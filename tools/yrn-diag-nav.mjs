import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--window-size=1600,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
const reqs = [];
page.on('request', (r) => reqs.push([Date.now(), r.url()]));
page.on('requestfailed', (r) => console.log('FAIL', r.url(), r.failure()?.errorText));
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const t0 = Date.now();
try {
  await page.goto('http://127.0.0.1:5199', { waitUntil: 'load', timeout: 30000 });
  console.log('load at', Date.now() - t0, 'ms; requests so far', reqs.length);
} catch (e) { console.log('goto error', e.message); }
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  const recent = reqs.filter((r) => r[0] > Date.now() - 1500);
  const dbg = await page.evaluate(() => (window.__echoes ? { v: window.__echoes.version, tick: window.__echoes.tick, fps: window.__echoes.fps } : null)).catch((e) => 'evalerr ' + e.message);
  console.log(`t+${Date.now() - t0}ms reqs/1.5s=${recent.length}`, JSON.stringify(dbg), recent.slice(0, 3).map((r) => r[1].slice(0, 90)));
}
const pending = reqs.slice(-8).map((r) => r[1].slice(0, 100));
console.log('last requests', pending);
await browser.close();
