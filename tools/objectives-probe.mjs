#!/usr/bin/env node
// ROOM OBJECTIVES probe (docs/ROOM_OBJECTIVES.md), headless sim, no browser:
//   assign   campaign levels place objective rooms in rooms 4-6 only (one on
//            the first level, one hunt + one purge later), the legacy single
//            run and the tutorial never meet one
//   hunt     the quarry is an elite of the act, never lands a hit, flees and
//            rests winded; killed in time -> won, bounty paid
//   escape   a quarry left alive escapes: soft-fail, no bounty
//   purge    three spread nests, each keeps at most childCap spawns alive;
//            all destroyed -> won, bounty paid
//   rooted   the purge timer runs out: soft-fail, no bounty
//   replay   the same seed plays a hunt and a purge to the same events
//   save     a mid-purge capture continues bit-identically in a fresh world
//
//   node tools/objectives-probe.mjs [--seed 4] [--out captures/objectives-probe.json]
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const O = await import(u('src/sim/objectives.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/objectives-probe.json');
const R = O.OBJECTIVE_RULES;

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

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
  const ap = world.runSystem().autopilot;
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
    if (['quarry_spawn', 'quarry_escape', 'nest_spawn', 'nest_brood', 'purge_start', 'purge_rooted', 'room_soft_fail', 'room_cleared', 'glint_gain', 'hit', 'death'].includes(e.type)) log.push(e);
  });
  const step = () => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  function continuation(n, every = 60) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      for (let k = 0; k < every; k++) step();
      hashes.push(hashState(io.capture()));
    }
    const events = rec.map((e) => canonicalJSON(e));
    rec = null;
    return { hashes, events };
  }
  const run = () => world.runSystem();
  return { registry, bus, clock, world, ap, io, step, continuation, log, run };
}

// Keep the party standing (the escape / rooted legs idle through a room).
function holdParty(w) {
  for (const e of w.registry.all()) if (e.partyIndex !== undefined && e.hp > 0) e.hp = e.maxHp;
}
const roomView = (w) => w.world.snapshotState ? w.world.snapshotState().room : null;
function objRoom(w) {
  const r = roomView(w);
  return r || null;
}
// Start a Level-`level` campaign with room `n` forced to `mode`, walk into it.
function into(seed, mode, n = 4, level = 1, autopilot = false) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  if (autopilot) w.ap.configure(true);
  w.world.cmd('objectiveRoom', mode, n);
  w.world.cmd('skipToRoom', n);
  w.step();
  return w;
}
const bounties = (w, kind) => w.log.filter((e) => e.type === 'glint_gain' && e.reason === `${kind}_bounty`);
// The objective room's own clear (skipToRoom clears the room it leaves).
const cleared = (w) => w.log.filter((e) => e.type === 'room_cleared' && e.objective).at(-1);
function stepUntil(w, pred, guard, each = null) {
  for (let i = 0; i < guard; i++) {
    if (each) each();
    w.step();
    if (pred()) return true;
  }
  return false;
}

// -------------------------------------------------------------- assign --
{
  let level1Ok = true;
  let laterOk = true;
  const bad = [];
  for (let s = 1; s <= 40; s++) {
    const w = build(s);
    w.run().startCampaign({ level: 1, harness: true });
    const modes = w.run().view().frame.modes;
    const objs = modes.map((m, i) => ({ m, room: i + 1 })).filter((x) => O.isObjectiveMode(x.m));
    if (objs.length !== 1 || objs.some((x) => x.room < R.fromRoom || x.room > 6)) {
      level1Ok = false;
      bad.push({ seed: s, modes });
    }
    const later = ['kill_all', 'kill_all', 'defend', 'kill_all', 'kill_all', 'kill_all', 'shop', 'boss'];
    const got = O.assignObjectives(later, s * 7919, 2);
    const kinds = got.map((g) => g.mode).sort().join(',');
    if (got.length !== 2 || kinds !== 'hunt,purge' || got.some((g) => g.room < 4 || g.room > 6)) {
      laterOk = false;
      bad.push({ seed: s, later: got });
    }
  }
  check('assign', 'every Level 1 campaign (seeds 1-40) holds exactly one objective room, in rooms 4-6', level1Ok, bad.slice(0, 3));
  check('assign', 'a later level holds one hunt and one purge, in rooms 4-6', laterOk);
  const kinds = new Set();
  for (let s = 1; s <= 40; s++) {
    const m = ['kill_all', 'kill_all', 'kill_all', 'kill_all', 'kill_all', 'kill_all'];
    O.assignObjectives(m, s, 1);
    m.filter(O.isObjectiveMode).forEach((k) => kinds.add(k));
  }
  check('assign', 'both kinds turn up on first levels', kinds.has('hunt') && kinds.has('purge'), [...kinds]);
  const legacy = build(SEED);
  legacy.run().startRun({ act: 1 });
  const lm = legacy.run().view().frame.modes;
  check('assign', 'the legacy single run never meets an objective room', !lm.some(O.isObjectiveMode), lm);
  const tut = build(SEED);
  tut.run().startCampaign({ tutorial: true, harness: true });
  const tm = tut.run().view().frame ? tut.run().view().frame.modes : [];
  check('assign', 'the tutorial never meets an objective room', !tm.some(O.isObjectiveMode), tm);
}

