#!/usr/bin/env node
// INT fix builder (r1): which network connections stay open on a menu-skip boot?
// (page.goto networkidle2 took 120 s on ?seed=7&menu=0 where older captures took 7-14 s.)
//   node tools/gntfixINT1-netidle.mjs [--url http://127.0.0.1:5199/?seed=7&menu=0] [--ms 12000]
import puppeteer from 'puppeteer';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const url = arg('url', 'http://127.0.0.1:5199/?seed=7&menu=0');
const ms = Number(arg('ms', 12000));
const sleep = (t) => new Promise((r) => setTimeout(r, t));
const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--window-size=1600,900'] });
const page = await browser.newPage();
const open = new Map(); const done = []; const ws = new Map();
const t0 = Date.now();
page.on('request', (r) => open.set(r, { url: r.url(), type: r.resourceType(), at: Date.now() - t0 }));
page.on('requestfinished', (r) => { const o = open.get(r); if (o) { done.push({ ...o, end: Date.now() - t0, ok: true }); open.delete(r); } });
page.on('requestfailed', (r) => { const o = open.get(r); if (o) { done.push({ ...o, end: Date.now() - t0, ok: false, err: r.failure() && r.failure().errorText }); open.delete(r); } });
const cdp = await page.target().createCDPSession();
await cdp.send('Network.enable');
cdp.on('Network.webSocketCreated', (e) => ws.set(e.requestId, { url: e.url, at: Date.now() - t0 }));
cdp.on('Network.webSocketClosed', (e) => { const w = ws.get(e.requestId); if (w) w.closed = Date.now() - t0; });
const gotoT0 = Date.now();
let gotoErr = null;
try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { gotoErr = String(e.message); }
const gotoMs = Date.now() - gotoT0;
await sleep(ms);
const state = await page.evaluate(() => { const E = window.__echoes; return E ? { v: E.version, tick: E.tick, app: E.app && E.app.state, net: E.net && E.net.state, serverState: E.net && E.net.serverState } : null; }).catch((e) => String(e));
const stillOpen = [...open.values()].map((o) => ({ ...o, ageMs: Date.now() - t0 - o.at }));
console.log(JSON.stringify({ url, gotoMs, gotoErr, state, requests: done.length, stillOpen, websockets: [...ws.values()], lastRequestAt: Math.max(0, ...done.map((d) => d.end)) }, null, 1));
await browser.close();
