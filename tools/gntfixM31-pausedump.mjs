// Fix builder M3 round 1 — attach to a running (possibly hung) harness browser and dump where
// the page's main thread is: Debugger.pause -> call frames. Read-only (resumes afterwards).
//   node tools/gntfixM31-pausedump.mjs <devtools-port>
import puppeteer from 'puppeteer';

const port = process.argv[2];
const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, protocolTimeout: 20000 });
try {
  const targets = browser.targets().filter((t) => t.type() === 'page' && /5199/.test(t.url()));
  for (const t of targets) {
    const cdp = await t.createCDPSession();
    await cdp.send('Debugger.enable');
    const paused = new Promise((res) => cdp.once('Debugger.paused', res));
    await cdp.send('Debugger.pause');
    const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 15000))]);
    if (!ev) {
      console.log('no pause within 15 s');
      continue;
    }
    for (const f of ev.callFrames.slice(0, 25)) console.log(`${f.functionName || '(anon)'} @ ${f.url.replace(/^.*\/src\//, 'src/')}:${f.location.lineNumber + 1}`);
    await cdp.send('Debugger.resume');
    await cdp.send('Debugger.disable');
  }
} finally {
  browser.disconnect();
}
