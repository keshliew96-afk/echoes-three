#!/usr/bin/env node
// Headless Node golden trace of the Echoes sim (docs/gauntlet/PLAN.md §6.5).
// Builds the sim EXACTLY like src/main.js (reseedable gameplay-RNG handle,
// registry, event bus, clock, world) with no browser, feeds the pure scripted
// input generator (src/sim/script.js) and prints a digest of every sim event
// (except `sound`) plus a state hash. Two builds that print the same digest
// for the same arguments simulate identically.
//
//   node tools/gnt-arch-simtrace.mjs [--mode kill_all|defend|run] [--ticks 3600]
//        [--seed 7] [--script 3] [--root <repo dir>] [--golden file.json] [--record file.json]
//
//   --mode run      startRun(); every 240 ticks: killAllEnemies, take the draft,
//                   choose door 0, leave the shop (walks the 8-room frame)
//   --record f      write the digest to f;  --golden f  compare against f (exit 1 on mismatch)
//   --root dir      simulate another checkout (e.g. a `git archive HEAD` export)
//
// Known limit: the camp scene (static colliders, seatParty on run_end) is
// render-side, so a Node trace covers wave rooms and the run frame, not camp
// walking. Browser-side equivalent: __echoes.sim.trace(n, scriptSeed).
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const opt = { mode: 'kill_all', ticks: 3600, seed: 7, script: 3, root: here, golden: null, record: null };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  const v = argv[i + 1];
  opt[k] = ['mode', 'root', 'golden', 'record'].includes(k) ? v : Number(v);
}

const u = (r, p) => pathToFileURL(join(r, p)).href;
const { createGameplayRng } = await import(u(opt.root, 'src/core/rng.js'));
const { createRegistry } = await import(u(opt.root, 'src/core/registry.js'));
const { createEventBus } = await import(u(opt.root, 'src/core/events.js'));
const { createClock } = await import(u(opt.root, 'src/core/clock.js'));
const { createWorld } = await import(u(opt.root, 'src/sim/world.js'));
// Probe tooling always comes from THIS checkout so both sides are measured alike.
const { scriptedInput } = await import(u(here, 'src/sim/script.js'));
const { hashState, fnv1a64Hex } = await import(u(here, 'src/core/hash.js'));
let SKILL_SLOTS = 4;
try {
  SKILL_SLOTS = (await import(u(opt.root, 'src/core/constants.js'))).SKILL_SLOTS ?? 4;
} catch {
  /* older checkout */
}

let impl = createGameplayRng(opt.seed >>> 0);
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
};
const registry = createRegistry();
const bus = createEventBus();
const clock = createClock();
const world = createWorld({
  rng,
  registry,
  events: bus,
  harness: false,
  requestHitstop: clock.requestHitstop,
  room: opt.mode === 'run' ? null : opt.mode,
});
const evs = [];
bus.on('*', (e) => {
  if (e.type !== 'sound') evs.push(e);
});
if (opt.mode === 'run') world.runSystem().startRun();
const t0 = Date.now();
for (let i = 0; i < opt.ticks; i++) {
  clock.advance(1000 / 60, (tick) => {
    world.step(tick, scriptedInput(opt.script, tick, { skillSlots: SKILL_SLOTS }));
    if (opt.mode === 'run' && tick % 240 === 0) {
      world.cmd('killAllEnemies');
      const r = world.runSystem().view();
      if (r.phase === 'reward') world.runSystem().takeReward();
      if (r.phase === 'path') world.cmd('pathChoose', 0);
      if (r.phase === 'shop') world.cmd('shopAdvance');
    }
  });
}
const byType = {};
for (const e of evs) byType[e.type] = (byType[e.type] || 0) + 1;
const out = {
  mode: opt.mode,
  seed: opt.seed,
  script: opt.script,
  ticks: opt.ticks,
  tick: clock.tick,
  events: evs.length,
  eventsHash: fnv1a64Hex(JSON.stringify(evs)),
  stateHash: hashState(JSON.parse(JSON.stringify(world.snapshotState()))),
  rngDraws: rng.drawIndex,
  room: world.runSystem().view().room ?? null,
  eventTypes: Object.keys(byType).length,
  ms: Date.now() - t0,
};
console.log(JSON.stringify(out));
const digest = (o) => JSON.stringify([o.tick, o.events, o.eventsHash, o.stateHash, o.rngDraws]);
if (opt.record) writeFileSync(opt.record, JSON.stringify(out, null, 1));
if (opt.golden) {
  const g = JSON.parse(readFileSync(opt.golden, 'utf8'));
  const same = digest(g) === digest(out);
  console.log(same ? 'GOLDEN MATCH' : `GOLDEN MISMATCH: expected ${digest(g)}`);
  process.exit(same ? 0 : 1);
}
