// Act II — The Sunken Mill (BUILD_BRIEF §23.1): wet slate + black-teal water,
// moss, rotten timber, amber lantern pools; violet ONLY on the corrupted mill
// wheel's veins (the act tell). Layouts 4 Millpond · 5 Weir · 6 Drowned
// Granary (6 is also the boss room's dressing). Spec grammar = env/variants.js
// (ground / paths / clusters / torches / lanterns / braziers + mood) plus the
// Gauntlet biome fields: ground.flagstones / ground.blade / ground.moss*,
// `water` channels, `millwheel` (the tell), `propFamily: 'mill'`, `apron`,
// `treeline`, `light`.
//
// Palette (display-space HSL, §23.1): shade base teal-slate H 196-204 S .30-.40
// L .10-.16 (the painter's night base = shadeH+16 / shadeS+.22 / shadeL+.055);
// lit wet flagstone H 185-200 S .10-.18 L .28-.34; moss H 80-100 S .35-.45;
// water H 190-200 S .45 L .06-.10 with Parchment specular <= 25% alpha.
import { hslColor } from '../colors.js';

export const BIOME = Object.freeze({
  id: 'mill',
  act: 2,
  name: 'The Sunken Mill',
  music: 'mill',
  bed: 'mill',
  // Night-graded like Act I; the key a touch whiter and the fill teal so the
  // wet slate reads cold and the lantern pools carry the warmth.
  light: Object.freeze({
    keyWhite: 0.62,
    sky: '#6D9DBE',
    ground: '#14222A',
  }),
});

const GROUND = Object.freeze({
  nightBase: 1,
  h: 204, s: 0.1, l: 0.3,
  shadeH: 183, shadeS: 0.13, shadeL: 0.062, coolLift: 12,
  dirtH: 32, dirtL: 0.13, mossN: 26, mossOff: -114, mossS: 0.4, mossL: 0.25,
  leafN: 110, litterH: 72, litterS: 0.16, litterL: 0.2, crackN: 5, pebbleN: 70,
  bushOff: -110, bushLitOff: -116, wallMossOff: -112, bladeCool: 'shade', bladeShadeL: 0.15, lift2: 2,
  flagstones: Object.freeze({ size: 0.95, h: 198, s: 0.13, l: 0.3, alpha: 0.3, groutH: 204, groutS: 0.25, groutL: 0.05, groutA: 0.5, grout: 3 }),
  blade: Object.freeze({ h: 88, s: 0.4, l: 0.27 }),
});

const APRON = Object.freeze({ base: 'hsl(198,30%,8%)', mottleH: 196, mottleS: 0.2, crownH: 190, crownS: 0.3 });
const TREELINE = Object.freeze({
  style: 'mill',
  crown: hslColor(188, 0.22, 0.11),
  crownLit: hslColor(184, 0.2, 0.17),
  trunk: hslColor(200, 0.14, 0.08),
  scrub: hslColor(96, 0.22, 0.16),
  rock: hslColor(200, 0.12, 0.1),
});
const MATS = Object.freeze({
  stoneCool: hslColor(196, 0.1, 0.22),
  stone: hslColor(200, 0.08, 0.26),
  stoneLit: hslColor(198, 0.08, 0.33),
});

const SHARED = {
  propsAvoidPaths: true,
  grass: 560,
  flowers: 24,
  propFamily: 'mill',
  apron: APRON,
  treeline: TREELINE,
  mats: MATS,
  flowerTints: null,
};

// Boss / shop per-room dressing (env/dressing.js) — the mill yard ring.
const ROOMS = Object.freeze({
  boss: {
    clusters: [
      [-9.0, -4.9, 0.6, 'pillar urn'],
      [9.0, -4.9, 0.6, 'pillar reeds'],
      [-9.3, 0.4, 0.6, 'idol urn'],
      [9.3, 0.4, 0.6, 'idol urn'],
      [-3.2, -6.7, 0.5, 'pillar'],
      [3.2, -6.7, 0.5, 'pillar'],
      [-5.8, 0.4, 0.5, 'urn pillar'],
      [5.8, 0.4, 0.5, 'pillar urn'],
      [-6.1, 1.9, 0.45, 'urn'],
      [6.1, 1.9, 0.45, 'urn'],
      [-7.4, -1.0, 0.5, 'idol reeds'],
      [-7.0, 2.4, 0.45, 'pillar urn'],
    ],
  },
  shop: {
    stall: [-6.4, -0.6, 0.28],
    clusters: [
      [-6.9, 1.3, 0.55, 'crate sack sack'],
      [-7.2, -2.6, 0.6, 'barrel ropecrate'],
      [-5.2, -2.9, 0.4, 'banner'],
      [-8.2, -0.4, 0.4, 'sack'],
    ],
  },
});

