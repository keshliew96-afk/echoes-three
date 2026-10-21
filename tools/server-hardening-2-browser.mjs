#!/usr/bin/env node
// SERVER HARDENING 2 in the real game (docs/DAILY.md "Run tickets"): against a
// served harness build (`VITE_ECHOES_HARNESS=1 npx vite build && node
// server/index.mjs --static dist --port 7821 --origins self`), shoots
//   sh2-1-outdated.png  the day's screen when the board runs a newer build
//                       (its answer rewritten to a far newer version): the
//                       out-of-date line, Set out reads Practice run
//   sh2-2-refused.png   the end card of a counted run whose ticket the server
//                       refused as out of date (the ticket answer rewritten)
//   node tools/server-hardening-2-browser.mjs [--url http://127.0.0.1:7821/] [--lang de] [--dir captures] [--w 1024 --h 640]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH and ECHOES_CHROME_ARGS as in CLAUDE.md.
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { VERSION } from '../src/version.js';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:7821/');
const LANG = opt('lang', null);
const DIR = opt('dir', 'captures');
const W = Number(opt('w', 1024));
const H = Number(opt('h', 640));
const SFX = LANG ? `-${LANG}` : '';
mkdirSync(DIR, { recursive: true });
const FAR = VERSION.replace(/\d+$/, (x) => String(Number(x) + 10));

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 600000, defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...extra] });
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
};
const settle = (ms = 2500) => new Promise((r) => setTimeout(r, ms));

async function open(mode) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const p = new URL(req.url()).pathname;
    if (mode === 'outdated' && p.startsWith('/daily/board/')) {
      const r = await fetch(req.url());
      const j = await r.json();
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...j, version: FAR }) });
    }
    if (mode === 'refused' && p === '/daily/ticket') return req.respond({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'bad_version', version: FAR }) });
    return req.continue();
  });
  await page.goto(`${URL0}?menu=0&seed=7&netname=Kesh${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  return { page, errors, cmd: (n, ...a) => page.evaluate((x, y) => window.__echoes.cmd(x, ...y), n, a) };
}

try {
  // 1. The board runs a newer build: practice, the counted run stays open.
  {
    const { page, errors, cmd } = await open('outdated');
    check((await cmd('campDaily')) === true, 'the day screen opens from camp');
    await page.waitForFunction(() => window.__echoes.daily().outdated(), { timeout: 60000, polling: 250 });
    await page.waitForFunction(() => document.querySelector('.dl-daily')?.classList.contains('dl-practice'), { timeout: 60000, polling: 250 });
    await settle(1500);
    const s = await page.evaluate(() => {
      const once = document.querySelector('.dl-daily .dl-once');
      const r = document.querySelector('.dl-daily .dl-stale').getBoundingClientRect();
      const g = document.querySelector('.dl-daily .dl-go').getBoundingClientRect();
      return { go: document.querySelector('.dl-daily .dl-go')?.textContent, once: once.textContent, stale: document.querySelector('.dl-daily .dl-stale').textContent, inView: r.bottom <= innerHeight && r.right <= innerWidth && g.bottom <= innerHeight, counted: window.__echoes.daily().counted(window.__echoes.daily().today()) };
    });
    check(s.counted === 'open' && s.inView && (LANG || (s.go === 'Practice run' && /out of date/.test(s.stale))), `the out-of-date screen: ${JSON.stringify(s)}`);
    await page.screenshot({ path: `${DIR}/sh2-1-outdated${SFX}.png` });
    await page.click('.dl-daily .dl-go');
    await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
    const st = await page.evaluate(() => ({ practice: window.__echoes.cmd('runState').daily?.practice, counted: window.__echoes.daily().counted(window.__echoes.daily().today()) }));
    check(st.practice === true && st.counted === 'open', `Set out played practice and kept the counted run: ${JSON.stringify(st)}`);
    check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }
  // 2. The ticket is refused: the end card says the page is out of date.
  {
    const { page, errors, cmd } = await open('refused');
    check((await cmd('campDaily')) === true, 'the day screen opens from camp');
    await page.waitForSelector('.dl-daily .dl-go', { visible: true, timeout: 60000 });
    await settle(1500);
    await page.click('.dl-daily .dl-go');
    await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('echoes.daily.v1')).days[window.__echoes.daily().today()] || {}).ticketError === 'bad_version', { timeout: 60000, polling: 250 });
    await cmd('endRun', 'defeat');
    await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'defeat', { timeout: 300000, polling: 250 });
    await page.waitForFunction(() => window.__echoes.daily().last()?.state === 'failed', { timeout: 60000, polling: 250 });
    await settle(3000);
    const e = await page.evaluate(() => ({ last: window.__echoes.daily().last(), summary: document.querySelector('.rn-end .rn-summary')?.textContent.replace(/\s+/g, ' ').trim() }));
    check(e.last.error === 'bad_version' && (LANG || /reload the page to update/.test(e.summary || '')), `the end card: ${JSON.stringify({ error: e.last.error, summary: (e.summary || '').slice(0, 200) })}`);
    await page.screenshot({ path: `${DIR}/sh2-2-refused${SFX}.png` });
    check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }
} catch (err) {
  check(false, `probe error: ${err && err.message ? err.message : err}`);
}
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
