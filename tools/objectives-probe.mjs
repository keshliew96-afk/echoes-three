#!/usr/bin/env node
// ROOM OBJECTIVES probe (docs/ROOM_OBJECTIVES.md), headless sim, no browser:
//   assign   campaign levels place objective rooms in rooms 4-6 only (one on
//            the first level, two of different kinds later; all four kinds
//            turn up), the legacy single run and the tutorial never meet one
//   hunt     the quarry is an elite of the act, never lands a hit, flees and
//            rests winded; killed in time -> won, bounty paid
//   escape   a quarry left alive escapes: soft-fail, no bounty
//   purge    three spread nests, each keeps at most childCap spawns alive;
//            all destroyed -> won, bounty paid
//   rooted   the purge timer runs out: soft-fail, no bounty
//   replay   the same seed plays a hunt and a purge to the same events
//   save     a mid-purge capture continues bit-identically in a fresh world
//   ESCORT AND HOLD (content plan 3 slice 7):
//   escort   the pilgrim (a party-side body with the escort's HP) walks a road
//            clear of the props from beside the party to the far side; it
//            waits when left alone and walks on when someone returns; the
//            waves strike it; it arrives -> won, bounty paid
//   fallen   the pilgrim dies: soft-fail, the room still clears, no bounty
//   hold     a sigil ring clear of the props and three spread rifts; the ring
//            stays lit while someone stands in it, the rifts keep at most
//            childCap spawns each; held to the end -> won, bounty paid
//   relight  a short absence fades the ring but a return wins it back
//   out      left empty past the fade the ring goes out: soft-fail, the rifts
//            close, the room still clears, no bounty
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
    if (['quarry_spawn', 'quarry_escape', 'nest_spawn', 'nest_brood', 'purge_start', 'purge_rooted', 'room_soft_fail', 'room_cleared', 'glint_gain', 'hit', 'death', 'pilgrim_spawn', 'pilgrim_wait', 'pilgrim_walk', 'pilgrim_arrive', 'pilgrim_lost', 'hold_start', 'hold_surge', 'sigil_fading', 'sigil_relit', 'sigil_out', 'sigil_sealed', 'rift_pulse', 'rift_brood'].includes(e.type)) log.push(e);
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
    if (got.length !== 2 || got[0].mode === got[1].mode || !got.every((g) => O.isObjectiveMode(g.mode)) || got.some((g) => g.room < 4 || g.room > 6)) {
      laterOk = false;
      bad.push({ seed: s, later: got });
    }
  }
  check('assign', 'every Level 1 campaign (seeds 1-40) holds exactly one objective room, in rooms 4-6', level1Ok, bad.slice(0, 3));
  check('assign', 'a later level holds two objective rooms of different kinds, in rooms 4-6', laterOk);
  const kinds = new Set();
  const pairs = new Set();
  for (let s = 1; s <= 40; s++) {
    const m = ['kill_all', 'kill_all', 'kill_all', 'kill_all', 'kill_all', 'kill_all'];
    O.assignObjectives(m, s, 1);
    m.filter(O.isObjectiveMode).forEach((k) => kinds.add(k));
    const later = ['kill_all', 'kill_all', 'kill_all', 'kill_all', 'kill_all', 'kill_all'];
    for (const k of [0, 1, 2]) pairs.add(O.assignObjectives([...later], s * 31 + k * 7919, 3).map((g) => g.mode).sort().join('+'));
  }
  check('assign', 'all four kinds turn up on first levels', O.OBJECTIVE_MODES.every((k) => kinds.has(k)), [...kinds]);
  check('assign', 'every pair of kinds turns up on later levels (6 of 6)', pairs.size === 6, [...pairs].sort());
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
  // ELITE AFFIXES (docs/ELITE_AFFIXES.md): prey carries no elite powers.
  check('hunt', 'the quarry carries no elite powers', !!q && !q.affixes && q.affixSpeed === undefined, q && q.affixes);
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
  // The AI seats still chip at the nests while the party idles; keep them whole
  // so only the timer decides (an affixed elite's fight can tip a nest over).
  const holdNests = () => { for (const e of w.registry.all()) if (e.kind === 'nest' && e.hp > 0) e.hp = e.maxHp; };
  const rooted = stepUntil(w, () => w.log.some((e) => e.type === 'purge_rooted'), R.purge.timerTicks + 240, () => { holdParty(w); holdNests(); });
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

