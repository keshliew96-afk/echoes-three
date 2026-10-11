#!/usr/bin/env node
// SHOP AND DAILY FIXES (content plan 3, slice 14): the docked shop with the
// relic rack up stays inside the window on every class tab — page top >= 0,
// bottom above the command bar — at 1024x640 (the §1 minimum) and 1280x720,
// in each language asked; at 1024x640 the tight reflow is on (binding quote
// hidden, the rumour on one line with its whole text in the title), and at
// 1280x720 it is off. Screenshots: <dir>/shop-fit-<lang>-<W>x<H>-seat<k>.png.
//   node tools/shop-fit-probe.mjs [--url http://127.0.0.1:5199/] [--langs en,de] [--dir captures]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANGS = opt('langs', 'en,de').split(',');
const DIR = opt('dir', 'captures');
const SIZES = [
  [1024, 640, true],
  [1280, 720, false],
];
mkdirSync(DIR, { recursive: true });
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
  await page.evaluate(() => window.__echoes.settings.set('gameplay.playClass', 'healer'));
  await settle(1500);
  await cmd('campChoose', 1);
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
  await cmd('partyGrant', 'max');
  for (const id of ['spirit_bolt', 'mending_bolt', 'swift_mend']) await cmd('giveSkill', id);
  await cmd('relics', true);
  await cmd('skipToRoom', 7);
  await page.waitForFunction(() => window.__echoes.runUi().screen === 'shop', { timeout: 300000, polling: 250 });
  for (const [w, h, tight] of SIZES) {
    await page.setViewport({ width: w, height: h });
    await settle(3000);
    for (let seat = 0; seat < 4; seat++) {
      if (seat > 0) {
        await page.keyboard.press('KeyE');
        await settle(2500);
      }
      const m = await page.evaluate(() => {
        const shop = document.querySelector('.rn-shop');
        const b = shop.getBoundingClientRect();
        const bar = document.querySelector('.hud-bar');
        const rum = shop.querySelector('.rn-rumour');
        const span = rum.querySelector('span');
        const bind = shop.querySelector('.rn-shelf:not(.rn-shelftwin) .rn-bind');
        return {
          top: b.top,
          bottom: b.bottom,
          barTop: bar ? bar.getBoundingClientRect().top : innerHeight,
          rack: getComputedStyle(shop.querySelector('.rl-rack')).display !== 'none',
          tight: shop.classList.contains('rn-tight'),
          rumourLines: Math.round(span.getBoundingClientRect().height / (parseFloat(getComputedStyle(span).lineHeight) || 22)),
          rumourTitle: rum.title || '',
          bindShown: bind ? getComputedStyle(bind).display !== 'none' : null,
          s: Number(getComputedStyle(document.querySelector('#run-screen')).getPropertyValue('--rn-s')) || 1,
        };
      });
      const tag = `${lang} ${w}x${h} seat ${seat}`;
      check(m.rack, `[${tag}] the relic rack is up`);
      check(m.top >= 0 && m.bottom <= m.barTop + 1, `[${tag}] the page sits in the window above the command bar (top ${m.top.toFixed(0)}, bottom ${m.bottom.toFixed(0)}, bar ${m.barTop.toFixed(0)}, scale ${m.s.toFixed(3)})`);
      check(m.tight === tight, `[${tag}] tight reflow ${tight ? 'on' : 'off'}`);
      if (tight) {
        check(m.rumourLines <= 1 && m.rumourTitle.length > 10, `[${tag}] the rumour keeps to one line, its whole text in the title`);
        if (m.bindShown !== null) check(!m.bindShown, `[${tag}] the binding quote steps aside`);
      }
      await page.screenshot({ path: `${DIR}/shop-fit-${lang}-${w}x${h}-seat${seat}.png` });
    }
    await page.keyboard.press('KeyE'); // back to seat 0
    await settle(1500);
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ probe: 'shop-fit', passed: passes, of: passes + fails.length, fails }));
process.exit(fails.length ? 1 : 0);
