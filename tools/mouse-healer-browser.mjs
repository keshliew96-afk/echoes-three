#!/usr/bin/env node
// MOUSE HEALER in the real game (docs/MOUSE_HEALER.md): against a harness build
// (`npm run dev`, port 5199), with ?healer=mouse (the default is the original
// procedural healer since v0.5.331), plays the healer through a run's fight and reads
// the clip the model plays at each beat, then shoots it. Captures (to --dir,
// default captures/):
//   mouse-1-gallery.png   the party gallery at the game camera, mouse first
//   mouse-2-fight.png     room 1 of Level I in a busy fight, casting bolts
//   mouse-2-hit1/2/3.png  the basic-attack combo: sweep, rising sweep, slam
//   mouse-2-skill.png     a skill cast with its own clip
//   mouse-3-downed.png    the healer down, lying, greyed, ring grown
//   mouse-4-rise.png      the healer getting up after a revive
//   mouse-5-camp.png      the camp, the mouse at the fire
//   mouse-6-classic.png   the same fight with no flag: the original healer (the default)
// and checks the run follows where she goes against where she faces.
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
  // Turning on the spot (Kesh's rule 2, live): planted feet hold the floor
  // while the game turns her, and step (lifted) once the twist is too big.
  const turn = await page.evaluate(() => {
    const h = window.__echoesClipHeroes[0];
    const rows = [];
    let yaw = 0;
    for (let i = 0; i < 30; i++) h.update(1 / 60);
    for (let i = 0; i < 240; i++) {
      yaw += i < 120 ? 0.02 : -0.035;
      h.setYaw(yaw);
      h.update(1 / 60);
      const st = h.clipState();
      rows.push([st.feet.L, st.feet.R, st.ik]);
    }
    return rows;
  });
  let slide = 0;
  let steps = 0;
  for (let i = 1; i < turn.length; i++) {
    for (const j of [0, 1]) {
      const a = turn[i - 1][j];
      const c = turn[i][j];
      if (a.locked && c.locked && !a.stepping && !c.stepping) slide = Math.max(slide, Math.hypot(c.x - a.x, c.z - a.z) * 100);
      if (c.stepping && !a.stepping) steps++;
    }
  }
  check(turn[60][2] === 1 && slide < 0.1 && steps >= 4, 'turning on the spot: planted feet hold (worst slide under 0.1 cm a frame) and she steps round', { slideCmPerFrame: +slide.toFixed(3), steps });
  // Fast turns, a flick and the combo while turning: no planted foot slides
  // or snaps (a foot the clip lifts, a step or a hand-back is not planted).
  const hard = await page.evaluate(() => {
    const h = window.__echoesClipHeroes[0];
    const D = Math.PI / 180;
    const one = (frames, drive) => {
      h.setAnim('idle');
      let yaw = 0;
      h.setYaw(0);
      for (let i = 0; i < 60; i++) h.update(1 / 60);
      const rows = [];
      for (let i = 0; i < frames; i++) {
        yaw = drive(i, yaw);
        h.setYaw(yaw);
        h.update(1 / 60);
        rows.push(h.clipState().feet);
      }
      let worst = 0;
      for (const s of ['L', 'R']) {
        const floor = Math.min(...rows.map((r) => r[s].y));
        for (let i = 1; i < rows.length; i++) {
          const a = rows[i - 1][s];
          const c = rows[i][s];
          if (a.locked && c.locked && !a.stepping && !c.stepping && a.y < floor + 0.005 && c.y < floor + 0.005) worst = Math.max(worst, Math.hypot(c.x - a.x, c.z - a.z) * 100);
        }
      }
      return +worst.toFixed(3);
    };
    return {
      turn240: one(180, (i, y) => y + (i < 90 ? 1 : -1) * 240 * D / 60),
      turn480: one(120, (i, y) => y + (i < 60 ? 1 : -1) * 480 * D / 60),
      flick150: one(60, (i, y) => (i === 5 ? y + 150 * D : y)),
      combo: one(240, (i, y) => {
        if (i % 25 === 0) h.setAnim('cast', 0, ((i / 25) % 3) + 1);
        return y + (i < 120 ? 1 : -1) * 120 * D / 60;
      }),
    };
  });
  check(Object.values(hard).every((v) => v < 0.05), 'fast turns, a flick and the combo while turning: no planted foot slides (cm a frame)', hard);
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
  // Hold fire: the shots should walk the combo 1, 2, 3, 1, ... and shoot each hit.
  const seen = [];
  const t0 = Date.now();
  const shots = new Set();
  while (Date.now() - t0 < 6000) {
    const st = (await clips(page)).find((c) => /^Bolt_/.test(c.clip || ''));
    if (st && seen[seen.length - 1] !== st.clip) seen.push(st.clip);
    if (st && shot === 'mouse-2-fight.png' && st.time > 0.06 && st.time < 0.2 && !shots.has(st.clip)) {
      shots.add(st.clip);
      await page.screenshot({ path: join(DIR, `mouse-2-hit${st.clip.slice(-1)}.png`) });
    }
    await sleep(40);
  }
  await page.screenshot({ path: join(DIR, shot) });
  await page.mouse.up({ button: 'right' });
  return { page, cmd, me, seen };
}
{
  const { page, cmd, me, seen } = await fight('?seed=3&healer=mouse', 'mouse-2-fight.png');
  const order = seen.join(' ');
  check(/Bolt_1 Bolt_2 Bolt_3/.test(order), 'held fire walks the combo hit 1, 2, 3', order);
  // A skill: the healer's first slot, cast with its key, plays its shape's clip.
  // (Clear the pack and heal up first, so the boars cannot down her mid-test.)
  await cmd('killAllEnemies');
  await cmd('setHp', me.id, 1);
  await cmd('giveSkill', 'nova_bloom'); // a nova: plays Cast_Area
  await sleep(800);
  const skillClips = ['Cast_Bolt', 'Cast_Quick', 'Cast_Area', 'Attack', 'Bolt_1'];
  await page.mouse.move(1000, 430);
  let skillSeen = null;
  for (const key of ['1', '2', '3', '4']) {
    await page.keyboard.down(key);
    await sleep(250);
    await page.keyboard.up(key);
    skillSeen = await waitFor(async () => (await clips(page)).map((c) => c.clip).find((c) => skillClips.slice(0, 4).includes(c)), 3000, 50);
    if (skillSeen) break;
  }
  check(!!skillSeen, 'a skill key plays its own cast clip', skillSeen);
  if (skillSeen) await page.screenshot({ path: join(DIR, 'mouse-2-skill.png') });
  // Every shape maps to its clip.
  const shapes = await page.evaluate(async () => {
    const h = window.__echoesClipHeroes.find((x) => x.castSkill);
    const out = {};
    for (const s of ['projectile', 'direct', 'nova', 'ground_aoe', 'melee_arc']) {
      h.castSkill(s);
      h.update(1 / 60);
      out[s] = h.clipState().clip;
    }
    return out;
  });
  check(shapes.projectile === 'Cast_Bolt' && shapes.direct === 'Cast_Quick' && shapes.nova === 'Cast_Area' && shapes.ground_aoe === 'Attack' && shapes.melee_arc === 'Bolt_1', 'each skill shape plays its own clip', shapes);
  await waitFor(async () => (await clips(page)).every((c) => c.clip !== 'Cast_Area' && c.clip !== 'Attack'), 5000);
  const here = await page.evaluate(() => {
    const p = window.__echoes.content.world().player;
    return { x: p.x, z: p.z };
  });
  for (let i = 0; i < 3; i++) await cmd('spawn', 'boar', here.x + 1.2, here.z + (i - 1) * 0.7, { hpMul: 60 });
  const hurt = await waitFor(() => playing(page, 'Hit'), 30000);
  check(!!hurt, 'a hit plays Hit');
  // Clear the pack, heal her and let her stand (the boars may have downed her
  // and an ally revived her), then down her on purpose.
  await cmd('killAllEnemies');
  await cmd('setHp', me.id, 1);
  await waitFor(async () => (await clips(page)).every((c) => c.clip !== 'Death' && c.clip !== 'Revive'), 10000);
  await sleep(500);
  await cmd('setHp', me.id, 0);
  const down = await waitFor(() => playing(page, 'Death'), 15000);
  check(!!down, 'downed plays Death');
  // Watch the fall: an AI ally may revive her on its own, which is fine, as
  // long as she lay held first and got up through Revive.
  let held = null;
  let rise = false;
  let shotDown = false;
  let maxDeath = 0;
  const t1 = Date.now();
  while (Date.now() - t1 < 8000 && !rise) {
    const cs = await clips(page);
    const d = cs.find((c) => c.clip === 'Death');
    if (d) maxDeath = Math.max(maxDeath, d.time);
    if (d && d.time > 2.1) {
      held = d;
      if (!shotDown) {
        shotDown = true;
        await page.screenshot({ path: join(DIR, 'mouse-3-downed.png') });
        await cmd('setHp', me.id, 1);
      }
    }
    if (cs.some((c) => c.clip === 'Revive')) rise = true;
    await sleep(40);
  }
  // Held on the floor, or (an ally got to her first) still falling until the revive.
  check(!!held || (rise && maxDeath > 0.5), 'Death plays until it holds lying, or until a revive', { held: !!held, maxDeath: +maxDeath.toFixed(2) });
  check(rise, 'a revive plays Revive');
  await sleep(250);
  await page.screenshot({ path: join(DIR, 'mouse-4-rise.png') });
  const up = await waitFor(async () => (await clips(page)).every((s) => s.clip !== 'Revive' && s.clip !== 'Death'), 15000);
  check(!!up, 'after Revive the body is back on its feet', await clips(page));
  await page.close();
}

