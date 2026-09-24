// Fix builder M3 round 1 — read a running harness page state over CDP (Runtime.evaluate). node tools/gntfixM31-peek.mjs <port>
import puppeteer from 'puppeteer';
const port = process.argv[2];
const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, protocolTimeout: 20000 });
const t = browser.targets().find((x) => x.type() === 'page' && /5199/.test(x.url()));
const cdp = await t.createCDPSession();
const r = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify({tick: window.__echoes && window.__echoes.tick, fps: window.__echoes && window.__echoes.fps, ps: window.__PS ? window.__PS.length : null, S: window.__S ? window.__S.length : null, W: window.__W ? window.__W.length : null, t: window.__t0 ? Math.round(performance.now() - window.__t0) : null, state: window.__echoes && window.__echoes.audio && window.__echoes.audio.state, run: window.__echoes && window.__echoes.state().run.phase, vis: document.visibilityState, hasFocus: document.hasFocus() })`, returnByValue: true });
console.log(r.result.value);
browser.disconnect();
