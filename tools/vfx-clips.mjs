#!/usr/bin/env node
// vfx-clips — real-speed video clips of the combat VFX (design-VFX.md §10),
// recorded on a machine with no GPU.
//
// Software GL renders a frame in about a second, so a normal screen capture
// plays every effect at 1 fps. This tool runs the page on a VIRTUAL clock
// instead: requestAnimationFrame and performance.now are taken over before
// the game loads, and while a clip records, each frame advances the clock by
// exactly 1/30 s, renders, and is screenshotted. The sim, the effects and the
// camera all see 30 fps time, so the frames stitch into a video that plays
// at true speed. (Outside a clip the page runs on the real clock.)
//
//   PUPPETEER_EXECUTABLE_PATH=... node tools/vfx-clips.mjs [--url http://127.0.0.1:5199/] [--only tank,boss-heron,...] [--out captures/clips]
// Needs ffmpeg on PATH (libx264). Writes <out>/<clip>.mp4.
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const URL0 = arg('--url', 'http://127.0.0.1:5199/');
const OUT = resolve(here, arg('--out', 'captures/clips'));
const only = argv.includes('--only') ? new Set(arg('--only').split(',')) : null;
const W = Number(arg('--w', 960));
const H = Number(arg('--h', 540));
const FPS = 30;
const { launchEchoes } = await import('./gnt-arch-browser.mjs');
const root = typeof process.getuid === 'function' && process.getuid() === 0;
const browser = await launchEchoes({ gpu: false, width: W, height: H, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(root ? ['--no-sandbox'] : [])] });
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const errors = [];

// Installed before any page script: a switchable virtual clock.
const VCLOCK = () => {
  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  let on = false;
  let vt = 0;
  let queue = [];
  window.requestAnimationFrame = (cb) => {
    if (on) {
      queue.push(cb);
      return queue.length;
    }
    return realRaf(cb);
  };
  performance.now = () => (on ? vt : realNow());
  window.__vclock = {
    start() {
      vt = realNow();
      on = true;
    },
    stop() {
      on = false;
      const q = queue;
      queue = [];
      for (const cb of q) realRaf(cb);
    },
    step(ms) {
      vt += ms;
      const q = queue;
      queue = [];
      for (const cb of q) cb(vt);
      return q.length;
    },
  };
};

async function open(seed = 4) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e?.message ?? e)));
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(VCLOCK);
  await page.goto(`${URL0}?menu=0&seed=${seed}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 180000, polling: 250 });
  return page;
}

// One clip = a list of segments; each segment runs `setup` on the real clock
// (sim frozen), then records `frames` virtual frames, calling `at[i]` before
// frame i when given.
async function clip(name, page, segments) {
  if (only && !only.has(name)) return;
  const dir = join(OUT, `${name}-frames`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let n = 0;
  const t0 = Date.now();
  for (const seg of segments) {
    if (seg.setup) await page.evaluate(seg.setup);
    await wait(400);
    await page.evaluate(() => {
      __echoes.sim.thaw();
      __vclock.start();
    });
    for (let i = 0; i < seg.frames; i++) {
      if (seg.at && seg.at[i]) await page.evaluate(seg.at[i]);
      await page.evaluate((ms) => __vclock.step(ms), 1000 / FPS);
      await page.screenshot({ path: join(dir, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 });
    }
    await page.evaluate(() => {
      __echoes.sim.freeze();
      __vclock.stop();
    });
  }
  const mp4 = join(OUT, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${name}: ${n} frames -> ${mp4} (${Math.round((Date.now() - t0) / 1000)} s)`);
}

// Setup helpers (run in the page, sim frozen).
const ROOM = (act, n) => new Function(`__echoes.sim.freeze(); __echoes.cmd('skipToRoom', ${n}, { act: ${act} }); __echoes.sim.stepN(160, null); ${n === 8 ? '' : "__echoes.cmd('killAllEnemies'); __echoes.sim.stepN(4, null);"}`);

const SETS = {
  tank: ['heavy_slam', 'ground_crack', 'taunting_roar', 'shoulder_charge', 'brutal_cleave', 'whirling_guard'],
  swordsman: ['flurry', 'blade_storm', 'crescent_finisher', 'fox_step', 'lunge_strike', 'riposte'],
  archer: ['piercing_shot', 'volley', 'rain_of_arrows', 'detonating_charge', 'sundering_nova', 'vault_shot'],
};