// ---------------------------------------------------------------- hunt --
{
  const w = into(SEED, 'hunt', 4);
  check('hunt', 'room 4 plays as a hunt', w.run().view().mode === 'hunt', w.run().view().mode);
  stepUntil(w, () => w.log.some((e) => e.type === 'quarry_spawn'), 600);
  const qs = w.log.find((e) => e.type === 'quarry_spawn');
  const q = qs && w.registry.byId(qs.id);
  check('hunt', "the quarry is the act's own enemy, elite, with the hunt's HP", !!q && q.kind === O.quarryFor(1) && q.elite === true && Math.abs(q.maxHp - R.hunt.hp * w.run().roomPlan().hpMul) < 1, q && { kind: q.kind, elite: q.elite, maxHp: q.maxHp });
  const x0 = q.x;
  const z0 = q.z;
  let winded = false;
  let path = 0;
  let px = q.x;
  let pz = q.z;
  // Idle the party for 8 s beside the quarry: it must run and never strike.
  for (let i = 0; i < 480; i++) {
    holdParty(w);
    w.step();
    if (q.quarry.winded) winded = true;
    path += Math.hypot(q.x - px, q.z - pz);
    px = q.x;
    pz = q.z;
  }
  const struck = w.log.filter((e) => e.type === 'hit' && e.attacker === q.id);
  check('hunt', 'the quarry never lands a hit', struck.length === 0, struck.length);
  check('hunt', 'it flees (runs a path, not in place) and rests winded', path > 6 && winded, { path: Math.round(path * 10) / 10, from: [x0, z0], winded });
  const r = objRoom(w);
  check('hunt', 'the room view carries the quarry and the escape clock', !!r && r.quarry && r.quarry.id === q.id && r.huntTicksLeft > 0, r && { quarry: r.quarry, left: r.huntTicksLeft });
  w.world.cmd('setHp', q.id, 0);
  w.ap.configure(true);
  stepUntil(w, () => !!cleared(w), 60 * 120);
  const c = cleared(w);
  check('hunt', 'the quarry killed in time wins the room', c && c.objective === 'hunt' && c.won === true && !c.softFailed, c);
  check('hunt', `the hunt's bounty (${R.bounty} Glint) is paid once`, bounties(w, 'hunt').length === 1 && bounties(w, 'hunt')[0].amount === R.bounty, bounties(w, 'hunt'));
}

// -------------------------------------------------------------- escape --
{
  const w = into(SEED, 'hunt', 4);
  stepUntil(w, () => w.log.some((e) => e.type === 'quarry_spawn'), 600);
  const qs = w.log.find((e) => e.type === 'quarry_spawn');
  const q = w.registry.byId(qs.id);
  const esc = stepUntil(w, () => w.log.some((e) => e.type === 'quarry_escape'), R.hunt.escapeTicks + 120, () => {
    holdParty(w);
    if (q.hp > 0) q.hp = q.maxHp;
  });
  const at = w.log.find((e) => e.type === 'quarry_escape');
  check('escape', 'a quarry left alive escapes when its clock runs out', esc && at.tick >= qs.escapeTick - 1 && at.tick <= qs.escapeTick + 2, at && { at: at.tick, want: qs.escapeTick });
  check('escape', 'the room soft-fails', w.log.some((e) => e.type === 'room_soft_fail' && e.mode === 'hunt'));
  w.world.cmd('killAllEnemies');
  w.ap.configure(true);
  stepUntil(w, () => !!cleared(w), 60 * 180);
  const c = cleared(w);
  check('escape', 'the room still clears, lost, with no bounty', c && c.softFailed === true && !c.won && bounties(w, 'hunt').length === 0, c);
}

