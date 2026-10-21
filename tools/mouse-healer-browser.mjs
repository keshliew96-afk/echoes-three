#!/usr/bin/env node
// MOUSE HEALER in the real game (docs/MOUSE_HEALER.md): against a harness build
// (`npm run dev`, port 5199), plays the healer through a run's fight and reads
// the clip the model plays at each beat, then shoots it. Captures (to --dir,
// default captures/):
//   mouse-1-gallery.png   the party gallery at the game camera, mouse first
//   mouse-2-fight.png     room 1 of Level I in a busy fight, casting bolts
//   mouse-3-downed.png    the healer down, lying, greyed, ring grown
//   mouse-4-rise.png      the healer getting up after a revive
//   mouse-5-camp.png      the camp, the mouse at the fire
//   mouse-6-classic.png   the same fight with ?healer=classic (the fallback)
//
//   node tools/mouse-healer-browser.mjs [--url http://localhost:5199/] [--dir captures]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://localhost:5199/');
const DIR = opt('dir', 'captures');
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, label, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--window-size=1600,900', ...extra] });
const errors = [];
async function open(query) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${URL0}${query}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.cmd, { timeout: 240000 });
  return page;
}
async function waitFor(fn, timeout = 60000, poll = 250) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeout) {
    v = await fn();
    if (v) return v;
    await sleep(poll);
  }
  return v;
}
// Clips every clip-driven hero is playing right now (the arena rig, the camp
// rig and the HUD portrait all count).
const clips = (page) => page.evaluate(() => (window.__echoesClipHeroes || []).map((h) => h.clipState()));
const playing = async (page, clip) => (await clips(page)).some((s) => s.clip === clip);

// 1. The gallery.
{
  const page = await open('?scene=chartest&cam=game');
  await waitFor(async () => (await clips(page)).length > 0, 60000);
  check((await clips(page)).length > 0, 'the gallery builds the mouse healer');
  await sleep(2500);
  await page.screenshot({ path: join(DIR, 'mouse-1-gallery.png') });
  await page.close();
}

// 2-4. A fight, a fall and a rise.
async function fight(query, shot) {
  const page = await open(query);
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  await cmd('startRun', { act: 1 });
  await waitFor(async () => (await cmd('runState')).phase === 'combat', 240000);
  await sleep(1500);
  const me = await page.evaluate(() => {
    const p = window.__echoes.content.world().player;
    return { id: p.id, x: p.x, z: p.z };
  });
  for (let i = 0; i < 4; i++) await cmd('spawn', 'boar', me.x + 1.6 + (i % 2) * 0.7, me.z + (i < 2 ? -0.8 : 0.9), { hpMul: 60 });
  await page.mouse.move(1000, 430);
  await page.mouse.down({ button: 'right' });
  const cast = await waitFor(() => playing(page, 'Cast_Bolt'), 20000);
  await sleep(600);
  await page.screenshot({ path: join(DIR, shot) });
  await page.mouse.up({ button: 'right' });
  return { page, cmd, me, cast };
}
{
  const { page, cmd, me, cast } = await fight('?seed=3', 'mouse-2-fight.png');
  check(!!cast, 'firing plays Cast_Bolt');
  const hurt = await waitFor(() => playing(page, 'Hit'), 30000);
  check(!!hurt, 'a hit plays Hit');
  await cmd('killAllEnemies');
  await cmd('setHp', me.id, 0);
  const down = await waitFor(() => playing(page, 'Death'), 15000);
  check(!!down, 'downed plays Death');
  await sleep(2600);
  const lying = (await clips(page)).find((s) => s.clip === 'Death');
  check(!!lying && lying.time > 2.1, 'Death holds on its last frame', lying);
  await page.screenshot({ path: join(DIR, 'mouse-3-downed.png') });
  await cmd('setHp', me.id, 1);
  const rise = await waitFor(() => playing(page, 'Revive'), 15000);
  check(!!rise, 'a revive plays Revive');
  await sleep(250);
  await page.screenshot({ path: join(DIR, 'mouse-4-rise.png') });
  const up = await waitFor(async () => (await clips(page)).every((s) => s.clip !== 'Revive' && s.clip !== 'Death'), 15000);
  check(!!up, 'after Revive the body is back on its feet', await clips(page));
  await page.close();
}

// 5. The camp.
{
  const page = await open('?seed=3');
  await sleep(4000);
  check((await clips(page)).length > 0, 'the camp builds the mouse healer');
  await page.screenshot({ path: join(DIR, 'mouse-5-camp.png') });
  await page.close();
}

// 6. The fallback.
{
  const { page } = await fight('?seed=3&healer=classic', 'mouse-6-classic.png');
  check((await clips(page)).length === 0, '?healer=classic keeps the procedural healer');
  await page.close();
}

check(errors.length === 0, 'no page errors', errors.slice(0, 3));
await browser.close();
console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