async function classClip(cls) {
  if (only && !only.has(cls)) return;
  const page = await open(11);
  await page.evaluate(ROOM(1, 3));
  const segs = [];
  for (let i = 0; i < SETS[cls].length; i += 4) {
    const group = SETS[cls].slice(i, i + 4);
    for (let k = 0; k < group.length; k++) {
      segs.push({
        setup: new Function(`
          const X = __echoes;
          const w = X.content.world();
          let seat = null;
          for (const e of w.entities()) if (e.classId === '${cls}' && e.partyIndex !== undefined) seat = e.partyIndex;
          ${JSON.stringify(group)}.forEach((id, j) => X.cmd('partySwap', seat, id, j));
          X.cmd('killAllEnemies');
          const p = w.player;
          for (const [dx, dz] of [[-1.0, 0], [0, -0.6], [1.0, 0], [0.4, 0.7]]) X.cmd('spawn', 'mantis', p.x + dx, p.z - 2.4 + dz);
          window.__clipSeat = seat;
          window.__clipAim = { x: p.x, z: p.z - 2.4 };
        `),
        frames: 34,
        at: { 3: new Function(`__echoes.cmd('partyCast', window.__clipSeat, ${k}, window.__clipAim)`) },
      });
    }
  }
  await clip(cls, page, segs);
  await page.close();
}

