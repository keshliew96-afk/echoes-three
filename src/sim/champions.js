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
// KEYS AND VAULTS (the next slice) hang their drop off the `champion_fall`
// event (id, champion, x, z): the chest spot is where a key would land.
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
});
export const CHAMPION_IDS = Object.freeze(Object.values(CHAMPIONS).map((c) => c.id));
export const isChampionKind = (k) => CHAMPION_IDS.includes(k);
export const championFor = (act) => CHAMPIONS[act] ?? CHAMPIONS[1];
export const championById = (id) => Object.values(CHAMPIONS).find((c) => c.id === id) ?? null;

const hash32 = (s) => parseInt(fnv1a64Hex(s).slice(0, 8), 16) >>> 0;

// The level's crown: the room it leads into and its preferred side. Pure.
export function crownFor(seed, index) {
  const h = hash32(`${seed >>> 0}:${index | 0}:CROWN`);
  const R = CHAMPION_RULES.rooms;
  return { room: R[h % R.length], side: (h >>> 8) & 1 };
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
