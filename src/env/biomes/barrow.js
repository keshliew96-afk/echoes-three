// Act III — The Ashen Barrow (BUILD_BRIEF §23.1): cold blue-grey ash,
// bone-stone cairns, ochre dead grass, brazier pools; violet ONLY in the veins
// of the standing stones (the act tell). Layouts 7 Barrow Gate · 8 Ossuary
// Row · 9 Moonwell (9 is also the boss room's dressing).
//
// Palette (display-space HSL, §23.1): shade base cold blue-grey H 212-224
// S .16-.24 L .09-.15; lit ash H 28-40 S .06-.12 L .30-.38 + dead ochre grass
// H 38-50 S .30-.40; signature surface bone-stone cairns (Bone +- 6% L).
import { hslColor } from '../colors.js';

export const BIOME = Object.freeze({
  id: 'barrow',
  act: 3,
  name: 'The Ashen Barrow',
  music: 'barrow',
  bed: 'barrow',
  // A cold moon: the key bleached toward white-blue, a blue-grey fill; the
  // braziers carry all of the warmth.
  light: Object.freeze({
    keyWhite: 0.7,
    keyTint: '#C9D6EE',
    sky: '#7F8FB8',
    ground: '#171B26',
  }),
});

const GROUND = Object.freeze({
  nightBase: 1,
  h: 46, s: 0.05, l: 0.32,
  shadeH: 202, shadeS: 0.0, shadeL: 0.064, coolLift: 16,
  dirtH: 36, dirtL: 0.17, mossN: 14, mossOff: -2, mossS: 0.34, mossL: 0.25,
  leafN: 70, litterH: 40, litterS: 0.16, litterL: 0.34, crackN: 16, pebbleN: 140,
  bushOff: -4, bushLitOff: -2, wallMossOff: -6, bladeCool: 'shade', bladeShadeL: 0.16, lift2: 3,
  ashDrifts: 12, ashH: 30, ashS: 0.07, ashL: 0.4, ashA: 0.11,
  flagstones: Object.freeze({ size: 1.15, h: 214, s: 0.06, l: 0.25, alpha: 0.16, groutH: 214, groutS: 0.12, groutL: 0.06, groutA: 0.34, grout: 2.5 }),
  blade: Object.freeze({ h: 44, s: 0.36, l: 0.31 }),
});

const APRON = Object.freeze({ base: 'hsl(218,16%,9%)', mottleH: 214, mottleS: 0.08, crownH: 36, crownS: 0.14 });
const TREELINE = Object.freeze({
  style: 'barrow',
  trunk: hslColor(214, 0.08, 0.1),
  crownLit: hslColor(210, 0.06, 0.2),
  scrub: hslColor(40, 0.22, 0.13),
  rock: hslColor(214, 0.06, 0.2),
});
const MATS = Object.freeze({
  stone: hslColor(36, 0.06, 0.52),
  stoneLit: hslColor(40, 0.08, 0.64),
  stoneCool: hslColor(214, 0.06, 0.3),
});

const SHARED = {
  propsAvoidPaths: true,
  grass: 600,
  flowers: 0,
  propFamily: 'barrow',
  apron: APRON,
  treeline: TREELINE,
  mats: MATS,
};

const ROOMS = Object.freeze({
  boss: {
    clusters: [
      [-9.0, -4.9, 0.6, 'standingstone urn'],
      [9.0, -4.9, 0.6, 'standingstone bonecairn'],
      [-9.3, 0.4, 0.6, 'idol urn'],
      [9.3, 0.4, 0.6, 'idol brokenurn'],
      [-3.2, -6.7, 0.5, 'standingstone'],
      [3.2, -6.7, 0.5, 'pillar'],
      [-5.8, 0.4, 0.5, 'urn standingstone'],
      [5.8, 0.4, 0.5, 'standingstone urn'],
      [-6.1, 1.9, 0.45, 'brokenurn'],
      [6.1, 1.9, 0.45, 'bonecairn'],
      [-7.4, -1.0, 0.5, 'idol'],
      [-7.0, 2.4, 0.45, 'pillar urn'],
    ],
  },
  shop: {
    stall: [-6.4, -0.6, 0.28],
    clusters: [
      [-6.9, 1.3, 0.55, 'urn sack sack'],
      [-7.2, -2.6, 0.6, 'brokenurn crate'],
      [-5.2, -2.9, 0.4, 'banner'],
      [-8.2, -0.4, 0.4, 'sack'],
    ],
  },
});

