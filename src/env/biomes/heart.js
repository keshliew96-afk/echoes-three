// Act IV — The Hollow Heart (docs/ACT_IV.md): the hollow beneath the Ashen
// Barrow where the violet corruption first took root and still beats. Root-
// veined black rock around a living heart, violet crystal growths (geodes),
// veins of violet light in the walls and the floor, bruised-rose flesh-stone,
// and the bones of what the corruption took. Here the corruption IS the
// place: the act's identity is violet + deep rose + black stone under a cold
// crystal light. Ember stays reserved for telegraphs — there is no fire in
// the heart (its light sources are violet crystal glows; only the Peddler's
// stall lantern burns warm).
//
// Layouts 16 Root Gate · 17 Vein Gallery · 18 Heart Chamber (18 is also the
// boss room's dressing) · 19 Geode Hall · 20 Weeping Wells. Spec grammar =
// env/biomes/barrow.js plus the heart fields:
//   crystals        [[x, z]] violet crystal spires that carry a 'crystal'
//                   emitter (halo + violet floor pool; the act's braziers)
//   crystalLightIdx two of them also carry a real violet PointLight (every
//                   dressing keeps exactly two point lights, like the torches)
//   landmarks       [[x, z, r, kind, yaw]] built props: 'heart' (the beating
//                   heart), 'heartnode', 'rootgate', 'geode', 'well' — each
//                   the act's violet tell for its layout (a monolith emitter)
//   veinNet         { seeds: [[x, z, angleDeg, len, width]] } the root-vein
//                   network: painted into the floor (ground.js) and laid over
//                   it as a glowing additive decal (props.js) from the same
//                   deterministic walk
//   tuft: 'shard'   the foliage scatter is crystal shards, not grass
//   moteTint        the drifting motes are violet spores, not fireflies
//
// Palette (display-space HSL): shade base violet-black H 262-280 S .25-.35
// L .10-.14; lit flesh-stone H 330-345 S .14-.22 L .20-.26; veins: a dark
// rose root channel, a flesh ridge, a violet core H 268-276; crystal H 262-
// 276 S .45-.6; bone pale (Bone, cool-shaded).
import { hslColor } from '../colors.js';

export const BIOME = Object.freeze({
  id: 'heart',
  act: 4,
  name: 'The Hollow Heart',
  music: 'heart',
  bed: 'heart',
  // A cold crystal light: the key pulled to violet-white, a violet fill, a
  // bruised-rose ground bounce.
  light: Object.freeze({
    keyWhite: 0.4,
    keyTint: '#D6CDE6',
    sky: '#625A82',
    ground: '#30161F',
  }),
});

const GROUND = Object.freeze({
  nightBase: 1,
  h: 350, s: 0.3, l: 0.3,
  shadeH: 258, shadeS: -0.06, shadeL: 0.06, coolLift: 12,
  dirtH: 292, dirtL: 0.15, mossN: 18, mossOff: -72, mossS: 0.34, mossL: 0.2,
  leafN: 90, litterH: 40, litterS: 0.07, litterL: 0.46, crackN: 22, pebbleN: 90,
  bushOff: -60, bushLitOff: -54, wallMossOff: -62, bladeCool: 'shade', bladeShadeL: 0.13, lift2: 4,
  // The vein network painted into the floor (ground.js veinSteps).
  veins: Object.freeze({ rootH: 318, rootS: 0.3, rootL: 0.06, fleshH: 336, fleshS: 0.34, fleshL: 0.2, coreH: 272, coreS: 0.52, coreL: 0.46 }),
  // Violet crystal flecks breaking through the stone in clusters.
  flecks: Object.freeze({ n: 16, h: 270, s: 0.55, l: 0.5 }),
  // Bruised flesh-stone slabs: big irregular plates split by dark seams.
  flagstones: Object.freeze({ organic: true, size: 1.3, h: 340, s: 0.26, l: 0.28, alpha: 0.3, groutH: 290, groutS: 0.3, groutL: 0.05, groutA: 0.5, grout: 3 }),
  blade: Object.freeze({ h: 270, s: 0.36, l: 0.36 }),
});

