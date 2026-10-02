// Difficulty curve (docs/gauntlet/PLAN.md §4.2, docs/BUILD_BRIEF.md §23.2).
// Owner: M4a. ARCH commits the binding formula; M4a wires it into the run and
// the wave director (sim/run.js, sim/waves.js) and may add fields, never
// change the numbers without a dated BUILD_BRIEF tuning note.
//
//   T(act)    = ACT_TIER[act]                    1.00 / 1.60 / 3.10 (PARTY)
//   R(room)   = 1 + ROOM_SLOPE × (room − 1)       rooms 1..6 (combat), slope 0.21 (PARTY)
//   hpMul     = T × R × CHALLENGE[c].hp
//   dmgMul    = (1 + 0.5 × (T × R − 1)) × CHALLENGE[c].dmg × LEVEL_DMG[act] (0.75 / 1 / 1, fix-M4a-r5)
//   budget    = 4.0 × T × R   threat points per kill_all wave (defend: × 1.25)
//   elite     = ELITE[act](room)
//   interval  = 480 ticks × (1 − 0.04 × (room − 1)) × INTERVAL_ACT[act]
//   bossHp    = 2400 × T × STAG_HP_LEVEL[act] (1 / 1.8 / 1.2, PARTY)
//   bossDmgMul = (1 + BOSS_DMG_SLOPE × (T − 1)) × STAG_DMG_LEVEL[act], slope 1.8 (PARTY), 4 / 2 / 1 (fix-PARTY-r5)
//   boss adds = the act tier alone (hpMul T, dmgMul 1 + BOSS_DMG_SLOPE(T − 1), no STAG_DMG_LEVEL)
//               — the Stag and its adds scale together (sim/run.js)
//
// TUNING NOTE (M4a, 2026-09-22 — BUILD_BRIEF §23.2 dated note, PLAN §4.2
// "if the band fails, M4a retunes the constants, never the formula's shape"):
// the v0.5.1 constants (T 1.00/1.35/1.75, slope 0.08, defend × 0.8, Stag
// 1800·T, adds at room 6's ramp) failed the measured playability band on the
// deterministic default-build autopilot (tools/gnt-M4a-actrun.mjs, seeds
// 1–5): Act I party damage did not rise across rooms (Spearman ρ 0.14 — an
// 8-slot build outgrew a 1.4× ramp), and Act III won 0–1 of 5 with boss-room
// stalemates. Retuned: T 1.00/1.15/1.60, slope 0.12, defend × 1.25, Stag
// 2400·T, adds at the act tier. Measured band after the retune: see
// docs/gauntlet/build-M4a.md (all acts ρ ≥ 0.6 on time AND damage, victories
// 5/5 · 4/5 · 3/5, no stuck room, act medians I < II < III).
//
// TUNING NOTE (M4c, 2026-09-22 — the user's skill/socket correction; dated
// note in BUILD_BRIEF §23.2): M4a tuned the constants above against an
// 8-skill, 2-socket build that reached the Stag with ~5 nodes socketed. The
// corrected build (at most 4 skills, 8 sockets each, 2 clear spoils per room,
// a 4-card shop at 15/20/25) reaches it with ~19. Re-measured on the same
// default-build autopilot (seeds 1–20, headless = in page): Act III victories
// went 13/20 (v0.5.39) -> 20/20 and its rooms 4–6 lost their teeth (party
// downs in Act III rooms 4–6 over 20 runs: 106 -> 16). Only constants moved, never the
// formula's shape: slope 0.12 -> 0.16 (the room ramp outpaces ~3 new nodes a
// room), Act III tier 1.60 -> 1.75 (the v0.5.1 value), and the Stag's damage
// slope — the 0.5 in 1 + 0.5(T − 1), now the named BOSS_DMG_SLOPE — 0.5 ->
// 0.7 so the Stag room keeps its damage spike above the steeper late rooms.
// Measured after the retune: seeds 1–5 (gate G4a.10) wins 5/5 · 4/5 · 3/5,
// every band check passes, 0 stuck; seeds 1–20 wins 20/20 · 19/20 · 13/20
// (Act III = the v0.5.39 rate), 0 stuck, kill_all-only ρ time/damage ≥ 0.886
// in every act (docs/gauntlet/build-M4c.md, tools/gntM4c-band.mjs).
//
// TUNING NOTE (CAMPAIGN, 2026-09-25 — the binding dated note in BUILD_BRIEF
// §23.2, PLAN §12.10): in the linear campaign Levels 2 and 3 meet the build
// CARRIED out of the previous level (4 skills, 19/32 sockets at the Level 1
// -> 2 card, 32/32 at 2 -> 3), not M4c's fresh build. Only constants moved:
// ACT_TIER 1.00/1.15/1.75 -> 1.00/1.60/2.80, BOSS_DMG_SLOPE 0.7 -> 0.9,
// STAG_HP_LEVEL [1, 1.35, 1] (new: the Level 2 Stag stays a spike), and the
// starter grant for a Level-N start (src/data/campaign.js STARTER_GRANT).
// Measured: carried campaign seeds 1-5 clears 5/5 · 5/5 · 4/5, L2 start 5/5 ·
// 4/5, L3 start 3/5, every band check true (tools/gntCAMPAIGN-camprun.mjs).
// Gate G4a.5 compares this module with the note: tools/gntfixM4a3-g4a5.mjs.
//
// TUNING NOTE (PARTY, 2026-09-28 — the binding dated note in BUILD_BRIEF
// §23.2, PLAN §16.8 / GP.13): the per-character builds give the three allies
// the Healer's growth model (4 skills x 8 sockets, swap offers, class
// techniques: taunts, Iron Stance / Shield Wall shields, parries). On the
// CAMPAIGN constants the four built characters flattened the game: party
// damage per combat room fell to x0.51-0.73 of the v0.5.150 baseline and the
// Stag room's to x0.41 (tools/gntPARTY-band.mjs, seeds 1-5, carried from
// Level 1 and Level-2 / Level-3 starts). Only constants moved, never the
// formula's shape: room slope 0.16 -> 0.21, Level 3 tier 2.80 -> 3.10,
// BOSS_DMG_SLOPE 0.9 -> 1.8, STAG_HP_LEVEL [1, 1.35, 1] -> [1, 1.8, 1.2] (a
// longer, survivable Stag fight keeps its damage spike instead of a burst
// that wipes the party), and the ally starter grant (src/data/campaign.js
// STARTER_GRANT[N].allies). Measured (v0.5.163, seeds 1-5): every §4.2 /
// GC.12 band check true from all three starts; per-level combat-room damage
// x0.75-1.18 and time-to-clear x0.99-1.16 of the baseline; the Level 3 Stag
// room >= 1.0 x its baseline (docs/gauntlet/build-PARTY.md S8, S9).
//
// Pure module. The ?room= harness (no run, no act) never calls this: it keeps
// the legacy §11 composition exactly (PLAN gate G4a.6).

