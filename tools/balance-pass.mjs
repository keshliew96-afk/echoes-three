#!/usr/bin/env node
// Balance pass probe (2026-10-05). Headless campaigns with the deterministic
// default-build autopilot (the same Node world tools/endless-run.mjs builds),
// measuring the two sim changes of the pass:
//   evade  Level 2 campaigns (Mire Toads): every lobbed glob aimed at an AI
//          seat (Tank / Swordsman / Archer), and whether it landed on that
//          seat. The AI now steps out of the ring (data/classes.js AI_EVADE).
//   grave  Level 3 campaigns: the enemy mix of every Open Grave room (layout
//          15, data/layouts.js `mix`) against the other Barrow layouts, plus
//          the Open Grave rooms' party damage, clear time and downs.
// plus a replay check (one seed twice -> one event hash).
//
//   node tools/balance-pass.mjs [--seeds 1-16] [--part evade,grave] [--root dir] [--out f]
//   --root d   measure another checkout (the "before" numbers)
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-16');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const PARTS = opt('part', 'evade,grave').split(',');
const ROOT = resolve(opt('root', here));
const OUT = opt('out', 'captures/balance-pass.json');
const STUCK_TICKS = 10800;
const OPEN_GRAVE = 15;

const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));

// One campaign from `level`, stopped once that level ends. `watch(bus, registry)`
// installs the part's collectors.
function playLevel(seed, level, watch) {
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
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const ap = run.autopilot;
  let hash = 0;
  const mix = (s) => {
    for (let i = 0; i < s.length; i++) hash = Math.imul(hash ^ s.charCodeAt(i), 16777619) >>> 0;
  };
  for (const t of ['room_enter', 'room_cleared', 'enemy_spawn', 'downed', 'level_clear', 'run_end']) bus.on(t, (e) => mix(`${t}:${e.tick}:${e.etype ?? e.index ?? e.level ?? ''}`));
  let roomStart = 0;
  bus.on('room_enter', (e) => (roomStart = e.tick));
  let done = null;
  bus.on('level_clear', () => (done = 'cleared'));
  watch(bus, registry);
  run.startCampaign({ level, harness: true });
  ap.configure(true);
  for (let i = 0; i < 2_000_000 && !done; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = run.view();
    if (v.phase === 'victory') done = 'cleared';
    else if (v.phase === 'defeat') done = 'defeat';
    else if (v.phase === 'combat' && clock.tick - roomStart > STUCK_TICKS) done = 'stuck';
  }
  return { outcome: done, hash: hash.toString(16) };
}

function evadeRun(seed) {
  const aimed = new Map(); // glob id -> target seat
  const landing = []; // [{ tick, targetId, seat }]
  const rec = { seed, aimed: [0, 0, 0, 0], hit: [0, 0, 0, 0] };
  const r = playLevel(seed, 2, (bus, registry) => {
    bus.on('telegraph_start', (e) => {
      if (e.etype !== 'eglob' || e.target == null) return;
      const t = registry.byId(e.target);
      if (t && t.kind === 'ally' && t.partyIndex !== undefined) aimed.set(e.id, { targetId: t.id, seat: t.partyIndex });
    });
    bus.on('enemy_glob_land', (e) => {
      const a = aimed.get(e.id);
      if (!a) return;
      aimed.delete(e.id);
      rec.aimed[a.seat] += 1;
      landing.push({ tick: e.tick, ...a });
    });
    bus.on('hit', (e) => {
      if (e.shape !== 'ring') return;
      const k = landing.findIndex((l) => l.tick === e.tick && l.targetId === e.target);
      if (k < 0) return;
      rec.hit[landing[k].seat] += 1;
      landing.splice(k, 1);
    });
    bus.on('room_enter', () => (landing.length = 0));
  });
  return { ...rec, outcome: r.outcome, hash: r.hash };
}

function graveRun(seed) {
  const rooms = [];
  let cur = null;
  const r = playLevel(seed, 3, (bus, registry) => {
    bus.on('layout_enter', (e) => {
      cur = e.mode === 'kill_all' || e.mode === 'defend' ? { room: e.room, layoutId: e.layoutId, mode: e.mode, types: {}, dmg: 0, downs: 0, start: e.tick, ticks: null } : null;
      if (cur) rooms.push(cur);
    });
    bus.on('enemy_spawn', (e) => {
      if (cur && e.etype !== 'broodling') cur.types[e.etype] = (cur.types[e.etype] ?? 0) + 1;
    });
    bus.on('hit', (e) => {
      if (!cur) return;
      const t = registry.byId(e.target);
      if (t && t.partyIndex !== undefined) cur.dmg += e.amount;
    });
    bus.on('downed', () => cur && (cur.downs += 1));
    bus.on('room_cleared', (e) => {
      if (cur && cur.ticks === null) cur.ticks = e.tick - cur.start;
    });
  });
  return { seed, outcome: r.outcome, hash: r.hash, rooms };
}