const APRON = Object.freeze({ base: 'hsl(278,26%,6%)', mottleH: 300, mottleS: 0.16, crownH: 326, crownS: 0.24, mist: [118, 96, 160] });
const TREELINE = Object.freeze({
  style: 'heart',
  trunk: hslColor(276, 0.16, 0.1), // black-violet rock columns
  crownLit: hslColor(290, 0.12, 0.17), // their lit ledges
  scrub: hslColor(322, 0.2, 0.12), // root-flesh humps at the wall foot
  rock: hslColor(282, 0.14, 0.12),
  crystal: hslColor(268, 0.5, 0.42),
  crystalLit: hslColor(262, 0.48, 0.66),
});
const MATS = Object.freeze({
  stone: hslColor(292, 0.08, 0.3),
  stoneLit: hslColor(300, 0.08, 0.42),
  stoneCool: hslColor(272, 0.14, 0.18),
});

const SHARED = {
  propsAvoidPaths: true,
  grass: 60,
  flowers: 0,
  tuft: 'shard',
  propFamily: 'heart',
  moteTint: [0.62, 0.48, 1.0],
  apron: APRON,
  treeline: TREELINE,
  mats: MATS,
  torches: [],
  lanterns: [],
  braziers: [],
};

const MOOD = Object.freeze({ key: 0.6, fill: 0.8, warmth: 0.0, keyWhite: 0.0 });

const ROOMS = Object.freeze({
  boss: {
    clusters: [
      [-9.2, -3.8, 0.6, 'pillar crystalcluster'],
      [9.2, -3.8, 0.6, 'pillar crystalcluster'],
      [-9.4, 0.4, 0.6, 'idol polyp'],
      [9.4, 0.4, 0.6, 'idol polyp'],
      [-3.0, -6.9, 0.4, 'pillar'],
      [3.0, -6.9, 0.4, 'pillar'],
      [-5.4, 0.2, 0.45, 'polyp'],
      [5.4, 0.2, 0.45, 'polyp'],
      [-4.8, 5.8, 0.45, 'ribcage'],
      [4.8, 5.8, 0.45, 'bonepile'],
      [-8.8, 4.8, 0.5, 'crystalcluster'],
      [8.8, 4.8, 0.5, 'crystalcluster'],
    ],
  },
  shop: {
    stall: [-6.4, -0.6, 0.28],
    clusters: [
      [-6.9, 1.3, 0.55, 'urn sack sack'],
      [-7.2, -2.6, 0.6, 'crystalcluster crate'],
      [-5.2, -2.9, 0.4, 'banner'],
      [-8.2, -0.4, 0.4, 'sack'],
    ],
  },
});

