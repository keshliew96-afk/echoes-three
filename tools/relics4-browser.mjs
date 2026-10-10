#!/usr/bin/env node
// RELICS batch 4 in the real game (docs/RELICS.md "Batch 4"): against
// `npm run dev` (port 5199), drives a campaign and captures
// captures/relics4-*.png: the relic page offering batch-4 relics, a Hold
// room with Warding Chalk (drawn, then mending), Banner Pennant on the win,
// an Escort pilgrim with Shepherd's Crook, each relic's beat through
// cmd('relicDemo'), and Kindred Blood on a kill. `--lang de` takes only the
// relic page, in that language. Fails on any page error.
//
//   node tools/relics4-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--lang de]
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
const SUF = LANG ? `-${LANG}` : '';
const W = 1600;
const H = 900;
mkdirSync('captures', { recursive: true });
const NEW = ['shepherds_crook', 'vigil_candle', 'warding_chalk', 'champions_laurel', 'jailers_ring', 'vault_ledger', 'banner_pennant', 'wanderers_token', 'geode_heart', 'saints_ashes'];

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
const all = await page.evaluate(() => window.__echoes.cmd('relicPool'));
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
check(choices.length === 3 && choices.every((c) => NEW.includes(c)), `the page offers batch-4 relics (${choices.join(', ')})`);
await settle();
await page.screenshot({ path: `captures/relics4-1-pick${SUF}.png` });
await cmd('relicChoose', 0);
v = await waitPhase(['path']);
if (LANG) {
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' / ')}` : ''}`);
  await browser.close();
  console.log(fails.length ? `FAIL relics batch 4 browser (${fails.length})` : 'PASS relics batch 4 browser');
  process.exit(fails.length ? 1 : 0);
}

// ------------------------------------------------- 2. a Hold room --
for (const id of ['warding_chalk', 'vigil_candle', 'banner_pennant']) await cmd('relicGrant', id);
check(!!(await cmd('objectiveRoom', 'hold', 3)), 'room 3 becomes a Hold room');
await cmd('skipToRoom', 3);
v = await waitPhase(['combat']);
await page.waitForFunction(() => window.__echoes.cmd('runState').mode === 'hold', { timeout: 60000, polling: 250 });
await ticks(4);
await page.screenshot({ path: 'captures/relics4-2-hold-chalk.png' });
// Stand the party in the ring at half health: the chalk mends them.
const ring = await page.evaluate(() => {
  const r = window.__echoes.content.world().snapshotState?.().room;
  return r && r.sigil ? { x: r.sigil.x, z: r.sigil.z } : null;
});
if (ring) {
  await page.evaluate((c) => {
    window.__echoes.content.world().entities().filter((e) => e.partyIndex !== undefined).forEach((b, i) => {
      b.x = b.px = c.x + Math.cos(i * 1.7) * 0.6 * (i > 0 ? 1 : 0);
      b.z = b.pz = c.z + Math.sin(i * 1.7) * 0.6 * (i > 0 ? 1 : 0);
      b.hp = Math.max(1, b.maxHp * 0.5);
    });
  }, ring);
}
await ticks(62);
await page.screenshot({ path: 'captures/relics4-3-hold-mend.png' });
await cmd('objectiveDebug', 'clock', 20);
await ticks(30);
await cmd('killAllEnemies');
await page.waitForFunction(() => window.__echoes.cmd('runState').phase !== 'combat', { timeout: 120000, polling: 100 });
await sleep(150);
await page.screenshot({ path: 'captures/relics4-4-pennant.png' });
v = await waitPhase(['reward', 'relic', 'path']);
while (v.phase !== 'path') {
  if (v.phase === 'reward') await cmd('draftDecline');
  if (v.phase === 'relic') await cmd('relicChoose', 0);
  await sleep(500);
  v = await runView();
}

// ------------------------------------------------- 3. an Escort room --
await cmd('relicGrant', 'shepherds_crook');
check(!!(await cmd('objectiveRoom', 'escort', 4)), 'room 4 becomes an Escort room');
await cmd('skipToRoom', 4);
v = await waitPhase(['combat']);
await page.waitForFunction(() => window.__echoes.content.world().entities().some((e) => e.kind === 'pilgrim'), { timeout: 120000, polling: 100 });
await ticks(3);
await page.screenshot({ path: 'captures/relics4-5-escort-crook.png' });
await cmd('killAllEnemies');

// ------------------------------------------------- 4. the relic beats --
const BEATS = [['jailers_ring', 6], ['vault_ledger', 8], ['champions_laurel', 8], ['wanderers_token', 6], ['geode_heart', 14], ['shepherds_crook', 6]];
let k = 6;
for (const [id, wait] of BEATS) {
  await cmd('killAllEnemies');
  await sleep(500);
  await setSeatHp(0, 0.6);
  check(!!(await cmd('relicDemo', id)), `${id}: its beat plays`);
  await ticks(wait);
  await page.screenshot({ path: `captures/relics4-${k}-${id}.png` });
  k += 1;
  await sleep(600);
}

// ------------------------------------------------- 5. Kindred Blood --
await cmd('killAllEnemies');
await sleep(600);
await cmd('relicCurseHere', 'kindred_blood');
await ticks(20);
const p = await playerAt();
const pack = [];
for (const [dx, dz] of [[-1.0, -2.0], [0, -2.2], [1.0, -2.0]]) pack.push(await spawn('boar', p.x + dx, p.z + dz));
await ticks(2);
for (const id of pack.slice(1)) await cmd('setHp', id, 0.5);
await cmd('setHp', pack[0], 0.0005);
await cmd('relicHit', pack[0], await seatId(1), 40, false);
await ticks(6);
await page.screenshot({ path: `captures/relics4-${k}-kindred_blood.png` });

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' / ')}` : ''}`);
await browser.close();
console.log(fails.length ? `FAIL relics batch 4 browser (${fails.length})` : 'PASS relics batch 4 browser');
process.exit(fails.length ? 1 : 0);
