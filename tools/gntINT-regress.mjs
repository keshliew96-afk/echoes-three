#!/usr/bin/env node
// GI.6 — regression over the ORIGINAL core loop on the GPU harness
// (docs/gauntlet/PLAN.md §7 INT). Owner: INT.
//
//   8-room loop by real input with every draft and door taken; keydown-to-move
//   <= 2 ticks; dodge i-frames; telegraphs >= 0.7 s; no frame > 100 ms after
//   warm-up; 0 page errors. Camp / combat / boss frames are captured for the
//   REFERENCE_BAR scoring pass.
//
//   node tools/gntINT-regress.mjs [--url http://127.0.0.1:5199] [--seed 7]
//                                 [--out captures/gntINT-regress.json]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5199');
const seed = Number(arg('seed', 7));
const outPath = arg('out', 'captures/gntINT-regress.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
let failures = 0;
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ''}`);
}
async function waitFor(page, body, { timeout = 30000, every = 120 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return true;
    await sleep(every);
  }
  return false;
}
// A screenshot freezes the page for a while: mute the frame sampler around it.
const shot = async (page, name) => {
  await page.evaluate(() => {
    if (window.__r) window.__r.frames.mute = true;
  });
  await page.screenshot({ path: join(root, 'captures', `${name}.png`) });
  await sleep(200);
  await page.evaluate(() => {
    if (window.__r) {
      window.__r.frames.mute = false;
      window.__r.frames.skipNext = true;
    }
  });
};
const press = async (page, key, times = 1, gap = 120) => {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await sleep(gap);
  }
};

const browser = await launchEchoes({ gpu: true });
const rooms = [];
let frames = null;
try {
  const { page, errors } = await openEchoes(browser, `${base}/?menu=0&seed=${seed}`);
  await waitReady(page);
  mkdirSync(join(root, 'captures'), { recursive: true });

  // Recorders: every sim event (telegraph timing, draft/door proof) and a rAF
  // frame-time sampler that ignores the first 2 s of warm-up.
  await page.evaluate(() => {
    window.__r = { evs: [], frames: { max: 0, over50: 0, over100: 0, n: 0, started: 0 }, mv: null };
    window.__echoes.on('*', (ev) => {
      if (ev.type === 'sound') return;
      window.__r.evs.push({ tick: ev.tick, type: ev.type, id: ev.id ?? null, kind: ev.kind ?? null, shape: ev.shape ?? null });
      if (window.__r.evs.length > 20000) window.__r.evs.splice(0, 5000);
    });
    // keydown-to-move (G22 responsiveness): the tick the key arrived.
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.code !== 'KeyW' || window.__r.mv) return;
        const p = window.__echoes.state().party[0];
        window.__r.mv = { t0: window.__echoes.tick, x0: p.x, z0: p.z, moved: null };
        const poll = () => {
          const q = window.__echoes.state().party[0];
          if (window.__r.mv.moved === null && (Math.abs(q.x - window.__r.mv.x0) > 1e-4 || Math.abs(q.z - window.__r.mv.z0) > 1e-4)) {
            window.__r.mv.moved = window.__echoes.tick;
            return;
          }
          if (window.__echoes.tick - window.__r.mv.t0 < 30) requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      },
      true
    );
    window.__r.frames.worst = [];
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      const f = window.__r.frames;
      if (!f.started) f.started = now;
      if (f.mute || f.skipNext) {
        // The harness's own screenshot stalls the page for hundreds of ms —
        // that is the capture tool, not the game (frames around a shot are
        // excluded, and the first frame after one is dropped too).
        f.skipNext = false;
        f.muted = (f.muted || 0) + 1;
      } else if (now - f.started > 2000) {
        f.n += 1;
        if (dt > f.max) f.max = dt;
        if (dt > 50) f.over50 += 1;
        if (dt > 100) f.over100 += 1;
        if (dt > 50) {
          const v = window.__echoes.state().run;
          f.worst.push({ ms: Math.round(dt), tick: window.__echoes.tick, atMs: Math.round(now - f.started), phase: v.phase, room: v.room, mode: v.mode });
          f.worst.sort((a, b) => b.ms - a.ms);
          if (f.worst.length > 12) f.worst.length = 12;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await sleep(2500);

  // ---------------------------------------------- keydown -> move latency --
  // The very first gesture of the page BUILDS the audio graph (M3), so it is a
  // warm-up press, never a measurement.
  await page.keyboard.down('w');
  await sleep(700);
  await page.keyboard.up('w');
  await sleep(700);
  const lat = [];
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      window.__r.mv = null;
    });
    await page.keyboard.down('w');
    await sleep(500);
    await page.keyboard.up('w');
    await sleep(500);
    const m = await page.evaluate(() => window.__r.mv);
    if (m && m.moved !== null) lat.push(m.moved - m.t0);
  }
  lat.sort((a, b) => a - b);
  const median = lat.length ? lat[Math.floor(lat.length / 2)] : null;
  check('R1 keydown-to-move <= 2 ticks (median of 5)', median !== null && median <= 2, { ticks: lat, median });

  // ------------------------------------------------------ dodge i-frames --
  // Space -> dash; the damage probe lands on the first tick the dash is live.
  await page.keyboard.down('Space');
  const dodge = await page.evaluate(async () => {
    const id = window.__echoes.state().party[0].id;
    const before = window.__echoes.state().party[0].hp;
    let dashing = 0;
    for (let i = 0; i < 40; i++) {
      dashing = window.__echoes.state().party[0].dashTicksLeft;
      if (dashing > 0) break;
      await new Promise((r) => setTimeout(r, 8));
    }
    const probe = window.__echoes.cmd('keenProbe', id, 0);
    const mid = window.__echoes.state().party[0].hp;
    const immune = window.__echoes.events.filter((e) => e.type === 'hit_immune').length;
    return { before, after: mid, dashing, probe, immune };
  });
  await page.keyboard.up('Space');
  await sleep(400);
  check('R2 dodge grants i-frames (damage during the dash does nothing)', dodge.dashing > 0 && dodge.after === dodge.before, dodge);

  // --------------------------------------- the 8-room loop by real input --
  // Walk into the portal ring with WASD — exactly what a player does (short
  // bursts steered at the ring centre, so an overshoot corrects itself).
  let portal = false;
  for (let i = 0; i < 24 && !portal; i++) {
    const cs = await page.evaluate(() => {
      const c = window.__echoes.cmd('campState');
      return { p: c.player, portal: c.portal, inPortal: c.inPortal };
    });
    if (cs.inPortal) {
      portal = true;
      break;
    }
    const tx = cs.portal.x;
    const tz = cs.portal.z + 0.55;
    const dx = tx - cs.p.x;
    const dz = tz - cs.p.z;
    const keys = [];
    if (Math.abs(dx) > 0.25) keys.push(dx > 0 ? 'd' : 'a');
    if (Math.abs(dz) > 0.25) keys.push(dz > 0 ? 's' : 'w');
    if (!keys.length) break;
    const ms = Math.max(90, Math.min(500, (Math.hypot(dx, dz) / 2.2) * 1000));
    for (const k of keys) await page.keyboard.down(k);
    await sleep(ms);
    for (const k of keys) await page.keyboard.up(k);
    await sleep(160);
    portal = await page.evaluate(() => window.__echoes.cmd('campState').inPortal);
  }
  const camp0 = await page.evaluate(() => window.__echoes.cmd('campState'));
  let room1 = false;
  for (let i = 0; i < 4 && !room1; i++) {
    await press(page, 'e');
    room1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.active&&r.room===1})()`, { timeout: 12000 });
    if (!room1) {
      // Nudge back into the portal ring and try again.
      await page.keyboard.down('w');
      await sleep(600);
      await page.keyboard.up('w');
      await sleep(400);
    }
  }
  check('R3 camp -> portal -> room 1 by real input', portal && room1, { camp: camp0, campNow: await page.evaluate(() => window.__echoes.cmd('campState')) });
  await sleep(2000);
  await shot(page, 'gntINT-rb-combat');

  const view = () => page.evaluate(() => window.__echoes.state().run);
  const uiScreen = () => page.evaluate(() => (window.__echoes.runUi() || {}).screen ?? 'none');
  const settled = () => page.evaluate(() => (window.__echoes.runUi() || {}).settled === true);

  const log = [];
  let guard = 0;
  let lastRoom = 0;
  while (guard++ < 240) {
    const v = await view();
    if (!v.active && (v.phase === 'victory' || v.phase === 'defeat' || v.phase === 'idle')) break;
    if (v.room !== lastRoom && v.room > 0) {
      rooms.push({ room: v.room, mode: v.mode, at: Date.now() });
      lastRoom = v.room;
      if (v.room === 8) {
        await sleep(2500);
        await shot(page, 'gntINT-rb-boss');
      }
    }
    // §16 chains a drafted NODE straight into the socket screen, which owns
    // the keyboard while it is open — close it (the candidate is banked)
    // before answering the page underneath.
    if (await page.evaluate(() => !!(window.__echoes.content && window.__echoes.content.socketUi && window.__echoes.content.socketUi().open))) {
      await press(page, 'Escape');
      await sleep(500);
      log.push({ at: guard, act: 'closed socket screen' });
      continue;
    }
    const scr = await uiScreen();
    if (scr !== 'none') {
      // A page is up: answer it with real keys once its settle window is over.
      if (!(await settled())) {
        await sleep(250);
        continue;
      }
      if (scr === 'end') break;
      log.push({ at: guard, act: `Enter on ${scr}`, room: v.room, phase: v.phase });
      await press(page, 'Enter'); // draft: Take · path: the focused door · shop: buy/leave
      await sleep(900);
      continue;
    }
    if (v.phase === 'combat') {
      // Fight with real input for a while (the party AI does the rest); a room
      // that outlasts its budget is finished with the documented debug clear
      // so the regression stays inside one capture window.
      const t0 = Date.now();
      let cleared = false;
      while (Date.now() - t0 < 12000) {
        await page.mouse.down({ button: 'right' }); // basic attack
        await sleep(400);
        await page.mouse.up({ button: 'right' });
        await press(page, 'Digit1');
        await press(page, 'Digit2');
        const w = await view();
        if (w.phase !== 'combat' || w.room !== v.room) {
          cleared = true;
          break;
        }
      }
      if (!cleared) {
        if (v.room === 8) await page.evaluate(() => window.__echoes.cmd('bossHp', 0.04));
        await page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
        await sleep(1200);
      }
      continue;
    }
    await sleep(300);
  }
  console.log('loop log (last 14):', JSON.stringify(log.slice(-14)));
  const endView = await view();
  const endScreen = await uiScreen();
  check('R4 the 8-room loop reached its end card', rooms.length >= 8 && (endScreen === 'end' || endView.phase === 'victory' || endView.phase === 'defeat'), {
    rooms: rooms.map((r) => `${r.room}:${r.mode}`),
    phase: endView.phase,
    screen: endScreen,
  });
  await shot(page, 'gntINT-rb-end');

  // Drafts / doors actually answered by real input.
  const answered = await page.evaluate(() =>
    window.__r.evs.reduce((a, e) => {
      if (['draft_taken', 'draft_declined', 'path_chosen', 'shop_purchase', 'room_cleared'].includes(e.type)) a[e.type] = (a[e.type] || 0) + 1;
      return a;
    }, {})
  );
  check('R5 drafts taken and doors chosen with real keys', (answered.draft_taken || 0) >= 1 && (answered.path_chosen || 0) >= 1, answered);

  // ------------------------------------------------------- telegraph time --
  const tg = await page.evaluate(() => {
    const evs = window.__r.evs;
    const open = new Map();
    const spans = [];
    for (const e of evs) {
      if (e.type === 'telegraph_start' || e.type === 'hazard_telegraph' || e.type === 'spawn_telegraph') open.set(`${e.type}:${e.id}`, e.tick);
      if (e.type === 'telegraph_resolve' || e.type === 'hazard_resolve') {
        const k = e.type === 'telegraph_resolve' ? `telegraph_start:${e.id}` : `hazard_telegraph:${e.id}`;
        if (open.has(k)) {
          spans.push(e.tick - open.get(k));
          open.delete(k);
        }
      }
    }
    return { n: spans.length, minTicks: spans.length ? Math.min(...spans) : null, medianTicks: spans.length ? spans.sort((a, b) => a - b)[Math.floor(spans.length / 2)] : null };
  });
  check('R6 every telegraph lasted >= 0.7 s (42 ticks)', tg.n > 0 && tg.minTicks >= 42, tg);

  // ------------------------------------------------------- frame budget --
  frames = await page.evaluate(() => ({ ...window.__r.frames, stats: window.__echoes.app.frameStats() }));
  check('R7 no frame over 100 ms after warm-up', frames.over100 === 0, { max: Math.round(frames.max), over50: frames.over50, over100: frames.over100, frames: frames.n, worst: frames.worst, p50: frames.stats && frames.stats.frameMsP50, p95: frames.stats && frames.stats.frameMsP95 });
  check('R8 rendered fps at the 60 Hz bar', frames.stats && frames.stats.renderedFps >= 55, frames.stats);

  // Camp frame for the reference bar: end the run and walk back.
  if (endScreen === 'end') {
    if (await settled()) await press(page, 'Enter');
    await sleep(2500);
  }
  await page.evaluate(() => window.__echoes.cmd('returnToCamp'));
  await sleep(2500);
  await shot(page, 'gntINT-rb-camp');
  check('R9 back in camp after the run (no dead end)', await page.evaluate(() => window.__echoes.app.state === 'playing' && window.__echoes.app.mode === 'camp'));
  check('R10 zero page errors over the whole regression', errors.length === 0, errors.slice(0, 5));
} finally {
  await browser.close();
}
mkdirSync(join(root, dirname(outPath)), { recursive: true });
writeFileSync(join(root, outPath), JSON.stringify({ schema: 'gntINT-regress/1', at: new Date().toISOString(), seed, failures, rooms, frames, checks }, null, 1));
console.log(`\n${checks.length - failures}/${checks.length} checks passed -> ${outPath}`);
process.exit(failures ? 1 : 0);
