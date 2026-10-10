// BOSS RUSH (docs/BOSS_RUSH.md, content plan 3 slice 12). Owner: RUSH.
//
// The bosses back to back: one per land in campaign order (the Wood, the
// Mill, the Barrow, the Heart), then a second lap that meets each land's
// OTHER boss on harder numbers. Eight fights in all. Between two fights the
// party takes a draft (the fight's reward), a supply of nodes and Glint (the
// war chest, in place of the six rooms a level would have given), now and
// then a relic, and a short visit to the Peddler. A run is timed from the
// first fight to the last blow; the profile keeps the best time.
//
// Which bosses: the line is seeded. The first lap meets the boss the run's
// seed rolls for each land (bossFor, so a third boss the save has unlocked
// can come up), the second lap the next boss of that land's list
// (endlessBossIndex at the Endless depth 5-8, so the Endless-only Vein
// Weaver joins once the save has opened it). Locked third bosses never
// appear, exactly as in a campaign.
//
// Pure data + helpers (sim- and UI-importable): no DOM, no three. The plain
// campaign, Endless, the Daily and the tutorial never read it, so the nine
// goldens are untouched.
import { LEVELS, ENDLESS_ACTS, bossFor } from './levels.js';
import { difficulty } from './difficulty.js';
import { endlessBossIndex, endlessUnlockedFrom } from './endless.js';

const ORDER = Object.freeze([...ENDLESS_ACTS].sort((a, b) => a - b));
export const LAP = ORDER.length; // 4 fights a lap

export const RUSH_RULES = Object.freeze({
  laps: 2,
  fights: LAP * 2, // 8
  // The kit the rush sets out with: the Level II starter grant (a party
  // that has just cleared Level I).
  grantLevel: 2,
  // A boss felled pays this on top of the clear stipend (every seat).
  bounty: 40,
  // The war chest, as the rush sets out (0) and after each fight but the
  // last: the Healer's skills (into an empty slot), nodes (in pairs with the
  // shared auto-fill; a node only lands where a skill has room) and
  // legendaries, and each ally's skill draws, nodes and legendaries. The
  // first lap tops the party up to what a campaign party carries into that
  // land's boss room (the Level III and Level IV starter grants, data/
  // campaign.js); the second lap adds a little each fight.
  supply: Object.freeze([
    Object.freeze({ skills: 0, nodes: 6, legendaries: 0, allies: Object.freeze({ swaps: 1, nodes: 12, legendaries: 0 }) }),
    Object.freeze({ skills: 1, nodes: 12, legendaries: 1, allies: Object.freeze({ swaps: 2, nodes: 16, legendaries: 2 }) }),
    Object.freeze({ skills: 1, nodes: 10, legendaries: 1, allies: Object.freeze({ swaps: 2, nodes: 8, legendaries: 1 }) }),
    Object.freeze({ skills: 0, nodes: 8, legendaries: 1, allies: Object.freeze({ swaps: 1, nodes: 8, legendaries: 1 }) }),
    Object.freeze({ skills: 0, nodes: 6, legendaries: 0, allies: Object.freeze({ swaps: 1, nodes: 6, legendaries: 0 }) }),
    Object.freeze({ skills: 0, nodes: 6, legendaries: 0, allies: Object.freeze({ swaps: 1, nodes: 6, legendaries: 0 }) }),
    Object.freeze({ skills: 0, nodes: 6, legendaries: 0, allies: Object.freeze({ swaps: 1, nodes: 6, legendaries: 0 }) }),
    Object.freeze({ skills: 0, nodes: 6, legendaries: 0, allies: Object.freeze({ swaps: 1, nodes: 6, legendaries: 0 }) }),
  ]),
  // A relic pick is owed after these fights (before the Peddler).
  relicAfter: Object.freeze([1, 3, 5, 7]),
  // The second lap's numbers: each land's own boss-room numbers, then this
  // much more HP and damage (bosses and their adds).
  lap2: Object.freeze({ hp: 1.8, dmg: 1.4 }),
  // Deeds (data/unlocks.js): a full clear under this many seconds.
  swiftSec: 600,
});

export const isRushFight = (n) => Number.isInteger(n) && n >= 1 && n <= RUSH_RULES.fights;
// The land of fight `n` (1..8) and its lap (1 | 2).
export const rushAct = (n) => ORDER[(Math.max(1, n | 0) - 1) % LAP];
export const rushLap = (n) => (Math.max(1, n | 0) > LAP ? 2 : 1);
// The land after fight n's (the line wraps into the second lap), null after
// the last fight.
export const rushNextLevel = (n) => ((n | 0) >= RUSH_RULES.fights ? null : rushAct((n | 0) + 1));

// The seeded line: [{ fight, act, lap, kind, name }] for a run on `seed`
// with the third bosses of `open` (the acts the save has unlocked).
export function rushLine(seed, open = null) {
  const out = [];
  for (let n = 1; n <= RUSH_RULES.fights; n++) {
    const act = rushAct(n);
    const lap = rushLap(n);
    const list = LEVELS[act].bosses ?? [];
    const row = lap === 1 ? bossFor(act, seed, null, open) : list[endlessBossIndex(n, seed, open)] ?? list[0];
    out.push({ fight: n, act, lap, kind: row.kind, name: row.name });
  }
  return out;
}

// The boss room's numbers for fight `n`: the land's own (difficulty(act, 6),
// what room 8 of that level plays), harder on the second lap.
export function rushDifficulty(n, challenge = 'standard') {
  const act = rushAct(n);
  const base = difficulty(act, 6, challenge);
  if (rushLap(n) === 1) return base;
  const L = RUSH_RULES.lap2;
  const r4 = (v) => Math.round(v * 10000) / 10000;
  return Object.freeze({
    ...base,
    bossHp: Math.round(base.bossHp * L.hp),
    bossDmgMul: r4(base.bossDmgMul * L.dmg),
    addHpMul: r4(base.addHpMul * L.hp),
    addDmgMul: r4(base.addDmgMul * L.dmg),
  });
}

// The war chest after fight `n` (fight 0 = as the rush sets out, on top of
// the starter kit; null after the last): the Healer's and each ally's share.
export function rushSupply(n) {
  if (!(Number.isInteger(n) && n >= 0 && n < RUSH_RULES.fights)) return null;
  const g = RUSH_RULES.supply[n];
  return g ? { skills: g.skills, nodes: g.nodes, legendaries: g.legendaries, allies: { ...g.allies } } : null;
}

// The draft a fight pays: a Skill after odd fights, a node after even ones.
export const rushReward = (n) => ((n | 0) % 2 === 1 ? 'skill' : 'node');

// The Level Select card opens with the Endless Descent: once the campaign
// has been won (every land's boss has been met by then).
export const rushUnlockedFrom = (profile) => endlessUnlockedFrom(profile);

// Plain-data view (probe / UI surface).
export function rushRules() {
  return { ...RUSH_RULES, order: [...ORDER], supply: RUSH_RULES.supply.map((g) => ({ ...g, allies: { ...g.allies } })), lap2: { ...RUSH_RULES.lap2 }, relicAfter: [...RUSH_RULES.relicAfter] };
}