export const LAYOUT_SPECS = Object.freeze({
  // ---- 4 · Millpond: one race down the west third, a pond in the NE corner.
  4: Object.freeze({
    id: 4,
    name: 'millpond',
    biome: 'mill',
    mood: { key: 0.46, fill: 0.7, warmth: 0.0, keyWhite: 0.12, poolGain: 0.8, poolTint: '#E6B456', poolR: 0.9 },
    ground: GROUND,
    ...SHARED,
    water: [
      { pts: [[-7.6, -8.6], [-7.6, 8.6]], w: 1.62 },
      { pts: [[8.4, -6.6], [10.2, -5.6], [11.8, -4.4]], w: 2.3 },
    ],
    paths: [{ pts: [[-4.2, 8.6], [-1.6, 3.2], [1.6, -0.8], [6.4, -3.6], [8.4, -8.6]], w: 1.4 }],
    torches: [[-5.6, -7.2], [5.2, 7.2], [11.2, -2.2], [-11.2, 4.8]],
    lightIdx: [0, 2],
    lanterns: [[3.0, -7.3, -1.5708], [-9.2, 7.3, 1.5708]],
    braziers: [[-3.3, 1.9], [3.3, -2.6], [6.7, 0.5], [-1.2, 5.7]],
    millwheel: [-9.8, -4.6, 1.5708],
    clusters: [
      [-4.4, -7.3, 0.7, 'timberpile reeds'],
      [0.9, -7.4, 0.6, 'ropecrate crate barrel'],
      [6.4, -7.3, 0.7, 'sluiceframe reeds'],
      [10.6, -7.2, 0.5, 'reeds'],
      [-10.3, 0.4, 0.4, 'millhouse'],
      [-9.7, 5.8, 0.6, 'reeds timberpile'],
      [-10.6, -1.9, 0.4, 'reeds'],
      [11.2, 0.6, 0.6, 'ropecrate crate'],
      [11.2, 5.4, 0.6, 'timberpile reeds'],
      [-3.4, 7.3, 0.6, 'reeds reeds'],
      [2.6, 7.4, 0.6, 'crate barrel'],
      [7.8, 7.3, 0.6, 'reeds footbridge'],
      [8.8, -2.4, 0.6, 'tower reeds'],
      [8.6, 2.8, 0.6, 'banner timberpile'],
      [4.2, 6.2, 0.5, 'tower'],
      [7.6, 4.6, 0.55, 'tower ropecrate'],
      [-5.6, 6.4, 0.5, 'banner reeds'],
      [-5.6, -6.2, 0.5, 'reeds'],
    ],
    rooms: ROOMS,
  }),

  // ---- 5 · Weir: a race along the north third into a weir, a second down the east.
  5: Object.freeze({
    id: 5,
    name: 'weir',
    biome: 'mill',
    mood: { key: 0.48, fill: 0.7, warmth: 0.0, keyWhite: 0.12, poolGain: 0.8, poolTint: '#E6B456', poolR: 0.9 },
    ground: GROUND,
    ...SHARED,
    water: [
      { pts: [[-12.6, -4.6], [2.6, -4.6]], w: 1.62 },
      { pts: [[7.4, 8.6], [7.4, -8.6]], w: 1.62 },
      { pts: [[-10.6, 5.6], [-8.2, 6.6]], w: 2.0 },
    ],
    paths: [{ pts: [[-12.6, 1.6], [-6.4, 1.0], [-1.8, 3.0], [3.4, 3.2], [6.4, 2.6]], w: 1.4 }],
    torches: [[-11.2, -1.9], [11.2, 1.2], [-1.9, -7.2], [2.2, 7.2]],
    lightIdx: [2, 1],
    lanterns: [[-8.8, 7.3, 1.5708], [4.6, 7.3, 1.5708]],
    braziers: [[-6.8, 1.0], [2.2, 3.6], [5.6, -0.9], [-1.8, -2.8]],
    millwheel: [4.3, -6.9, 0],
    clusters: [
      [-9.4, -7.3, 0.7, 'reeds timberpile'],
      [-4.6, -7.4, 0.6, 'sluiceframe reeds'],
      [0.0, -7.3, 0.5, 'reeds'],
      [10.2, -5.8, 0.4, 'millhouse'],
      [10.4, -1.2, 0.5, 'ropecrate'],
      [10.6, 5.4, 0.6, 'reeds reeds'],
      [-11.2, -2.2, 0.5, 'reeds'],
      [-11.0, 4.0, 0.6, 'timberpile'],
      [-5.6, 7.3, 0.6, 'reeds crate'],
      [0.6, 7.4, 0.6, 'ropecrate barrel'],
      [-8.4, -2.4, 0.6, 'tower reeds'],
      [-8.2, 2.6, 0.6, 'banner'],
      [-5.0, 4.4, 0.5, 'reeds'],
      [3.4, 5.6, 0.55, 'tower timberpile'],
      [5.8, 5.6, 0.5, 'banner reeds'],
      [-1.6, 6.2, 0.5, 'tower'],
    ],
    rooms: ROOMS,
  }),

  // ---- 6 · Drowned Granary: a race along the south, flooded pools, the
  // granary ruin on the north wall. Also the Act II boss room's dressing.
  6: Object.freeze({
    id: 6,
    name: 'granary',
    biome: 'mill',
    mood: { key: 0.44, fill: 0.72, warmth: 0.0, keyWhite: 0.14, poolR: 0.95, poolGain: 0.8, poolTint: '#E6B456' },
    ground: GROUND,
    ...SHARED,
    water: [
      { pts: [[12.6, 4.8], [-2.8, 4.8]], w: 1.62 },
      { pts: [[-10.4, 5.2], [-7.6, 6.4]], w: 2.6 },
      { pts: [[-10.6, -6.4], [-8.8, -5.2]], w: 1.8 },
    ],
    paths: [{ pts: [[-12.6, -1.4], [-7.0, -0.2], [-1.6, 1.2], [4.2, -1.6], [12.6, -2.6]], w: 1.4 }],
    torches: [[-11.2, 3.2], [11.2, -5.0], [-4.6, -7.2], [4.0, 7.2]],
    lightIdx: [2, 1],
    lanterns: [[1.4, -7.3, -1.5708], [-8.6, 7.3, 1.5708]],
    braziers: [[-3.4, 1.8], [2.2, -2.6], [6.6, -1.2], [-6.8, -2.2]],
    millwheel: [-9.4, -3.2, 1.5708],
    clusters: [
      [-0.8, -7.2, 0.4, 'millhouse'],
      [4.2, -7.3, 0.7, 'ropecrate crate crate'],
      [8.4, -7.2, 0.6, 'timberpile reeds'],
      [-5.8, -7.3, 0.6, 'sack crate'],
      [11.2, 0.4, 0.6, 'reeds timberpile'],
      [11.2, 2.6, 0.5, 'reeds'],
      [-11.2, 0.8, 0.5, 'reeds'],
      [-11.3, -3.9, 0.55, 'timberpile'],
      [-5.6, 7.4, 0.6, 'reeds reeds'],
      [1.6, 7.3, 0.6, 'reeds'],
      [8.6, -3.6, 0.6, 'tower reeds'],
      [8.2, 1.9, 0.6, 'banner crate'],
      [-8.4, 1.6, 0.6, 'tower'],
      [-4.4, 4.4, 0.5, 'reeds banner'],
      [5.6, 3.2, 0.5, 'tower'],
      [-3.6, -6.4, 0.4, 'sack'],
    ],
    rooms: ROOMS,
  }),
});
