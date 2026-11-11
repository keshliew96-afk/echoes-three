#!/usr/bin/env node
// ENDLESS SOAK probe (docs/TESTING.md "Soak"). Plays Endless descents headless
// with the autopilot (the same Node world tools/endless-run.mjs builds), one
// after another in the same world: a lost run starts the next, as a player at
// camp would. It and watches what a slow leak would grow: live entities, bus
// listeners, the event ring and the JS heap after a forced GC. Each is sampled
// at every level start; the probe fails when a count keeps climbing level over
// level instead of settling.
//
//   node --expose-gc tools/endless-soak-probe.mjs [--seed 7] [--levels 12] [--json out.json]
//
// Without --expose-gc the probe re-runs itself with it (npm test calls it bare).
//
// What fails it (each a growth from the second level start to the last, so the
// first level's one-time warm-up is not counted):
//   - bus listeners: any growth (a listener added per level and never removed);
//   - live entities at a level start: more than SOAK.entitySlack over the second
//     level's count (the last room was cleared, so leftovers are leaks);
//   - the event ring: above its capacity (src/core/constants.js);
//   - heap after GC: more than SOAK.heapGrowMB.
// A room that stays live past SOAK.stuckTicks fails it too, since a stuck run
// soaks nothing. Before it reports, it checks itself: a short run with a
// planted leak (--plant 1, one listener added per level) must fail.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SOAK = Object.freeze({
  entitySlack: 40,
  heapGrowMB: 12, // seed 7 grows about 5 MB over twelve level starts (v0.5.358)
  stuckTicks: 10800, // a room still live 180 s after it started
});

if (typeof global.gc !== 'function') {
  const r = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '7'));
const LEVELS = Number(opt('levels', '12')); // level starts to sample, over as many runs as it takes
const u = (p) => pathToFileURL(join(root, p)).href;

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { EVENT_RING_CAPACITY } = await import(u('src/core/constants.js'));

let impl = createGameplayRng(SEED >>> 0);
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
const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
const run = world.runSystem();
const ap = run.autopilot;

const samples = [];
let sampleDue = false;
let room = null;
const t0 = Date.now();
bus.on('run_start', () => (sampleDue = true));
bus.on('level_start', () => (sampleDue = true));
bus.on('room_enter', (e) => (room = { startTick: e.tick, index: e.index }));
const PLANT = opt('plant', '0') === '1';
if (PLANT) bus.on('level_start', () => bus.on('hit', () => {}));

function sample() {
  global.gc();
  samples.push({
    start: samples.length + 1,
    tick: clock.tick,
    entities: registry.count,
    listeners: bus.listenerCount(),
    ring: bus.buffer().length,
    heapMB: Math.round((process.memoryUsage().heapUsed / 1048576) * 10) / 10,
  });
}

const runs = [];
run.startCampaign({ level: 1, harness: true, endless: true });
ap.configure(true);
let stuck = null;
for (let i = 0; i < 20_000_000 && !stuck; i++) {
  clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
  if (sampleDue) {
    sampleDue = false;
    if (samples.length >= LEVELS) break;
    sample();
  }
  const v = run.view();
  if (v.phase === 'victory' || v.phase === 'defeat') {
    runs.push(`${v.phase} at level start ${samples.length}`);
    run.startCampaign({ level: 1, harness: true, endless: true });
    ap.configure(true);
    room = null;
    continue;
  }
  if (v.phase === 'combat' && room && clock.tick - room.startTick > SOAK.stuckTicks) stuck = `room ${room.index} stuck at tick ${clock.tick}`;
}
const outcome = stuck ? `stuck: ${stuck}` : `${samples.length} level starts over ${runs.length + 1} runs (${runs.join(', ') || 'no run lost'})`;

console.log(`seed ${SEED}: ${outcome}; ${clock.tick} ticks, ${Math.round((Date.now() - t0) / 1000)} s`);
console.log('start   tick  entities  listeners  ring  heapMB');
for (const s of samples) console.log(`${String(s.start).padStart(5)} ${String(s.tick).padStart(7)} ${String(s.entities).padStart(9)} ${String(s.listeners).padStart(10)} ${String(s.ring).padStart(5)} ${String(s.heapMB).padStart(7)}`);

const fails = [];
if (stuck) fails.push(`a room stayed live too long: ${stuck}`);
if (samples.length < 3) fails.push(`only ${samples.length} level starts sampled`);
else {
  // The second sample is the base, so the first level's one-time warm-up
  // (lazy tables, JIT, first dressing) is not counted as growth.
  const rest = samples.slice(1);
  const base = rest[0];
  const last = rest[rest.length - 1];
  const maxListeners = Math.max(...rest.map((s) => s.listeners));
  if (maxListeners > base.listeners) fails.push(`bus listeners grew ${base.listeners} -> ${maxListeners}`);
  const maxEntities = Math.max(...rest.map((s) => s.entities));
  if (maxEntities > base.entities + SOAK.entitySlack) fails.push(`live entities at a level start grew ${base.entities} -> ${maxEntities} (slack ${SOAK.entitySlack})`);
  if (last.heapMB - base.heapMB > SOAK.heapGrowMB) fails.push(`heap after GC grew ${base.heapMB} -> ${last.heapMB} MB (limit +${SOAK.heapGrowMB})`);
}
const maxRing = Math.max(...samples.map((s) => s.ring));
if (maxRing > EVENT_RING_CAPACITY) fails.push(`event ring ${maxRing} > capacity ${EVENT_RING_CAPACITY}`);

const out = opt('json');
if (out) writeFileSync(resolve(out), JSON.stringify({ seed: SEED, levels: LEVELS, outcome, runs, samples, fails }, null, 1));
if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
if (PLANT) process.exit(0); // the planted leak went unseen: the parent reports it
const self = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), '--seed', String(SEED), '--levels', '4', '--plant', '1'], { encoding: 'utf8' });
if (self.status !== 1 || !/bus listeners grew/.test(self.stdout)) {
  console.log(`FAIL the self-check: a planted listener leak was not caught (exit ${self.status})`);
  process.exit(1);
}
console.log('self-check: a planted listener leak fails the probe');
console.log(`PASS endless soak: ${samples.length} level starts, listeners flat, entities and heap settled`);