// 4b. Run direction follows travel against facing (Kesh's rule 1): she faces
// her aim, so running away from the cursor must backpedal, across it strafe.
{
  const page = await open('?seed=3&healer=mouse');
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  await cmd('startRun', { act: 1 });
  await waitFor(async () => (await cmd('runState')).phase === 'combat', 240000);
  await cmd('killAllEnemies');
  await sleep(800);
  const mainLoco = async () => {
    const st = (await clips(page)).find((c) => c.loco && c.loco.full > 0.5);
    return st ? st.loco : null;
  };
  const runWith = async (aim, key) => {
    await page.mouse.move(aim[0], aim[1]);
    await sleep(400);
    await page.keyboard.down(key);
    await sleep(900);
    const l = await mainLoco();
    await page.keyboard.up(key);
    await sleep(500);
    return l;
  };
  const fwd = await runWith([800, 120], 'w');
  check(!!fwd && fwd.F > 0.7, 'running toward the aim plays Run_F', fwd);
  const back = await runWith([800, 820], 'w');
  check(!!back && back.B > 0.7, 'running away from the aim backpedals (Run_B)', back);
  const side = await runWith([800, 120], 'a');
  check(!!side && side.L + side.R > 0.7, 'running across the aim strafes', side);
  check(!!fwd && Math.abs(fwd.rate - 1) < 0.15, 'the stride rate matches her speed (rate ~1 at 2.4 u/s)', fwd && fwd.rate);
  // Casting on the move: the cast's upper half over the run's legs.
  await page.mouse.move(800, 120);
  await page.keyboard.down('w');
  await page.mouse.down({ button: 'right' });
  const layered = await waitFor(async () => (await clips(page)).find((c) => /_upper$/.test(c.clip || '') && c.loco.legs > 0.5), 8000, 50);
  await page.mouse.up({ button: 'right' });
  await page.keyboard.up('w');
  check(!!layered, 'casting while running plays the cast on the upper body over the running legs', layered && { clip: layered.clip, legs: layered.loco.legs });
  // Hand-offs never blend toward the bind pose: upper and lower body weights
  // stay at 1 through run -> cast -> stop -> idle -> run.
  let minW = 2;
  const sampleW = async (ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      for (const c of await clips(page)) if (c.wsum) minW = Math.min(minW, c.wsum.upper, c.wsum.lower);
      await sleep(30);
    }
  };
  await page.keyboard.down('d');
  await sampleW(500);
  await page.mouse.down({ button: 'right' });
  await sampleW(700);
  await page.keyboard.up('d');
  await sampleW(700);
  await page.mouse.up({ button: 'right' });
  await sampleW(900);
  await page.keyboard.down('s');
  await sampleW(600);
  await page.keyboard.up('s');
  await sampleW(600);
  check(minW > 0.99, 'every hand-off keeps the body fully weighted (no bind-pose blend)', +minW.toFixed(3));
  await page.close();
}

// 5. The camp.
{
  const page = await open('?seed=3&healer=mouse');
  await sleep(4000);
  check((await clips(page)).length > 0, 'the camp builds the mouse healer');
  await page.screenshot({ path: join(DIR, 'mouse-5-camp.png') });
  await page.close();
}

// 6. The fallback.
{
  const { page } = await fight('?seed=3', 'mouse-6-classic.png');
  check((await clips(page)).length === 0, 'the default healer is the original procedural one');
  await page.close();
}

check(errors.length === 0, 'no page errors', errors.slice(0, 3));
await browser.close();
console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