async function healerClip() {
  if (only && !only.has('healer')) return;
  const page = await open(11);
  await page.evaluate(ROOM(1, 3));
  const group = ['spirit_bolt', 'nova_bloom', 'sanctuary', 'pale_lance'];
  const segs = [];
  for (let k = 0; k < group.length; k++) {
    segs.push({
      setup: new Function(`
        const X = __echoes;
        ${JSON.stringify(group)}.forEach((id, j) => X.cmd('partySwap', 0, id, j));
        X.cmd('killAllEnemies');
        const p = X.content.world().player;
        for (const [dx, dz] of [[-1.0, 0], [0, -0.6], [1.0, 0]]) X.cmd('spawn', 'mantis', p.x + dx, p.z - 2.4 + dz);
        for (const m of (X.state().party || []).slice(1)) X.cmd('setHp', m.id, 0.5);
      `),
      frames: 36,
      at: {
        2: new Function(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit${k + 1}', key: '${k + 1}' }))`),
        6: new Function(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit${k + 1}', key: '${k + 1}' }))`),
      },
    });
  }
  // Aim the Healer up the screen at the targets.
  const pt = await page.evaluate(() => {
    const p = __echoes.content.world().player;
    return __echoes.content.project(p.x, p.z - 2.4);
  });
  await page.mouse.move(pt.x, pt.y);
  await clip('healer', page, segs);
  await page.close();
}

async function enemyClip(name, act, kinds, frames = 210) {
  if (only && !only.has(name)) return;
  const page = await open(4);
  await page.evaluate(ROOM(act, 3));
  await clip(name, page, [
    {
      setup: new Function(`
        const X = __echoes;
        X.cmd('killAllEnemies');
        const p = X.content.world().player;
        const kinds = ${JSON.stringify(kinds)};
        kinds.forEach((k, i) => X.cmd('spawn', k, p.x + (i - (kinds.length - 1) / 2) * 1.5, p.z - 3.0 - (i % 2) * 0.8));
      `),
      frames,
    },
  ]);
  await page.close();
}

// Boss clips: step the fight (off camera) until the next signature beat is
// about to land, record it, repeat.
async function bossClip(name, act, beats, kind = null) {
  if (only && !only.has(name)) return;
  const page = await open(5);
  // A named boss: a fresh run of that act that ends with it.
  if (kind) await page.evaluate(new Function(`__echoes.sim.freeze(); if (__echoes.state().run?.active) __echoes.cmd('abandonRun', 'quit'); __echoes.cmd('startRun', { act: ${act}, boss: '${kind}' }); __echoes.sim.stepN(30, null);`));
  await page.evaluate(ROOM(act, 8));
  await page.evaluate(() => __echoes.cmd('autopilot', true));
  const segs = [];
  for (const b of beats) {
    segs.push({
      setup: new Function(`
        const X = __echoes;
        ${b.pre || ''}
        // Run until this beat's telegraph is up (or the mode is reached), then
        // back off so the clip opens on the warning.
        for (let i = 0; i < 900; i++) {
          X.sim.stepN(2, null);
          const bb = X.state().run.boss;
          if (!bb) break;
          const t = bb.telegraph || (bb.quake ? { attack: 'quake' } : null);
          const R = X.content.vfx().recipes || {};
          if (${b.until}) break;
        }
      `),
      frames: b.frames ?? 75,
    });
  }
  await clip(name, page, segs);
  await page.close();
}

try {
  for (const cls of ['tank', 'swordsman', 'archer']) await classClip(cls);
  await healerClip();
  await enemyClip('enemies-act1', 1, ['boar', 'mantis', 'quillback', 'toad', 'ram', 'mole']);
  await enemyClip('enemies-barrow', 3, ['crow', 'brood', 'crow']);
  await enemyClip('enemies-mill', 2, ['rotcap', 'snail', 'rotcap']);
  await bossClip('boss-stag', 1, [
    { until: "t && t.attack === 'quake'", frames: 80 },
    { until: "t && t.attack === 'quake'", frames: 80 },
    { pre: "X.cmd('killBoss');", until: 'true', frames: 70 },
  ]);
  await bossClip('boss-heron', 2, [
    { until: "t && t.attack === 'spear'", frames: 75 },
    { until: "t && t.attack === 'wingbeat'", frames: 60 },
    { pre: "X.cmd('bossHp', 0.45);", until: "bb.mode === 'submerged'", frames: 45 },
    { until: "bb.mode === 'surfacing'", frames: 75 },
    { pre: "X.cmd('killBoss');", until: 'true', frames: 70 },
  ]);
  await bossClip('boss-wyrm', 3, [
    { until: "t && t.attack === 'breath'", frames: 75 },
    { until: "bb.mode === 'burrowed'", frames: 45 },
    { until: "t && t.attack === 'emerge'", frames: 75 },
    { pre: "X.cmd('bossHp', 0.45);", until: 'true', frames: 40 },
    { pre: "X.cmd('killBoss');", until: 'true', frames: 70 },
  ]);
  // Content slice 2 (design-VFX.md §5c / §6c).
  await enemyClip('enemies-wood2', 1, ['wasp', 'thornling', 'wasp']);
  await enemyClip('enemies-mill2', 2, ['crab', 'lamprey', 'crab']);
  await enemyClip('enemies-barrow2', 3, ['knight', 'ram', 'gravewisp']);
  await bossClip('boss-thornmother', 1, [
    { until: "t && t.attack === 'charge'", frames: 85 },
    { until: "(R.thorn_seed_root ?? 0) > (window.__r0 ?? 0)", pre: 'window.__r0 = (X.content.vfx().recipes || {}).thorn_seed_root ?? 0;', frames: 60 },
    { pre: "X.cmd('killBoss');", until: 'true', frames: 70 },
  ], 'thornmother');
  await bossClip('boss-millwheel', 2, [
    { until: "t && t.attack === 'shards'", frames: 70 },
    { until: "t && t.attack === 'crosscut'", frames: 110 },
    { pre: "X.cmd('killBoss');", until: 'true', frames: 70 },
  ], 'millwheel');
  await bossClip('boss-lichram', 3, [
    { until: "t && t.attack === 'rush'", frames: 100 },
    { until: "(R.lichram_grave_call ?? 0) > (window.__r0 ?? 0)", pre: 'window.__r0 = (X.content.vfx().recipes || {}).lichram_grave_call ?? 0;', frames: 75 },
    { pre: "X.cmd('bossHp', 0.35);", until: 'true', frames: 40 },
    { pre: "X.cmd('killBoss');", until: 'true', frames: 70 },
  ], 'lichram');
} finally {
  await browser.close();
}
for (const e of errors) console.log('PAGE ERROR ' + e);
console.log(JSON.stringify({ clips: readdirSync(OUT).filter((f) => f.endsWith('.mp4')), errors: errors.length }));
process.exit(errors.length ? 1 : 0);
