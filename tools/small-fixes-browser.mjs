#!/usr/bin/env node
// Small fixes (v0.5.244), in the browser against the dev server:
//   1. Glint counter: playing the Swordsman, the top-right counter shows the
//      Swordsman's purse, not the Healer's wallet.
//   2. German Controls tab: no action label is cut off (each label fits its
//      row, on up to two lines).
// Screenshots: --shots <dir> (glint-swordsman.png, controls-de.png).
//
//   node tools/small-fixes-browser.mjs [--url http://127.0.0.1:5199/] [--shots captures]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH pointing at a chrome wrapper that
// adds --no-sandbox and the swiftshader flags (docs/TESTING.md).
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SHOTS = opt('shots', 'captures');
mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------- 1. Glint counter --
{
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  await page.goto(`${URL0}?seed=7&lang=en`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await page.evaluate(() => window.__echoes.settings.set('gameplay.playClass', 'swordsman'));
  await sleep(1500);
  const start = await cmd('campChoose', 1);
  check(start && start.ok, `a Level 1 run starts as the Swordsman (${JSON.stringify(start)})`);
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
  await cmd('wallet', 13);
  await cmd('partyPurse', 2, 57);
  await page.waitForFunction(() => (document.querySelector('.hud-glint-num') || {}).textContent === '57', { timeout: 120000, polling: 250 }).catch(() => null);
  const shown = await page.$eval('.hud-glint-num', (n) => n.textContent);
  check(shown === '57', `the Glint counter shows the Swordsman's purse 57, not the Healer's wallet 13 (shows ${shown})`);
  await page.screenshot({ path: `${SHOTS}/glint-swordsman.png` });
  check(errors.length === 0, `no page error (${errors.slice(0, 2).join(' | ')})`);
  await page.close();
}

// ------------------------------------------------- 2. German Controls tab --
{
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.goto(`${URL0}?menu=1&fresh=1&lang=de`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => (window.__echoes && window.__echoes.app ? window.__echoes.app.state : null)).catch(() => null);
    if (st === 'title') break;
    if (st === 'boot') await page.keyboard.press('Shift');
    await sleep(1500);
  }
  await sleep(1000);
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'controls' }));
  await page.waitForSelector('#ap-bind-dodge', { visible: true, timeout: 60000 });
  await sleep(1500);
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll('.ap-controls .ap-bind-row .ap-ref-act')]
      .filter((n) => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)
      .map((n) => n.textContent),
  );
  const labels = await page.evaluate(() => ['attack', 'interact'].map((k) => [...document.querySelectorAll('.ap-controls .ap-bind-row')].map((r) => r.querySelector('.ap-ref-act').textContent).find((t) => (k === 'attack' ? /Standardangriff/ : /Wiederbeleben/).test(t))));
  check(cut.length === 0, `no German Controls label is cut off (${cut.join(' | ') || 'none'}; ${labels.join(' | ')})`);
  await page.screenshot({ path: `${SHOTS}/controls-de.png` });
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('.ap-controls .ap-bind-row')].find((n) => /Wiederbeleben/.test(n.textContent));
    if (r) r.scrollIntoView({ block: 'center' });
  });
  await sleep(1200);
  await page.screenshot({ path: `${SHOTS}/controls-de-interact.png` });
  check(errors.length === 0, `no page error (${errors.slice(0, 2).join(' | ')})`);
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ probe: 'small-fixes-browser', ok: fails.length === 0, fails }));
process.exit(fails.length ? 1 : 0);
