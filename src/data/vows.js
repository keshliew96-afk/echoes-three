// VOW RANKS (plan 4 slice 10, docs/UNLOCKS.md "Vow ranks"): every vow is
// sworn at rank I, II or III. Pure data + pure helpers: no DOM, no storage,
// no RNG. The profile keeps the ranks (meta.loadout.vowRanks), data/unlocks.js
// turns them into the run's `boons`, and the sim reads them back here.
//
// THE RULE: rank I is the vow as it always was, so a save from before the
// ranks keeps exactly the run it picked, and a run with no vow on never
// reads this file at all (the nine goldens stay the same run).
//
// Each row's `ranks` holds the number the vow uses at ranks I, II and III:
//   diff   the room-curse numbers (sim/relics.js cursedDiff), the six vows
//          that have always cursed every combat room
//   fuse   Short Fuse: the share of an enemy's warning left, over a floor
//          (0.6 s at rank I, 0.55 s at II, 0.5 s at III)
//   heal   Thin Air: how much weaker healing on the party is, in every room
//   dodge  Heavy Bell: how much slower the party's dodges recover, everywhere
import { CURSES } from '../sim/relics.js';
import { ACT_IDS } from './levels.js';

export const VOW_MAX_RANK = 3;
export const VOW_ROMAN = Object.freeze(['', 'I', 'II', 'III']);

// The rank numbers, in rank order. `key` names the curse's own number for the
// diff vows (rank I equals the curse's value exactly).
export const VOW_RANKS = Object.freeze({
  elite_tide: Object.freeze({ key: 'eliteAdd', ranks: Object.freeze([0.35, 0.5, 0.65]) }),
  crowded: Object.freeze({ key: 'budgetMul', ranks: Object.freeze([1.5, 1.75, 2]) }),
  iron_hide: Object.freeze({ key: 'hpMul', ranks: Object.freeze([1.4, 1.7, 2]) }),
  sharp_fangs: Object.freeze({ key: 'dmgMul', ranks: Object.freeze([1.35, 1.6, 1.85]) }),
  restless: Object.freeze({ key: 'waveMul', ranks: Object.freeze([0.65, 0.5, 0.4]) }),
  // (Most warnings already sit at the 0.6 s floor at rank I, so the higher
  // ranks lower the floor too: 0.55 s at II, 0.5 s at III.)
  short_fuse: Object.freeze({ fuse: true, ranks: Object.freeze([0.8, 0.7, 0.6]), floors: Object.freeze([36, 33, 30]) }),
  // THE STILL SPIRE: two vows of the high cold air, opened by Level V. They
  // are vows only (no door ever carries them), and hold in every room, the
  // boss's included.
  ...(ACT_IDS.includes(5)
    ? {
        thin_air: Object.freeze({ heal: true, name: 'Thin Air', ranks: Object.freeze([0.2, 0.3, 0.4]) }),
        heavy_bell: Object.freeze({ dodge: true, name: 'Heavy Bell', ranks: Object.freeze([0.25, 0.45, 0.65]) }),
      }
    : {}),
});
export const VOW_IDS = Object.freeze(Object.keys(VOW_RANKS));
// The vows no door carries (they have no room curse behind them).
export const SPIRE_VOW_IDS = Object.freeze(VOW_IDS.filter((id) => !CURSES[id]));

export const vowName = (id) => (CURSES[id] ? CURSES[id].name : VOW_RANKS[id] ? VOW_RANKS[id].name : id);
export const clampRank = (r) => Math.max(1, Math.min(VOW_MAX_RANK, Math.round(Number(r)) || 1));

// The rank a run wears a vow at, from its boons (1 when the boons name none).
export function rankIn(boons, id) {
  const r = boons && boons.vowRanks && boons.vowRanks[id];
  return Number.isFinite(r) ? clampRank(r) : 1;
}

// The vow's number at a rank.
export function rankValue(id, rank) {
  const row = VOW_RANKS[id];
  return row ? row.ranks[clampRank(rank) - 1] : null;
}

// The cursedDiff scale that makes a diff vow's curse read its rank's number
// (1 at rank I, so rank I runs exactly the old curse).
export function vowScale(id, rank) {
  const row = VOW_RANKS[id];
  const c = CURSES[id];
  if (!row || !row.key || !c || !c.diff) return 1;
  const r = clampRank(rank);
  if (r === 1) return 1;
  const base = c.diff[row.key];
  const want = row.ranks[r - 1];
  // eliteAdd scales by itself; the multipliers scale their distance from 1.
  return row.key === 'eliteAdd' ? want / base : (want - 1) / (base - 1);
}

// Short Fuse's rule at a rank ({ mul, minTicks }, the curse's own at rank I).
export function vowFuseRule(id, rank) {
  const row = VOW_RANKS[id];
  if (!row || !row.fuse) return null;
  const r = clampRank(rank);
  if (r === 1 && CURSES[id] && CURSES[id].fuse) return CURSES[id].fuse;
  return { mul: row.ranks[r - 1], minTicks: row.floors[r - 1] };
}

// The Vow level: the ranks of every vow worn, added up.
export function vowLevelOf(boons) {
  const vows = boons && Array.isArray(boons.vows) ? boons.vows : [];
  return vows.reduce((n, id) => n + rankIn(boons, id), 0);
}
export const MAX_VOW_LEVEL = VOW_IDS.length * VOW_MAX_RANK;

// EMBER PAY: each Vow level pays a share more of the run's Embers. The first
// six levels pay as the six vows always did (+25% each); every level past six
// pays +15%.
export const VOW_PAY = Object.freeze({ low: 0.25, lowLevels: 6, high: 0.15 });
export function vowPayPct(level) {
  const n = Math.max(0, Math.round(Number(level)) || 0);
  const lo = Math.min(n, VOW_PAY.lowLevels);
  return Math.round(100 * (lo * VOW_PAY.low + (n - lo) * VOW_PAY.high));
}

// BEST PER MODE: the highest Vow level a mode has been beaten at.
//   campaign  a campaign completed
//   endless   the campaign won inside an Endless Descent
//   rush      a Boss Rush won
// (The Daily is vow-free, so it keeps no Vow level.)
export const VOW_MODES = Object.freeze(['campaign', 'endless', 'rush']);
export const VOW_DEED_LEVELS = Object.freeze([5, 10, 15]);
export function freshVowBest() {
  return { campaign: 0, endless: 0, rush: 0 };
}
export function saneVowBest(b) {
  const out = freshVowBest();
  if (!b || typeof b !== 'object') return out;
  for (const k of VOW_MODES) out[k] = Math.max(0, Math.min(MAX_VOW_LEVEL, Math.round(Number(b[k])) || 0));
  return out;
}
