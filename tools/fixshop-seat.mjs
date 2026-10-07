#!/usr/bin/env node
// FIX SHOP SEAT (v0.5.237, Kesh: "when i play as a character other than the
// Healer the default shop i view is the Healer's and i can buy in it ... it
// should be done by AI, and the default shop should be the character i
// control"). Solo, once per class (Ally builds: Suggested, the default):
//   1. the peddler's shelf opens on the played character's tab;
//   2. a card click there buys from that character's purse;
//   3. another character's tab is view-only: a click buys nothing and the
//      "does its own shopping" note shows;
//   4. not the Healer: the AI Healer's shelf carries its Suggested picks and
//      Advance buys them from the Healer's wallet.
// Screenshots: captures/fixshop-<class>-open.png, captures/fixshop-<class>-healer.png.
//
//   node tools/fixshop-seat.mjs [--url http://127.0.0.1:5199/] [--seed 7] [--class swordsman]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SEED = Number(opt('seed', '7'));
const ONLY = opt('class');
const SEAT = { healer: 0, tank: 1, swordsman: 2, archer: 3 };
const FKEY = ['F1', 'F2', 'F3', 'F4'];
mkdirSync('captures', { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...extra],
});
const fails = [];
let passes = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (ok) passes += 1;
  else fails.push(what);
  return ok;
};
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));

for (const cls of ONLY ? [ONLY] : ['healer', 'tank', 'swordsman', 'archer']) {
  const own = SEAT[cls];
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  const st = () => page.evaluate(() => window.__echoes.state().run);
  const ui = () => page.evaluate(() => window.__echoes.runUi().shop);
  const purse = (v, seat) => (seat === 0 ? v.shop.wallet : v.partyShop.shelves[seat].purse);
  const shelfOf = (v, seat) => (seat === 0 ? v.shop.stock : v.partyShop.shelves[seat].stock);
  const clickCard = async (i) => {
    await page.evaluate((k) => {
      const c = document.querySelectorAll('.rn-shop .rn-shelf:not(.rn-shelftwin) .rn-card')[k];
      if (c) c.click();
    }, i);
    await settle(600);
  };
  const viewTab = async (seat) => {
    await page.keyboard.press(FKEY[seat]);
    await page.waitForFunction((s) => window.__echoes.runUi().shop.viewSeat === s, { timeout: 30000, polling: 200 }, seat);
    await settle(800);
  };

  await page.goto(`${URL0}?seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await page.evaluate((c) => window.__echoes.settings.set('gameplay.playClass', c), cls);
  await settle(1500);
  const start = await cmd('campChoose', 1);
  check(start && start.ok, `[${cls}] a Level 1 run starts (${JSON.stringify(start)})`);
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
  // Nobody starts with skills (v0.5.227) and the shelf sells nodes for owned
  // skills: hand every seat a kit first.
  await cmd('partyGrant', 'max');
  for (const id of ['spirit_bolt', 'mending_bolt', 'swift_mend']) await cmd('giveSkill', id);
  await cmd('skipToRoom', 7);
  await page.waitForFunction(() => window.__echoes.runUi().screen === 'shop', { timeout: 300000, polling: 250 });
  await settle(2500);

  // 1. Opens on the played character.
  let u = await ui();
  check(u.viewSeat === own, `[${cls}] the shelf opens on the ${cls}'s tab (viewSeat ${u.viewSeat})`);
  await page.screenshot({ path: `captures/fixshop-${cls}-open.png` });

  // 2. Own tab buys from own purse.
  let v = await st();
  const p0 = purse(v, own);
  const idx = shelfOf(v, own).findIndex((c) => !c.sold && c.price <= p0);
  if (idx >= 0) {
    await clickCard(idx);
    v = await st();
    check(shelfOf(v, own)[idx].sold && purse(v, own) === p0 - shelfOf(v, own)[idx].price, `[${cls}] a click on the own tab buys (purse ${p0} -> ${purse(v, own)})`);
  } else check(false, `[${cls}] nothing affordable on the own tab (purse ${p0}, ${JSON.stringify(shelfOf(v, own))})`);

  // 3. Another tab is view-only.
  const other = own === 0 ? 2 : 0;
  await viewTab(other);
  v = await st();
  const q0 = purse(v, other);
  const sold0 = shelfOf(v, other).filter((c) => c.sold).length;
  await clickCard(0);
  await clickCard(1);
  v = await st();
  const note = await page.evaluate(() => {
    const n = document.querySelector('.rn-shop .rn-lock');
    return n && n.style.display !== 'none' ? n.textContent : '';
  });
  check(purse(v, other) === q0 && shelfOf(v, other).filter((c) => c.sold).length === sold0, `[${cls}] clicks on the ${other === 0 ? 'Healer' : 'Swordsman'}'s tab buy nothing (purse ${q0} -> ${purse(v, other)})`);
  check(/does its own shopping/.test(note), `[${cls}] the AI tab says it shops for itself ("${note}")`);
  if (other === 0) await page.screenshot({ path: `captures/fixshop-${cls}-healer.png` });

  // 4. The AI Healer buys its Suggested picks on Advance.
  if (own !== 0) {
    v = await st();
    const marks = v.shop.stock.map((c, k) => (c.marked && !c.sold ? k : -1)).filter((k) => k >= 0);
    const w0 = v.shop.wallet;
    check(marks.length > 0, `[${cls}] the AI Healer's shelf carries Suggested picks (${JSON.stringify(marks)}, wallet ${w0})`);
    await viewTab(own);
    await page.evaluate(() => {
      window.__fsClose = null;
      window.__echoes.on('shop_close', (ev) => (window.__fsClose = ev));
    });
    await page.evaluate(() => document.querySelector('.rn-shop .rn-advance').click());
    await settle(1200);
    const close = await page.evaluate(() => window.__fsClose);
    const expect = marks.reduce((a, k) => a + v.shop.stock[k].price, 0);
    check(!!close && close.wallet === w0 - expect, `[${cls}] Advance: the AI Healer bought its picks (wallet ${w0} -> ${close && close.wallet}, picks cost ${expect})`);
  }
  check(errors.length === 0, `[${cls}] no page errors (${errors.slice(0, 3).join(' | ')})`);
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ probe: 'fixshop-seat', passed: passes, of: passes + fails.length, fails }));
process.exit(fails.length ? 1 : 0);