// ------------------------------------------------------ ESCORT AND HOLD --
const { blockerClearance: staticClearance } = await import(u('src/sim/movement.js'));
const partyBodies = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
// Stand every party body at (x, z) (spread a little), whole.
function standParty(w, x, z) {
  partyBodies(w).forEach((b, i) => {
    const a = i * 1.7;
    b.x = b.px = x + Math.cos(a) * 0.5 * (i > 0 ? 1 : 0);
    b.z = b.pz = z + Math.sin(a) * 0.5 * (i > 0 ? 1 : 0);
    if (b.hp > 0) b.hp = b.maxHp;
  });
}
const E = R.escort;
const H = R.hold;
let escortSave = null;
let holdSave = null;
{
  const w = into(SEED, 'escort', 4);
  check('escort', 'room 4 plays as an escort', w.run().view().mode === 'escort', w.run().view().mode);
  const sp = w.log.find((e) => e.type === 'pilgrim_spawn') ?? (stepUntil(w, () => w.log.some((e) => e.type === 'pilgrim_spawn'), 60), w.log.find((e) => e.type === 'pilgrim_spawn'));
  const p = sp && w.registry.byId(sp.id);
  check('escort', "the pilgrim is a party-side body with the escort's HP", !!p && p.kind === 'pilgrim' && p.faction === 'party' && p.partyIndex === undefined && Math.abs(p.maxHp - E.hp * w.run().roomPlan().hpMul) < 1, p && { kind: p.kind, faction: p.faction, maxHp: p.maxHp });
  const route = sp.route;
  let minClear = Infinity;
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1];
    const [bx, bz] = route[i];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
    for (let k = 0; k <= n; k++) minClear = Math.min(minClear, staticClearance(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, E.radius));
  }
  const [sx, sz] = route[0];
  const [ex, ez] = route.at(-1);
  check('escort', 'the road starts beside the party, ends on the far side, and runs clear of the props', Math.hypot(sx, sz) < 3 && Math.abs(ex) > 8 && Math.sign(ex) !== Math.sign(sx) && minClear >= -0.02 && O.routeLength(route) > 20, { start: route[0], end: route.at(-1), points: route.length, length: Math.round(O.routeLength(route) * 10) / 10, minClear: Math.round(minClear * 100) / 100 });
  // 12 s walking with the party at its side (and the waves held off it).
  let hits = 0;
  for (let i = 0; i < 720; i++) {
    standParty(w, p.x - 1.2, p.z + 0.6);
    p.hp = p.maxHp;
    w.step();
  }
  const walked = p.escort.walked;
  check('escort', 'escorted, it walks the road', walked > 7 && !p.escort.waiting, { walked: Math.round(walked * 10) / 10 });
  // Left alone (the party across the room): it stops and calls; the waves strike it.
  const x0 = p.x;
  const z0 = p.z;
  for (let i = 0; i < 600; i++) {
    standParty(w, -p.x * 0.2 + (p.x > 0 ? -9 : 9), p.z > 0 ? -5 : 5);
    if (p.hp > 0) p.hp = p.maxHp;
    w.step();
  }
  hits = w.log.filter((e) => e.type === 'hit' && e.target === p.id).length;
  check('escort', 'left alone it waits (pilgrim_wait) and stays put', w.log.some((e) => e.type === 'pilgrim_wait') && p.escort.waiting && Math.hypot(p.x - x0, p.z - z0) < 0.6, { moved: Math.round(Math.hypot(p.x - x0, p.z - z0) * 100) / 100 });
  check('escort', 'the waves go for the pilgrim', hits > 0, { hits });
  escortSave = clonePlain(w.io.capture());
  // Back at its side: it walks on, and arrives.
  w.world.cmd('killAllEnemies');
  const arrived = stepUntil(w, () => !!cleared(w), 60 * 120, () => {
    standParty(w, p.x - 1.0, p.z + 0.5);
    if (p.hp > 0) p.hp = p.maxHp;
    w.world.cmd('killAllEnemies');
  });
  check('escort', 'a party member back at its side: it walks on (pilgrim_walk)', w.log.some((e) => e.type === 'pilgrim_walk'));
  const c = cleared(w);
  const at = w.log.find((e) => e.type === 'pilgrim_arrive');
  check('escort', 'it reaches the far end: the room is won', arrived && !!at && Math.hypot(at.x - ex, at.z - ez) < 0.5 && c.objective === 'escort' && c.won === true && !c.softFailed, c);
  check('escort', `the escort's bounty (${R.bounty} Glint) is paid once`, bounties(w, 'escort').length === 1 && bounties(w, 'escort')[0].amount === R.bounty, bounties(w, 'escort'));
}
{
  // Every act's layouts: the road runs clear of the blockers and is long.
  const bad = [];
  const layouts = new Set();
  for (let level = 1; level <= 4; level++)
    for (let s = 1; s <= 6; s++) {
      const w = into(s, 'escort', 4, level);
      const sp = w.log.find((e) => e.type === 'pilgrim_spawn');
      if (!sp) continue;
      layouts.add(w.run().view().layout.layoutId);
      const route = sp.route;
      let minClear = Infinity;
      for (let i = 1; i < route.length; i++) {
        const [ax, az] = route[i - 1];
        const [bx, bz] = route[i];
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
        for (let k = 0; k <= n; k++) minClear = Math.min(minClear, staticClearance(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, E.radius));
      }
      if (!(minClear >= -0.02) || O.routeLength(route) < 20) bad.push({ level, seed: s, layout: w.run().view().layout.layoutId, minClear, length: O.routeLength(route) });
    }
  check('roads', `the pilgrim's road is clear and long on every layout met (levels 1-4, seeds 1-6)`, bad.length === 0 && layouts.size >= 8, { layouts: [...layouts].sort((a, b) => a - b), bad: bad.slice(0, 3) });
}
{
  const w = into(SEED, 'escort', 4);
  stepUntil(w, () => w.log.some((e) => e.type === 'pilgrim_spawn'), 60);
  const p = w.registry.byId(w.log.find((e) => e.type === 'pilgrim_spawn').id);
  w.world.cmd('setHp', p.id, 0);
  stepUntil(w, () => w.log.some((e) => e.type === 'pilgrim_lost'), 30);
  check('fallen', 'the pilgrim falls: pilgrim_lost and a soft-fail', w.log.some((e) => e.type === 'pilgrim_lost') && w.log.some((e) => e.type === 'room_soft_fail' && e.mode === 'escort'));
  const r = objRoom(w);
  check('fallen', 'the room view says so (lost, the leash back on the party)', !!r && r.pilgrim && r.pilgrim.lost === true && r.softFailed === true, r && r.pilgrim);
  w.ap.configure(true);
  stepUntil(w, () => !!cleared(w), 60 * 180, () => holdParty(w));
  const c = cleared(w);
  check('fallen', 'the room still clears, lost, with no bounty', c && c.softFailed === true && !c.won && bounties(w, 'escort').length === 0, c);
}
{
  const w = into(SEED, 'hold', 5);
  check('hold', 'room 5 plays as a hold', w.run().view().mode === 'hold', w.run().view().mode);
  const hs = w.log.find((e) => e.type === 'hold_start');
  const rf = hs ? hs.rifts : [];
  let minD = Infinity;
  for (let i = 0; i < rf.length; i++) for (let j = i + 1; j < rf.length; j++) minD = Math.min(minD, Math.hypot(rf[i].x - rf[j].x, rf[i].z - rf[j].z));
  check('hold', 'a sigil ring clear of the props and three spread rifts', !!hs && hs.radius === H.radius && staticClearance(hs.x, hs.z, 1.1) >= 0 && rf.length === 3 && minD > 5, hs && { x: hs.x, z: hs.z, rifts: rf, minD: Math.round(minD * 10) / 10 });
  // 30 s with the party in the ring: lit, the rifts feed the room, capped.
  let maxBrood = 0;
  for (let i = 0; i < 1800; i++) {
    standParty(w, hs.x, hs.z);
    w.step();
    if (i === 900) holdSave = clonePlain(w.io.capture());
    for (let k = 0; k < 3; k++) maxBrood = Math.max(maxBrood, w.registry.all().filter((e) => e.riftOf === k && e.hp > 0 && e.state === 'active').length);
  }
  const broods = w.log.filter((e) => e.type === 'rift_brood').length;
  const r = objRoom(w);
  check('hold', `manned, the ring stays lit; the rifts spawn, never more than ${H.childCap} living each`, r.sigil.lit && r.sigil.fade === 0 && !w.log.some((e) => e.type === 'sigil_out') && broods >= 3 && maxBrood <= H.childCap, { broods, maxBrood, fade: r.sigil.fade });
  // 2 s out of it, then back: it fades and wins the light back.
  for (let i = 0; i < 120; i++) {
    standParty(w, hs.x + (hs.x > 0 ? -7 : 7), hs.z);
    w.step();
  }
  const fadeMid = objRoom(w).sigil.fade;
  for (let i = 0; i < 120; i++) {
    standParty(w, hs.x, hs.z);
    w.step();
  }
  check('relight', 'a short absence fades the ring (sigil_fading), a return wins it back (sigil_relit)', fadeMid > 0.3 && w.log.some((e) => e.type === 'sigil_fading') && w.log.some((e) => e.type === 'sigil_relit') && objRoom(w).sigil.fade === 0 && !w.log.some((e) => e.type === 'sigil_out'), { fadeMid });
  const won = stepUntil(w, () => !!cleared(w), H.timerTicks, () => standParty(w, hs.x, hs.z));
  const sealed = w.log.find((e) => e.type === 'sigil_sealed');
  const surge = w.log.find((e) => e.type === 'hold_surge');
  const c = cleared(w);
  check('hold', 'held to the end of its clock: sealed and won, the surge came first', won && !!sealed && sealed.tick === hs.endTick && !!surge && surge.tick === hs.endTick - H.surgeTicks && c.objective === 'hold' && c.won === true && !c.softFailed, c && { sealed: sealed && sealed.tick, endTick: hs.endTick, surge: surge && surge.tick });
  check('hold', 'the bounty is paid once', bounties(w, 'hold').length === 1, bounties(w, 'hold'));
}
{
  const w = into(SEED, 'hold', 5);
  const hs = w.log.find((e) => e.type === 'hold_start');
  const away = () => standParty(w, hs.x + (hs.x > 0 ? -7 : 7), hs.z + (hs.z > 0 ? -4 : 4));
  const out = stepUntil(w, () => w.log.some((e) => e.type === 'sigil_out'), H.fadeTicks + 60, away);
  const fading = w.log.find((e) => e.type === 'sigil_fading');
  const at = w.log.find((e) => e.type === 'sigil_out');
  check('out', 'left empty, the ring goes out after the fade', out && at.tick - fading.tick >= H.fadeTicks - 2 && at.tick - fading.tick <= H.fadeTicks + 2, at && { fading: fading.tick, out: at.tick });
  check('out', 'the room soft-fails', w.log.some((e) => e.type === 'room_soft_fail' && e.mode === 'hold'));
  const pulses0 = w.log.filter((e) => e.type === 'rift_pulse').length;
  for (let i = 0; i < 900; i++) {
    holdParty(w);
    w.step();
  }
  check('out', 'the rifts close (no spawn after it went out)', w.log.filter((e) => e.type === 'rift_pulse').length === pulses0, { before: pulses0, after: w.log.filter((e) => e.type === 'rift_pulse').length });
  w.world.cmd('killAllEnemies');
  w.ap.configure(true);
  stepUntil(w, () => !!cleared(w), 60 * 180, () => holdParty(w));
  const c = cleared(w);
  check('out', 'the room clears lost, with no bounty', c && c.softFailed === true && !c.won && bounties(w, 'hold').length === 0, c);
}
for (const mode of ['escort', 'hold']) {
  const a = into(SEED, mode, 4, 2, true);
  const b = into(SEED, mode, 4, 2, true);
  const ca = a.continuation(2400);
  const cb = b.continuation(2400);
  const same = JSON.stringify(ca.hashes) === JSON.stringify(cb.hashes) && JSON.stringify(ca.events) === JSON.stringify(cb.events);
  check('replay', `a Level 2 ${mode} with the autopilot plays the same twice (40 s)`, same && ca.events.length > 0, { events: ca.events.length });
}
for (const [name, tree, key] of [['escort', escortSave, 'pilgrim'], ['hold', holdSave, 'sigil']]) {
  if (!tree) continue;
  const a = build(SEED);
  const ok1 = a.io.apply(clonePlain(tree));
  const contA = a.continuation(900);
  const b = build(SEED + 1000);
  const ok2 = b.io.apply(clonePlain(tree));
  const contB = b.continuation(900);
  const same = JSON.stringify(contA.hashes) === JSON.stringify(contB.hashes) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  const r = objRoom(a);
  check('save', `a mid-${name} capture continues bit-identically in a fresh world`, ok1.ok && ok2.ok && same && !!r && !!r[key], { applyA: ok1.ok, applyB: ok2.ok, events: contA.events.length });
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
