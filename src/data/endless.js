// ENDLESS DESCENT — the mode that keeps the game going after Act III
// (docs/ENDLESS.md). Owner: ENDLESS.
//
// An endless campaign is an ordinary campaign from Level 1 whose final level
// does not end the run: clearing Depth 4 (the Hollow Heart, the campaign won)
// leads to Depth 5 in the Hollow Wood, and the four biomes cycle on until
// the party falls. Depth = the campaign's level index (1, 2, 3, 4, 5, ...).
// (Act IV, docs/ACT_IV.md: the cycle was three biomes, Depth 4 the first
// past the campaign, on the Act III numbers.)
//
// Depths 1-4 play each act on its own numbers: the same difficulty(),
// rosters and bosses, number for number. From Depth 5 on:
//   - every depth is built on the Act IV numbers (difficulty(4, room)) — a
//     Depth-5 woodland is never easier than the Heart the party just left —
//     and each depth past 5 multiplies them by a named step (DEPTH_STEP);
//   - rosters mix: the home biome's roster plus every other act's creatures
//     at GUEST_WEIGHT of their own weight (one room later than at home);
//   - the boss alternates: each cycle meets the act's OTHER boss from the
//     one the seed met the cycle before, so both bosses of every act appear.
// Everything is a pure function of (depth, room, seed): no RNG draw, nothing
// saved beyond the campaign record, so replays and goldens stay exact.
//
// Pure data + helpers (sim-importable): no DOM, no three.
import { difficulty } from './difficulty.js';
import { LEVELS, ACT_IDS, ENDLESS_ACTS, levelFor, bossIndexFor, bossPool, campaignLevel } from './levels.js';

// The descent cycles every act's biome, Act IV included even when the
// campaign keeps three levels (levels.js CAMPAIGN_ACTS).
const ORDER = Object.freeze([...ENDLESS_ACTS].sort((a, b) => a - b));
export const CYCLE = ORDER.length; // 4 biomes per cycle
const FINAL = Math.max(...ACT_IDS); // the campaign's final level

// Per depth past the first cycle (k = depth - CYCLE - 1; the first depth past
// it plays the Act IV numbers). Tuned against the headless
// endless runner (tools/endless-run.mjs, seeds 1-16, docs/ENDLESS.md): the
// survival curve falls a step at a time, not off a cliff. Balance pass
// (2026-10-05, docs/BALANCE_PASS.md): hp .18 -> .21 and dmg .10 -> .12, so
// the Archer's smarter footing (data/classes.js AI_EVADE / AI_KITE) does not
// make the deep descent easier: median depths cleared stays at 6 of seeds 1-32.
export const DEPTH_STEP = Object.freeze({
  hp: 0.21, // enemy + boss + add HP: x (1 + hp k)
  dmg: 0.12, // enemy + boss + add damage: x (1 + dmg k)
  budget: 0.06, // threat points per wave: x (1 + budget k)
  elite: 0.03, // elite chance: + elite k (capped at ELITE_CAP)
});
export const ELITE_CAP = 0.55;
// The boss of a biome met past the first cycle: its kit was tuned for its
// own act's damage multiplier (2.1 / 4.2 against the ~4.8 of Act III and of
// Act IV, data/difficulty.js STAG_DMG_LEVEL), so past the first cycle its
// hits land at this share of them. Act IV's own bosses (docs/ACT_IV_BOSSES.md)
// are tuned on Act IV numbers.
export const BOSS_HOME_DMG = Object.freeze({ 1: 0.7, 2: 0.9, 3: 1, 4: 1 });
export const GUEST_WEIGHT = 0.35;
export const MIX_FROM_DEPTH = CYCLE + 1;

export const levelOfDepth = (depth) => ORDER[(Math.max(1, depth | 0) - 1) % CYCLE];
export const cycleOfDepth = (depth) => Math.floor((Math.max(1, depth | 0) - 1) / CYCLE);
export const beyondCampaign = (depth) => (depth | 0) > CYCLE;

const r4 = (v) => Math.round(v * 10000) / 10000;

// The room's difficulty numbers at `depth`. The first cycle: difficulty(act,
// room) exactly. Past it: the Act IV numbers scaled by DEPTH_STEP.
export function endlessDifficulty(depth, room, challenge = 'standard') {
  const d = Math.max(1, depth | 0);
  if (!beyondCampaign(d)) return difficulty(levelOfDepth(d), room, challenge);
  const base = difficulty(ORDER[ORDER.length - 1], room, challenge);
  const k = d - CYCLE - 1; // the first depth past the cycle = the Act IV numbers; each depth after adds a step
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
// row through the first cycle; past it the home roster plus every other act's
// creatures at GUEST_WEIGHT (introduced one room later than at home).
export function endlessLevel(depth) {
  const d = Math.max(1, depth | 0);
  // Endless is campaign play: every land's campaign-only creatures are in.
  const home = campaignLevel(levelFor(levelOfDepth(d)));
  if (d < MIX_FROM_DEPTH) return home;
  const roster = { ...home.roster };
  const introduce = { ...home.introduce };
  for (const act of ORDER) {
    const lv = campaignLevel(LEVELS[act]);
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
// cycle, the next one of the act's list on each later cycle (an endlessOnly
// boss, the Vein Weaver, joins that cycle once the save has opened it).
export function endlessBossIndex(depth, seed, open = null) {
  const act = levelOfDepth(depth);
  const pool = bossPool(levelFor(act), act, open, beyondCampaign(depth));
  const at = pool.indexOf(bossIndexFor(act, seed, open));
  return pool[(Math.max(0, at) + cycleOfDepth(depth)) % pool.length];
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
  const final = FINAL;
  return !!(r.gameWon || (r.campaignsCompleted ?? 0) > 0 || (r.levelClears && r.levelClears[final] > 0));
}
