// ENDLESS DESCENT — the mode that keeps the game going after Act III
// (docs/ENDLESS.md). Owner: ENDLESS.
//
// An endless campaign is an ordinary campaign from Level 1 whose final level
// does not end the run: clearing Depth 3 (the Ashen Barrow, the campaign won)
// leads to Depth 4 in the Hollow Wood, and the three biomes cycle on until
// the party falls. Depth = the campaign's level index (1, 2, 3, 4, ...).
//
// Depths 1-3 ARE the campaign: the same difficulty(), rosters and bosses,
// number for number. From Depth 4 on:
//   - every depth is built on the Act III numbers (difficulty(3, room)) — a
//     Depth-4 woodland is never easier than the Barrow the party just left —
//     and each depth past 4 multiplies them by a named step (DEPTH_STEP);
//   - rosters mix: the home biome's roster plus every other act's creatures
//     at GUEST_WEIGHT of their own weight (one room later than at home);
//   - the boss alternates: each cycle meets the act's OTHER boss from the
//     one the seed met the cycle before, so both bosses of every act appear.
// Everything is a pure function of (depth, room, seed): no RNG draw, nothing
// saved beyond the campaign record, so replays and goldens stay exact.
//
// Pure data + helpers (sim-importable): no DOM, no three.
import { difficulty } from './difficulty.js';
import { LEVELS, ACT_IDS, levelFor, bossIndexFor } from './levels.js';

const ORDER = Object.freeze([...ACT_IDS].sort((a, b) => a - b));
export const CYCLE = ORDER.length; // 3 biomes per cycle

// Per depth past Depth 4 (k = depth - 4; Depth 4 plays the Act III numbers). Tuned against the headless
// endless runner (tools/endless-run.mjs, seeds 1-16, docs/ENDLESS.md): the
// survival curve falls a step at a time, not off a cliff.
export const DEPTH_STEP = Object.freeze({
  hp: 0.18, // enemy + boss + add HP: x (1 + hp k)
  dmg: 0.1, // enemy + boss + add damage: x (1 + dmg k)
  budget: 0.06, // threat points per wave: x (1 + budget k)
  elite: 0.03, // elite chance: + elite k (capped at ELITE_CAP)
});
export const ELITE_CAP = 0.55;
// The boss of an Act I / Act II biome met past Depth 3: its kit was tuned
// for its own act's damage multiplier (2.1 / 4.2 against Act III's 4.8), so
// on the Act III numbers its hits land at this share of them.
export const BOSS_HOME_DMG = Object.freeze({ 1: 0.7, 2: 0.9, 3: 1 });
export const GUEST_WEIGHT = 0.35;
export const MIX_FROM_DEPTH = 4;

export const levelOfDepth = (depth) => ORDER[(Math.max(1, depth | 0) - 1) % CYCLE];
export const cycleOfDepth = (depth) => Math.floor((Math.max(1, depth | 0) - 1) / CYCLE);
export const beyondCampaign = (depth) => (depth | 0) > CYCLE;

const r4 = (v) => Math.round(v * 10000) / 10000;

// The room's difficulty numbers at `depth`. Depths 1-3: difficulty(act, room)
// exactly. Past 3: the Act III numbers scaled by DEPTH_STEP.
export function endlessDifficulty(depth, room, challenge = 'standard') {
  const d = Math.max(1, depth | 0);
  if (!beyondCampaign(d)) return difficulty(levelOfDepth(d), room, challenge);
  const base = difficulty(ORDER[ORDER.length - 1], room, challenge);
  const k = d - CYCLE - 1; // Depth 4 = the Act III numbers; each depth after adds a step
  const home = levelOfDepth(d);
  const hp = 1 + DEPTH_STEP.hp * k;
  const dmg = 1 + DEPTH_STEP.dmg * k;
  const budget = 1 + DEPTH_STEP.budget * k;
  return Object.freeze({
    ...base,
    act: levelOfDepth(d),
    depth: d,
    hpMul: r4(base.hpMul * hp),
    dmgMul: r4(base.dmgMul * dmg),
    budget: r4(base.budget * budget),
    defendBudget: r4(base.defendBudget * budget),
    eliteChance: r4(Math.min(ELITE_CAP, base.eliteChance + DEPTH_STEP.elite * k)),
    waystoneHp: Math.round(base.waystoneHp * Math.sqrt(hp)),
    bossHp: Math.round(base.bossHp * hp),
    bossDmgMul: r4(base.bossDmgMul * dmg * (BOSS_HOME_DMG[home] ?? 1)),
    addHpMul: r4(base.addHpMul * hp),
    addDmgMul: r4(base.addDmgMul * dmg),
  });
}

// The level row the wave director rolls from at `depth`: the home act's own
// row through Depth 3; past it the home roster plus every other act's
// creatures at GUEST_WEIGHT (introduced one room later than at home).
export function endlessLevel(depth) {
  const d = Math.max(1, depth | 0);
  const home = levelFor(levelOfDepth(d));
  if (d < MIX_FROM_DEPTH) return home;
  const roster = { ...home.roster };
  const introduce = { ...home.introduce };
  for (const act of ORDER) {
    const lv = LEVELS[act];
    if (lv === home) continue;
    for (const et of Object.keys(lv.roster)) {
      if (et in home.roster) continue;
      roster[et] = r4(Math.max(roster[et] ?? 0, lv.roster[et] * GUEST_WEIGHT));
      introduce[et] = Math.min(introduce[et] ?? 99, (lv.introduce[et] ?? 1) + 1);
    }
  }
  return Object.freeze({ ...home, roster: Object.freeze(roster), introduce: Object.freeze(introduce) });
}

// Which boss a depth meets: the seed's own boss (bossIndexFor) on the first
// cycle, the next one of the act's list on each later cycle.
export function endlessBossIndex(depth, seed) {
  const act = levelOfDepth(depth);
  const lv = levelFor(act);
  const n = lv.bosses ? lv.bosses.length : 1;
  return (bossIndexFor(act, seed) + cycleOfDepth(depth)) % n;
}

// The next depth's level after clearing `level` (the cycle wraps).
export function endlessNextLevel(level) {
  const i = ORDER.indexOf(Number(level));
  return ORDER[(i + 1) % CYCLE];
}

// Plain-data view (probe / UI surface).
export function endlessRules() {
  return { cycle: CYCLE, order: [...ORDER], step: { ...DEPTH_STEP }, eliteCap: ELITE_CAP, guestWeight: GUEST_WEIGHT, mixFromDepth: MIX_FROM_DEPTH };
}

// The unlock rule (Level Select, camp): the descent opens once the game has
// been won — any campaign completed (profile records.gameWon) or the final
// level cleared once (records.levelClears).
export function endlessUnlockedFrom(profile) {
  const r = profile && profile.records ? profile.records : null;
  if (!r) return false;
  const final = ORDER[ORDER.length - 1];
  return !!(r.gameWon || (r.campaignsCompleted ?? 0) > 0 || (r.levelClears && r.levelClears[final] > 0));
}
