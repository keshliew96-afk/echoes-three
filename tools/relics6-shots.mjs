#!/usr/bin/env node
// RELICS batch 6 in the real game, against `npm run dev` (port 5199): each
// new relic's beat and the three curses, in a Level I campaign room, shot a
// moment after it fires (docs/RELICS.md "Batch 6").
// Captures into --shots (default captures/).
//
//   node tools/relics6-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--only id]
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
const ONLY = opt('only', null);
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
const front = () => page.evaluate(() => {
  const p = window.__echoes.content.world().player;
  return { x: p ? p.x : 0, z: p ? p.z - 2.2 : -2.2 };
});
const seatId = (i) => page.evaluate((k) => {
  const b = window.__echoes.content.world().entities().find((e) => e.partyIndex === k);
  return b ? b.id : null;
}, i);
const idOf = (r) => (r && typeof r === 'object' ? r.id : r);
let ok = 0;

await page.goto(`${URL0}?seed=4&tips=0&story=0&audio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

async function freshRoom() {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startCampaign', { level: 1, seed: 4 });
  for (let i = 0; i < 600 && (await run()).phase !== 'combat'; i++) await sleep(150);
  await sleep(800);
  await cmd('killAllEnemies');
  await sleep(300);
}
async function shot(name, delay) {
  await sleep(delay);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  ok += 1;
  console.log(`shot ${name}`);
}

const BEATS = [
  ['delvers_lantern', 500],
  ['kiln_coal', 900],
  ['pumice_soles', 250],
  ['wing_bone', 350],
  ['crown_shard', 550],
  ['dusk_lens', 300],
  ['nightfall_veil', 200],
  ['rekindled_heart', 300],
];
for (const [id, delay] of BEATS) {
  if (ONLY && ONLY !== id) continue;
  await freshRoom();
  const f = await front();
  if (id === 'delvers_lantern') await cmd('secretWall');
  else if (id === 'crown_shard') await cmd('spawn', 'boar', f.x, f.z - 2.4, { elite: true, affixes: ['gusting', 'cinder'] });
  else if (id === 'kiln_coal' || id === 'rekindled_heart' || id === 'wing_bone') {
    for (const dx of [-2.4, -1.2, 0, 1.2, 2.4]) await cmd('spawn', 'dummy', f.x + dx, f.z - (id === 'kiln_coal' ? 2.4 : 1.0));
  } else if (id !== 'pumice_soles') await cmd('spawn', 'boar', f.x, f.z - 2.0);
  await sleep(200);
  await cmd('relicDemo', id);
  await shot(id, delay);
}

if (!ONLY || ONLY === 'sealed_door') {
  await freshRoom();
  await cmd('relicCurseHere', 'sealed_door');
  await shot('sealed_door-seal', 450);
  await cmd('secretWall');
  await sleep(700);
  await cmd('relicSealKnock');
  await shot('sealed_door-refuse', 250);
}
if (!ONLY || ONLY === 'dimmed_lantern') {
  await freshRoom();
  await cmd('relicCurseHere', 'dimmed_lantern');
  const f = await front();
  for (const [dx, dz] of [[-5, -3], [5, -4], [0, -7]]) await cmd('spawn', 'boar', f.x + dx, f.z + dz);
  const near = idOf(await cmd('spawn', 'boar', f.x + 1, f.z));
  await sleep(1500);
  if (near) await cmd('relicHit', near, await seatId(1), 10, false);
  await shot('dimmed_lantern', 150);
}
if (!ONLY || ONLY === 'heavy_crowns') {
  await freshRoom();
  await cmd('relicCurseHere', 'heavy_crowns');
  await shot('heavy_crowns', 450);
}

console.log(`${ok} shots${errors.length ? `, page errors: ${errors.slice(0, 5).join(' | ')}` : ', no page errors'}`);
await browser.close();
process.exit(errors.length ? 1 : 0);
