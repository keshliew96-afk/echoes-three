// CHAMPION ROOMS (docs/CHAMPIONS.md, content plan 3 slice 1): one named
// champion in every level, behind a CROWN DOOR on the path screen before room
// 4 or room 5.
//
//   A champion is a mini-boss: one of the act's own heavies grown into a
//   named lord with a name plate, two telegraphed moves under the §11
//   governor, an entrance sting and, at half health, a short rage. It is not
//   a boss: no phase cards, no music change, no adds. Its room keeps two
//   light waves of the act's roster beside it; the room is cleared when the
//   champion and every wave are down. The champion falls where it stood and
//   leaves a RELIC CHEST there: clearing the room opens it for a greater
//   relic pick (rare or legendary) after the room's draft.
//
// WHERE: campaign runs only (Endless and the Daily included), never the
// tutorial and never the legacy single-level run, so the nine goldens never
// meet one. Which screen carries the crown (before room 4 or room 5) and on
// which side comes from a hash of the level's frame seed and index, never
// from the run stream. The crown door is never the cursed door; when the
// other door holds a "?" event, the crown takes its place (one champion every
// level, at most one). Taking the crown door turns the next room into the
// champion room; the other door keeps its own room. Endless gives each depth
// its land's champion.
//
// KEYS AND VAULTS (src/sim/vaults.js, docs/VAULTS.md) hang their drop off
// the `champion_fall` event (id, champion, x, z): the key lands there.
//
// Sim only: no DOM, no i18n (the UI translates the English names).
import { fnv1a64Hex } from '../core/hash.js';

export const CHAMPION_RULES = Object.freeze({
  rooms: Object.freeze([4, 5]), // the crown door leads into one of these
  hp: 560, // champion HP at hpMul 1 (scaled by the room's hpMul)
  waves: 2, // light waves of the act's roster beside it...
  budgetMul: 0.65, // ...each at this share of a kill_all wave's budget
  entranceTicks: 96, // it stands and roars this long before its first move
  rageAt: 0.5, // below this share of its HP it rages once...
  rageCdMul: 0.7, // ...its cooldowns shorten...
  rageSpeedMul: 1.15, // ...and it moves a little faster
  starveTicks: 210, // a move the governor held back this long goes anyway
  chestSource: 'champion', // the relic pick the chest pays (rare or legendary)
});

