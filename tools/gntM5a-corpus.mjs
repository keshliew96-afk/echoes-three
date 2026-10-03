#!/usr/bin/env node
// gntM5a — snapshot delta-compression corpus probe (docs/gauntlet/PLAN.md §7
// G5a.3). Runs the REAL sim headless in Node (same construction as main.js
// and tools/gnt-arch-simtrace.mjs, with M4a's autopilot playing seat 0 like
// the act runner), captures the state tree at every 3rd tick end (20 Hz), and
// streams it through the real host encoder (src/net/protocol/snapshot.js) to
// N simulated guests over a lossy, reordering, duplicating channel with lossy
// acks. Checks per decoded snapshot: canonical equality with the host's
// quantised view, hash agreement, and the bytes.
//
//   node tools/gntM5a-corpus.mjs [--acts 1,2,3] [--seconds 70] [--boss 1] [--guests 3]
//        [--loss 0.2] [--ackloss 0.2] [--seed 7] [--tree auto|composite] [--out captures/gntM5a-corpus.json]
//
// State tree: `--tree auto` (default) uses the save system's complete
// capture — M2's createStateIO (src/save/capture.js), the exact StateTree v1
// a host snapshots in the game — when it exists; `--tree composite` (or an
// older checkout) uses { clock, rng, registry { nextOrdinal, entities },
// world: world.snapshotState() minus its entity projections, systems { build } }.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(resolve(here, p)).href;
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const ACTS = String(arg('acts', '1,2,3')).split(',').map(Number);
const SECONDS = Number(arg('seconds', 70));
const BOSS = Number(arg('boss', 1)) === 1;
const GUESTS = Number(arg('guests', 3));
const LOSS = Number(arg('loss', 0.2));
const ACKLOSS = Number(arg('ackloss', 0.2));
const SEED = Number(arg('seed', 7));
const OUT = arg('out', 'captures/gntM5a-corpus.json');

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { createSnapshotHost, createSnapshotClient, pct } = await import(u('src/net/protocol/snapshot.js'));
const TREE = arg('tree', 'auto');
let createStateIO = null;
if (TREE !== 'composite' && existsSync(resolve(here, 'src/save/capture.js'))) {
  try {
    ({ createStateIO } = await import(u('src/save/capture.js')));
  } catch (err) {
    console.warn('save capture unavailable, using the composite tree:', err.message);
  }
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSim(seed) {
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
    // M2's RNG-WRAPPER contract (main.js): the live stream's state.
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const step = (t) => {
    const s = emptySnapshot();
    world.step(t, ap && ap.active() ? ap.intents(t, s) : s);
  };
  // M2's complete world state (world.serialize(), PLAN §3.4) once it exists;
  // until then the COMPOSITE cold part: world.snapshotState() minus its pure
  // projections of registry entities (party / zones / azones / skillBolts /
  // projectiles / enemies / eshots / party_ai.allies — the save tree carries
  // those once, in registry.entities) plus the build system's serialize().
  const io = createStateIO && typeof world.saveState === 'function' ? createStateIO({ clock, rng, registry, world }) : null;
  const hasSerialize = typeof world.serialize === 'function';
  const DERIVED = ['party', 'zones', 'azones', 'skillBolts', 'projectiles', 'enemies', 'eshots'];
  const capture = () => {
    const base = {
      v: 0,
      clock: { tick: clock.tick, hitstopRemaining: clock.hitstopRemaining },
      rng: { seed: rng.seed, draws: rng.drawIndex },
      registry: { nextOrdinal: registry.nextOrdinal, entities: registry.all() },
    };
    if (io) return io.capture(); // the REAL save StateTree v1 (M2, PLAN §3.4)
    if (hasSerialize) return { ...base, v: 1, world: world.serialize() };
    const view = world.snapshotState();
    for (const k of DERIVED) delete view[k];
    if (view.party_ai) view.party_ai = { ...view.party_ai, allies: undefined };
    return { ...base, world: view, systems: { build: world.buildSystem().serialize ? world.buildSystem().serialize() : null } };
  };
  return { rng, registry, bus, clock, world, step, capture, treeKind: io ? 'save.capture (StateTree v1)' : hasSerialize ? 'world.serialize' : 'composite' };
}

// Count null leaves (the cold tree must carry nulls for the G5a.3 null check).
function countNulls(v) {
  if (v === null) return 1;
  if (typeof v !== 'object') return 0;
  let n = 0;
  for (const k of Object.keys(v)) n += countNulls(v[k]);
  return n;
}

const segments = [];
for (const act of ACTS) segments.push({ act, room: 1, label: `act${act}` });
if (BOSS) segments.push({ act: 1, room: 8, label: 'boss' });

const R = mulberry(SEED * 7919);
const report = { schema: 'gntM5a-corpus/1', at: new Date().toISOString(), params: { acts: ACTS, seconds: SECONDS, boss: BOSS, guests: GUESTS, loss: LOSS, ackLoss: ACKLOSS, seed: SEED }, tree: 'composite', segments: [] };
let totalMismatch = 0;
let totalHashMismatch = 0;
let totalDecoded = 0;
let allFull = [];
let allDelta = [];
let combatTicksTotal = 0;
let nullLeavesMin = Infinity;
let maxPosErr = 0;
let maxMoverErr = 0;

for (const seg of segments) {
  const sim = buildSim(SEED + seg.act * 101 + seg.room);
  report.tree = sim.treeKind;
  sim.world.cmd('startRun', { act: seg.act });
  sim.world.cmd('autopilot', true);
  if (seg.room > 1) sim.world.cmd('skipToRoom', seg.room);
  const host = createSnapshotHost();
  const refLink = host.link(); // never acks: its encodings are the FULL reference
  const guests = [];
  for (let g = 0; g < GUESTS; g++) guests.push({ link: host.link(), client: createSnapshotClient(), inflight: [], acksInflight: [], decoded: 0, mismatches: 0, hashChecks: 0, hashMismatch: 0, noBaseline: 0, dupSeen: 0, bytes: 0, fulls: 0 });
  const ticks = SECONDS * 60;
  let combatTicks = 0;
  const fullSizes = [];
  const deltaSizes = [];
  const t0 = Date.now();
  for (let i = 0; i < ticks; i++) {
    sim.clock.stepOnce(sim.step);
    const tick = sim.clock.tick;
    const view = sim.world.runSystem().view();
    if (view.phase === 'combat') combatTicks += 1;
    // Deliver packets due this tick (simulated one-way latency 3..9 ticks,
    // 5% reordered by +2..6 ticks, 2% duplicated).
    for (const g of guests) {
      const due = g.inflight.filter((p) => p.at <= tick);
      g.inflight = g.inflight.filter((p) => p.at > tick);
      due.sort((a, b) => a.at - b.at || a.n - b.n);
      for (const p of due) {
        const r = g.client.decode(p.bytes);
        if (!r.ok) {
          if (r.error === 'no_baseline') g.noBaseline += 1;
          else throw new Error(`decode error ${r.error} ${r.message || ''}`);
          continue;
        }
        if (r.duplicate) {
          g.dupSeen += 1;
          continue;
        }
        g.decoded += 1;
        const want = canonicalJSON(host.view(p.rec));
        const got = canonicalJSON(r.view());
        if (want !== got) {
          g.mismatches += 1;
          if (!report.firstMismatch) report.firstMismatch = { seg: seg.label, seq: r.seq, wantLen: want.length, gotLen: got.length };
        }
        if (r.hashOk !== null) {
          g.hashChecks += 1;
          if (!r.hashOk) g.hashMismatch += 1;
        }
        // Ack with the next INPUT packet: lost with ACKLOSS, delayed 3..9 ticks.
        if (R() >= ACKLOSS) g.acksInflight.push({ at: tick + 3 + Math.floor(R() * 7), seq: g.client.ackSeq });
      }
      const acks = g.acksInflight.filter((a) => a.at <= tick);
      g.acksInflight = g.acksInflight.filter((a) => a.at > tick);
      for (const a of acks) host.ack(g.link, a.seq);
    }
    if (tick % 3 !== 0) continue;
    const tree = sim.capture();
    nullLeavesMin = Math.min(nullLeavesMin, countNulls(tree.world) + countNulls(tree.systems) + countNulls(tree.scene));
    const rec = host.capture(tick, tree);
    // Quantisation error vs the true tree (max over entities).
    const hv = host.view(rec);
    const trueById = new Map(tree.registry.entities.map((e) => [e.id, e]));
    for (const e of hv.registry.entities) {
      const t = trueById.get(e.id);
      if (!t || typeof t.x !== 'number') continue;
      const err = Math.max(Math.abs(t.x - e.x), Math.abs(t.z - e.z));
      if (typeof t.vx === 'number' && typeof t.traveled === 'number') maxMoverErr = Math.max(maxMoverErr, err);
      else maxPosErr = Math.max(maxPosErr, err);
    }
    fullSizes.push(host.encodeFor(refLink, rec, { forceFull: true }).length);
    for (const g of guests) {
      const bytes = host.encodeFor(g.link, rec, { seat: guests.indexOf(g) + 1 });
      g.bytes += bytes.length;
      const isFull = g.link.lastFullSeq === rec.seq;
      if (isFull) g.fulls += 1;
      else deltaSizes.push(bytes.length);
      if (R() < LOSS) continue; // snapshot lost
      let at = tick + 3 + Math.floor(R() * 7);
      if (R() < 0.05) at += 2 + Math.floor(R() * 5);
      g.inflight.push({ at, bytes, rec, n: rec.seq });
      if (R() < 0.02) g.inflight.push({ at: at + 1 + Math.floor(R() * 4), bytes, rec, n: rec.seq });
    }
  }
  const hs = host.stats();
  const segOut = {
    label: seg.label,
    act: seg.act,
    startRoom: seg.room,
    ticks,
    combatTicks,
    endRoom: sim.world.runSystem().view().room,
    endPhase: sim.world.runSystem().view().phase,
    snapshots: hs.captures,
    fullBytesAvg: +(fullSizes.reduce((s, x) => s + x, 0) / fullSizes.length).toFixed(1),
    deltaBytesAvg: +(deltaSizes.reduce((s, x) => s + x, 0) / Math.max(1, deltaSizes.length)).toFixed(1),
    captureMsP95: +(hs.captureMsP95 ?? 0).toFixed(3),
    encodeMsP95: +(hs.encodeMsP95 ?? 0).toFixed(3),
    bodyCacheHits: hs.bodyCacheHits,
    deltaHotAvg: +hs.deltaHotAvg.toFixed(1),
    deltaColdAvg: +hs.deltaColdAvg.toFixed(1),
    deltaChangedEntitiesAvg: +hs.deltaChangedAvg.toFixed(2),
    wallMs: Date.now() - t0,
    guests: guests.map((g, i) => ({
      seat: i + 1,
      decoded: g.decoded,
      mismatches: g.mismatches,
      hashChecks: g.hashChecks,
      hashMismatches: g.hashMismatch,
      noBaseline: g.noBaseline,
      duplicatesIgnored: g.dupSeen,
      fullsSent: g.fulls,
      bytesPerSec: +((g.bytes / ticks) * 60).toFixed(1),
    })),
  };
  segOut.deltaRatio = +(segOut.deltaBytesAvg / segOut.fullBytesAvg).toFixed(4);
  report.segments.push(segOut);
  for (const g of segOut.guests) {
    totalMismatch += g.mismatches;
    totalHashMismatch += g.hashMismatches;
    totalDecoded += g.decoded;
  }
  allFull = allFull.concat(fullSizes);
  allDelta = allDelta.concat(deltaSizes);
  combatTicksTotal += combatTicks;
  console.log(`${seg.label}: ${segOut.snapshots} snapshots, combat ${(combatTicks / 60).toFixed(1)} s, full ${segOut.fullBytesAvg} B, delta ${segOut.deltaBytesAvg} B, ratio ${segOut.deltaRatio} (hot ${segOut.deltaHotAvg} / cold ${segOut.deltaColdAvg} B, ${segOut.deltaChangedEntitiesAvg} ents), mismatches ${segOut.guests.map((g) => g.mismatches).join('/')}, hash ${segOut.guests.map((g) => `${g.hashChecks - g.hashMismatches}/${g.hashChecks}`).join(' ')}, down ${segOut.guests.map((g) => g.bytesPerSec).join('/')} B/s, capture p95 ${segOut.captureMsP95} ms, encode p95 ${segOut.encodeMsP95} ms`);
}
const fullAvg = allFull.reduce((s, x) => s + x, 0) / allFull.length;
const deltaAvg = allDelta.reduce((s, x) => s + x, 0) / allDelta.length;
report.summary = {
  snapshots: allFull.length,
  combatSeconds: +(combatTicksTotal / 60).toFixed(1),
  decodedTotal: totalDecoded,
  meanFullBytes: +fullAvg.toFixed(1),
  meanDeltaBytes: +deltaAvg.toFixed(1),
  deltaRatio: +(deltaAvg / fullAvg).toFixed(4),
  fullP95: pct(allFull, 0.95),
  deltaP95: pct(allDelta, 0.95),
  mismatches: totalMismatch,
  hashMismatches: totalHashMismatch,
  coldNullLeavesMin: nullLeavesMin,
  maxPosErrU: +maxPosErr.toFixed(5),
  maxMoverErrU: +maxMoverErr.toFixed(5),
};
const s = report.summary;
report.gates = {
  'G5a.3 delta<=30% of full': s.deltaRatio <= 0.3,
  'G5a.3 >=60 s combat corpus': s.combatSeconds >= 60,
  'G5a.3 decode(encode) exact under loss': s.mismatches === 0 && s.decodedTotal > 0,
  'G5a.3 cold tree with nulls never mismatches the hash': s.hashMismatches === 0 && s.coldNullLeavesMin > 0,
  'quantisation error <= 1/512 u (actors), <= 1/64 u + 1/512 (movers)': s.maxPosErrU <= 1 / 512 + 1e-9 && s.maxMoverErrU <= 1 / 64 + 1 / 512 + 1e-9,
};
console.log(JSON.stringify(report.summary));
for (const [k, v] of Object.entries(report.gates)) console.log(`${v ? 'PASS' : 'FAIL'}  ${k}`);
mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify(report, null, 1));
console.log(`-> ${OUT}`);
process.exit(Object.values(report.gates).every(Boolean) ? 0 : 1);
