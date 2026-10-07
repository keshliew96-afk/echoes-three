// Wave director + room win conditions (BUILD_BRIEF §11) — the encounter
// scheduler for kill_all and defend rooms.
//
//   kill_all: 2–3 sequential waves (seeded roll) of 3–5 enemies, each enemy
//     60% Boar / 40% Mantis (seeded). Spawns at arena-edge spawn points with a
//     0.8 s spawn telegraph (violet shimmer, not Ember). Next wave at
//     previous-wave-dead OR 2.0 s after previous wave fully spawned +
//     wave-interval 8 s, whichever first. Clear: schedule exhausted ∧ no
//     living enemies ∧ >=1 party member not Downed (end of tick).
//   defend: objective = the Waystone (static rune monolith, 150 HP, warm amber
//     rune glow), defend_timer 45 s, waves at t = 0/12/24/36 s of 3–4 enemies
//     (same mix), running to completion regardless of objective state. Clear:
//     timer expires ∧ objective alive (survivors retreat + despawn). Objective
//     death = SOFT-FAIL: room converts to kill-all-remaining over the same
//     remaining schedule, the run continues (reward forfeiture + leash flip
//     land with the run/ally blocks; the `room_soft_fail` event is the hook).
//
// Determinism: the ENTIRE schedule — wave count, per-wave sizes, every enemy
// type and spawn point — is rolled from the seeded stream in one fixed sequence at
// startRoom, so one seed always produces one composition (the §1 run-frame
// discipline). Nothing after startRoom draws from the stream except combat
// crit rolls.
//
// GAUNTLET (docs/gauntlet/PLAN.md §4.2, BUILD_BRIEF §23.2) — inside a RUN the
// run system plans each room with a `plan` = { act, room, challenge, level,
// diff } (data/levels.js + data/difficulty.js): kill_all rooms roll 2 + int(2)
// waves (+1 from room 4), defend rooms 4 waves at 0/12/24/36 s; every wave is
// FILLED to its threat budget (4.0·T·R, defend × 0.8) by seeded weighted draws
// from the act roster (types introduced by this room), each draw with its own
// elite roll, while the unit's cost ≤ remaining + 0.5, at most 8 per wave;
// spawns carry the room's hpMul / dmgMul through enemies.spawnScaled (M4b);
// the kill_all wave interval and the Waystone's HP follow the curve; at most
// 20 hostiles live per room (a spawn waits in its telegraph while the room is
// full). The `?room=` harness (no plan) keeps the legacy §11 roll EXACTLY
// (gate G4a.6).
import { innerBounds } from './movement.js';
import { THREAT, ELITE_COST, WAVE_SIZE_CAP, ROOM_CONCURRENT_CAP } from '../data/difficulty.js';
// ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md): hunt and purge rooms. Their
// state lives in `obj` (null in kill_all / defend rooms, so those rooms save,
// hash and replay exactly as before).
import { OBJECTIVE_RULES, quarryFor, quarryState, nestSpots, isObjectiveMode } from './objectives.js';
import { enemyStats, ELITE } from './enemies.js';

const r2 = (v) => Math.round(v * 100) / 100;

// §11 numbers, verbatim (ticks = seconds x 60).
export const WAVE_RULES = Object.freeze({
  spawnTelegraphTicks: 48, // 0.8 s spawn telegraph
  boarChance: 0.6, // 60% Boar / 40% Mantis
  killAll: Object.freeze({
    minWaves: 2, // 2–3 sequential waves
    extraWaves: 2, // rng.int(2) -> +0..1
    minSize: 3, // 3–5 enemies
    extraSize: 3, // rng.int(3) -> +0..2
    graceTicks: 120, // 2.0 s after previous wave fully spawned...
    intervalTicks: 480, // ...+ wave-interval 8 s
  }),
  defend: Object.freeze({
    timerTicks: 2700, // defend_timer 45 s
    waveAtTicks: Object.freeze([0, 720, 1440, 2160]), // waves at 0/12/24/36 s
    minSize: 3, // 3–4 enemies each
    extraSize: 2,
  }),
});

// §11 Waystone: 150 HP static rune monolith. Position/footprint are authored
// scaffold (center-south of the spawn arc, clear of the ally idle spots).
export const WAYSTONE = Object.freeze({ hp: 150, x: 0, z: 1.6, radius: 0.45 });

// Arena-edge spawn ring (§11 "arena-edge spawn points"): 8 authored points
// inset from the walls, clear of every variant's prop clusters.
export const SPAWN_POINTS = Object.freeze([
  [-5, -6.6],
  [5, -6.6],
  [-10.2, -3],
  [10.2, -3],
  [-10.2, 3],
  [10.2, 3],
  [-5, 6.6],
  [5, 6.6],
]);