// --------------------------------------------------------------- purge --
let saveTree = null;
{
  const w = into(SEED, 'purge', 5);
  check('purge', 'room 5 plays as a purge', w.run().view().mode === 'purge', w.run().view().mode);
  stepUntil(w, () => w.log.filter((e) => e.type === 'nest_spawn').length >= 3, 300);
  const ns = w.log.filter((e) => e.type === 'nest_spawn').map((e) => w.registry.byId(e.id));
  let minD = Infinity;
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) minD = Math.min(minD, Math.hypot(ns[i].x - ns[j].x, ns[i].z - ns[j].z));
  check('purge', 'three nests stand, well spread', ns.length === 3 && minD > 5, { n: ns.length, minD: Math.round(minD * 10) / 10 });
  // 30 s idle: count each nest's living brood every tick.
  let maxBrood = 0;
  for (let i = 0; i < 1800; i++) {
    holdParty(w);
    w.step();
    if (i === 900) saveTree = clonePlain(w.io.capture());
    for (const n of ns) maxBrood = Math.max(maxBrood, w.registry.all().filter((e) => e.nestOf === n.id && e.hp > 0).length);
  }
  const broods = w.log.filter((e) => e.type === 'nest_brood').length;
  check('purge', `the nests spawn, never more than ${R.purge.childCap} living each`, broods >= 3 && maxBrood <= R.purge.childCap, { broods, maxBrood });
  for (const n of ns) w.world.cmd('setHp', n.id, 0);
  w.ap.configure(true);
  stepUntil(w, () => !!cleared(w), 60 * 180);
  const c = cleared(w);
  check('purge', 'all three destroyed wins the room', c && c.objective === 'purge' && c.won === true && !c.softFailed, c);
  check('purge', 'the bounty is paid once', bounties(w, 'purge').length === 1, bounties(w, 'purge'));
}

// -------------------------------------------------------------- rooted --
{
  const w = into(SEED, 'purge', 5);
  const rooted = stepUntil(w, () => w.log.some((e) => e.type === 'purge_rooted'), R.purge.timerTicks + 240, () => holdParty(w));
  check('rooted', 'the corruption takes root when the purge timer runs out', rooted);
  check('rooted', 'the room soft-fails', w.log.some((e) => e.type === 'room_soft_fail' && e.mode === 'purge'));
  const alive = w.log.filter((e) => e.type === 'nest_spawn').map((e) => w.registry.byId(e.id)).filter((e) => e && e.hp > 0);
  check('rooted', 'the nests still stand (they must be destroyed to leave)', alive.length === 3 && !cleared(w), alive.length);
  for (const n of alive) w.world.cmd('setHp', n.id, 0);
  w.world.cmd('killAllEnemies');
  w.ap.configure(true);
  stepUntil(w, () => !!cleared(w), 60 * 180);
  const c = cleared(w);
  check('rooted', 'the room clears lost, with no bounty', c && c.softFailed === true && !c.won && bounties(w, 'purge').length === 0, c);
}

// -------------------------------------------------------------- replay --
for (const mode of ['hunt', 'purge']) {
  const a = into(SEED, mode, 4, 2, true);
  const b = into(SEED, mode, 4, 2, true);
  const ca = a.continuation(2400);
  const cb = b.continuation(2400);
  const same = JSON.stringify(ca.hashes) === JSON.stringify(cb.hashes) && JSON.stringify(ca.events) === JSON.stringify(cb.events);
  check('replay', `a Level 2 ${mode} with the autopilot plays the same twice (40 s)`, same && ca.events.length > 0, { events: ca.events.length });
}

// ---------------------------------------------------------------- save --
if (saveTree) {
  const a = build(SEED);
  const ok1 = a.io.apply(clonePlain(saveTree));
  const contA = a.continuation(900);
  const b = build(SEED + 1000);
  const ok2 = b.io.apply(clonePlain(saveTree));
  const contB = b.continuation(900);
  const same = JSON.stringify(contA.hashes) === JSON.stringify(contB.hashes) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  const r = objRoom(a);
  check('save', 'a mid-purge capture continues bit-identically in a fresh world, nests and all', ok1.ok && ok2.ok && same && r && r.nestsTotal === 3, { applyA: ok1.ok, applyB: ok2.ok, events: contA.events.length, nests: r && r.nestsAlive });
}

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ seed: SEED, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
