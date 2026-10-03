#!/usr/bin/env node
// M2 headless round-trip probe (docs/gauntlet/PLAN.md §3.4 / G2.1 / G2.11).
// Builds the sim exactly like src/main.js (reseedable RNG handle with
// getState/setState, registry, bus, clock, world, the autopilot step wrapper),
// drives it to a scenario moment with the §6.4 setup commands, then:
//   A = capture(); run K ticks of scripted input (hash every 60 + every
//   non-sound event); apply(A); assert hash(capture()) === hash(A); run the
//   same K ticks again and compare; then build a FRESH world (a new "page"),
//   apply(A) there and compare its continuation too.
//
//   node tools/gntM2-nodetrip.mjs [--scenario all|<name>] [--ticks 600] [--script 1] [--out f.json]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { hashState, fnv1a64Hex } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { SKILL_SLOTS } = await import(u('src/core/constants.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { encodeOrdered, decode, buildFile, parseFile } = await import(u('src/save/codec.js'));

const opt = { scenario: 'all', ticks: 600, script: 1, out: null };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = ['scenario', 'out'].includes(k) ? argv[i + 1] : Number(argv[i + 1]);
}

function build({ seed = 7, room = null, harness = false } = {}) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness, requestHitstop: clock.requestHitstop, room });
  // main.js @gnt:M4a WORLD-LAYERS autopilot wrapper
  const autopilot = world.runSystem().autopilot;
  const rawStep = world.step;
  world.step = (tick, snap, ...rest) => rawStep(tick, autopilot && autopilot.active() ? autopilot.intents(tick, snap) : snap, ...rest);
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
  });
  const io = createStateIO({ clock, rng, registry, world });
  function stepN(n, script = null, driver = null) {
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, script === null ? scriptedInput(0, t, { skillSlots: 0 }) : scriptedInput(script, t, { skillSlots: SKILL_SLOTS })))) {
        stepped += 1;
        if (driver) driver(world, clock.tick);
      }
    }
    return stepped;
  }
  function continuation(n, script, every = 60, driver = null) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      stepN(Math.min(every, n - done), script, driver);
      hashes.push({ tick: clock.tick, h: hashState(io.capture()) });
    }
    const events = rec;
    rec = null;
    return { hashes, events };
  }
  return { rng, registry, bus, clock, world, io, stepN, continuation };
}

// Run-mode driver (same as tools/gnt-arch-simtrace.mjs --mode run).
const runDriver = (world, tick) => {
  if (tick % 240 !== 0) return;
  world.cmd('killAllEnemies');
  const r = world.runSystem().view();
  if (r.phase === 'reward') world.runSystem().takeReward();
  if (r.phase === 'path') world.cmd('pathChoose', 0);
  if (r.phase === 'shop') world.cmd('shopAdvance');
};

function firstDiff(c1, c2) {
  for (let i = 0; i < Math.max(c1.hashes.length, c2.hashes.length); i++) {
    const a = c1.hashes[i];
    const b = c2.hashes[i];
    if (!a || !b || a.h !== b.h || a.tick !== b.tick) {
      let ev = null;
      for (let j = 0; j < Math.max(c1.events.length, c2.events.length); j++) {
        const x = c1.events[j] ? canonicalJSON(c1.events[j]) : null;
        const y = c2.events[j] ? canonicalJSON(c2.events[j]) : null;
        if (x !== y) {
          ev = { index: j, a: x && x.slice(0, 300), b: y && y.slice(0, 300) };
          break;
        }
      }
      return { hashIndex: i, a, b, event: ev };
    }
  }
  if (c1.events.length !== c2.events.length) return { events: [c1.events.length, c2.events.length] };
  for (let j = 0; j < c1.events.length; j++) {
    const x = canonicalJSON(c1.events[j]);
    const y = canonicalJSON(c2.events[j]);
    if (x !== y) return { event: { index: j, a: x.slice(0, 300), b: y.slice(0, 300) } };
  }
  return null;
}

function treeDiff(a, b, path = '$', out = []) {
  if (out.length > 8) return out;
  const ca = canonicalJSON(a);
  const cb = canonicalJSON(b);
  if (ca === cb) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) treeDiff(a[k], b[k], `${path}.${k}`, out);
    return out;
  }
  out.push({ path, a: ca.slice(0, 160), b: cb.slice(0, 160) });
  return out;
}

