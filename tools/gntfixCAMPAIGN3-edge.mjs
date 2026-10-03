#!/usr/bin/env node
// gntfixCAMPAIGN3 — the boss-room clear with enemy shots IN FLIGHT (fix for the
// round-3 campaign critic's GC7-inflight-4s), headless in Node, the world built
// exactly like src/main.js / tools/gntCAMPAIGN-edge.mjs.
//
//   node tools/gntfixCAMPAIGN3-edge.mjs [--seeds 1-10] [--out captures/gntfixCAMPAIGN3-edge.json]
//
// Cases (every seed; each starts with >= 1 Quillback shot in flight at the kill):
//   campaign    Level 1 campaign: Stag + adds killed between two steps -> level_clear
//               on the very next tick (never waits for the shot), the shot despawns
//               with cause room_clear on the clear tick, no shot exists / lands after
//               it, exactly one level_clear + level_transit, phase transit.
//   single      legacy startRun (the act runner / ?run=1 contract): the same kill ->
//               run_end victory on the next tick, shots dissolved.
//   wipe        party floored on the same step as the kill (shot in flight) -> defeat,
//               no level_clear, no transit (a wipe still outranks the clear).
//   stagFirst   the Stag dies while adds live (shot in flight) -> no clear; the adds die
//               -> the clear on that tick.
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

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-10');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const OUT = opt('out', 'captures/gntfixCAMPAIGN3-edge.json');

function build(seed) {
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
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const counts = {};
  const log = [];
  bus.on('*', (e) => {
    if (e.type === 'sound') return;
    counts[e.type] = (counts[e.type] || 0) + 1;
    if (['level_clear', 'level_transit', 'level_start', 'run_end', 'room_cleared', 'eshot_despawn', 'eshot_fire'].includes(e.type)) log.push({ type: e.type, tick: e.tick, cause: e.cause ?? null, result: e.result ?? null, mode: e.mode ?? null });
  });
  function stepN(n) {
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, scriptedInput(0, t, { skillSlots: 0 })))) stepped += 1;
    }
    return stepped;
  }
  const run = () => world.runSystem();
  const c = (t) => counts[t] || 0;
  return { world, registry, bus, clock, stepN, run, counts, c, log };
}

const party = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const shots = (w) => w.registry.all().filter((e) => e.kind === 'eshot').length;
const hostiles = (w) => w.registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0 && e.kind !== 'eshot');
const heal = (w) => {
  for (const p of party(w)) if (!p.downed) w.world.cmd('setHp', p.id, 1);
};

// Into the Stag room; optionally wait for its adds; then a Quillback beside the
// party and step until one of its shots is in flight (party kept at full HP).
function toStagWithShot(w, { wantAdds = false } = {}) {
  w.world.cmd('skipToRoom', 8);
  w.stepN(20);
  if (wantAdds) {
    for (let i = 0; i < 120; i++) {
      if (hostiles(w).filter((e) => e.kind !== 'stag').length > 0) break;
      w.world.cmd('bossHp', 0.3);
      w.stepN(30);
    }
  } else {
    w.world.cmd('bossHp', 0.5);
  }
  const p = party(w)[0];
  w.world.cmd('spawn', 'quillback', p.x + 5, p.z - 2);
  for (let i = 0; i < 900 && shots(w) === 0; i++) {
    heal(w);
    w.stepN(1);
  }
  return shots(w);
}

const checks = [];
function check(seed, what, ok, got = null) {
  checks.push({ seed, what, ok: !!ok, got });
  if (!ok) console.log(`FAIL [seed ${seed}] ${what} ${JSON.stringify(got).slice(0, 400)}`);
}
const after = (w, tick, pred) => w.log.filter((e) => e.tick > tick && pred(e));