export const ACT_TIER = Object.freeze([null, 1.0, 1.6, 3.1]);
export const ROOM_SLOPE = 0.21;
export const BASE_BUDGET = 4.0;
export const DEFEND_BUDGET_SCALE = 1.25;
export const STAG_BASE_HP = 2400; // bossHp = STAG_BASE_HP × T × STAG_HP_LEVEL[act]
// Per-level Stag HP factor (CAMPAIGN retune, 2026-09-25): the Stag meets a
// CARRIED build from Level 2 on; 1.0 keeps a level on the plain formula.
export const STAG_HP_LEVEL = Object.freeze([null, 1.0, 1.8, 1.2]);
export const BOSS_DMG_SLOPE = 1.8; // bossDmgMul = addDmgMul = 1 + BOSS_DMG_SLOPE × (T − 1)
// fix-M4a-r5 (content r5 F5 / F7, GP.13 — the dated BUILD_BRIEF §23.2 note):
// the per-level enemy-damage factor on the combat rooms (dmgMul). The AI
// engagement fix (data/classes.js AI_ENGAGE) put the melee pair in front of
// Level 1's waves — the Tank and the Swordsman now take the hits the Archer's
// arrows used to prevent — and Level 1's median party damage per combat room
// rose to x1.5 of the v0.5.150 baseline (GP.13 (b) caps it at x1.35); Level 1's
// enemies hit 25 % softer so the first level keeps its measured feel.
export const LEVEL_DMG = Object.freeze([null, 0.75, 1.0, 1.0]);
// fix-PARTY-r5 (party critic r5 F9 — GP.13 (d) ">= 1 party down per level on
// >= 2 of 5 seeds"; the dated BUILD_BRIEF §23.2 note): the per-level factor on
// the STAG's own hits (quake, trample — never its adds). Once the four
// characters were built and the AI engaged (MENACE, overdue-first casts), a
// carried party met the Level 1 and Level 2 Stags with no member going down on
// 4-5 of 5 seeds: the party's healing soaks attrition (a Level 1 Stag with 2x
// HP and 2x damage still downed nobody in 20 seeds) — only a HIT that is a
// real threat does. The Level 1 Stag's quake / trample now land 60 / 48 (x4)
// and the Level 2 Stag's 62 / 50 (x2 on top of its tier): a telegraphed boss
// hit that can down the Archer or a just-revived member, as the Level 3
// Stag's already could (72 / 57). Measured: tools/gntfixPARTY5-sweep.mjs,
// tools/gntPARTY-band.mjs (docs/gauntlet/fix-PARTY-r5.md).
export const STAG_DMG_LEVEL = Object.freeze([null, 4.0, 2.0, 1.0]);
// PARTY (PLAN §16.9): the determinism proof's Node-only switch — the
// v0.5.150 (CAMPAIGN) constants back in force (cmd('difficultyLegacy')). The
// game never sets it; tools/gntPARTY-goldenproof.mjs does.
const LEGACY = Object.freeze({ tier: Object.freeze([null, 1.0, 1.6, 2.8]), slope: 0.16, stag: Object.freeze([null, 1.0, 1.35, 1.0]), bossSlope: 0.9 });
let legacy = false;
export function setDifficultyLegacy(on) {
  legacy = !!on;
  return legacy;
}
export const isDifficultyLegacy = () => legacy;
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
  // Content slice 1 (docs/CONTENT_PLAN.md §3).
  rotcap: 1.0,
  snail: 1.4,
  crow: 1.6,
  brood: 2.0, // its two Broodlings ride on the mother's cost
  broodling: 0.4,
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
  const tiers = legacy ? LEGACY.tier : ACT_TIER;
  const slope = legacy ? LEGACY.slope : ROOM_SLOPE;
  const stagLevel = legacy ? LEGACY.stag : STAG_HP_LEVEL;
  const bossSlope = legacy ? LEGACY.bossSlope : BOSS_DMG_SLOPE;
  const T = tiers[a];
  const R = 1 + slope * (r - 1);
  const levelDmg = legacy ? 1 : LEVEL_DMG[a] ?? 1;
  return Object.freeze({
    act: a,
    room: r,
    challenge: CHALLENGE[challenge] ? challenge : 'standard',
    tier: T,
    ramp: r4(R),
    hpMul: r4(T * R * c.hp),
    dmgMul: r4((1 + 0.5 * (T * R - 1)) * c.dmg * levelDmg),
    budget: r4(BASE_BUDGET * T * R),
    defendBudget: r4(BASE_BUDGET * T * R * DEFEND_BUDGET_SCALE),
    eliteChance: r4(ELITE[a](r)),
    waveIntervalTicks: Math.round(WAVE_INTERVAL_TICKS * (1 - 0.04 * (r - 1)) * INTERVAL_ACT[a]),
    waystoneHp: Math.round(150 * Math.sqrt(T)),
    bossHp: Math.round(STAG_BASE_HP * T * (stagLevel[a] ?? 1) * c.hp),
    // Boss adds scale with the act tier alone, like the Stag they serve.
    addHpMul: r4(T * c.hp),
    addDmgMul: r4((1 + bossSlope * (T - 1)) * c.dmg),
    bossDmgMul: r4((1 + bossSlope * (T - 1)) * c.dmg * (legacy ? 1 : STAG_DMG_LEVEL[a] ?? 1)),
  });
}

// The whole curve as a table (debug API / critic probe: __echoes.cmd('difficultyTable')).
export function difficultyTable(challenge = 'standard') {
  const rows = [];
  for (let act = 1; act <= 3; act++) for (let room = 1; room <= 6; room++) rows.push(difficulty(act, room, challenge));
  return rows;
}