export const LAYOUT_SPECS = Object.freeze({
  // ---- 16 · Root Gate: the way down — a great arch of roots on the north
  // wall where the Barrow's floor gave way.
  16: Object.freeze({
    id: 16,
    name: 'rootgate',
    biome: 'heart',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[0.0, -6.2], [0.8, -2.8], [-0.4, 1.2], [0.6, 4.8], [0.0, 8.6]], w: 1.4 }],
    landmarks: [[0.0, -7.1, 1.4, 'rootgate', 0]],
    crystals: [[-8.6, -6.2], [8.8, -6.0], [-9.4, 4.6], [9.2, 5.6], [-2.8, 5.4], [3.2, -3.0]],
    crystalLightIdx: [5, 4],
    veinNet: {
      seeds: [
        [-0.6, -6.0, 104, 5.2, 0.2],
        [0.7, -6.0, 76, 4.2, 0.16],
        [-11.7, -1.0, 4, 4.2, 0.15],
        [11.7, 2.0, 184, 4.2, 0.15],
        [-6.0, 7.8, -84, 3.2, 0.13],
        [6.4, -7.8, 96, 3.0, 0.13],
        [-11.7, 5.6, -18, 3.6, 0.12],
        [11.7, -5.0, 164, 3.6, 0.12],
      ],
    },
    clusters: [
      [-3.0, -7.2, 0.5, 'roots crystalcluster'],
      [3.2, -7.2, 0.5, 'roots bonepile'],
      [-10.6, -6.4, 0.6, 'crystalcluster veinrock'],
      [10.9, -1.2, 0.5, 'geode'],
      [-11.0, -1.4, 0.5, 'veinrock roots'],
      [-11.0, 1.6, 0.5, 'ribcage'],
      [10.8, 7.0, 0.5, 'crystalcluster polyp'],
      [-7.8, 7.0, 0.6, 'polyp polyp roots'],
      [-2.0, 7.2, 0.5, 'bonepile crystalcluster'],
      [2.8, 7.2, 0.5, 'shardfall roots'],
      [7.6, 7.0, 0.5, 'ribcage'],
      [-9.0, -3.6, 0.45, 'polyp'],
      [8.6, 2.0, 0.5, 'veinrock crystalcluster'],
      [-8.4, 3.6, 0.5, 'roots geode'],
      [7.8, -4.6, 0.5, 'crystalcluster bonepile'],
    ],
    rooms: ROOMS,
  }),

  // ---- 17 · Vein Gallery: a long gallery whose walls bleed veins of violet
  // light along the floor; a heart node swells in the south-east corner.
  17: Object.freeze({
    id: 17,
    name: 'veingallery',
    biome: 'heart',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[-12.6, -0.4], [-6.0, 0.4], [0.0, -0.6], [6.0, 0.4], [12.6, -0.2]], w: 1.4 }],
    landmarks: [[9.8, 5.6, 1.0, 'heartnode', -0.6]],
    crystals: [[-9.0, -6.4], [7.4, -6.6], [-9.4, 5.6], [1.0, 6.2], [7.6, -2.8], [-8.6, -1.8]],
    crystalLightIdx: [4, 3],
    veinNet: {
      seeds: [
        [-11.7, -6.8, 6, 9.0, 0.17],
        [11.7, 6.9, 186, 7.0, 0.17],
        [-11.7, 3.2, -10, 4.2, 0.13],
        [11.7, -3.0, 172, 4.2, 0.13],
        [-3.2, -7.8, 82, 2.4, 0.12],
        [3.0, 7.8, -98, 2.4, 0.12],
        [9.0, 5.0, 205, 4.6, 0.17],
        [9.2, 4.8, 250, 3.6, 0.14],
      ],
    },
    clusters: [
      [-6.6, -7.3, 0.5, 'crystalcluster roots'],
      [-3.6, -7.3, 0.45, 'veinrock'],
      [3.6, -7.3, 0.5, 'ribcage'],
      [10.8, -6.6, 0.5, 'geode'],
      [-11.0, -4.6, 0.5, 'roots polyp'],
      [11.0, 1.0, 0.5, 'crystalcluster'],
      [-11.0, 0.2, 0.5, 'bonepile'],
      [-11.0, 6.4, 0.5, 'veinrock roots'],
      [-6.2, 7.2, 0.5, 'polyp shardfall'],
      [4.4, 7.2, 0.5, 'roots bonepile'],
      [6.8, 7.0, 0.4, 'crystalcluster'],
      [-8.4, 3.0, 0.5, 'ribcage'],
      [8.8, -4.8, 0.45, 'bonepile'],
    ],
    rooms: ROOMS,
  }),

  // ---- 18 · Heart Chamber: the heart itself, grown into the north wall,
  // every vein in the floor running to it. The Act IV boss room's dressing.
  18: Object.freeze({
    id: 18,
    name: 'heartchamber',
    biome: 'heart',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[0.0, -5.9], [0.5, -2.6], [-0.5, 1.2], [-2.6, 4.2], [-3.4, 8.6]], w: 1.3 }],
    landmarks: [[0.0, -7.3, 1.3, 'heart', 0]],
    crystals: [[-9.6, -6.2], [9.6, -6.2], [-9.6, 5.6], [9.6, 5.6], [-3.6, -5.8], [3.6, -5.8]],
    crystalLightIdx: [4, 3],
    veinNet: {
      seeds: [
        [-0.9, -6.2, 112, 7.5, 0.22],
        [0.9, -6.2, 68, 7.5, 0.22],
        [-1.5, -6.7, 156, 6.5, 0.18],
        [1.5, -6.7, 24, 6.5, 0.18],
        [0.0, -6.1, 90, 4.4, 0.15],
        [-11.7, 4.0, -14, 4.2, 0.13],
        [11.7, 4.0, 194, 4.2, 0.13],
      ],
    },
    clusters: [
      [-6.4, -7.3, 0.5, 'crystalcluster roots'],
      [6.4, -7.3, 0.5, 'roots crystalcluster'],
      [-11.0, -1.2, 0.5, 'geode'],
      [11.0, -1.2, 0.5, 'geode'],
      [-11.0, 6.6, 0.5, 'ribcage'],
      [11.0, 6.6, 0.5, 'bonepile polyp'],
      [-6.4, 7.2, 0.5, 'polyp roots'],
      [6.4, 7.2, 0.5, 'roots polyp'],
      [-3.6, 7.3, 0.4, 'bonepile'],
      [3.6, 7.3, 0.4, 'veinrock'],
      [-8.8, -4.6, 0.45, 'veinrock'],
      [8.8, -4.6, 0.45, 'veinrock'],
      [-8.6, 3.6, 0.45, 'polyp'],
      [8.6, 3.6, 0.45, 'polyp'],
    ],
    rooms: ROOMS,
  }),

  // ---- 19 · Geode Hall: the floor itself is heart crystal; three great
  // open geodes stand in the hall's corners and north wall.
  19: Object.freeze({
    id: 19,
    name: 'geodehall',
    biome: 'heart',
    mood: MOOD,
    ground: Object.freeze({ ...GROUND, flecks: Object.freeze({ n: 34, h: 268, s: 0.58, l: 0.52 }) }),
    ...SHARED,
    grass: 100,
    paths: [
      { pts: [[-12.6, 1.6], [-6.0, 1.0], [-1.2, -0.6], [3.6, 0.6], [12.6, 1.2]], w: 1.4 },
      { pts: [[0.0, -6.0], [0.2, -2.0]], w: 1.0 },
    ],
    landmarks: [
      [0.0, -7.3, 1.2, 'geode', 0],
      [-9.6, 5.6, 1.0, 'geode', 0.9],
      [9.6, -5.4, 0.9, 'geode', -2.2],
    ],
    crystals: [[-9.4, -6.0], [9.8, 5.8], [-5.6, 6.6], [5.6, 6.6]],
    crystalLightIdx: [0, 3],
    veinNet: {
      seeds: [
        [-11.7, -4.0, 10, 4.0, 0.12],
        [11.7, 3.0, 190, 4.0, 0.12],
        [0.0, -6.2, 90, 3.0, 0.14],
        [-6.0, 7.8, -80, 3.0, 0.1],
        [6.0, 7.8, -100, 3.0, 0.1],
      ],
    },
    clusters: [
      [-4.8, -7.3, 0.5, 'crystalcluster crystalcluster'],
      [4.8, -7.3, 0.5, 'crystalcluster shardfall'],
      [-11.0, -1.0, 0.5, 'geode crystalcluster'],
      [11.0, 1.4, 0.5, 'geode'],
      [-2.4, 7.3, 0.4, 'shardfall'],
      [2.4, 7.3, 0.4, 'bonepile'],
      [8.6, -2.6, 0.5, 'crystalcluster veinrock'],
      [-8.4, 2.4, 0.5, 'ribcage'],
      [8.4, 3.4, 0.5, 'polyp crystalcluster'],
    ],
    rooms: ROOMS,
  }),

  // ---- 20 · Weeping Wells: two wells where the heart's ichor wells up and
  // weeps over the rim; a heart node pushes out of the north wall.
  20: Object.freeze({
    id: 20,
    name: 'weepingwells',
    biome: 'heart',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[-12.6, -6.4], [-7.0, -4.6], [-2.0, -1.6], [2.4, 1.8], [7.0, 4.8], [12.6, 6.2]], w: 1.3 }],
    landmarks: [
      [-7.6, 5.6, 1.1, 'well', 0.3],
      [7.8, -5.6, 1.1, 'well', -0.4],
      [0.0, -7.5, 0.85, 'heartnode', 0],
    ],
    crystals: [[-10.0, -6.4], [10.2, 6.2], [-1.6, 6.6], [2.8, -6.4]],
    crystalLightIdx: [2, 3],
    veinNet: {
      seeds: [
        [-6.6, 4.8, -40, 4.2, 0.15],
        [-8.4, 4.9, -120, 3.0, 0.12],
        [6.8, -4.8, 140, 4.2, 0.15],
        [8.6, -4.9, 60, 3.0, 0.12],
        [0.0, -6.9, 90, 2.4, 0.12],
        [-11.7, -4.6, 0, 3.4, 0.12],
        [11.7, 4.2, 180, 3.4, 0.12],
      ],
    },
    clusters: [
      [-7.0, -7.3, 0.5, 'crystalcluster roots'],
      [-3.0, -7.3, 0.4, 'bonepile'],
      [11.0, -1.6, 0.5, 'geode roots'],
      [-11.0, 1.6, 0.5, 'veinrock'],
      [-11.0, -4.8, 0.45, 'ribcage'],
      [3.0, 7.2, 0.5, 'polyp roots'],
      [-4.8, 7.3, 0.45, 'bonepile shardfall'],
      [7.4, 6.8, 0.45, 'crystalcluster'],
      [8.8, -1.6, 0.4, 'polyp'],
      [-8.8, 1.8, 0.5, 'roots crystalcluster'],
    ],
    rooms: ROOMS,
  }),
});
