#!/usr/bin/env node
// RELICS batch 5 in the real game (docs/RELICS.md "Batch 5"): against
// `npm run dev` (port 5199), drives a vowed campaign and captures
// <out>/relics5-*.png: the relic page offering batch-5 relics, the relic
// strip holding all eight, each relic's beat through cmd('relicDemo'), the
// Corked HUD slot and toast, a Tolling Dead knell tolling then striking,
// and a Dulled Edge crit chipping.
// `--lang de` takes only the relic page and the Corked toast, in that
// language. Fails on any page error or an untranslated line.
//
//   node tools/relics5-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--lang de] [--out captures]
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
const LANG = opt('lang', null);
const OUT = opt('out', 'captures');
const SUF = LANG ? `-${LANG}` : '';
const W = 1600;
const H = 900;
mkdirSync(OUT, { recursive: true });
const NEW = ['brewers_satchel', 'votive_ribbon', 'stormglass', 'twin_fuse', 'trophy_cord', 'oathkeepers_brand', 'bottomless_flask', 'tenor_bell'];

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

await page.goto(`${URL0}?seed=${SEED}${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = () => sleep(900);
const shot = (name) => page.screenshot({ path: `${OUT}/relics5-${name}${SUF}.png` });
const setSeatHp = (i, f) => page.evaluate((k, ff) => {
  const b = window.__echoes.content.world().entities().find((e) => e.partyIndex === k);
  if (b) b.hp = Math.max(1, b.maxHp * ff);
}, i, f);
const seatId = (i) => page.evaluate((k) => window.__echoes.content.world().entities().find((e) => e.partyIndex === k)?.id ?? null, i);
const playerAt = () => page.evaluate(() => {
  const p = window.__echoes.content.world().player;
  return { x: p.x, z: p.z };
});
async function spawn(kind, x, z, hp = 4000) {
  const r = await cmd('spawn', kind, x, z);
  const id = r && typeof r === 'object' ? r.id : r;
  await page.evaluate((i, h) => {
    const e = window.__echoes.content.world().entities().find((b) => b.id === i);
    if (e) {
      e.maxHp = h;
      e.hp = h;
    }
  }, id, hp);
  return id;
}
async function ticks(n) {
  const t0 = await page.evaluate(() => window.__echoes.tick);
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 60000, polling: 50 }, t0 + n);
}
const misses = () => page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []) || []);

// ------------------------------------------------- 1. the free relic page --
// A vowed run (Iron Hide III, Crowded I: Vow level 4) so the Brand is offered.
await cmd('startCampaign', { level: 1, boons: { vows: ['iron_hide', 'crowded'], vowRanks: { iron_hide: 3 } } });
await waitPhase(['combat']);
const all = await cmd('relicPool');
check(Array.isArray(all) && NEW.every((id) => all.includes(id)), `all eight batch-5 relics are in the pool (${(all || []).filter((id) => NEW.includes(id)).length})`);
for (const id of all || []) if (!NEW.includes(id)) await cmd('relicGrant', id);
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
check(choices.length === 3 && choices.every((c) => NEW.includes(c)), `the page offers batch-5 relics (${choices.join(', ')})`);
await settle();
await shot('1-pick');
await cmd('relicChoose', 0);
v = await waitPhase(['path']);
for (const id of NEW) await cmd('relicGrant', id);

// Into room 2: fight with all eight held.
await cmd('skipToRoom', 2);
v = await waitPhase(['combat']);
await ticks(20);
await cmd('killAllEnemies');
await sleep(500);

// ------------------------------------------------- 2. Corked --
await cmd('tonicGive', 0, 'fire_bomb');
await cmd('relicCurseHere', 'corked');
await ticks(30);
const corked = await cmd('tonicState');
check(!!corked && corked.corked === true, 'Corked: the tonic view reads corked');
const sealed = await page.evaluate(() => !!document.querySelector('.hud-slot-tonic.is-corked'));
check(sealed, 'Corked: the HUD slot wears the wax seal');
await shot('2-corked');
if (LANG) {
  const m = await misses();
  const ours = m.filter((k) => /Corked|Brewer|Votive|Stormglass|Twin Fuse|Trophy|Oathkeeper|Bottomless|Tenor|Tolling|Dulled/.test(k));
  check(ours.length === 0, `no untranslated batch-5 line (${ours.join(' / ')})`);
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' / ')}` : ''}`);
  await browser.close();
  console.log(fails.length ? `FAIL relics batch 5 browser (${fails.length})` : 'PASS relics batch 5 browser');
  process.exit(fails.length ? 1 : 0);
}
const r = await cmd('tonicUse', 0);
check(r && r.denied === 'corked', 'Corked: the press is refused');

// Next room for the beats: a Hold room with a long clock, so killing its
// enemies between beats never clears it (no reward page over the shots).
check(Array.isArray(await cmd('objectiveRoom', 'hold', 3)), 'room 3 becomes a Hold room');
await cmd('skipToRoom', 3);
v = await waitPhase(['combat']);
await cmd('objectiveDebug', 'clock', 60000);
await ticks(20);
await cmd('killAllEnemies');
await sleep(500);
await shot('3-strip');

// ------------------------------------------------- 3. the relic beats --
// [id, [ticks to each shot], dummies in front]
const BEATS = [
  ['brewers_satchel', [10, 22], false],
  ['bottomless_flask', [8, 94], false],
  ['twin_fuse', [18, 39], true],
  ['votive_ribbon', [12, 30], false],
  ['stormglass', [5, 12], true],
  ['trophy_cord', [16, 40], false],
  ['oathkeepers_brand', [6, 20], false],
  ['tenor_bell', [4, 14], true],
];
let k = 4;
for (const [id, at, dummies] of BEATS) {
  await cmd('killAllEnemies');
  await sleep(500);
  for (const i of [0, 1, 2, 3]) await setSeatHp(i, 0.6);
  if (dummies) {
    const p = await playerAt();
    for (const dx of [-3, -1.5, 0, 1.5, 3]) await spawn('dummy', p.x + dx, p.z - 2.2);
    await ticks(4);
  }
  if (id === 'bottomless_flask') await cmd('tonicGive', 0, null);
  check(!!(await cmd('relicDemo', id)), `${id}: its beat plays`);
  let last = 0;
  for (const [j, t] of at.entries()) {
    await ticks(t - last);
    last = t;
    await shot(`${k}-${id}-${j + 1}`);
  }
  k += 1;
  await sleep(600);
  check((await runView()).phase === 'combat', `${id}: the room stays live through its beat`);
}

// ------------------------------------------------- 4. Tolling Dead --
await cmd('killAllEnemies');
await sleep(600);
await cmd('relicCurseHere', 'tolling_dead');
await ticks(30);
const p = await playerAt();
const pack = [];
for (const [dx, dz] of [[-1.0, -1.0], [0.4, -1.2], [1.4, -0.6]]) pack.push(await spawn('boar', p.x + dx, p.z + dz, 40));
await ticks(2);
for (const id of pack) {
  await cmd('setHp', id, 0.02);
  await cmd('relicHit', id, await seatId(1), 40, false);
}
await ticks(24);
await shot(`${k}-tolling_dead-toll`);
await ticks(28);
await shot(`${k}-tolling_dead-strike`);

// ------------------------------------------------- 5. Dulled Edge --
// Bound as a major curse, then a crit on a dummy in front of the party (the
// room's enemies held off so the beat reads on its own).
await cmd('eventMajor', 'dulled_edge');
await ticks(150);
await cmd('killAllEnemies');
await sleep(400);
const q = await playerAt();
const dummy = await spawn('dummy', q.x + 1.6, q.z + 1.6, 9000);
await ticks(6);
const fired0 = await page.evaluate(() => window.__echoes.content.vfx().recipes.curse_dulled_edge ?? 0);
await cmd('relicHit', dummy, await seatId(1), 20, true);
await ticks(2);
await shot(`${k + 1}-dulled_edge-1`);
await ticks(6);
await shot(`${k + 1}-dulled_edge-2`);
const fired1 = await page.evaluate(() => window.__echoes.content.vfx().recipes.curse_dulled_edge ?? 0);
check(fired1 === fired0 + 1, `Dulled Edge: a crit plays its beat (${fired0} -> ${fired1})`);

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' / ')}` : ''}`);
await browser.close();
console.log(fails.length ? `FAIL relics batch 5 browser (${fails.length})` : 'PASS relics batch 5 browser');
process.exit(fails.length ? 1 : 0);
