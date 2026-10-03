#!/usr/bin/env node
// gntM5a — debug helper: open a host page and a guest page against a server
// and dump both clients' net logs / stats (development aid for the netbench).
//   node tools/gntM5a-pagedebug.mjs ws://127.0.0.1:7810/echoes
import { launchEchoes } from './gnt-arch-browser.mjs';
import { openEchoesWindow as openEchoes } from './gntM5a-botlib.mjs';
const server = process.argv[2] || 'ws://127.0.0.1:7810/echoes';
const browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
try {
  const h = await openEchoes(browser, `http://127.0.0.1:5199/?menu=0&seed=7&net=${encodeURIComponent(server)}&nethost=1&netname=H`, { width: 1280, height: 720 });
  const code = await h.page.evaluate(async () => { for (let i = 0; i < 100; i++) { const n = window.__echoes.net; if (n && n.code) return n.code; await new Promise((r) => setTimeout(r, 100)); } return null; });
  console.log('code', code);
  const g = await openEchoes(browser, `http://127.0.0.1:5199/?menu=0&seed=8&net=${encodeURIComponent(server)}&netjoin=${code}&netname=G`, { width: 1280, height: 720 });
  await new Promise((r) => setTimeout(r, 3000));
  console.log('ready', await g.page.evaluate(() => window.__echoes.net.setReady(true)));
  console.log('start', await h.page.evaluate(() => window.__echoes.net.start()));
  await new Promise((r) => setTimeout(r, 2500));
  await h.page.evaluate(() => { window.__echoes.cmd('startRun', { act: 1 }); window.__echoes.cmd('autopilot', true); });
  await new Promise((r) => setTimeout(r, 4000));
  console.log('host tick', await h.page.evaluate(() => [window.__echoes.tick, window.__echoes.app && window.__echoes.app.state, JSON.stringify(window.__echoes.net.stats()).slice(0, 600)]));
  for (const [n, p] of [['host', h], ['guest', g]]) {
    const out = await p.page.evaluate(() => ({ state: window.__echoes.net.state, seat: window.__echoes.net.seat, code: window.__echoes.net.code, log: window.__echoes.net.log(30), url: window.__echoes.net.serverUrl }));
    console.log(n, JSON.stringify(out).slice(0, 1500));
    console.log(n, 'errors', p.errors, p.consoleLines.filter((l) => /net|error|warn/i.test(l)).slice(0, 10));
  }
} finally {
  await browser.close();
}