const report = { tool: 'balance-pass', root: ROOT, seeds: SEEDS, at: new Date().toISOString(), checks: {} };
const fails = [];
const check = (k, ok, got) => {
  report.checks[k] = { ok: !!ok, got };
  console.log(`${ok ? 'PASS' : 'FAIL'} ${k} ${JSON.stringify(got)}`);
  if (!ok) fails.push(k);
};
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

if (PARTS.includes('evade')) {
  const runs = SEEDS.map(evadeRun);
  const aimed = [0, 0, 0, 0];
  const hit = [0, 0, 0, 0];
  for (const x of runs) for (let s = 1; s < 4; s++) (aimed[s] += x.aimed[s]), (hit[s] += x.hit[s]);
  const A = aimed.reduce((a, b) => a + b, 0);
  const H = hit.reduce((a, b) => a + b, 0);
  report.evade = { runs, aimed, hit, cleared: runs.filter((x) => x.outcome === 'cleared').length };
  console.log(`evade: Level 2 cleared ${report.evade.cleared}/${runs.length}; globs aimed at AI seats ${A}, landed on them ${H} (${pct(H, A)}%)`);
  console.log(`       per seat tank/swordsman/archer: ${[1, 2, 3].map((s) => `${hit[s]}/${aimed[s]}`).join('  ')}`);
  check('evade: at most 1 in 3 globs aimed at an AI seat lands on it', A > 0 && H * 3 <= A, `${H}/${A}`);
  const again = evadeRun(SEEDS[0]);
  check('evade: a seed replays to the same event hash', again.hash === runs[0].hash, `${again.hash} vs ${runs[0].hash}`);
}

if (PARTS.includes('grave')) {
  const runs = SEEDS.map(graveRun);
  const sum = (rooms) => {
    const types = {};
    let dmg = 0;
    let downs = 0;
    const ticks = [];
    for (const rm of rooms) {
      for (const [k, n] of Object.entries(rm.types)) types[k] = (types[k] ?? 0) + n;
      dmg += rm.dmg;
      downs += rm.downs;
      if (rm.ticks !== null) ticks.push(rm.ticks);
    }
    const n = Object.values(types).reduce((a, b) => a + b, 0);
    ticks.sort((a, b) => a - b);
    return {
      rooms: rooms.length,
      units: n,
      moleBroodPct: pct((types.mole ?? 0) + (types.brood ?? 0), n),
      types,
      dmgPerRoom: rooms.length ? Math.round(dmg / rooms.length) : 0,
      downs,
      medianClearS: ticks.length ? Math.round(ticks[ticks.length >> 1] / 6) / 10 : null,
    };
  };
  const all = runs.flatMap((x) => x.rooms);
  const og = sum(all.filter((rm) => rm.layoutId === OPEN_GRAVE));
  const rest = sum(all.filter((rm) => rm.layoutId !== OPEN_GRAVE));
  report.grave = { openGrave: og, otherBarrow: rest, cleared: runs.filter((x) => x.outcome === 'cleared').length, runs };
  console.log(`grave: Level 3 cleared ${report.grave.cleared}/${runs.length}`);
  for (const [k, s] of [['Open Grave', og], ['other layouts', rest]])
    console.log(`  ${k}: ${s.rooms} rooms, ${s.units} units, moles+broods ${s.moleBroodPct}%, dmg/room ${s.dmgPerRoom}, downs ${s.downs}, median clear ${s.medianClearS}s  ${JSON.stringify(s.types)}`);
  check('grave: Open Grave rooms were met', og.rooms > 0, og.rooms);
  check('grave: moles and broods are at least half of Open Grave\'s units', og.moleBroodPct >= 50, `${og.moleBroodPct}%`);
  check('grave: Open Grave favours them over the other layouts', og.moleBroodPct > rest.moleBroodPct, `${og.moleBroodPct}% vs ${rest.moleBroodPct}%`);
}

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify(report, null, 1));
console.log(`${fails.length ? 'FAIL' : 'PASS'} ${Object.keys(report.checks).length - fails.length}/${Object.keys(report.checks).length} -> ${OUT}`);
process.exit(fails.length ? 1 : 0);
