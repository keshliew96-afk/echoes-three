#!/usr/bin/env node
// gntfixPARTY6 (PARTY6-F1) — determinism proof for the run-golden re-record.
//
// The fix makes the AI's own §25.8 key sort (party.aiSort) emit one
// `loadout_reorder` per move so the event trace replays to the committed
// loadout. The 3 `run` goldens (tools/gnt-arch-simtrace.mjs recipe: 3600
// ticks, script 3, every 240 ticks killAllEnemies / take the draft / door 0 /
// leave the shop) therefore gain those events. This probe proves NOTHING ELSE
// changed: it replays the exact golden recipe on the working tree and
//   (a) the digest with the AI-sort `loadout_reorder` events removed (the
//       recipe never reorders by hand, so every such event is an AI sort)
//       = the committed golden (tick, event count, events hash, state hash,
//       RNG draws) — same state, same RNG, same every other event;
//   (b) the 6 `?room=` goldens match unchanged (no run, no page).
// With --record it then writes the new run goldens (all events).
//   node tools/gntfixPARTY6-goldenproof.mjs [--record 1]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const RECORD = argv.includes('--record') && argv[argv.indexOf('--record') + 1] === '1';
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { hashState, fnv1a64Hex } = await import(u('src/core/hash.js'));
const { SKILL_SLOTS } = await import(u('src/core/constants.js'));

function trace(mode, seed) {
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
  const stateHash = hashState(JSON.parse(JSON.stringify(world.snapshotState())));
  const base = { tick: clock.tick, stateHash, rngDraws: rng.drawIndex };
  const sorts = evs.filter((e) => e.type === 'loadout_reorder');
  const rest = evs.filter((e) => e.type !== 'loadout_reorder');
  const byType = {};
  for (const e of evs) byType[e.type] = (byType[e.type] || 0) + 1;
  return {
    all: { ...base, events: evs.length, eventsHash: fnv1a64Hex(JSON.stringify(evs)) },
    withoutSorts: { ...base, events: rest.length, eventsHash: fnv1a64Hex(JSON.stringify(rest)) },
    sorts: sorts.map((e) => ({ tick: e.tick, seat: e.seat, from: e.from, to: e.to })),
    byType,
    room: world.runSystem().view().room,
  };
}
const digest = (o) => JSON.stringify([o.tick, o.events, o.eventsHash, o.stateHash, o.rngDraws]);

const rows = [];
let ok = true;
for (const s of [1, 2, 3]) {
  const f = join(here, `captures/gnt-M2-golden-run-${s}.json`);
  const g = JSON.parse(readFileSync(f, 'utf8'));
  const t = trace('run', s);
  const proof = digest(t.withoutSorts) === digest(g);
  if (!proof) ok = false;
  rows.push({ mode: 'run', seed: s, golden: digest(g), withoutAiSortEvents: digest(t.withoutSorts), proof, all: digest(t.all), aiSortEvents: t.sorts });
  if (RECORD && proof) {
    const out = { mode: 'run', seed: s, script: 3, ticks: 3600, tick: t.all.tick, events: t.all.events, eventsHash: t.all.eventsHash, stateHash: t.all.stateHash, rngDraws: t.all.rngDraws, room: t.room, eventTypes: Object.keys(t.byType).length, ms: g.ms ?? 0 };
    writeFileSync(f, JSON.stringify(out, null, 1));
    rows[rows.length - 1].recorded = f;
  }
}
for (const m of ['kill_all', 'defend']) {
  for (const s of [1, 2, 3]) {
    const g = JSON.parse(readFileSync(join(here, `captures/gnt-M2-golden-${m}-${s}.json`), 'utf8'));
    const t = trace(m, s);
    const match = digest(t.all) === digest(g);
    if (!match) ok = false;
    rows.push({ mode: m, seed: s, match, aiSortEvents: t.sorts.length });
  }
}
console.log(JSON.stringify({ tool: 'gntfixPARTY6-goldenproof', ok, record: RECORD, rows }, null, 1));
process.exit(ok ? 0 : 1);
