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
import { innerBounds } from './movement.js';

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
  let schedule = []; // [{ size, units: [{ etype, x, z }] }]
  let waveIndex = -1;
  let pending = []; // spawn telegraphs in flight: { etype, x, z, spawnTick, wave }
  let fullySpawnedTick = -1; // current wave (kill_all pacing)
  let startTick = 0;
  let waystoneId = null;
  let cleared = false;
  let softFailed = false;

  const isEnemy = (e) => e.kind === 'boar' || e.kind === 'mantis';

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

  function startRoom(m) {
    if (m !== 'kill_all' && m !== 'defend') return null;
    const tick = getTick();
    enemies.reset();
    if (waystoneId !== null && registry.byId(waystoneId)) registry.despawn(waystoneId);
    mode = m;
    startTick = tick;
    waveIndex = -1;
    pending = [];
    fullySpawnedTick = -1;
    cleared = false;
    softFailed = false;
    waystoneId = null;

    // One fixed roll sequence (see header) — the whole room frame up front.
    schedule = [];
    if (m === 'kill_all') {
      const n = WAVE_RULES.killAll.minWaves + rng.int(WAVE_RULES.killAll.extraWaves);
      for (let w = 0; w < n; w++) {
        schedule.push(rollWave(WAVE_RULES.killAll.minSize + rng.int(WAVE_RULES.killAll.extraSize)));
      }
    } else {
      for (let w = 0; w < WAVE_RULES.defend.waveAtTicks.length; w++) {
        schedule.push(rollWave(WAVE_RULES.defend.minSize + rng.int(WAVE_RULES.defend.extraSize)));
      }
      const ws = registry.spawn({
        kind: 'waystone',
        faction: 'party', // joins the §11 defend candidate set {party} ∪ {objective}
        hittable: true,
        knockbackable: false,
        hp: WAYSTONE.hp,
        maxHp: WAYSTONE.hp,
        radius: WAYSTONE.radius,
        x: WAYSTONE.x,
        z: WAYSTONE.z,
        px: WAYSTONE.x,
        pz: WAYSTONE.z,
        iframeUntilTick: 0,
      });
      waystoneId = ws.id;
      events.emit(tick, 'waystone_spawn', { id: ws.id, x: WAYSTONE.x, z: WAYSTONE.z, hp: WAYSTONE.hp });
    }
    events.emit(tick, 'room_start', { mode: m, waves: schedule.map((w) => w.size) });
    beginWave(0);
    return { mode: m, waves: schedule.map((w) => w.size) };
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
      events.emit(tick, 'spawn_telegraph', { etype: u.etype, x: u.x, z: u.z, spawnTick, wave: i });
    }
  }

  // End-of-tick director work (§4 ④ slot; §11 clear predicates are evaluated
  // at end of tick).
  function step() {
    if (!mode || cleared) return;
    const tick = getTick();

    // Spawn maturations.
    if (pending.length > 0) {
      const due = pending.filter((p) => tick >= p.spawnTick);
      if (due.length > 0) {
        pending = pending.filter((p) => tick < p.spawnTick);
        for (const p of due) enemies.spawn(p.etype, p.x, p.z, p.wave);
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

    // Wave progression.
    const lastWave = waveIndex >= schedule.length - 1;
    if (mode === 'kill_all') {
      if (!lastWave && pending.length === 0 && fullySpawnedTick >= 0) {
        const timer =
          fullySpawnedTick + WAVE_RULES.killAll.graceTicks + WAVE_RULES.killAll.intervalTicks;
        if (alive === 0 || tick >= timer) beginWave(waveIndex + 1); // §11 whichever first
      }
    } else {
      // Defend waves ride absolute room time and run to completion regardless
      // of objective state (§11).
      const at = WAVE_RULES.defend.waveAtTicks;
      if (!lastWave && tick >= startTick + at[waveIndex + 1]) beginWave(waveIndex + 1);
    }

    // Clear predicates (end of tick).
    const scheduleExhausted = waveIndex === schedule.length - 1 && pending.length === 0;
    if (mode === 'kill_all' || softFailed) {
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
    events.emit(tick, 'room_cleared', { mode, softFailed });
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
    };
  }

  // Render-side accessor: spawn telegraphs in flight (read-only copies).
  const pendingSpawnsList = () => pending.map((p) => ({ ...p }));

  return { startRoom, step, forceNextWave, forceClear, roomState, pendingSpawnsList };
}
