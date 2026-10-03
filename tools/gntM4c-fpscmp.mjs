#!/usr/bin/env node
// gntM4c COPY of tools/gntM4a-fpscmp.mjs (never edited) with ONE change: Chrome is
// launched with --disable-features=NetworkServiceSandbox (loopback work-around, see
// tools/gntM4c-certcapture.mjs) and the output is captures/gntM4c-fpscmp-<tag>.json.
// gntM4a — fps comparison on the GPU harness (PLAN §6.7, gate G4a.8 "fps
// within 10% of v0.5.0"). One scripted real-input fight that every build since
// v0.5.0 can play (no build-specific API): `?seed=7&menu=0`, walk to the portal
// (W), E, then 45 s of combat in the Act I rooms with W/A/S/D strafing on a
// fixed cycle, the basic attack held and skills 1-2 tapped, the cursor
// circling the party. Samples the game's own fps meter (median frame time over
// ~1.5 s) every 250 ms after a 6 s warm-up.
//
//   node tools/gntM4a-fpscmp.mjs --url http://127.0.0.1:4304/ [--tag name] [--secs 45]
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const TAG = opt('tag', 'run');
const SECS = Number(opt('secs', '45'));
const W = 1600;
const H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(here, 'captures'), { recursive: true });

const browser = await launchEchoes({ gpu: true, width: W, height: H, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
const { page, errors } = await openEchoes(browser, `${URL0}?seed=7&menu=0`, { width: W, height: H });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
const version = await page.evaluate(() => __echoes.version);
await page.keyboard.down('KeyW');
const t0 = Date.now();
while (Date.now() - t0 < 12000 && !(await page.evaluate(() => __echoes.cmd('campState').inPortal))) await sleep(80);
await page.keyboard.up('KeyW');
await page.keyboard.down('KeyE');
await sleep(120);
await page.keyboard.up('KeyE');
const tRun = Date.now();
while (Date.now() - tRun < 10000 && (await page.evaluate(() => __echoes.state().run.phase)) !== 'combat') await sleep(100);
await page.mouse.move(W * 0.7, H * 0.45);
await page.mouse.down({ button: 'right' });
const CYCLE = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
const samples = [];
const phases = {};
const tFight = Date.now();
let k = 0;
while (Date.now() - tFight < SECS * 1000) {
  const el = Date.now() - tFight;
  const key = CYCLE[Math.floor(el / 1500) % CYCLE.length];
  for (const c of CYCLE) {
    if (c === key) await page.keyboard.down(c);
    else await page.keyboard.up(c);
  }
  const a = (el / 1000) * 1.3;
  await page.mouse.move(W / 2 + Math.cos(a) * 320, H / 2 + Math.sin(a) * 200);
  if (k % 14 === 0) {
    await page.keyboard.press('Digit1');
    await page.keyboard.press('Digit2');
  }
  k += 1;
  if (el > 6000) {
    const s = await page.evaluate(() => ({ fps: __echoes.fps, phase: __echoes.state().run.phase }));
    samples.push(s.fps);
    phases[s.phase] = (phases[s.phase] || 0) + 1;
    // A cleared room: take the reward / walk the door with Enter so the
    // sample stays in combat as much as possible.
    if (s.phase === 'reward' || s.phase === 'path') {
      await sleep(400);
      await page.keyboard.press('Enter');
    }
  }
  await sleep(250);
}
await page.mouse.up({ button: 'right' });
for (const c of CYCLE) await page.keyboard.up(c);
const sorted = [...samples].sort((x, y) => x - y);
const out = {
  tag: TAG,
  url: URL0,
  version,
  n: sorted.length,
  median: sorted[Math.floor(sorted.length / 2)],
  p10: sorted[Math.floor(sorted.length * 0.1)],
  p5: sorted[Math.floor(sorted.length * 0.05)],
  min: sorted[0],
  mean: Math.round((sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length)) * 10) / 10,
  phases,
  pageErrors: errors,
};
writeFileSync(join(here, 'captures', `gntM4c-fpscmp-${TAG}.json`), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
await browser.close();
process.exit(errors.length ? 1 : 0);