const out = { seeds: SEEDS, cases: {} };
for (const seed of SEEDS) {
  // ---------------------------------------------------------- campaign --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    const inFlight = toStagWithShot(w);
    const killTick = w.clock.tick;
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(3);
    const lc = w.log.filter((e) => e.type === 'level_clear');
    const clearTick = lc[0] ? lc[0].tick : null;
    const dissolved = w.log.filter((e) => e.type === 'eshot_despawn' && e.cause === 'room_clear' && e.tick === clearTick).length;
    const landedAfter = after(w, clearTick ?? killTick, (e) => e.type === 'eshot_despawn' && e.cause === 'impact').length;
    const row = { inFlight, killTick, clearTick, wait: clearTick === null ? null : clearTick - killTick, dissolved, landedAfter, shotsNow: shots(w), lc: w.c('level_clear'), lt: w.c('level_transit'), phase: w.run().view().phase };
    check(seed, `campaign: ${inFlight} shot(s) in flight at the kill -> level_clear on the next tick, shot dissolved on the clear tick, none lands after, exactly once`, inFlight >= 1 && row.wait === 1 && dissolved >= 1 && landedAfter === 0 && row.shotsNow === 0 && row.lc === 1 && row.lt === 1 && row.phase === 'transit', row);
    (out.cases.campaign ||= []).push({ seed, ...row });
  }
  // ------------------------------------------------------------ single --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startRun', { act: 1 });
    w.stepN(60);
    const inFlight = toStagWithShot(w);
    const killTick = w.clock.tick;
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(3);
    const end = w.log.filter((e) => e.type === 'run_end');
    const row = { inFlight, killTick, endTick: end[0] ? end[0].tick : null, result: end[0] ? end[0].result : null, shotsNow: shots(w), lc: w.c('level_clear'), phase: w.run().view().phase };
    check(seed, `single (legacy startRun): shot in flight at the kill -> run_end victory on the next tick, no shot left`, inFlight >= 1 && row.result === 'victory' && row.endTick - killTick === 1 && row.shotsNow === 0 && row.lc === 1 && row.phase === 'victory', row);
    (out.cases.single ||= []).push({ seed, ...row });
  }
  // -------------------------------------------------------------- wipe --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    const inFlight = toStagWithShot(w);
    w.world.cmd('downAll');
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(4);
    const ends = w.log.filter((e) => e.type === 'run_end');
    const row = { inFlight, lc: w.c('level_clear'), lt: w.c('level_transit'), phase: w.run().view().phase, ends };
    check(seed, 'wipe: party floored on the kill step (shot in flight) -> defeat, no level_clear, no transit', inFlight >= 1 && row.lc === 0 && row.lt === 0 && row.phase === 'defeat' && ends.length === 1 && ends[0].result === 'defeat', row);
  }
  // --------------------------------------------------------- stagFirst --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    const inFlight = toStagWithShot(w, { wantAdds: true });
    const adds0 = hostiles(w).filter((e) => e.kind !== 'stag').length;
    w.world.cmd('killBoss');
    w.stepN(2);
    const lcStag = w.c('level_clear');
    const addsLeft = hostiles(w).length;
    heal(w);
    const killTick = w.clock.tick;
    w.world.cmd('killAllEnemies');
    w.stepN(3);
    const lc = w.log.filter((e) => e.type === 'level_clear');
    const row = { inFlight, adds0, addsLeft, lcStag, killTick, clearTick: lc[0] ? lc[0].tick : null, lc: w.c('level_clear'), phase: w.run().view().phase };
    check(seed, `stagFirst: Stag down with ${addsLeft} hostiles alive -> no clear; last add dies -> clear on the next tick`, (addsLeft === 0 || lcStag === 0) && row.lc === 1 && (addsLeft === 0 || row.clearTick - killTick === 1) && row.phase === 'transit', row);
  }
}
const byCase = {};
for (const k of checks) {
  const key = k.what.split(':')[0].split(' ')[0];
  byCase[key] ||= { pass: 0, total: 0 };
  byCase[key].total += 1;
  if (k.ok) byCase[key].pass += 1;
}
out.summary = byCase;
out.checks = checks;
writeFileSync(resolve(here, OUT), JSON.stringify(out, null, 1));
const pass = checks.filter((k) => k.ok).length;
console.log(JSON.stringify(byCase));
console.log(`${pass}/${checks.length} checks pass -> ${OUT}`);
process.exit(pass === checks.length ? 0 : 1);
