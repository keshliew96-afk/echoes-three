#!/usr/bin/env node
// SHOP REFRESH: the docked shelf's frame with the Refresh button, per window
// size and language — the button row stays one button tall, Refresh and the
// lamp sit inside the panel, and from 1280 px up the page fits the window. Screenshots:
// captures/shoprefresh-layout-<lang>-<W>x<H>.png.
//   node tools/shop-refresh-layout.mjs [--url http://127.0.0.1:5199/] [--class healer] [--sizes 1024x640,1280x720,1920x1080] [--langs en,de]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const CLS = opt('class', 'healer');
const SIZES = opt('sizes', '1024x640,1280x720,1920x1080').split(',').map((s) => s.split('x').map(Number));
const LANGS = opt('langs', 'en,de').split(',');
const HIDE = argv.includes('--hide'); // A/B: the frame without the button
mkdirSync('captures', { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 900000, args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...extra] });
const fails = [];
let passes = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (ok) passes += 1;
  else fails.push(what);
};
const settle = (ms) => new Promise((r) => setTimeout(r, ms));
for (const lang of LANGS) {
  const page = await browser.newPage();
  await page.setViewport({ width: SIZES[0][0], height: SIZES[0][1] });
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  await page.goto(`${URL0}?seed=7&lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await page.evaluate((c) => window.__echoes.settings.set('gameplay.playClass', c), CLS);
  await settle(1500);
  await cmd('campChoose', 1);
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
  await cmd('partyGrant', 'max');
  for (const id of ['spirit_bolt', 'mending_bolt', 'swift_mend']) await cmd('giveSkill', id);
  await cmd('relics', true);
  await cmd('skipToRoom', 7);
  await page.waitForFunction(() => window.__echoes.runUi().screen === 'shop', { timeout: 300000, polling: 250 });
  if (HIDE) await page.addStyleTag({ content: '#run-screen .rn-shop .rn-refresh { display: none !important; }' });
  for (const [w, h] of SIZES) {
    await page.setViewport({ width: w, height: h });
    await settle(3500);
    const m = await page.evaluate(() => {
      const r = (q) => {
        const n = document.querySelector(q);
        if (!n) return null;
        const b = n.getBoundingClientRect();
        return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width };
      };
      return { scale: Number(getComputedStyle(document.querySelector('#run-screen')).getPropertyValue('--rn-s')) || 1, page: r('.rn-shop'), row: r('.rn-shop .rn-buttons'), btn: r('.rn-shop .rn-refresh'), lamp: r('.rn-shop .rn-advance'), vw: innerWidth, vh: innerHeight };
    });
    const tag = `${lang} ${w}x${h}`;
    // The row holding Refresh and the lamp stays one button tall (the hints
    // step aside rather than wrap), so the button never grows the page. (At
    // 1024x640 with the relic rack up the docked page already reached past
    // the window top before this slice — reported, not gated here.)
    const rowH = (m.row.b - m.row.t) / (m.scale || 1);
    check(rowH <= 60, `[${tag}] the button row stays one button tall (${rowH.toFixed(0)} px; page top ${m.page.t.toFixed(0)}, bottom ${m.page.b.toFixed(0)} of ${m.vh})`);
    if (w >= 1280) check(m.page.t >= -0.5 && m.page.b <= m.vh + 0.5 && m.page.l >= -0.5 && m.page.r <= m.vw + 0.5, `[${tag}] the shelf fits the window`);
    if (!HIDE) check(m.btn.l >= m.page.l && m.lamp.r <= m.page.r && m.btn.r <= m.lamp.l, `[${tag}] Refresh and the lamp sit inside the panel, side by side`);
    await page.screenshot({ path: `captures/shoprefresh-layout-${lang}-${w}x${h}${HIDE ? '-hidden' : ''}.png` });
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ probe: 'shop-refresh-layout', passed: passes, of: passes + fails.length, fails }));
process.exit(fails.length ? 1 : 0);
