#!/usr/bin/env node
// CROSS-RUN UNLOCKS in the real game (docs/UNLOCKS.md), against `npm run dev`
// (port 5199). One browser profile, two page loads:
//   1. fresh camp: the Unlocks screen (U) shows 0 Embers;
//   2. a run started from the camp (the player's own start, campChoose) is
//      walked to the Level I boss, the boss killed, then the party quits
//      to the lobby in Level II: the run end pays Embers (toast + profile);
//   3. the Unlocks screen: the Purse tab card is clicked (buy + equip), a
//      Tints card too;
//   4. RELOAD the page: the profile still owns and wears both; the next run
//      started from the camp opens with the purse's Glint and the boons in
//      the run view, and the tint is live in the VFX table.
// Screenshots: captures/unlocks-1-fresh.png, -2-earned.png, -3-bought.png,
// -4-next-run.png. Fails on any page error.
//
//   node tools/unlocks-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3]
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
const SEED = Number(opt('seed', '3'));
const W = 1600;
const H = 900;
mkdirSync('captures', { recursive: true });

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, ...extra],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const meta = () => page.evaluate(() => window.__echoes.save.profile().meta);
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
async function boot() {
  await page.goto(`${URL0}?seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await settle(1500);
}
async function openUnlocks() {
  await page.keyboard.press('KeyU');
  await page.waitForFunction(() => !!document.querySelector('.ul-unlocks .ul-card'), { timeout: 60000, polling: 250 });
  await settle(1200);
}
async function closeUnlocks() {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.ul-unlocks') || document.querySelector('.ul-unlocks').offsetParent === null, { timeout: 60000, polling: 250 });
  await settle(600);
}
const balanceText = () => page.evaluate(() => document.querySelector('.ul-unlocks .ul-bal-n')?.textContent ?? null);

// ---------------------------------------------------------- 1: fresh camp --
await boot();
await openUnlocks();
check((await balanceText()) === '0', 'a fresh profile shows 0 Embers');
const fresh = await page.evaluate(() => ({
  tabs: [...document.querySelectorAll('.ul-unlocks .ul-tab')].map((t) => t.textContent.trim()),
  cards: document.querySelectorAll('.ul-unlocks .ul-card').length,
  next: document.querySelector('.ul-unlocks .ul-next-b')?.textContent.trim(),
}));
check(fresh.tabs.length === 6 && fresh.cards >= 5, `the screen lists the kinds and the kit cards (${JSON.stringify(fresh)})`);
await page.screenshot({ path: 'captures/unlocks-1-fresh.png' });
await closeUnlocks();

// ---------------------------------------------- 2: a run that pays Embers --
const start1 = await cmd('campChoose', 1);
check(start1 && start1.ok, `the camp starts a campaign (${JSON.stringify(start1)})`);
let v = await waitPhase(['combat', 'transit']);
check(!v.boons, 'a plain profile starts a plain run (no boons in the view)');
await cmd('skipToRoom', 8);
v = await waitPhase(['combat']);
await page.waitForFunction(() => window.__echoes.cmd('killBoss') === true, { timeout: 240000, polling: 500 });
v = await waitPhase(['transit', 'victory'], 300000);
check(v.phase === 'transit', `the Level I boss room cleared (phase ${v.phase})`);
await settle(1500);
await cmd('abandonRun');
await settle(2500);
const m1 = await meta();
const toast = await page.evaluate(() => (window.__echoes.app && window.__echoes.app.toasts ? window.__echoes.app.toasts() : []).map((t) => t.text || t).slice(-3));
check(m1.embers > 0 && m1.lastAward && m1.lastAward.embers === m1.embers, `the run paid Embers (${m1.embers}: ${JSON.stringify(m1.lastAward && m1.lastAward.lines)})`);
check(m1.deeds.includes('first_light'), 'the First Light deed was paid');
check(JSON.stringify(toast).includes('Embers'), `a toast named the Embers (${JSON.stringify(toast)})`);
await waitPhase(['idle'], 120000).catch(() => null);
await settle(2500);

// ------------------------------------------------------ 3: buy and equip --
await openUnlocks();
check((await balanceText()) === String(m1.embers), 'the screen shows the new balance');
await page.screenshot({ path: 'captures/unlocks-2-earned.png' });
await page.click('.ul-unlocks .ul-tab[data-tab="purse"]');
await settle();
await page.click('.ul-unlocks .ul-card[data-id="purse_1"]');
await settle();
await page.click('.ul-unlocks .ul-tab[data-tab="tint"]');
await settle();
await page.click('.ul-unlocks .ul-card[data-id="tint_emberforge"]');
await settle();
await page.click('.ul-unlocks .ul-tab[data-tab="purse"]');
await settle(1200);
const m2 = await meta();
check(m2.owned.purse_1 === 50 && m2.loadout.purse === 1, `Pilgrim's Purse I bought and equipped (${JSON.stringify(m2.loadout)})`);
check(m2.owned.tint_emberforge === 30 && m2.loadout.tints.tank === 'tint_emberforge', 'the Emberforge tint bought and equipped');
check(m2.embers === m1.embers - 80, `the balance paid for both (${m2.embers})`);
const card = await page.evaluate(() => {
  const c = document.querySelector('.ul-unlocks .ul-card[data-id="purse_1"]');
  return { state: c?.dataset.state, equipped: c?.dataset.equipped, wear: document.querySelector('.ul-unlocks .ul-wear-b')?.textContent };
});
check(card.state === 'owned' && card.equipped === 'true' && /Purse/.test(card.wear), `the card and the side panel show it worn (${JSON.stringify(card)})`);
await page.screenshot({ path: 'captures/unlocks-3-bought.png' });
await closeUnlocks();

// ------------------------------------------------- 4: reload, next run --
await boot();
const m3 = await meta();
check(m3.owned.purse_1 === 50 && m3.loadout.purse === 1 && m3.loadout.tints.tank === 'tint_emberforge' && m3.embers === m2.embers, 'after a reload the profile still owns and wears them');
const tint = await page.evaluate(async () => {
  const m = await import('/src/data/vfx.js');
  return m.vfxClassStyle('tank').glow;
});
check(tint === '#FF8A3D', `the Tank tint is live in the VFX table (${tint})`);
const start2 = await cmd('campChoose', 1);
check(start2 && start2.ok, 'the camp starts the next run');
v = await waitPhase(['combat', 'transit']);
check(!!v.boons && v.boons.glint === 15, `the next run carries the purse (${JSON.stringify(v.boons)})`);
check(v.wallet === 15, `the run opened with 15 Glint (wallet ${v.wallet})`);
await settle(2500);
await page.screenshot({ path: 'captures/unlocks-4-next-run.png' });

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\nFAIL unlocks browser (${fails.length})` : '\nPASS unlocks browser');
process.exit(fails.length ? 1 : 0);
