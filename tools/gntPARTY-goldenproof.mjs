#!/usr/bin/env node
// PARTY determinism proof (docs/gauntlet/PLAN.md §16.9, gate GP.16).
//
// The 3 `run` goldens legitimately change with PARTY (the ally cards,
// spoils, purses and shelves; later the retuned levels). This probe proves
// NOTHING ELSE changed them: it replays the golden recipe of
// tools/gnt-arch-simtrace.mjs (--mode run, 3600 ticks, script 3, every 240
// ticks killAllEnemies / take the draft / door 0 / leave the shop) on the
// working tree with the ally supply switched OFF (cmd('partySupply', false))
// and the v0.5.150 difficulty constants in force (cmd('difficultyLegacy',
// true) when the retune has landed) and compares the digest — tick, event
// count, events hash, state hash, RNG draws — with the kept v0.5.150 goldens
// (captures/gntPARTY-v0.5.150-golden-run-<seed>.json). It also re-checks the
// 6 `?room=` goldens (no run: no page, no supply to switch).
//   node tools/gntPARTY-goldenproof.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { hashState, fnv1a64Hex } = await import(u('src/core/hash.js'));
const { SKILL_SLOTS } = await import(u('src/core/constants.js'));

function trace(mode, seed, { supplyOff }) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() {
      return impl.seed;
    },
    get drawIndex() {
      return impl.drawIndex;
    },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => {
      impl = createGameplayRng(s >>> 0);
      return impl.seed;
    },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: mode === 'run' ? null : mode });
  if (supplyOff) {
    world.cmd('partySupply', false);
    const legacy = world.cmd('difficultyLegacy', true);
    void legacy;
  }
  const evs = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') evs.push(e);
  });
  if (mode === 'run') world.runSystem().startRun();
  for (let i = 0; i < 3600; i++) {
    clock.advance(1000 / 60, (tick) => {
      world.step(tick, scriptedInput(3, tick, { skillSlots: SKILL_SLOTS }));
      if (mode === 'run' && tick % 240 === 0) {
        world.cmd('killAllEnemies');
        const r = world.runSystem().view();
        if (r.phase === 'reward') world.runSystem().takeReward();
        if (r.phase === 'path') world.cmd('pathChoose', 0);
        if (r.phase === 'shop') world.cmd('shopAdvance');
      }
    });
  }
  return {
    tick: clock.tick,
    events: evs.length,
    eventsHash: fnv1a64Hex(JSON.stringify(evs)),
    stateHash: hashState(JSON.parse(JSON.stringify(world.snapshotState()))),
    rngDraws: rng.drawIndex,
  };
}
const digest = (o) => JSON.stringify([o.tick, o.events, o.eventsHash, o.stateHash, o.rngDraws]);

const rows = [];
let ok = true;
for (const s of [1, 2, 3]) {
  const f = join(here, `captures/gntPARTY-v0.5.150-golden-run-${s}.json`);
  if (!existsSync(f)) {
    rows.push({ mode: 'run', seed: s, match: false, why: 'missing kept v0.5.150 golden' });
    ok = false;
    continue;
  }
  const g = JSON.parse(readFileSync(f, 'utf8'));
  const off = trace('run', s, { supplyOff: true });
  const on = trace('run', s, { supplyOff: false });
  const match = digest(off) === digest(g);
  if (!match) ok = false;
  rows.push({ mode: 'run', seed: s, supplyOffMatchesV150: match, v150: digest(g), supplyOff: digest(off), supplyOn: digest(on), changedWithSupply: digest(on) !== digest(g) });
}
for (const m of ['kill_all', 'defend']) {
  for (const s of [1, 2, 3]) {
    const g = JSON.parse(readFileSync(join(here, `captures/gnt-M2-golden-${m}-${s}.json`), 'utf8'));
    const cur = trace(m, s, { supplyOff: false });
    const match = digest(cur) === digest(g);
    if (!match) ok = false;
    rows.push({ mode: m, seed: s, match });
  }
}
console.log(JSON.stringify({ tool: 'gntPARTY-goldenproof', ok, rows }, null, 1));
process.exit(ok ? 0 : 1);
