#!/usr/bin/env node
// INT fix builder (r1): does the window 'load' event fire on a menu-skip boot, and when?
//   node tools/gntfixINT1-loadevent.mjs [--url u] [--ms 15000]
import puppeteer from 'puppeteer';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const url = arg('url', 'http://127.0.0.1:5199/?seed=7&menu=0');
const ms = Number(arg('ms', 15000));
const sleep = (t) => new Promise((r) => setTimeout(r, t));
const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--window-size=1600,900'] });
const page = await browser.newPage();
const cdp = await page.target().createCDPSession();
await cdp.send('Network.enable');
const pending = new Map();
cdp.on('Network.requestWillBeSent', (e) => pending.set(e.requestId, { url: e.request.url, type: e.type, at: Date.now() }));
cdp.on('Network.loadingFinished', (e) => pending.delete(e.requestId));
cdp.on('Network.loadingFailed', (e) => pending.delete(e.requestId));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(ms);
const info = await page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; return { readyState: document.readyState, loadEventStart: nav ? Math.round(nav.loadEventStart) : null, domComplete: nav ? Math.round(nav.domComplete) : null, resourcesPending: performance.getEntriesByType('resource').length, tick: window.__echoes && window.__echoes.tick, app: window.__echoes && window.__echoes.app && window.__echoes.app.state }; });
console.log(JSON.stringify({ url, afterMs: Date.now() - t0, info, pendingCdp: [...pending.values()].map((p) => ({ ...p, ageMs: Date.now() - p.at })) }, null, 1));
await browser.close();
