#!/usr/bin/env node
// SHOP REFRESH (v0.5.248, Kesh: "spend glint for a refresh of shop items").
// Solo, per class (Ally builds: Suggested, the default):
//   1. the Refresh button shows on the played character's tab at 5 Glint,
//      with its key cap (R);
//   2. R pays 5 from that character's purse, redraws its whole shelf (fresh,
//      unsold cards), plays the shelf flip, and the next refresh costs 10;
//      the relic shelf is untouched;
//   3. pad X refreshes too (15);
//   4. another character's tab is view-only: no button, R does nothing;
//   5. once the purse cannot pay, the button cools (rn-short), a press is
//      refused with nothing spent and nothing redrawn;
//   6. the AI Healer never refreshes (its count stays 0) and keeps its picks.
// Screenshots: captures/shoprefresh-<class>-*.png (pinned flip frames).
//
//   node tools/shop-refresh-browser.mjs [--url http://127.0.0.1:5199/] [--seed 7] [--class swordsman] [--lang de] [--size 1280x720]
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
const LANG = opt('lang');
const [VW, VH] = (opt('size', '1600x900')).split('x').map(Number);
const SEAT = { healer: 0, tank: 1, swordsman: 2, archer: 3 };
const FKEY = ['F1', 'F2', 'F3', 'F4'];
mkdirSync('captures', { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1 },
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

// A standard-mapping pad the page reads through navigator.getGamepads().
const PAD_MOCK = () => {
  const pad = { id: 'Probe pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__pad = {
    set({ buttons = {} } = {}) {
      for (const b of pad.buttons) {
        b.pressed = false;
        b.value = 0;
      }
      for (const [i, v] of Object.entries(buttons)) {
        pad.buttons[i].pressed = v > 0.5;
        pad.buttons[i].value = v;
      }
      pad.timestamp = performance.now();
    },
  };
  navigator.getGamepads = () => [pad, null, null, null];
};

for (const cls of ONLY ? [ONLY] : ['healer', 'swordsman']) {
  const own = SEAT[cls];
  const tag = `${cls}${LANG ? `-${LANG}` : ''}${VW !== 1600 ? `-${VW}` : ''}`;
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(PAD_MOCK);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  const st = () => page.evaluate(() => window.__echoes.state().run);
  const ui = () => page.evaluate(() => window.__echoes.runUi().shop);
  const anim = () => page.evaluate(() => window.__echoes.runUi().shopAnim());
  const pin = (ms) => page.evaluate((m) => window.__echoes.runUi().shopPin(m), ms);
  const purse = (v, seat) => (seat === 0 ? v.shop.wallet : v.partyShop.shelves[seat].purse);
  const shelfOf = (v, seat) => (seat === 0 ? v.shop.stock : v.partyShop.shelves[seat].stock);
  const count = (v, seat) => (seat === 0 ? v.shop.refreshes || 0 : (v.partyShop.refreshes || [0, 0, 0, 0])[seat]);
  const frames = () => page.evaluate(() => window.__echoes.app.frameCount);
  const waitFrames = async (n, minMs) => {
    const f0 = await frames();
    const t0 = Date.now();
    while ((await frames()) < f0 + n || Date.now() - t0 < minMs) await settle(80);
  };
  const padPress = async (b) => {
    await page.evaluate((k) => window.__pad.set({ buttons: { [k]: 1 } }), b);
    await waitFrames(3, 300);
    await page.evaluate(() => window.__pad.set({}));
    await waitFrames(3, 300);
  };
  const viewTab = async (seat) => {
    await page.keyboard.press(FKEY[seat]);
    await page.waitForFunction((s) => window.__echoes.runUi().shop.viewSeat === s, { timeout: 30000, polling: 200 }, seat);
    await waitFrames(6, 1200);
  };
  const flipDone = () => page.waitForFunction(() => window.__echoes.runUi().shopAnim().refreshing === null, { timeout: 120000, polling: 100 });
  const events = () => page.evaluate(() => window.__srEv.splice(0));

  await page.goto(`${URL0}?seed=${SEED}${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await page.evaluate((c) => window.__echoes.settings.set('gameplay.playClass', c), cls);
  await settle(1500);
  const start = await cmd('campChoose', 1);
  check(start && start.ok, `[${tag}] a Level 1 run starts`);
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
  await cmd('partyGrant', 'max');
  for (const id of ['spirit_bolt', 'mending_bolt', 'swift_mend']) await cmd('giveSkill', id);
  await cmd('relics', true);
  await cmd('skipToRoom', 7);
  await page.waitForFunction(() => window.__echoes.runUi().screen === 'shop', { timeout: 300000, polling: 250 });
  await page.evaluate(() => {
    window.__srEv = [];
    for (const n of ['shop_refresh', 'refresh_denied']) window.__echoes.on(n, (ev) => window.__srEv.push({ ...ev, name: n }));
  });
  await settle(2500);

  // 1. The button on the own tab.
  let u = await ui();
  let a = await anim();
  check(u.viewSeat === own && a.refreshShown && a.refreshPrice === '5', `[${tag}] Refresh shows on the own tab at 5 Glint (seat ${u.viewSeat}, shown ${a.refreshShown}, price ${a.refreshPrice})`);
  const capTxt = await page.$eval('.rn-shop .rn-rfkey', (n) => n.textContent);
  check(capTxt === 'R', `[${tag}] its key cap reads R ("${capTxt}")`);
  await page.screenshot({ path: `captures/shoprefresh-${tag}-1-open.png` });

  // 2. R refreshes: pays 5, redraws, flips, next costs 10.
  let v = await st();
  const p0 = purse(v, own);
  const before = shelfOf(v, own).map((c) => c.node).join(',');
  const relicsBefore = JSON.stringify(v.relics && v.relics.shelf);
  const aiBefore = own === 0 ? null : JSON.stringify(v.shop.stock.map((c) => [c.node, !!c.marked]));
  // Pin the clock at the press so the flip can be photographed frame by frame.
  await page.keyboard.press('KeyR');
  await page.waitForFunction(() => window.__echoes.runUi().shopAnim().refreshing !== null, { timeout: 60000, polling: 50 });
  await pin(120);
  await page.screenshot({ path: `captures/shoprefresh-${tag}-2-turning.png` });
  await pin(560);
  await page.screenshot({ path: `captures/shoprefresh-${tag}-3-landing.png` });
  await pin(null);
  await flipDone();
  a = await anim();
  check(a.refreshFrames >= 3, `[${tag}] the shelf flip ran over ${a.refreshFrames} rendered frames`);
  v = await st();
  const after = shelfOf(v, own);
  check(purse(v, own) === p0 - 5, `[${tag}] R paid 5 from the own purse (${p0} -> ${purse(v, own)})`);
  check(count(v, own) === 1 && after.length > 0 && after.every((c) => !c.sold), `[${tag}] the shelf is redrawn, all cards fresh (count ${count(v, own)}, ${after.map((c) => c.node).join(',')} vs ${before})`);
  const ev1 = await events();
  check(ev1.length === 1 && ev1[0].name === 'shop_refresh' && ev1[0].seat === own && ev1[0].price === 5, `[${tag}] one shop_refresh event for seat ${own} (${JSON.stringify(ev1.map((e) => [e.name, e.seat, e.price]))})`);
  check(JSON.stringify(v.relics && v.relics.shelf) === relicsBefore, `[${tag}] the relic shelf is untouched`);
  if (own !== 0) check(JSON.stringify(v.shop.stock.map((c) => [c.node, !!c.marked])) === aiBefore && !v.shop.refreshes, `[${tag}] the AI Healer's shelf and picks are untouched`);
  a = await anim();
  check(a.refreshPrice === '10', `[${tag}] the next refresh costs 10 (${a.refreshPrice})`);
  await page.screenshot({ path: `captures/shoprefresh-${tag}-4-after.png` });

  // 3. Pad X refreshes (15).
  v = await st();
  const p1 = purse(v, own);
  await padPress(2);
  await flipDone();
  v = await st();
  check(purse(v, own) === p1 - 10 && count(v, own) === 2, `[${tag}] pad X refreshed for 10 (${p1} -> ${purse(v, own)}, count ${count(v, own)})`);
  const padCap = await page.$eval('.rn-shop .rn-rfkey', (n) => n.textContent);
  check(padCap === 'X', `[${tag}] with the pad in use the key cap reads X ("${padCap}")`);
  await page.keyboard.press('Shift'); // back to the keyboard
  await events();

  // 4. Another tab is view-only.
  const other = own === 0 ? 2 : 0;
  await viewTab(other);
  v = await st();
  const q0 = purse(v, other);
  const oBefore = shelfOf(v, other).map((c) => c.node).join(',');
  a = await anim();
  check(!a.refreshShown, `[${tag}] no Refresh on the view-only tab`);
  await page.keyboard.press('KeyR');
  await settle(1200);
  v = await st();
  check(purse(v, other) === q0 && shelfOf(v, other).map((c) => c.node).join(',') === oBefore && count(v, other) === 0 && (await events()).length === 0, `[${tag}] R on the view-only tab does nothing`);
  await viewTab(own);

  // 5. Refresh until the purse cannot pay: the button cools and a press is refused.
  for (let k = 0; k < 8; k++) {
    v = await st();
    a = await anim();
    if (purse(v, own) < Number(a.refreshPrice)) break;
    await page.keyboard.press('KeyR');
    await page.waitForFunction((n) => {
      const r = window.__echoes.state().run;
      return (r.shop.refreshes || 0) + (r.partyShop && r.partyShop.refreshes ? r.partyShop.refreshes.reduce((x, y) => x + y, 0) : 0) > n;
    }, { timeout: 60000, polling: 100 }, count(v, own));
    await flipDone();
  }
  v = await st();
  a = await anim();
  const pShort = purse(v, own);
  const shelfShort = shelfOf(v, own).map((c) => c.node).join(',');
  check(a.refreshShort && pShort < Number(a.refreshPrice), `[${tag}] the button cools when the purse cannot pay (purse ${pShort}, price ${a.refreshPrice})`);
  await events();
  await page.keyboard.press('KeyR');
  await settle(1200);
  v = await st();
  const ev2 = await events();
  check(purse(v, own) === pShort && shelfOf(v, own).map((c) => c.node).join(',') === shelfShort && ev2.length === 1 && ev2[0].name === 'refresh_denied', `[${tag}] the short press is refused with nothing spent (${JSON.stringify(ev2.map((e) => e.name))})`);
  await page.screenshot({ path: `captures/shoprefresh-${tag}-5-short.png` });

  // 6. AI seats never refresh.
  v = await st();
  const aiCounts = [0, 1, 2, 3].filter((s) => s !== own).map((s) => count(v, s));
  check(aiCounts.every((n) => n === 0), `[${tag}] no AI seat refreshed (${aiCounts})`);
  check(errors.length === 0, `[${tag}] no page errors (${errors.slice(0, 3).join(' | ')})`);
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ probe: 'shop-refresh', passed: passes, of: passes + fails.length, fails }));
process.exit(fails.length ? 1 : 0);
