// SHRINES (docs/SHRINES.md, content plan 4 slice 9): one shrine a level, a
// room interactable that TRADES something for a 60 s blessing on the whole
// party, so every act has one thing to stop and use mid-fight besides the
// dewfont. Each land's shrine has its own trade:
//   wood    Antler Shrine   15% max HP from every living hero -> Swiftness:
//                           +30% move speed
//   mill    Tithe Shrine    25 Glint -> Ward: the party takes 25% less damage
//   barrow  Grave Shrine    a curse on the next fight -> Fury: the party
//                           deals 30% more damage (the cursed room still pays
//                           its relic pick, as any cursed room does)
//   heart   Geode Shrine    the party's key -> a greater relic pick (rare or
//                           legendary) when the room clears; no blessing
//   spire   Wind Shrine     the offering hero's tonic or bomb -> Tailwind:
//                           +20% move speed and +15% damage
//   kiln    Forge Shrine    the party's newest common relic, melted down ->
//                           Tempered: +25% damage and 20% less damage taken
//                           (content plan 5 slice 9)
//
// Rules: a shrine stands in ONE combat room a level, the first combat room
// from a hashed room in 4-6 on (never the boss room, the vault, the shop or a
// "?" room). E uses it once (any human seat; the AI seats leave it alone,
// they never press E). It answers only while the room is live: the clear
// puts it to sleep with the other combat assets. A trade the party cannot
// pay (too little Glint, no key, no tonic, no common relic) is refused and
// the shrine stays.
// A new blessing replaces the old one. Campaign runs only (Endless and the
// Daily included), never the tutorial or the legacy single-level run, so the
// nine goldens never see one. Sim only: no DOM, no i18n.
import { TICK_HZ } from '../core/constants.js';

export const SHRINE_RULES = Object.freeze({
  blessTicks: 60 * TICK_HZ, // 60 s
  rooms: Object.freeze([4, 6]), // the hashed room a level's shrine aims at
  radius: 0.5, // the shrine's solid footprint
  interactRadius: 1.1,
  hpCost: 0.15, // Antler Shrine: share of max HP each living hero pays
  glintCost: 25, // Tithe Shrine
  // Where a shrine may stand: the first clear spot of the hashed rotation
  // (>= clearance from props, >= 1.8 u from hazards and assets, >= 3 u from
  // the party's entry at the centre).
  spots: Object.freeze([[-5.2, -3.6], [5.2, -3.6], [-5.6, 3.2], [5.6, 3.2], [0, -5.2], [0, 5.0], [-7.2, 0], [7.2, 0], [-3.4, -5.4], [3.4, 5.4], [-8.6, -5.4], [8.6, 5.4], [-8.6, 5.4], [8.6, -5.4], [-3.6, 3.8], [3.6, -3.8], [-6.4, -6.2], [6.4, 6.2], [-9.6, 1.6], [9.6, -1.6]]),
});

export const SHRINES = Object.freeze({
  wood: Object.freeze({ id: 'wood', name: 'Antler Shrine', cost: 'hp', gift: 'swiftness', trade: '15% health → Swiftness, 60 s', text: 'Give 15% of every hero\'s health for Swiftness: +30% move speed for 60 s.' }),
  mill: Object.freeze({ id: 'mill', name: 'Tithe Shrine', cost: 'glint', gift: 'ward', trade: '25 Glint → Ward, 60 s', text: 'Give 25 Glint for a Ward: the party takes 25% less damage for 60 s.' }),
  barrow: Object.freeze({ id: 'barrow', name: 'Grave Shrine', cost: 'curse', gift: 'fury', trade: 'A cursed next fight → Fury, 60 s', text: 'Take a curse on your next fight for Fury: the party deals 30% more damage for 60 s.' }),
  heart: Object.freeze({ id: 'heart', name: 'Geode Shrine', cost: 'key', gift: 'relic', trade: 'Your vault key → a greater relic', text: 'Give your vault key for a rare or legendary relic pick when this room clears.' }),
  spire: Object.freeze({ id: 'spire', name: 'Wind Shrine', cost: 'tonic', gift: 'tailwind', trade: 'Your tonic → Tailwind, 60 s', text: 'Give your tonic or bomb for a Tailwind: +20% move speed and +15% damage for 60 s.' }),
  kiln: Object.freeze({ id: 'kiln', name: 'Forge Shrine', cost: 'relic', gift: 'tempered', trade: 'A common relic → Tempered, 60 s', text: 'Melt down your newest common relic for Tempered: the party deals 25% more damage and takes 20% less for 60 s.' }),
});
export const SHRINE_IDS = Object.freeze(Object.keys(SHRINES));