// --------------------------------------------------------- scenarios --
const SCENARIOS = {
  // kill_all harness mid-combat, projectiles + zones in flight
  killall: () => {
    const s = build({ seed: 7, room: 'kill_all' });
    s.stepN(700, 3);
    return { s, script: 3, driver: null };
  },
  defend: () => {
    const s = build({ seed: 2, room: 'defend' });
    s.stepN(1300, 3);
    return { s, script: 3, driver: null };
  },
  // run: act I room 2 combat
  run1: () => {
    const s = build({ seed: 1 });
    s.world.runSystem().startRun({ act: 1 });
    s.stepN(1000, 3, runDriver);
    return { s, script: 3, driver: runDriver };
  },
  // reward page (a cleared room waiting on the draft)
  reward: () => {
    const s = build({ seed: 4 });
    s.world.runSystem().startRun({ act: 1 });
    s.stepN(200, 3);
    s.world.cmd('killAllEnemies');
    let g = 0;
    while (s.world.runSystem().view().phase === 'combat' && g++ < 2000) {
      s.stepN(1, 3);
      s.world.cmd('killAllEnemies');
    }
    s.stepN(30, 3);
    return { s, script: 3, driver: null, phase: s.world.runSystem().view().phase };
  },
  // shop (room 7)
  shop: () => {
    const s = build({ seed: 5 });
    s.world.runSystem().startRun({ act: 1 });
    s.stepN(10, null);
    s.world.cmd('skipToRoom', 7);
    s.stepN(60, null);
    return { s, script: 3, driver: null, phase: s.world.runSystem().view().phase };
  },
  // boss with adds
  boss: () => {
    const s = build({ seed: 6 });
    s.world.runSystem().startRun({ act: 1 });
    s.stepN(10, null);
    s.world.cmd('skipToRoom', 8);
    s.stepN(120, 3);
    s.world.cmd('bossHp', 0.7);
    s.stepN(200, 3);
    return { s, script: 3, driver: null };
  },
  // act II run with hazards, act III with moles + echo + resonance
  act2: () => {
    const s = build({ seed: 11 });
    s.world.runSystem().startRun({ act: 2 });
    s.stepN(420, 3);
    return { s, script: 3, driver: null };
  },
  act3: () => {
    const s = build({ seed: 12 });
    s.world.runSystem().startRun({ act: 3 });
    s.stepN(10, null);
    s.world.cmd('skipToRoom', 3);
    s.stepN(400, 3);
    s.world.cmd('grantNode', 'echo');
    s.world.cmd('socket', 'mending_bolt', 'echo');
    s.world.cmd('echoArm', 'mending_bolt');
    s.stepN(1, 3);
    s.world.cmd('echoArm', 'mending_bolt');
    return { s, script: 3, driver: null };
  },
  // autopilot playing act I
  autopilot: () => {
    const s = build({ seed: 3 });
    s.world.runSystem().startRun({ act: 1 });
    s.world.cmd('autopilot', true);
    s.stepN(2500, null);
    return { s, script: null, driver: null };
  },
};

const names = opt.scenario === 'all' ? Object.keys(SCENARIOS) : opt.scenario.split(',');
const results = [];
let allOk = true;
for (const name of names) {
  const t0 = Date.now();
  let r;
  try {
    const { s, script, driver, phase } = SCENARIOS[name]();
    const A = s.io.capture();
    const hA = hashState(A);
    const bytes = encodeOrdered(A).length;
    const c1 = s.continuation(opt.ticks, script, 60, driver);
    const ap = s.io.apply(A);
    const hB = hashState(s.io.capture());
    const diffAfterApply = hB === hA ? null : treeDiff(A, s.io.capture());
    const c2 = s.continuation(opt.ticks, script, 60, driver);
    const d2 = firstDiff(c1, c2);
    // Fresh "page": a new world, the tree through the FILE codec (encode -> parse).
    const { text } = buildFile({ slot: { id: 'probe', kind: 'manual', name: name }, meta: {}, state: A, game: 'probe', createdAt: '', savedAt: '' });
    const pf = parseFile(text);
    const s3 = build({ seed: 99 });
    s3.stepN(37, 2);
    const ap3 = s3.io.apply(pf.ok ? pf.file.state : A);
    const hC = hashState(s3.io.capture());
    const diffFresh = hC === hA ? null : treeDiff(A, s3.io.capture());
    const c3 = s3.continuation(opt.ticks, script, 60, driver);
    const d3 = firstDiff(c1, c3);
    const ok = ap.ok && hA === hB && !d2 && pf.ok && ap3.ok && hC === hA && !d3;
    r = {
      name,
      ok,
      phase: phase ?? s.world.runSystem().view().phase,
      tick: A.clock.tick,
      entities: A.registry.entities.length,
      bytes,
      hashBefore: hA,
      hashAfterApply: hB,
      equal: hA === hB,
      continuationEqual: !d2,
      firstDivergence: d2,
      diffAfterApply,
      file: pf.ok ? 'ok' : pf,
      fresh: { apply: ap3.ok, equal: hC === hA, continuationEqual: !d3, firstDivergence: d3, diffFresh },
      events: c1.events.length,
      ms: Date.now() - t0,
    };
  } catch (err) {
    r = { name, ok: false, error: String(err && err.stack ? err.stack : err).slice(0, 1200) };
  }
  if (!r.ok) allOk = false;
  results.push(r);
  console.log(JSON.stringify(r));
}
if (opt.out) writeFileSync(opt.out, JSON.stringify({ allOk, results }, null, 1));
console.log(allOk ? `ALL ${results.length} ROUND TRIPS OK` : 'ROUND TRIP FAILURES');
process.exit(allOk ? 0 : 1);
