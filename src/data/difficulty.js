// Difficulty curve (docs/gauntlet/PLAN.md §4.2, docs/BUILD_BRIEF.md §23.2).
// Owner: M4a. ARCH commits the binding formula; M4a wires it into the run and
// the wave director (sim/run.js, sim/waves.js) and may add fields, never
// change the numbers without a dated BUILD_BRIEF tuning note.
//
//   T(act)    = ACT_TIER[act]                    1.00 / 1.35 / 1.75
//   R(room)   = 1 + ROOM_SLOPE × (room − 1)       rooms 1..6 (combat), slope 0.08
//   hpMul     = T × R × CHALLENGE[c].hp
//   dmgMul    = (1 + 0.5 × (T × R − 1)) × CHALLENGE[c].dmg
//   budget    = 4.0 × T × R   threat points per kill_all wave (defend: × 0.8)
//   elite     = ELITE[act](room)
//   interval  = 480 ticks × (1 − 0.04 × (room − 1)) × INTERVAL_ACT[act]
//   bossHp    = 1800 × T ; bossDmgMul = 1 + 0.5 × (T − 1)
//
// Pure module. The ?room= harness (no run, no act) never calls this: it keeps
// the legacy §11 composition exactly (PLAN gate G4a.6).

export const ACT_TIER = Object.freeze([null, 1.0, 1.35, 1.75]);
export const ROOM_SLOPE = 0.08;
export const BASE_BUDGET = 4.0;
export const DEFEND_BUDGET_SCALE = 0.8;
export const WAVE_INTERVAL_TICKS = 480; // §11 8 s
export const INTERVAL_ACT = Object.freeze([null, 1.0, 0.95, 0.9]);
export const WAVE_SIZE_CAP = 8; // enemies per wave
export const ROOM_CONCURRENT_CAP = 20; // live hostiles per room (§1 hard ceiling is 40)

// Player-selectable challenge (Gameplay setting `gameplay.challenge`, captured
// into the run state at run start so saves/net sessions keep it).
export const CHALLENGE = Object.freeze({
  relaxed: Object.freeze({ hp: 0.75, dmg: 0.7 }),
  standard: Object.freeze({ hp: 1.0, dmg: 1.0 }),
  harrowing: Object.freeze({ hp: 1.25, dmg: 1.3 }),
});

// Threat cost per archetype (budget draws). Elite = cost × ELITE_COST.
export const THREAT = Object.freeze({
  boar: 1.0,
  mantis: 1.2,
  quillback: 1.5,
  toad: 1.6,
  moth: 1.3,
  ram: 3.0,
  mole: 1.5,
});
export const ELITE_COST = 1.8;
export const ELITE_MUL = Object.freeze({ hp: 1.8, dmg: 1.25, scale: 1.2 });

const ELITE = Object.freeze([
  null,
  (room) => (room <= 3 ? 0 : 0.08),
  (room) => 0.12 + 0.02 * (room - 1),
  (room) => 0.2 + 0.03 * (room - 1),
]);

const r4 = (v) => Math.round(v * 10000) / 10000;

// difficulty(act = 1..3, room = 1..8, challenge = 'standard') -> numbers for
// one room. Rooms 7 (shop) and 8 (boss) reuse room 6's ramp for their adds.
export function difficulty(act = 1, room = 1, challenge = 'standard') {
  const a = Math.min(3, Math.max(1, act | 0));
  const r = Math.min(6, Math.max(1, room | 0));
  const c = CHALLENGE[challenge] ?? CHALLENGE.standard;
  const T = ACT_TIER[a];
  const R = 1 + ROOM_SLOPE * (r - 1);
  return Object.freeze({
    act: a,
    room: r,
    challenge: CHALLENGE[challenge] ? challenge : 'standard',
    tier: T,
    ramp: r4(R),
    hpMul: r4(T * R * c.hp),
    dmgMul: r4((1 + 0.5 * (T * R - 1)) * c.dmg),
    budget: r4(BASE_BUDGET * T * R),
    defendBudget: r4(BASE_BUDGET * T * R * DEFEND_BUDGET_SCALE),
    eliteChance: r4(ELITE[a](r)),
    waveIntervalTicks: Math.round(WAVE_INTERVAL_TICKS * (1 - 0.04 * (r - 1)) * INTERVAL_ACT[a]),
    waystoneHp: Math.round(150 * Math.sqrt(T)),
    bossHp: Math.round(1800 * T * c.hp),
    bossDmgMul: r4((1 + 0.5 * (T - 1)) * c.dmg),
  });
}

// The whole curve as a table (debug API / critic probe: __echoes.cmd('difficultyTable')).
export function difficultyTable(challenge = 'standard') {
  const rows = [];
  for (let act = 1; act <= 3; act++) for (let room = 1; room <= 6; room++) rows.push(difficulty(act, room, challenge));
  return rows;
}