export const LAYOUT_SPECS = Object.freeze({
  // ---- 7 · Barrow Gate: the barrow's stone mouth on the north wall.
  7: Object.freeze({
    id: 7,
    name: 'barrowgate',
    biome: 'barrow',
    mood: { key: 0.44, fill: 0.7, warmth: 0.0, keyWhite: 0.0, poolGain: 0.8, poolTint: '#E6B456', poolR: 0.9 },
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[-2.0, -8.6], [-0.6, -3.4], [1.2, 1.4], [0.2, 8.6]], w: 1.5 }],
    torches: [[-5.6, -7.2], [5.2, 7.2], [11.2, -3.0], [-11.2, 3.2]],
    lightIdx: [0, 2],
    lanterns: [[3.0, -7.3, -1.5708], [-3.4, 7.3, 1.5708]],
    braziers: [[-3.2, 2.2], [2.6, -1.9], [6.8, 3.0], [-6.8, -1.6]],
    veinStones: [8.4, -6.6, 0.3],
    clusters: [
      [-1.4, -7.1, 0.3, 'barrowgate'],
      [-6.4, -7.3, 0.6, 'bonecairn standingstone'],
      [4.4, -7.3, 0.6, 'graveslab brokenurn'],
      [-10.4, -6.6, 0.6, 'standingstone bonecairn'],
      [11.2, -6.2, 0.5, 'bonecairn'],
      [-11.2, -0.8, 0.6, 'graveslab'],
      [-11.0, 5.8, 0.6, 'standingstone urn'],
      [11.2, 1.0, 0.6, 'brokenurn bonecairn'],
      [11.2, 5.8, 0.6, 'graveslab'],
      [-6.8, 7.3, 0.6, 'bonecairn brokenurn'],
      [4.8, 7.4, 0.6, 'standingstone'],
      [-8.6, -2.8, 0.6, 'tower graveslab'],
      [8.6, -1.6, 0.6, 'standingstone brokenurn'],
      [-8.4, 3.2, 0.5, 'banner bonecairn'],
      [3.6, 5.8, 0.5, 'tower bonecairn'],
      [-7.6, 5.2, 0.5, 'brokenurn'],
      [7.6, 5.0, 0.5, 'tower'],
    ],
    rooms: ROOMS,
  }),

  // ---- 8 · Ossuary Row: a double row of grave slabs and cairns.
  8: Object.freeze({
    id: 8,
    name: 'ossuary',
    biome: 'barrow',
    mood: { key: 0.46, fill: 0.7, warmth: 0.0, keyWhite: 0.0, poolGain: 0.8, poolTint: '#E6B456', poolR: 0.9 },
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[-12.6, 1.0], [-5.0, 0.6], [1.8, -0.8], [12.6, -0.4]], w: 1.6 }],
    torches: [[-11.2, -1.9], [11.2, 1.2], [-1.9, -7.2], [2.2, 7.2]],
    lightIdx: [2, 1],
    lanterns: [[-5.0, 7.3, 1.5708], [6.8, 7.3, 1.5708]],
    braziers: [[-1.4, -3.0], [2.4, 3.2], [-6.8, 3.4], [7.0, -3.6]],
    veinStones: [-8.6, -6.6, -0.3],
    clusters: [
      [-3.6, -7.3, 0.7, 'graveslab graveslab bonecairn'],
      [2.4, -7.3, 0.6, 'graveslab standingstone'],
      [7.4, -7.3, 0.6, 'bonecairn graveslab'],
      [11.2, -5.8, 0.6, 'standingstone'],
      [-11.2, -5.6, 0.6, 'bonecairn'],
      [-11.2, 4.8, 0.6, 'graveslab brokenurn'],
      [11.2, 4.6, 0.6, 'bonecairn standingstone'],
      [-7.6, 7.3, 0.6, 'graveslab'],
      [-2.4, 7.4, 0.6, 'bonecairn urn'],
      [3.4, 7.3, 0.5, 'graveslab'],
      [-8.6, -2.6, 0.6, 'tower brokenurn'],
      [8.6, 2.8, 0.6, 'tower graveslab'],
      [-8.4, 1.8, 0.5, 'standingstone'],
      [5.8, 6.2, 0.5, 'brokenurn'],
      [-4.6, 5.2, 0.5, 'banner'],
    ],
    rooms: ROOMS,
  }),

  // ---- 9 · Moonwell: a sunken well-ring of stones mid-north; the Act III
  // boss room's dressing.
  9: Object.freeze({
    id: 9,
    name: 'moonwell',
    biome: 'barrow',
    mood: { key: 0.42, fill: 0.72, warmth: 0.0, keyWhite: 0.0, poolR: 0.95, poolGain: 0.8, poolTint: '#E6B456' },
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[-12.6, 5.6], [-6.4, 3.6], [-1.6, 0.6], [1.8, -3.2], [7.2, -5.4], [12.6, -5.8]], w: 1.5 }],
    torches: [[-11.2, 4.9], [11.2, -5.0], [-4.6, -7.2], [4.0, 7.2]],
    lightIdx: [2, 1],
    lanterns: [[1.2, -7.3, -1.5708], [-8.7, 7.3, 1.5708]],
    braziers: [[-2.2, -3.6], [6.6, 1.6], [-6.4, 0.8], [2.2, 3.4]],
    veinStones: [-0.2, -6.6, 0],
    clusters: [
      [-5.2, -7.3, 0.6, 'standingstone bonecairn'],
      [4.8, -7.3, 0.6, 'standingstone graveslab'],
      [9.4, -7.2, 0.6, 'bonecairn'],
      [-10.0, -7.2, 0.6, 'graveslab'],
      [-11.2, -1.6, 0.6, 'standingstone urn'],
      [11.2, 1.8, 0.6, 'bonecairn brokenurn'],
      [11.2, 6.0, 0.6, 'graveslab'],
      [-6.6, 7.3, 0.6, 'brokenurn bonecairn'],
      [0.4, 7.4, 0.6, 'standingstone'],
      [-8.6, -3.6, 0.6, 'tower'],
      [8.6, -2.0, 0.6, 'tower bonecairn'],
      [-6.4, 5.2, 0.5, 'bonecairn'],
      [6.6, 5.8, 0.5, 'banner brokenurn'],
      [8.4, 4.4, 0.5, 'standingstone'],
    ],
    rooms: ROOMS,
  }),
});
