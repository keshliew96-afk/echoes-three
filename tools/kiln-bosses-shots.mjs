#!/usr/bin/env node
// THE KILN'S BOSSES in the real game (docs/KILN_BOSSES.md): against `npm run
// dev` (port 5199), the Bellfounder's pour, bell, Casting and Firing and its
// quenched window, the Cinderback's dive, surfacing, lash and spit, and the
// Level IV clear card's fork. Captures into --shots (default captures/).
//
//   node tools/kiln-bosses-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--lang de] [--only fork]
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
const LANG = opt('lang', null);
const SHOTS = opt('shots', 'captures');
const ONLY = opt('only', null); // 'founder' | 'cinderback' | 'fork'
const sfx = LANG ? `-${LANG}` : '';
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
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}${sfx}.png` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`${URL0}?seed=5&tips=0&story=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const run = () => cmd('runState');
async function untilPhase(p, n = null, tries = 600) {
  for (let i = 0; i < tries; i++) {
    const v = await run();
    if (v.phase === p && (n === null || v.room === n)) return v;
    await sleep(150);
  }
  return run();
}
// The boss as the page sees it (mode, telegraph).
const boss = (kind) => page.evaluate((k) => {
  const e = window.__echoes.content.world().entities().find((x) => x.kind === k);
  return e ? { id: e.id, x: e.x, z: e.z, hp: e.hp, mode: e.mode ?? null, attack: e.telegraph ? e.telegraph.attack : null, tx: e.telegraph ? e.telegraph.x : null, tz: e.telegraph ? e.telegraph.z : null } : null;
}, kind);
// Keep the adds out of frame and the party upright.
const calm = () => page.evaluate(() => {
  const w = window.__echoes.content.world();
  for (const e of w.entities()) if (e.faction === 'enemy' && !/founder|cinderback/.test(e.kind)) { e.x = 11; e.z = 7; e.px = 11; e.pz = 7; }
});
async function until(fn, ms = 30000, every = 40) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await fn();
    if (v) return v;
    await sleep(every);
  }
  return null;
}
async function enterBoss(kind) {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startRun', { act: 6, boss: kind });
  await untilPhase('combat');
  await cmd('skipToRoom', 8, { act: 6 });
  await untilPhase('combat', 8);
  await sleep(1500);
  return boss(kind);
}
// Stand the player `dist` u in front of the boss and wait for `attack`.
async function tellAndHit(kind, attack, dist, name, { impactMs = 120, after = null } = {}) {
  const b = await boss(kind);
  if (!b) return check(false, `${kind} is in the room`);
  await cmd('teleport', b.x, Math.min(6, b.z + dist));
  await calm();
  const tell = await until(async () => {
    const q = await boss(kind);
    return q && q.attack === attack ? q : null;
  }, 40000);
  if (!check(!!tell, `${kind} winds up its ${attack}`)) return false;
  await sleep(250);
  await shot(`${name}-tell`);
  const hit = await until(async () => {
    const q = await boss(kind);
    return q && q.attack !== attack ? q : null;
  }, 20000, 20);
  await sleep(impactMs);
  await shot(name);
  if (after) {
    await sleep(after);
    await shot(`${name}-after`);
  }
  return check(!!hit, `${kind} lands its ${attack}`);
}

if (!ONLY || ONLY === 'founder') {
  const b = await enterBoss('founder');
  check(!!b, 'the Firing Floor holds the Bellfounder');
  await shot('founder');
  await tellAndHit('founder', 'pour', 4.5, 'founder-pour', { impactMs: 200, after: 1200 });
  await tellAndHit('founder', 'bell', 3.2, 'founder-bell', { impactMs: 60 });
  await cmd('bossHp', 0.74);
  await tellAndHit('founder', 'firing', 5, 'founder-firing', { impactMs: 60 });
  const q = await until(async () => {
    const x = await boss('founder');
    return x && x.mode === 'quenched' ? x : null;
  }, 5000);
  await sleep(400);
  if (check(!!q, 'the Bellfounder stands quenched after the Firing')) await shot('founder-quenched');
}
if (!ONLY || ONLY === 'cinderback') {
  const b = await enterBoss('cinderback');
  check(!!b, 'the Firing Floor holds the Cinderback');
  await shot('cinderback');
  await tellAndHit('cinderback', 'dive', 4, 'cinderback-dive', { impactMs: 80, after: 600 });
  await tellAndHit('cinderback', 'lash', 2.0, 'cinderback-lash', { impactMs: 60 });
  await cmd('bossHp', 0.45);
  const spit = await until(async () => {
    const x = await boss('cinderback');
    return x && x.mode === 'rear' ? x : null;
  }, 40000, 30);
  if (check(!!spit, 'the Cinderback rears to spit')) {
    await shot('cinderback-spit');
    await sleep(900);
    await shot('cinderback-spit-land');
  }
}
if (!ONLY || ONLY === 'fork') {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startCampaign', { level: 4 });
  await untilPhase('combat');
  await cmd('skipToRoom', 8);
  await untilPhase('combat', 8);
  await sleep(1200);
  await cmd('killBoss');
  const card = await until(async () => {
    await cmd('killAllEnemies');
    const v = await run();
    return v.phase === 'transit' ? v : null;
  }, 90000, 300);
  check(!!card, 'the Level IV clear reaches the transit card');
  await sleep(2500);
  const fork = await page.evaluate(() => {
    const el = document.querySelector('.rn-fork');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  check(!!fork && fork.length > 10, `the card offers the fork (${fork ? fork.slice(0, 120) : 'none'})`);
  await shot('fork-card');
  await page.keyboard.press('ArrowRight');
  await sleep(600);
  await shot('fork-kiln-focus');
  await page.keyboard.press('Enter');
  await sleep(800);
  await shot('fork-kiln-picked');
  const picked = await until(async () => {
    const v = await run();
    return v.phase === 'combat' && v.act === 6 ? v : null;
  }, 120000, 400);
  if (check(!!picked, 'Enter takes the party into the Ember Kiln')) {
    await sleep(1500);
    await shot('fork-kiln-arrival');
  }
}

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
console.log(fails.length ? `${fails.length} FAILED` : 'ALL OK');
await browser.close();
process.exitCode = fails.length ? 1 : 0;
