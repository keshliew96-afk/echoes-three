#!/usr/bin/env node
// Small fixes 8 in the real game, against `npm run dev` (port 5199):
//   moss    a Wood campaign room: the Moss Hart lays its moss, and the AI
//           seats are caught ~3 s later (before this round they stood in it,
//           now they fight from its edge)
//   soles   a Barrow room with a grave-frost slip floor and Pumice Soles: the
//           hero walks across and stops dead on the ice, the soles' grit puff
//           at the feet
// Captures into --shots (default captures/), suffixed with --tag.
//
//   node tools/small-fixes-8-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--tag before] [--only moss|soles]
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
const SHOTS = opt('shots', 'captures');
const TAG = opt('tag', null);
const ONLY = opt('only', null);
const sfx = TAG ? `-${TAG}` : '';
mkdirSync(SHOTS, { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1600,900', ...extra],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const run = () => cmd('runState');
const tick = () => page.evaluate(() => window.__echoes.tick);
async function untilPhase(p, tries = 600) {
  for (let i = 0; i < tries; i++) {
    const v = await run();
    if (v.phase === p) return v;
    await sleep(150);
  }
  return run();
}
async function untilTick(t, tries = 3000) {
  for (let i = 0; i < tries && (await tick()) < t; i++) await sleep(100);
}
// Every hostile but `keep` far off; the party unhurt.
const calm = (keep = -1) => page.evaluate((k) => {
  for (const e of window.__echoes.content.world().entities()) {
    if (e.faction === 'hostile' && e.id !== k && e.kind !== 'slick') { e.x = e.px = 0; e.z = e.pz = 30; }
    if (e.partyIndex !== undefined) e.hp = e.maxHp;
  }
}, keep);
let ok = 0;

await page.goto(`${URL0}?seed=4&tips=0&story=0&audio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

async function room(level, seed) {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startCampaign', { level, seed });
  await untilPhase('combat');
  await sleep(800);
  await cmd('killAllEnemies');
  await calm();
}

if (!ONLY || ONLY === 'moss') {
  await room(1, 4);
  await cmd('teleport', 0, 2.2);
  await sleep(300);
  const hart = await page.evaluate(() => {
    const r = window.__echoes.cmd('spawn', 'moss_hart', 0, -1.6);
    const id = r && typeof r === 'object' ? r.id : r;
    const e = window.__echoes.content.world().entities().find((x) => x.id === id);
    if (e) e.hp = e.maxHp = 60000;
    return id;
  });
  // Until the hart's moss is down, then ~3 s for the seats to settle.
  let laid = null;
  for (let i = 0; i < 900 && !laid; i++) {
    await calm(hart);
    laid = await page.evaluate((h) => {
      const s = window.__echoes.content.world().entities().find((x) => x.kind === 'slick' && x.variant === 'moss' && x.ownerId === h);
      return s ? { t: window.__echoes.tick, x: s.x, z: s.z } : null;
    }, hart);
    if (!laid) await sleep(120);
  }
  if (laid) {
    for (let i = 0; i < 12; i++) {
      await calm(hart);
      await sleep(250);
    }
    await untilTick(laid.t + 170);
    const seats = await page.evaluate((m) => window.__echoes.content.world().entities().filter((x) => x.kind === 'ally').map((a) => Math.round(Math.hypot(a.x - m.x, a.z - m.z) * 100) / 100), laid);
    await page.screenshot({ path: `${SHOTS}/sf8-moss${sfx}.png` });
    console.log(`moss: seats ${JSON.stringify(seats)} u from the moss centre (r 1.8)`);
    ok += 1;
  } else console.log('moss: no moss laid');
}

if (!ONLY || ONLY === 'soles') {
  await room(3, 4);
  await cmd('clearLayout');
  await cmd('relicGrant', 'pumice_soles');
  await cmd('spawnHazard', 'slip', 2.4, 0, { r: 2.2, skin: 'frost' });
  for (const [i, x, z] of [[1, -6, -3.5], [2, -6.5, 3.5], [3, -7, 0]]) await cmd('placeAlly', i, x, z);
  await cmd('teleport', 0.6, 0);
  await sleep(400);
  await page.keyboard.down('KeyD');
  const t0 = await tick();
  await untilTick(t0 + 45);
  await page.keyboard.up('KeyD');
  await untilTick(t0 + 52);
  await calm();
  await page.screenshot({ path: `${SHOTS}/sf8-soles${sfx}.png` });
  const p = await page.evaluate(() => {
    const e = window.__echoes.content.world().entities().find((x) => x.partyIndex === 0);
    return e ? { x: Math.round(e.x * 100) / 100, slipVx: e.slipVx ?? null } : null;
  });
  console.log(`soles: hero at ${JSON.stringify(p)}`);
  ok += 1;
}

console.log(`${ok} shots${errors.length ? `; page errors: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
