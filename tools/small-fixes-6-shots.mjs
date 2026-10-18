#!/usr/bin/env node
// Small fixes 6 in the real game: the Spire's rime slick floors and belfry
// barricades, against `npm run dev` (port 5199). Walks Level V campaign
// rooms and stands the hero beside the first two slick floors and the first
// two barricades it meets. Captures into --shots (default captures/), named
// spire-<what>-<layout>.
//
//   node tools/small-fixes-6-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--tag before]
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
const ents = () => page.evaluate(() => window.__echoes.content.world().entities().map((e) => ({ kind: e.kind, htype: e.htype, skin: e.skin, x: e.x, z: e.z, faction: e.faction })));
// Keep the room's hostiles far off so the floor and the walls read.
const calm = () => page.evaluate(() => {
  for (const e of window.__echoes.content.world().entities()) if (e.faction === 'hostile') { e.x = e.px = 0; e.z = e.pz = 30; }
});

const run = () => cmd('runState');
async function untilPhase(p, n = null, tries = 600) {
  for (let i = 0; i < tries; i++) {
    const v = await run();
    if (v.phase === p && (n === null || v.room === n)) return v;
    await sleep(150);
  }
  return run();
}
// Walk a Level V campaign room by room; in the first room that holds the
// feature, stand the hero beside it and shoot.
const WANT = [
  ['rime', (es) => es.find((e) => e.htype === 'slip'), [1.7, 1.1]],
  ['belfry', (es) => es.find((e) => e.kind === 'barricade'), [0.7, 2.2]],
];
await page.goto(`${URL0}?seed=4&tips=0&story=0&audio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
const got = new Map();
for (let seed = 4; seed <= 8 && got.size < 4; seed++) {
  const v0 = await run();
  if (v0.active) {
    await cmd('abandonRun', 'quit');
    await sleep(500);
  }
  await cmd('startCampaign', { level: 5, seed });
  await untilPhase('combat');
  for (let n = 1; n <= 7 && got.size < 4; n++) {
    if (n > 1) {
      await cmd('skipToRoom', n);
      await untilPhase('combat', n);
    }
    await sleep(1500);
    const es = await ents();
    for (const [what, pick, [dx, dz]] of WANT) {
      const f = pick(es);
      const lay = (await run()).layout;
      const layout = lay && lay.id != null ? lay.id : `s${seed}r${n}`;
      const key = `${what}-${layout}`;
      if (!f || got.has(key) || [...got.keys()].filter((k) => k.startsWith(what)).length >= 2) continue;
      await calm();
      await cmd('teleport', f.x + dx, f.z + dz);
      await sleep(2500);
      await calm();
      await page.screenshot({ path: `${SHOTS}/spire-${what}-${layout}${sfx}.png` });
      got.set(key, f.skin);
      console.log(`ok   ${key}: ${f.skin} at ${f.x.toFixed(1)}, ${f.z.toFixed(1)}`);
    }
  }
}
console.log(`${got.size >= 4 ? 'ok  ' : 'FAIL'} ${got.size} shots`);
console.log(errors.length ? `FAIL page errors: ${errors.slice(0, 3).join(' | ')}` : 'ok   no page errors');
await browser.close();
