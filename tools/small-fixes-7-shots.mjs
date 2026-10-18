#!/usr/bin/env node
// Small fixes 7 in the real game, against `npm run dev` (port 5199):
//   tempered   a Kiln campaign room: a common relic melted at the Forge
//              Shrine, then the hero ~6 s into Tempered (the lasting look)
//   wraith     an Ash Wraith fades behind the hero; the sim is frozen on its
//              ring and stepped to the rise, so the shot lands mid-rise
// Captures into --shots (default captures/), suffixed with --tag.
//
//   node tools/small-fixes-7-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--tag before] [--only tempered|wraith]
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
// Keep the room's hostiles (all but `keep`) far off so the hero reads.
const calm = (keep = -1) => page.evaluate((k) => {
  for (const e of window.__echoes.content.world().entities()) if (e.faction === 'hostile' && e.id !== k) { e.x = e.px = 0; e.z = e.pz = 30; }
}, keep);
async function untilPhase(p, tries = 600) {
  for (let i = 0; i < tries; i++) {
    const v = await run();
    if (v.phase === p) return v;
    await sleep(150);
  }
  return run();
}
const tick = () => page.evaluate(() => window.__echoes.tick);
async function untilTick(t, tries = 2000) {
  for (let i = 0; i < tries && (await tick()) < t; i++) await sleep(100);
}
let ok = 0;

await page.goto(`${URL0}?seed=4&tips=0&story=0&audio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

async function kilnRoom(seed) {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startCampaign', { level: 6, seed });
  await untilPhase('combat');
  await sleep(800);
  await calm();
}

if (!ONLY || ONLY === 'tempered') {
  await kilnRoom(4);
  await cmd('relicGrant', 'slag_greaves');
  await cmd('shrineHere', 'kiln', 2.6, -0.6);
  await cmd('teleport', 2.6, 0.7);
  await sleep(600);
  await calm();
  const used = await cmd('shrineUse');
  const t0 = await tick();
  // ~6 s in: the shrine's answer has gone, the blessing's own look is left.
  for (let i = 0; i < 80 && (await tick()) < t0 + 360; i++) {
    await calm();
    await sleep(150);
  }
  await cmd('teleport', 0.4, 1.4);
  for (let i = 0; i < 12; i++) {
    await calm();
    await sleep(150);
  }
  const bl = await page.evaluate(() => { const p = window.__echoes.content.world().entities().find((e) => e.partyIndex === 0); return p && p.blessing ? { ...p.blessing, tick: window.__echoes.tick } : null; });
  await page.screenshot({ path: `${SHOTS}/tempered${sfx}.png` });
  const good = !!(bl && bl.id === 'tempered');
  if (good) ok += 1;
  console.log(`${good ? 'ok  ' : 'FAIL'} tempered${sfx}.png: ${JSON.stringify(used && used.blessing ? { blessing: used.blessing } : used)} ${JSON.stringify(bl)}`);
}

if (!ONLY || ONLY === 'wraith') {
  await kilnRoom(5);
  await page.evaluate(() => { for (const e of window.__echoes.content.world().entities()) if (e.partyIndex === 0) e.hp = e.maxHp = 9999; });
  await cmd('teleport', 0, 0.6);
  const id = await cmd('spawn', 'ashwraith', -3.6, 0.6);
  // Wait for its fade (the ring opens behind the hero), freeze on it.
  let tel = null;
  for (let i = 0; i < 900 && !tel; i++) {
    await calm(id);
    tel = await page.evaluate((wid) => {
      const w = window.__echoes.content.world().entities().find((e) => e.id === wid);
      if (!w || !w.telegraph) return null;
      window.__echoes.sim.freeze();
      return { left: w.telegraph.resolveTick - window.__echoes.tick, x: w.telegraph.x, z: w.telegraph.z };
    }, id);
    if (!tel) await sleep(60);
  }
  if (tel) {
    // The ring, a beat before the rise.
    await page.evaluate((n) => window.__echoes.sim.stepN(n), Math.max(0, tel.left - 12));
    await sleep(700);
    await page.screenshot({ path: `${SHOTS}/wraith-ring${sfx}.png` });
    // Step onto the rise and shoot at once (the column, the claws).
    await page.evaluate(() => window.__echoes.sim.stepN(12));
    await page.screenshot({ path: `${SHOTS}/wraith-rise${sfx}.png` });
    await sleep(120);
    await page.screenshot({ path: `${SHOTS}/wraith-rise-b${sfx}.png` });
    const st = await page.evaluate((wid) => { const w = window.__echoes.content.world().entities().find((e) => e.id === wid); return w ? { mode: w.mode, rakeTick: w.rakeTick, tick: window.__echoes.tick } : null; }, id);
    await page.evaluate(() => window.__echoes.sim.thaw());
    const good = !!(st && st.mode === 'spent' && st.rakeTick >= 0);
    if (good) ok += 1;
    console.log(`${good ? 'ok  ' : 'FAIL'} wraith-rise${sfx}.png: ${JSON.stringify(st)} ring at ${tel.x.toFixed(1)}, ${tel.z.toFixed(1)}`);
  } else console.log('FAIL the wraith never faded');
}

console.log(`${ok} shots ok`);
console.log(errors.length ? `FAIL page errors: ${errors.slice(0, 3).join(' | ')}` : 'ok   no page errors');
await browser.close();