// One champion per act (= land). Endless depths use their land's.
export const CHAMPIONS = Object.freeze({
  1: Object.freeze({ id: 'briar_knight', act: 1, name: 'The Briar Knight' }),
  2: Object.freeze({ id: 'sluice_warden', act: 2, name: 'The Sluice Warden' }),
  3: Object.freeze({ id: 'bone_reeve', act: 3, name: 'The Bone Reeve' }),
  4: Object.freeze({ id: 'hollow_choir', act: 4, name: 'The Hollow Choir' }),
  // Act V (plan 4 slice 7, docs/CHAMPIONS.md "The Gale Herald").
  5: Object.freeze({ id: 'gale_herald', act: 5, name: 'The Gale Herald' }),
  // The Ember Kiln (content plan 5 slice 9, docs/CHAMPIONS.md "The Ember
  // Kiln's champions"): its own two, where it borrowed the Spire's before.
  6: Object.freeze({ id: 'furnace_knight', act: 6, name: 'The Furnace Knight' }),
});
// SECOND CHAMPIONS (plan 4 slice 8, docs/CHAMPIONS.md "Second champions"):
// Acts I to IV each have a second lord, and the Still Spire too (content
// plan 5 slice 2: the Bell Abbess). A level's crown door leads to one of
// its act's two, picked by a hash of the level's frame seed and index
// (championPick), so a seed still meets one champion per level.
export const SECOND_CHAMPIONS = Object.freeze({
  1: Object.freeze({ id: 'moss_hart', act: 1, name: 'The Moss Hart', second: true }),
  2: Object.freeze({ id: 'lockkeeper', act: 2, name: 'The Lockkeeper', second: true }),
  3: Object.freeze({ id: 'gravebell_ringer', act: 3, name: 'The Gravebell Ringer', second: true }),
  4: Object.freeze({ id: 'vein_matron', act: 4, name: 'The Vein Matron', second: true }),
  5: Object.freeze({ id: 'bell_abbess', act: 5, name: 'The Bell Abbess', second: true }),
  6: Object.freeze({ id: 'glassblower', act: 6, name: 'The Glassblower', second: true }),
});
// Every champion, in act order (each act's first, then its second).
export const CHAMPION_LIST = Object.freeze(
  Object.keys(CHAMPIONS)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((a) => [CHAMPIONS[a], ...(SECOND_CHAMPIONS[a] ? [SECOND_CHAMPIONS[a]] : [])])
);
export const CHAMPION_IDS = Object.freeze(CHAMPION_LIST.map((c) => c.id));
export const isChampionKind = (k) => CHAMPION_IDS.includes(k);
// (An act past the last champion's meets the last one.)
const LAST_CHAMPION_ACT = Math.max(...Object.keys(CHAMPIONS).map(Number));
const actOf = (act) => (CHAMPIONS[act] ? act : act > LAST_CHAMPION_ACT ? LAST_CHAMPION_ACT : 1);
// The act's first champion (the one every act had before slice 8).
export const championFor = (act) => CHAMPIONS[actOf(act)];
// The act's champions: its first, then its second when it has one.
export const championsOfAct = (act) => {
  const a = actOf(act);
  return SECOND_CHAMPIONS[a] ? [CHAMPIONS[a], SECOND_CHAMPIONS[a]] : [CHAMPIONS[a]];
};
// Each act's first champion, Acts I to IV, then with the Gale Herald.
export const FIRST_CROWNS = Object.freeze(['briar_knight', 'sluice_warden', 'bone_reeve', 'hollow_choir']);
export const FIVE_CROWNS = Object.freeze([...FIRST_CROWNS, 'gale_herald']);
// The Crowns deeds' lands (small fixes 5): Four Crowns is a champion felled
// in each of Acts I to IV, Five Crowns in each of the five; either of a
// land's champions crowns it, its second as well as its first.
export const FOUR_CROWN_ACTS = Object.freeze([1, 2, 3, 4]);
export const FIVE_CROWN_ACTS = Object.freeze([1, 2, 3, 4, 5]);
export const crownLands = (felled, acts) => acts.filter((a) => (CHAMPIONS[a] ? [CHAMPIONS[a], ...(SECOND_CHAMPIONS[a] ? [SECOND_CHAMPIONS[a]] : [])] : []).some((c) => (felled || []).includes(c.id))).length;
export const championById = (id) => CHAMPION_LIST.find((c) => c.id === id) ?? null;

const hash32 = (s) => parseInt(fnv1a64Hex(s).slice(0, 8), 16) >>> 0;

// The level's crown: the room it leads into and its preferred side. Pure.
export function crownFor(seed, index) {
  const h = hash32(`${seed >>> 0}:${index | 0}:CROWN`);
  const R = CHAMPION_RULES.rooms;
  return { room: R[h % R.length], side: (h >>> 8) & 1 };
}

// The level's champion: one of its act's champions, from its own hash of the
// frame seed and index (never the crown's, so the crown's room and side keep
// their old roll; never the run stream). Pure.
export function championPick(seed, index, act) {
  const list = championsOfAct(act);
  if (list.length < 2) return list[0];
  const h = hash32(`${seed >>> 0}:${index | 0}:CHAMPION`);
  return list[h % list.length];
}

// Where the crown door goes on a path screen: never on the cursed side; over
// the event door when the other side is cursed. Returns a side, or null.
export function crownSide(pref, curseSide, eventSide) {
  const cursed = curseSide === 0 || curseSide === 1 ? curseSide : null;
  if (cursed !== null) return 1 - cursed;
  if (eventSide === 0 || eventSide === 1) return 1 - eventSide;
  return pref === 1 ? 1 : 0;
}

// Where the champion stands when it arrives: the first of these spots, far
// from the entry, with room for its body among the layout's props.
export const CHAMPION_SPOTS = Object.freeze([
  [0, -4.6],
  [0, -3.4],
  [-4.2, -3.6],
  [4.2, -3.6],
  [0, 4.4],
]);