// The blessings (read by sim/status.js off `e.blessing`).
export const BLESSINGS = Object.freeze({
  swiftness: Object.freeze({ id: 'swiftness', name: 'Swiftness', text: '+30% move speed', haste: 0.3 }),
  ward: Object.freeze({ id: 'ward', name: 'Ward', text: '25% less damage taken', ward: 0.25 }),
  fury: Object.freeze({ id: 'fury', name: 'Fury', text: '+30% damage', might: 0.3 }),
  tailwind: Object.freeze({ id: 'tailwind', name: 'Tailwind', text: '+20% move speed, +15% damage', haste: 0.2, might: 0.15 }),
  tempered: Object.freeze({ id: 'tempered', name: 'Tempered', text: '+25% damage, 20% less damage taken', might: 0.25, ward: 0.2 }),
});

// The curse the Grave Shrine lays on the next fight: a room curse by a hash
// of the seed, level and room (never the run stream).
export const shrineOfBiome = (biome) => SHRINES[biome] ?? null;

function mix32(x) {
  x = (x + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
const hash = (...xs) => xs.reduce((a, b) => mix32(a ^ (b >>> 0)), 0x5a17e5);

// The room a level's shrine aims at (4-6); it stands in the first combat
// room from there on.
export function shrineRoomFor(seed, index) {
  const [a, b] = SHRINE_RULES.rooms;
  return a + (hash(seed >>> 0, index | 0, 0x5481) % (b - a + 1));
}
// Which spot of the rotation is tried first (the rest follow in order).
export const shrineSpotStart = (seed, index, room) => hash(seed >>> 0, index | 0, room | 0, 0x5907) % SHRINE_RULES.spots.length;
export const shrineCurseFor = (seed, index, room, ids) => (ids.length ? ids[hash(seed >>> 0, index | 0, room | 0, 0xc0e5) % ids.length] : null);

// The shrine's prompt words (E · Offer; spent: Answered).
export const SHRINE_BODY = Object.freeze({ verb: 'Offer', spentLabel: 'Answered' });

// The shrine's body (plain entity data for registry.spawn).
export function shrineSpec(shrineId, x, z) {
  const R = SHRINE_RULES;
  return {
    kind: 'shrine',
    itype: 'shrine',
    shrine: shrineId,
    faction: 'neutral',
    x,
    z,
    px: x,
    pz: z,
    yaw: Math.atan2(-x, -z), // faces the room's middle
    interactable: true,
    interactRadius: R.interactRadius,
    radius: R.radius,
    verb: SHRINE_BODY.verb,
    spentLabel: SHRINE_BODY.spentLabel,
    uses: 1,
    cooldownUntilTick: 0,
    activeUntilTick: 0,
    usedTick: -1,
    usedBy: null,
    collider: { r: R.radius },
    blocksMovement: true,
  };
}

// Lay a blessing on every hero body (downed ones too: it rides their revive).
// `ticks`: how long it lasts (Votive Ribbon doubles it).
export function bless(bodies, gift, tick, ticks = SHRINE_RULES.blessTicks) {
  const B = BLESSINGS[gift];
  if (!B) return null;
  const rec = { id: B.id, untilTick: tick + ticks, ...(B.haste ? { haste: B.haste } : {}), ...(B.ward ? { ward: B.ward } : {}), ...(B.might ? { might: B.might } : {}) };
  for (const e of bodies) e.blessing = { ...rec };
  return rec;
}
