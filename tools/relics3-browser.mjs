#!/usr/bin/env node
// RELICS batch 3 in the real game (docs/RELICS.md "Batch 3"): against
// `npm run dev` (port 5199), drives a campaign through the REAL pages and
// captures:
//   captures/relics3-1-pick.png      the free relic page offering batch-3 relics
//   captures/relics3-2-kindling.png  Kindling Coal (with Ember Tooth) flaring a pack
//   captures/relics3-3-oath.png      Warden's Oath: three taunts heal the Tank
//   captures/relics3-4-chalice.png   Sun Chalice searing the nearest enemy
//   captures/relics3-5-shelf.png     the peddler's relic shelf with batch-3 relics
// The older relics are granted first, so every pool holds only the new ten.
// Fails on any page error or a missing page.
//
//   node tools/relics3-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3]
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
const OLD = ['whetstone', 'ember_tooth', 'hawk_feather', 'lantern_oil', 'millstone', 'grave_coin', 'peddlers_seal', 'wyrm_scale', 'hearthstone', 'heron_quill', 'thorn_mail', 'leech_fang', 'last_light', 'glass_heart', 'ashen_crown', 'ash_feather', 'spore_sac'];
const NEW = ['wardens_oath', 'fox_ribbon', 'fletchers_knot', 'mercy_bell', 'kindling_coal', 'sun_chalice', 'cinder_pact', 'bounty_writ', 'huntsmans_horn', 'pilgrims_lamp'];

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

await page.goto(`${URL0}?seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = () => sleep(900);
// Party bodies and spawns, read straight off the sim.
const seatId = (i) => page.evaluate((k) => window.__echoes.content.world().entities().find((e) => e.partyIndex === k)?.id ?? null, i);
const setSeatHp = (i, f) => page.evaluate((k, ff) => {
  const b = window.__echoes.content.world().entities().find((e) => e.partyIndex === k);
  if (b) b.hp = Math.max(1, b.maxHp * ff);
}, i, f);
const playerAt = () => page.evaluate(() => {
  const p = window.__echoes.content.world().player;
  return { x: p.x, z: p.z };
});
async function spawn(kind, x, z) {
  const r = await cmd('spawn', kind, x, z);
  const id = r && typeof r === 'object' ? r.id : r;
  await page.evaluate((i) => {
    const e = window.__echoes.content.world().entities().find((b) => b.id === i);
    if (e) {
      e.maxHp = 4000;
      e.hp = 4000;
    }
  }, id);
  return id;
}
// Wait a few sim ticks (the page runs slowly under software GL).
async function ticks(n) {
  const t0 = await page.evaluate(() => window.__echoes.tick);
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 60000, polling: 50 }, t0 + n);
}

// ------------------------------------------------- 1. the free relic page --
await cmd('startCampaign', { level: 1 });
await waitPhase(['combat']);
for (const id of OLD) await cmd('relicGrant', id);
await cmd('clearRoom');
let v = await waitPhase(['reward', 'relic', 'path']);
if (v.phase === 'reward') {
  await cmd('draftTake');
  await settle();
  const socketOpen = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (socketOpen) await page.keyboard.press('Escape');
  v = await waitPhase(['relic', 'path']);
}
check(v.phase === 'relic', 'room 1 opens the free relic page');
const choices = v.relics && v.relics.offer ? v.relics.offer.choices.map((c) => c.id) : [];
check(choices.length === 3 && choices.every((c) => NEW.includes(c)), `the page offers batch-3 relics (${choices.join(', ')})`);
const cls = choices.find((c) => ['wardens_oath', 'fox_ribbon', 'fletchers_knot', 'mercy_bell'].includes(c));
if (cls) await cmd('relicFocus', choices.indexOf(cls));
await settle();
const tag = await page.evaluate(() => [...document.querySelectorAll('.rn-cardkind')].map((e) => e.textContent).join(' | '));
console.log('     card kinds:', tag);
await page.screenshot({ path: 'captures/relics3-1-pick.png' });
await cmd('relicChoose', choices.indexOf(cls ?? choices[0]));
v = await waitPhase(['path']);

// Into a plain kill_all room for the effects (never the waystone room).
let fxRoom = 0;
for (const n of [3, 4, 5, 6]) {
  if (await cmd('objectiveRoom', 'kill_all', n)) {
    fxRoom = n;
    break;
  }
}
check(fxRoom > 0, `a kill_all room for the effects (room ${fxRoom})`);
await cmd('skipToRoom', fxRoom);
v = await waitPhase(['combat']);
await sleep(1500);
await cmd('killAllEnemies');
await sleep(600);

// --------------------------------------------------- 2. Kindling Coal --
await cmd('relicGrant', 'ember_tooth');
await cmd('relicGrant', 'kindling_coal');
await cmd('killAllEnemies');
let p = await playerAt();
const pack = [];
for (const [dx, dz] of [[-0.7, -2.0], [0, -2.5], [0.7, -2.0], [0, -1.6]]) pack.push(await spawn('boar', p.x + dx, p.z + dz));
await ticks(2);
await cmd('relicHit', pack[1], await seatId(1), 12, true);
await ticks(3);
await page.screenshot({ path: 'captures/relics3-2-kindling.png' });
await sleep(400);
await cmd('killAllEnemies');
await sleep(1200);

// --------------------------------------------------- 3. Warden's Oath --
await cmd('relicGrant', 'wardens_oath');
await cmd('killAllEnemies');
p = await playerAt();
const foes = [];
for (const [dx, dz] of [[-1.2, -2.2], [0, -2.6], [1.2, -2.2]]) foes.push(await spawn('boar', p.x + dx, p.z + dz));
await setSeatHp(1, 0.4);
await ticks(2);
for (const id of foes) await cmd('relicStatus', id, 'taunt', 1, 120, 1);
await ticks(8);
await page.screenshot({ path: 'captures/relics3-3-oath.png' });
await sleep(400);
await cmd('killAllEnemies');
await sleep(1200);

// ----------------------------------------------------- 4. Sun Chalice --
await cmd('relicGrant', 'sun_chalice');
await cmd('killAllEnemies');
p = await playerAt();
await spawn('boar', p.x + 1.0, p.z - 1.6);
await setSeatHp(0, 0.4);
await ticks(2);
await cmd('relicHeal', await seatId(0), await seatId(0), 30);
await ticks(8);
await page.screenshot({ path: 'captures/relics3-4-chalice.png' });
await sleep(400);
await cmd('killAllEnemies');
await sleep(800);

// ------------------------------------------------- 5. the relic shelf --
await cmd('skipToRoom', 7);
v = await waitPhase(['shop']);
await sleep(2500);
v = await runView();
const shelf = v.relics && v.relics.shelf ? v.relics.shelf.map((s) => s.id) : [];
check(shelf.length > 0 && shelf.every((s) => NEW.includes(s)), `the shelf stocks batch-3 relics (${shelf.join(', ')})`);
const rack = await page.evaluate(() => !!document.querySelector('.rn-shop .rl-rack'));
check(rack, 'the relic rack is on screen');
await page.screenshot({ path: 'captures/relics3-5-shelf.png' });

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' / ')}` : ''}`);
await browser.close();
console.log(fails.length ? `FAIL relics batch 3 browser (${fails.length})` : 'PASS relics batch 3 browser');
process.exit(fails.length ? 1 : 0);