export function createWaveDirector({ registry, events, rng, enemies, getTick }) {
  let mode = null; // null | 'kill_all' | 'defend'
  let schedule = []; // [{ size, units: [{ etype, x, z, elite?, cost? }], budget?, cost? }]
  let waveIndex = -1;
  let pending = []; // spawn telegraphs in flight: { etype, x, z, spawnTick, wave, elite? }
  let fullySpawnedTick = -1; // current wave (kill_all pacing)
  let startTick = 0;
  let waystoneId = null;
  let cleared = false;
  let softFailed = false;
  // Gauntlet run plan for the live room (null in the ?room= harness): the
  // difficulty numbers the schedule was rolled with + what spawns carry.
  let plan = null; // { act, room, challenge, hpMul, dmgMul, eliteChance, intervalTicks, waystoneHp, budget, defendBudget }
  let planned = null; // mode staged by planRoom(), started by beginRoom()
  // ROOM OBJECTIVES: { kind: 'hunt'|'purge', ...} while a hunt / purge room
  // is planned or live (see objectives.js for the rules).
  let obj = null;

  // Live hostile wave bodies (every enemy kind, by faction — PLAN §3.6 (d)):
  // the Stag and enemy shots are not wave members; retreating bodies no
  // longer count (their `state` leaves 'active').
  const isEnemy = (e) => e.faction === 'hostile' && e.state !== undefined && e.kind !== 'stag' && e.boss !== true && e.kind !== 'eshot';

  // M4b's content contract: `spawnScaled(etype, x, z, { hpMul, dmgMul, elite,
  // wave })` and `hasType(etype)`. Without them (a build before M4b) only the
  // two v0.4.63 archetypes exist and nothing is scaled.
  const knownType = (etype) =>
    typeof enemies.hasType === 'function' ? !!enemies.hasType(etype) : etype === 'boar' || etype === 'mantis';

  function rollWave(size) {
    const units = [];
    for (let i = 0; i < size; i++) {
      const etype = rng.chance(WAVE_RULES.boarChance) ? 'boar' : 'mantis'; // §11 60/40
      const [sx, sz] = SPAWN_POINTS[rng.int(SPAWN_POINTS.length)];
      // Deterministic tangential fan so same-point spawns never stack exactly.
      const inv = Math.hypot(sx, sz) || 1;
      const tx = -(-sz / inv); // tangent = perp of the toward-center direction
      const tz = -(sx / inv);
      const off = (i - (size - 1) / 2) * 0.55;
      units.push({ etype, x: r2(sx + tx * off), z: r2(sz + tz * off) });
    }
    return { size, units };
  }

  // §23.2 budget fill (one wave). Draw order per unit: type (weighted), elite
  // (only when the room's chance is > 0), spawn point — fixed, so one seed is
  // one composition. The first unit always joins (every wave has a body).
  function rollBudgetWave(budget, p) {
    const roster = p.roster; // [[etype, weight], ...] sorted by etype, introduced + known
    const total = roster.reduce((s, [, w]) => s + w, 0);
    const units = [];
    let remaining = budget;
    let cost = 0;
    while (units.length < WAVE_SIZE_CAP && roster.length > 0) {
      let r = rng.float() * total;
      let etype = roster[roster.length - 1][0];
      for (const [et, w] of roster) {
        if (r < w) {
          etype = et;
          break;
        }
        r -= w;
      }
      const elite = p.eliteChance > 0 ? rng.chance(p.eliteChance) : false;
      const c = (THREAT[etype] ?? 1) * (elite ? ELITE_COST : 1);
      if (units.length > 0 && c > remaining + 0.5) break;
      const [sx, sz] = SPAWN_POINTS[rng.int(SPAWN_POINTS.length)];
      units.push({ etype, sx, sz, elite, cost: Math.round(c * 100) / 100 });
      remaining -= c;
      cost += c;
    }
    // Same deterministic tangential fan as the legacy roll, per spawn point.
    const byPoint = new Map();
    for (const u of units) {
      const k = `${u.sx},${u.sz}`;
      byPoint.set(k, (byPoint.get(k) ?? 0) + 1);
    }
    const seen = new Map();
    const out = units.map((u) => {
      const k = `${u.sx},${u.sz}`;
      const n = byPoint.get(k);
      const i = seen.get(k) ?? 0;
      seen.set(k, i + 1);
      const inv = Math.hypot(u.sx, u.sz) || 1;
      const tx = u.sz / inv;
      const tz = -(u.sx / inv);
      const off = (i - (n - 1) / 2) * 0.55;
      const unit = { etype: u.etype, x: r2(u.sx + tx * off), z: r2(u.sz + tz * off), cost: u.cost };
      if (u.elite) unit.elite = true;
      return unit;
    });
    return { size: out.length, units: out, budget: Math.round(budget * 100) / 100, cost: Math.round(cost * 100) / 100 };
  }

  // ROOM OBJECTIVES: a nest's spawn list — the same weighted type draw and
  // elite roll as a wave unit, no budget (the nest's cadence is its budget).
  function rollNestList(n, p) {
    const roster = p.roster;
    const total = roster.reduce((s, [, w]) => s + w, 0);
    const out = [];
    for (let i = 0; i < n; i++) {
      let r = rng.float() * total;
      let etype = roster[roster.length - 1][0];
      for (const [et, w] of roster) {
        if (r < w) {
          etype = et;
          break;
        }
        r -= w;
      }
      const elite = p.eliteChance > 0 ? rng.chance(p.eliteChance) : false;
      out.push(elite ? { etype, elite: true } : { etype });
    }
    return out;
  }

  // planRoom(m, runPlan?) rolls the whole schedule (no events, no spawns);
  // beginRoom() then starts it. The run system rolls its room layout BETWEEN
  // the two (PLAN §3.6 (a): "after the wave schedule") and emits
  // layout_enter / room_enter before the room begins.
  function planRoom(m, runPlan = null) {
    if (m !== 'kill_all' && m !== 'defend' && !(isObjectiveMode(m) && runPlan)) return null;
    enemies.reset();
    if (waystoneId !== null && registry.byId(waystoneId)) registry.despawn(waystoneId);
    mode = null;
    waveIndex = -1;
    pending = [];
    fullySpawnedTick = -1;
    cleared = false;
    softFailed = false;
    waystoneId = null;
    plan = null;
    obj = null;
    schedule = [];
    if (!runPlan) {
      // One fixed roll sequence (see header) — the whole room frame up front.
      if (m === 'kill_all') {
        const n = WAVE_RULES.killAll.minWaves + rng.int(WAVE_RULES.killAll.extraWaves);
        for (let w = 0; w < n; w++) {
          schedule.push(rollWave(WAVE_RULES.killAll.minSize + rng.int(WAVE_RULES.killAll.extraSize)));
        }
      } else {
        for (let w = 0; w < WAVE_RULES.defend.waveAtTicks.length; w++) {
          schedule.push(rollWave(WAVE_RULES.defend.minSize + rng.int(WAVE_RULES.defend.extraSize)));
        }
      }
    } else {
      const d = runPlan.diff;
      const level = runPlan.level;
      const roster = Object.keys(level.roster)
        .sort()
        .filter((et) => (level.introduce[et] ?? 1) <= runPlan.room && knownType(et))
        .map((et) => [et, level.roster[et]]);
      plan = {
        act: runPlan.act,
        room: runPlan.room,
        challenge: runPlan.challenge,
        hpMul: d.hpMul,
        dmgMul: d.dmgMul,
        eliteChance: d.eliteChance,
        intervalTicks: d.waveIntervalTicks,
        waystoneHp: d.waystoneHp,
        budget: d.budget,
        defendBudget: d.defendBudget,
        roster: roster.map(([et, w]) => [et, w]),
      };
      if (roster.length === 0) plan.roster = [['boar', 1]];
      if (m === 'kill_all') {
        const n = WAVE_RULES.killAll.minWaves + rng.int(WAVE_RULES.killAll.extraWaves) + (runPlan.room >= 4 ? 1 : 0);
        for (let w = 0; w < n; w++) schedule.push(rollBudgetWave(d.budget, plan));
      } else if (m === 'hunt') {
        // The kill_all wave count on a lighter budget; the quarry leads wave 1.
        const H = OBJECTIVE_RULES.hunt;
        const n = WAVE_RULES.killAll.minWaves + rng.int(WAVE_RULES.killAll.extraWaves) + (runPlan.room >= 4 ? 1 : 0);
        for (let w = 0; w < n; w++) schedule.push(rollBudgetWave(r2(d.budget * H.budgetMul), plan));
        const etype = knownType(quarryFor(runPlan.act)) ? quarryFor(runPlan.act) : 'boar';
        const [qx, qz] = SPAWN_POINTS[rng.int(SPAWN_POINTS.length)];
        schedule[0].units.unshift({ etype, x: qx, z: qz, cost: 0, elite: true, quarry: true });
        schedule[0].size = schedule[0].units.length;
        obj = { kind: 'hunt', etype, quarryId: null, escapeTick: null, escaped: false, won: false };
      } else if (m === 'purge') {
        // One opening wave; then the nests feed the room from their own lists.
        const P = OBJECTIVE_RULES.purge;
        schedule.push(rollBudgetWave(r2(d.budget * P.openingBudgetMul), plan));
        const start = rng.int(SPAWN_POINTS.length);
        const lists = [];
        for (let k = 0; k < P.nests; k++) lists.push(rollNestList(P.spawnsPerNest, plan));
        obj = { kind: 'purge', start, lists, nests: [], endTick: null, rooted: false, won: false, ring: null };
      } else {
        for (let w = 0; w < WAVE_RULES.defend.waveAtTicks.length; w++)
          schedule.push(rollBudgetWave(d.defendBudget, plan));
      }
    }
    planned = m;
    return { mode: m, waves: schedule.map((w) => w.size) };
  }

  function beginRoom() {
    const m = planned;
    if (!m) return null;
    planned = null;
    const tick = getTick();
    mode = m;
    startTick = tick;
    if (m === 'defend') {
      const hp = plan ? plan.waystoneHp : WAYSTONE.hp;
      const ws = registry.spawn({
        kind: 'waystone',
        faction: 'party', // joins the §11 defend candidate set {party} ∪ {objective}
        hittable: true,
        knockbackable: false,
        hp,
        maxHp: hp,
        radius: WAYSTONE.radius,
        x: WAYSTONE.x,
        z: WAYSTONE.z,
        px: WAYSTONE.x,
        pz: WAYSTONE.z,
        iframeUntilTick: 0,
      });
      waystoneId = ws.id;
      events.emit(tick, 'waystone_spawn', { id: ws.id, x: WAYSTONE.x, z: WAYSTONE.z, hp });
    }
    if (obj && obj.kind === 'purge') beginPurge(tick);
    events.emit(tick, 'room_start', { mode: m, waves: schedule.map((w) => w.size) });
    beginWave(0);
    return { mode: m, waves: schedule.map((w) => w.size) };
  }

  // Slice-2 layouts (data/layouts.js `spawns`): move every planned unit from
  // its SPAWN_POINTS point onto the same index of the room's own ring, fan
  // offset kept. Called by the run frame right after the layout roll — no
  // draws, and the relocated schedule is what serialize() already saves.
  function relocateSpawns(ring) {
    if (!Array.isArray(ring) || ring.length !== SPAWN_POINTS.length) return;
    if (obj && obj.kind === 'purge') obj.ring = ring.map((p) => [p[0], p[1]]);
    for (const w of schedule) {
      for (const u of w.units) {
        let k = 0;
        let best = Infinity;
        for (let i = 0; i < SPAWN_POINTS.length; i++) {
          const d = Math.hypot(u.x - SPAWN_POINTS[i][0], u.z - SPAWN_POINTS[i][1]);
          if (d < best) {
            best = d;
            k = i;
          }
        }
        u.x = r2(u.x + ring[k][0] - SPAWN_POINTS[k][0]);
        u.z = r2(u.z + ring[k][1] - SPAWN_POINTS[k][1]);
      }
    }
  }

  // Balance pass (data/layouts.js `mix`): a layout that favours some types
  // retypes part of the planned schedule after the layout roll, like
  // relocateSpawns: no draws, and serialize() saves the result. Walking the
  // units in plan order, every `every`-th unit that is not already favoured,
  // costs at most `maxThreat` (so Rams and Knights stay) becomes the next
  // favoured type in turn (only types already introduced by this room). Its
  // cost is re-read so the room's planned threat stays honest.
  function favourRoster(mix, level, room) {
    if (!mix || !Array.isArray(mix.favour) || !plan) return 0;
    const intro = (level && level.introduce) || {};
    const favour = mix.favour.filter((et) => (intro[et] ?? 1) <= room && knownType(et));
    if (favour.length === 0) return 0;
    const every = Math.max(1, mix.every | 0 || 2);
    let seen = 0;
    let next = 0;
    let swapped = 0;
    for (const w of schedule) {
      const before = swapped;
      for (const u of w.units) {
        if (u.quarry || favour.includes(u.etype)) continue;
        if ((THREAT[u.etype] ?? 1) > (mix.maxThreat ?? 2)) continue;
        seen += 1;
        if ((seen - 1) % every !== 0) continue;
        u.etype = favour[next % favour.length];
        next += 1;
        u.cost = Math.round((THREAT[u.etype] ?? 1) * (u.elite ? ELITE_COST : 1) * 100) / 100;
        swapped += 1;
      }
      if (swapped > before) w.cost = Math.round(w.units.reduce((n, u) => n + (u.cost ?? 0), 0) * 100) / 100;
    }
    return swapped;
  }

  function startRoom(m, runPlan = null) {
    if (!planRoom(m, runPlan)) return null;
    return beginRoom();
  }

  function beginWave(i) {
    const tick = getTick();
    waveIndex = i;
    fullySpawnedTick = -1;
    const wave = schedule[i];
    events.emit(tick, 'wave_start', { index: i, total: schedule.length, size: wave.size });
    for (const u of wave.units) {
      const spawnTick = tick + WAVE_RULES.spawnTelegraphTicks; // §11 0.8 s telegraph
      pending.push({ ...u, spawnTick, wave: i });
      const ev = { etype: u.etype, x: u.x, z: u.z, spawnTick, wave: i };
      if (u.elite) ev.elite = true;
      if (u.quarry) ev.quarry = true;
      events.emit(tick, 'spawn_telegraph', ev);
    }
  }

  function spawnUnit(p) {
    if (p.quarry) return spawnQuarry(p);
    if (p.nest !== undefined) {
      const e = enemies.spawnScaled(p.etype, p.x, p.z, { hpMul: plan.hpMul, dmgMul: plan.dmgMul, elite: !!p.elite, wave: p.wave });
      if (e) {
        e.nestOf = p.nest;
        events.emit(getTick(), 'nest_brood', { nest: p.nest, id: e.id, etype: p.etype });
      }
      return e;
    }
    if (plan && typeof enemies.spawnScaled === 'function') {
      return enemies.spawnScaled(p.etype, p.x, p.z, { hpMul: plan.hpMul, dmgMul: plan.dmgMul, elite: !!p.elite, wave: p.wave });
    }
    const e = enemies.spawn(p.etype, p.x, p.z, p.wave);
    // A build without M4b's spawnScaled: the curve's HP still lands.
    if (e && plan && plan.hpMul !== 1) {
      e.hp *= plan.hpMul;
      e.maxHp *= plan.hpMul;
      e.dmgMul = plan.dmgMul;
    }
    return e;
  }

  // ------------------------------------------------- ROOM OBJECTIVES --
  // The quarry: an elite of the act's own roster with the hunt's HP, its
  // archetype's attacks off (sim/enemies.js runs quarryFlee instead).
  function spawnQuarry(p) {
    const H = OBJECTIVE_RULES.hunt;
    const S = enemyStats(p.etype);
    const want = H.hp * (plan ? plan.hpMul : 1);
    const hpMul = S && S.hp > 0 ? want / (S.hp * ELITE.hpMul) : 1;
    const e = enemies.spawnScaled(p.etype, p.x, p.z, { hpMul, dmgMul: plan ? plan.dmgMul : 1, elite: true, wave: p.wave });
    if (!e) return null;
    const tick = getTick();
    e.quarry = quarryState(tick);
    e.telegraph = null;
    if (e.guard) e.guard.active = false; // a fleeing Ram drops its horn guard
    obj.quarryId = e.id;
    obj.escapeTick = e.quarry.escapeTick;
    events.emit(tick, 'quarry_spawn', { id: e.id, etype: p.etype, x: r2(e.x), z: r2(e.z), hp: r2(e.hp), escapeTick: e.quarry.escapeTick });
    return e;
  }

  // The nests stand at three points of the room's spawn ring.
  function beginPurge(tick) {
    const P = OBJECTIVE_RULES.purge;
    const ring = obj.ring ?? SPAWN_POINTS.map((q) => [q[0], q[1]]);
    // The drawn point first, then each next the ring point farthest from
    // the ones already taken (ties: ring order), so the nests spread out.
    const idx = [obj.start % ring.length];
    while (idx.length < P.nests) {
      let best = -1;
      let bestD = -1;
      ring.forEach(([x, z], i) => {
        if (idx.includes(i)) return;
        const d = Math.min(...idx.map((j) => Math.hypot(x - ring[j][0], z - ring[j][1])));
        if (d > bestD + 1e-9) {
          bestD = d;
          best = i;
        }
      });
      idx.push(best);
    }
    const spots = nestSpots(idx.map((i) => ring[i]));
    const hp = r2(P.hp * (plan ? plan.hpMul : 1));
    obj.nests = [];
    obj.endTick = tick + P.timerTicks;
    spots.forEach((sp, k) => {
      const e = registry.spawn({
        kind: 'nest',
        faction: 'hostile',
        hittable: true,
        knockbackable: false,
        hp,
        maxHp: hp,
        radius: P.radius,
        x: sp.x,
        z: sp.z,
        px: sp.x,
        pz: sp.z,
        iframeUntilTick: 0,
        nest: { index: k, nextSpawnTick: tick + P.firstSpawnTicks + k * P.staggerTicks, spawned: 0 },
      });
      obj.nests.push(e.id);
      events.emit(tick, 'nest_spawn', { id: e.id, index: k, x: sp.x, z: sp.z, hp });
    });
    events.emit(tick, 'purge_start', { nests: obj.nests.length, endTick: obj.endTick });
  }

  const liveNests = () => (obj && obj.kind === 'purge' ? obj.nests.map((id) => registry.byId(id)).filter((e) => e && e.hp > 0) : []);

  // A nest's turn: one telegraphed spawn from its list when it has room.
  function stepNests(tick) {
    const P = OBJECTIVE_RULES.purge;
    for (const nest of liveNests()) {
      const st = nest.nest;
      if (tick < st.nextSpawnTick) continue;
      let kids = 0;
      for (const e of registry.all()) if (e.nestOf === nest.id && e.state === 'active' && e.hp > 0) kids += 1;
      for (const p of pending) if (p.nest === nest.id) kids += 1;
      if (kids >= P.childCap) {
        st.nextSpawnTick = tick + 30;
        continue;
      }
      const list = obj.lists[st.index % obj.lists.length];
      const u = list[st.spawned % list.length];
      const a = st.spawned * 2.39996 + st.index;
      const x = r2(nest.x + Math.cos(a) * (nest.radius + 0.55));
      const z = r2(nest.z + Math.sin(a) * (nest.radius + 0.55));
      const spawnTick = tick + WAVE_RULES.spawnTelegraphTicks;
      const unit = { etype: u.etype, x, z, spawnTick, wave: Math.max(0, waveIndex), nest: nest.id };
      if (u.elite) unit.elite = true;
      pending.push(unit);
      st.spawned += 1;
      st.nextSpawnTick = tick + (nest.hp < nest.maxHp * 0.5 ? P.woundedCadenceTicks : P.cadenceTicks);
      const ev = { etype: u.etype, x, z, spawnTick, wave: unit.wave, nest: nest.id };
      if (u.elite) ev.elite = true;
      events.emit(tick, 'spawn_telegraph', ev);
      events.emit(tick, 'nest_pulse', { id: nest.id, etype: u.etype, x: r2(nest.x), z: r2(nest.z) });
    }
  }

  // End-of-tick director work (§4 ④ slot; §11 clear predicates are evaluated
  // at end of tick).
  function step() {
    if (!mode || cleared) return;
    const tick = getTick();

    // Spawn maturations. Inside a run the room holds at most
    // ROOM_CONCURRENT_CAP live hostiles: a due spawn waits in its telegraph
    // (in schedule order) until a body frees a place.
    if (pending.length > 0) {
      const due = pending.filter((p) => tick >= p.spawnTick);
      if (due.length > 0) {
        if (!plan) {
          pending = pending.filter((p) => tick < p.spawnTick);
          for (const p of due) spawnUnit(p);
        } else {
          let live = 0;
          for (const e of registry.all()) if (isEnemy(e) && e.state === 'active') live += 1;
          const room = Math.max(0, ROOM_CONCURRENT_CAP - live);
          const go = due.slice(0, room);
          if (go.length > 0) {
            const goSet = new Set(go);
            pending = pending.filter((p) => !goSet.has(p));
            for (const p of go) spawnUnit(p);
          }
        }
      }
      if (pending.length === 0 && fullySpawnedTick < 0) fullySpawnedTick = tick;
    } else if (fullySpawnedTick < 0) {
      fullySpawnedTick = tick;
    }

    let alive = 0;
    let shots = 0;
    let partyUp = false;
    for (const e of registry.all()) {
      if (isEnemy(e) && e.state === 'active') alive += 1;
      else if (e.kind === 'eshot') shots += 1;
      else if (e.partyIndex !== undefined && e.hp > 0) partyUp = true;
    }

    // Defend soft-fail: the Waystone died (combat.kill already emitted the
    // death event and despawned it).
    if (mode === 'defend' && !softFailed && waystoneId !== null && !registry.byId(waystoneId)) {
      softFailed = true;
      events.emit(tick, 'room_soft_fail', { mode });
    }

    // ROOM OBJECTIVES: the quarry's escape, the nests' spawns and the purge
    // timer.
    if (mode === 'hunt' && obj && obj.quarryId !== null && !obj.escaped && !obj.won) {
      const q = registry.byId(obj.quarryId);
      if (!q) obj.won = true; // killed (an escape keeps the body until it is out)
      else if (q.state === 'active' && tick >= q.quarry.escapeTick) {
        obj.escaped = true;
        enemies.startRetreat(q);
        events.emit(tick, 'quarry_escape', { id: q.id, x: r2(q.x), z: r2(q.z) });
        softFailed = true;
        events.emit(tick, 'room_soft_fail', { mode });
      }
    }
    let nestsAlive = 0;
    if (mode === 'purge' && obj) {
      stepNests(tick);
      nestsAlive = liveNests().length;
      if (nestsAlive === 0 && !obj.won && !obj.rooted) obj.won = true;
      if (nestsAlive > 0 && !softFailed && tick >= obj.endTick) {
        obj.rooted = true;
        softFailed = true;
        events.emit(tick, 'purge_rooted', { nests: nestsAlive });
        events.emit(tick, 'room_soft_fail', { mode });
      }
    }

    // Wave progression.
    const lastWave = waveIndex >= schedule.length - 1;
    if (mode === 'kill_all' || mode === 'hunt') {
      if (!lastWave && pending.length === 0 && fullySpawnedTick >= 0) {
        const timer =
          fullySpawnedTick + WAVE_RULES.killAll.graceTicks + (plan ? plan.intervalTicks : WAVE_RULES.killAll.intervalTicks);
        if (alive === 0 || tick >= timer) beginWave(waveIndex + 1); // §11 whichever first
      }
    } else if (mode === 'defend') {
      // Defend waves ride absolute room time and run to completion regardless
      // of objective state (§11).
      const at = WAVE_RULES.defend.waveAtTicks;
      if (!lastWave && tick >= startTick + at[waveIndex + 1]) beginWave(waveIndex + 1);
    }

    // Clear predicates (end of tick).
    const scheduleExhausted = waveIndex === schedule.length - 1 && pending.length === 0;
    if (mode === 'purge') {
      // Won: the last nest fell (the rest retreat). Rooted: every nest and
      // every body must still go.
      if (!softFailed && nestsAlive === 0) doClear();
      else if (softFailed && nestsAlive === 0 && scheduleExhausted && alive === 0 && shots === 0 && partyUp) doClear();
    } else if (mode === 'hunt' && !softFailed) {
      if (obj && obj.won) doClear();
    } else if (mode === 'kill_all' || softFailed) {
      if (scheduleExhausted && alive === 0 && shots === 0 && partyUp) doClear();
    } else if (mode === 'defend') {
      const waystoneAlive = waystoneId !== null && !!registry.byId(waystoneId);
      if (tick >= startTick + WAVE_RULES.defend.timerTicks && waystoneAlive) doClear();
    }
  }

  function doClear() {
    const tick = getTick();
    cleared = true;
    pending = [];
    enemies.despawnShots(); // §13: no instance may land after the clear tick
    enemies.retreatAllSurvivors(); // §11: survivors retreat + despawn
    // ROOM OBJECTIVES: what the room was won by (keys only in hunt / purge).
    const extra = obj && !softFailed ? { objective: obj.kind, won: true } : obj ? { objective: obj.kind } : {};
    events.emit(tick, 'room_cleared', { mode, softFailed, ...extra });
  }

  // Run end (§2 "all run state is wiped at run end"; §18 "Corruption never
  // touches Camp"): the director stops DEAD. The schedule, every spawn
  // telegraph in flight and the Waystone go, and `mode` drops to null so
  // step() is a no-op until the next startRoom. Without this the pending
  // spawns matured 48 ticks after run_end and the next wave rolled into the
  // Defeat card and the camp (Round D F6).
  function stop(cause = "run_end") {
    if (mode === null && pending.length === 0) return false;
    const tick = getTick();
    if (waystoneId !== null && registry.byId(waystoneId)) registry.despawn(waystoneId);
    if (obj && obj.kind === 'purge') for (const id of obj.nests) if (registry.byId(id)) registry.despawn(id);
    obj = null;
    const dropped = pending.length;
    mode = null;
    planned = null;
    plan = null;
    schedule = [];
    waveIndex = -1;
    pending = [];
    fullySpawnedTick = -1;
    cleared = false;
    softFailed = false;
    waystoneId = null;
    events.emit(tick, "director_stop", { cause, droppedSpawns: dropped });
    return true;
  }

  // ------------------------------------------------------------- test hooks --
  const forceNextWave = () => {
    if (!mode || cleared || waveIndex >= schedule.length - 1) return null;
    beginWave(waveIndex + 1);
    return waveIndex;
  };
  const forceClear = () => {
    if (!mode || cleared) return null;
    doClear();
    return true;
  };

  function roomState() {
    if (!mode) return null;
    const tick = getTick();
    let alive = 0;
    for (const e of registry.all()) if (isEnemy(e) && e.state === 'active') alive += 1;
    const ws = waystoneId !== null ? registry.byId(waystoneId) : null;
    return {
      mode,
      cleared,
      softFailed,
      waveIndex,
      wavesTotal: schedule.length,
      waveSizes: schedule.map((w) => w.size),
      pendingSpawns: pending.length,
      aliveEnemies: alive,
      defendTicksLeft:
        mode === 'defend' && !cleared
          ? Math.max(0, startTick + WAVE_RULES.defend.timerTicks - tick)
          : null,
      waystone: ws ? { id: ws.id, hp: ws.hp, maxHp: ws.maxHp } : null,
      ...(obj ? objectiveState(tick) : {}),
    };
  }

  // ROOM OBJECTIVES: the HUD / probe view of a hunt or a purge.
  function objectiveState(tick) {
    if (obj.kind === 'hunt') {
      const q = obj.quarryId !== null ? registry.byId(obj.quarryId) : null;
      return {
        quarry: {
          id: obj.quarryId,
          etype: obj.etype,
          hp: q && !obj.escaped ? Math.max(0, q.hp) : 0,
          maxHp: q ? q.maxHp : 0,
          spawned: obj.quarryId !== null,
          winded: !!(q && q.quarry && q.quarry.winded),
          escaped: obj.escaped,
          killed: obj.won,
        },
        huntTicksLeft: obj.escapeTick !== null && !obj.escaped && !obj.won && !cleared ? Math.max(0, obj.escapeTick - tick) : null,
      };
    }
    const nests = obj.nests.map((id) => {
      const e = registry.byId(id);
      return { id, hp: e ? Math.max(0, e.hp) : 0, maxHp: e ? e.maxHp : 0, alive: !!(e && e.hp > 0) };
    });
    return {
      nests,
      nestsAlive: nests.filter((n) => n.alive).length,
      nestsTotal: OBJECTIVE_RULES.purge.nests,
      purgeTicksLeft: obj.endTick !== null && !softFailed && !cleared ? Math.max(0, obj.endTick - tick) : null,
      rooted: obj.rooted,
    };
  }

  // Render-side accessor: spawn telegraphs in flight (read-only copies).
  const pendingSpawnsList = () => pending.map((p) => ({ ...p }));

  // The rolled plan of the live room (content probe `roomPlan()`, the act
  // runner, the curve gate G4a.5): the difficulty numbers it was rolled with
  // and every wave's budget / cost / units.
  function planView() {
    if (!mode && !planned) return null;
    return {
      mode: mode ?? planned,
      legacy: !plan,
      act: plan ? plan.act : null,
      room: plan ? plan.room : null,
      challenge: plan ? plan.challenge : null,
      hpMul: plan ? plan.hpMul : 1,
      dmgMul: plan ? plan.dmgMul : 1,
      eliteChance: plan ? plan.eliteChance : 0,
      intervalTicks: plan ? plan.intervalTicks : WAVE_RULES.killAll.intervalTicks,
      waystoneHp: plan ? plan.waystoneHp : WAYSTONE.hp,
      roster: plan ? plan.roster.map(([et, w]) => ({ etype: et, weight: w })) : [{ etype: 'boar', weight: 0.6 }, { etype: 'mantis', weight: 0.4 }],
      waves: schedule.map((w) => ({
        size: w.size,
        budget: w.budget ?? null,
        cost: w.cost ?? null,
        elites: w.units.filter((u) => u.elite).length,
        units: w.units.map((u) => ({ etype: u.etype, elite: !!u.elite, cost: u.cost ?? null })),
      })),
      waveIndex,
      pendingSpawns: pending.length,
      ...(obj ? { objective: obj.kind, ...(obj.kind === 'hunt' ? { quarry: obj.etype } : { nestLists: obj.lists.map((l) => l.map((u) => u.etype)) }) } : {}),
    };
  }

  // Persistence (PLAN §3.4 per-system contract): the director's private state
  // is plain data (entities are ids).
  function serialize() {
    return {
      mode,
      planned,
      plan: plan ? { ...plan, roster: plan.roster.map((r) => [...r]) } : null,
      schedule: schedule.map((w) => ({ ...w, units: w.units.map((u) => ({ ...u })) })),
      waveIndex,
      pending: pending.map((p) => ({ ...p })),
      fullySpawnedTick,
      startTick,
      waystoneId,
      cleared,
      softFailed,
      ...(obj ? { obj: structuredClone(obj) } : {}),
    };
  }
  function restore(d) {
    if (!d) return;
    mode = d.mode ?? null;
    planned = d.planned ?? null;
    plan = d.plan ? { ...d.plan, roster: (d.plan.roster ?? []).map((r) => [...r]) } : null;
    schedule = (d.schedule ?? []).map((w) => ({ ...w, units: w.units.map((u) => ({ ...u })) }));
    waveIndex = d.waveIndex ?? -1;
    pending = (d.pending ?? []).map((p) => ({ ...p }));
    fullySpawnedTick = d.fullySpawnedTick ?? -1;
    startTick = d.startTick ?? 0;
    waystoneId = d.waystoneId ?? null;
    cleared = !!d.cleared;
    softFailed = !!d.softFailed;
    obj = d.obj ? structuredClone(d.obj) : null;
  }

  return {
    startRoom,
    planRoom,
    beginRoom,
    relocateSpawns,
    favourRoster,
    stop,
    step,
    forceNextWave,
    forceClear,
    roomState,
    pendingSpawnsList,
    planView,
    serialize,
    restore,
    // Save system (PLAN §3.4, M2): serialize() is already the complete state.
    saveState: serialize,
    loadState: restore,
  };
}
