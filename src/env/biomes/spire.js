// Act V — The Still Spire (docs/ACT_V.md): the gods' high belfry, where they
// sat down to watch and never rose. A platform of pale weathered limestone
// open to a slate-blue dusk sky: big worn flagstones with rime in the cracks,
// tarnished bronze bells in stone frames and timber bell-cages, belfry ropes
// hanging out of the dark above, gargoyles on their perches, wind-torn
// banners, feathers everywhere the wind has dropped them. Beyond the parapet
// there is no forest — a stone balustrade, broken arches and, far below, a
// sea of cloud with the other spires standing out of it. Warm light comes
// only from fire (braziers, lanterns, a few cressets); Ember stays reserved
// for telegraphs.
//
// The act tell (one indigo corruption tell per layout, like the Barrow's
// veined stones and the Heart's landmarks): a bronze bell whose CRACK glows
// indigo — 'bellframe' (a stone frame built into a parapet) in the ordinary
// rooms, the GREAT BELL in the belfry's crown (32, also Level V's boss room
// dressing). Both push a `monolith` emitter (the indigo-violet halo + floor
// underglow).
//
// Layouts 29 Bell Stair · 30 Rope Walk · 31 Chime Gallery · 32 Belfry Crown
// (also the boss room) · 33 Gargoyle Ledge · 34 Windward Court (the ARENA).
// Spec grammar = env/biomes/barrow.js plus the spire fields:
//   landmarks  [[x, z, r, kind, yaw]] built pieces (props.js spire branch):
//              'greatbell' / 'bellframe' (the tell, straddling a parapet:
//              yaw 0 = the north wall, +-PI/2 the side walls) and 'stair'
//              (a flight of steps up to a broken doorway on the north wall)
//   ropes      [[x, z]] belfry ropes hanging out of the dark overhead, each
//              with a striped sally a hand above the floor (they sway)
//   tuft: 'feather'   the foliage scatter is fallen feathers, not grass
//   moteTint   the drifting motes are frost flecks in the high cold air
//   ground.rime       the rime pass (ground.js): frost windrows along the
//              parapets, rime feathering out of the cracks, dropped feathers
//   apron.clouds      the apron is a sea of cloud far below (ground.js)
//   treeline 'spire'  balustrade + broken arches + distant spires over cloud
//
// Palette (display-space HSL): limestone H 36-44 S .05-.09 L .40-.72; shade
// slate H 214-226 S .1-.24 L .09-.2; rime H 200-208 S .25-.35 L .8-.9;
// bronze H 38-44 S .34-.42 L .36-.56 (verdigris H 176, never the heal band);
// hemp H 40 S .22; the tell's crack TELL indigo (pre-compensated linear).
import { hslColor } from '../colors.js';

export const BIOME = Object.freeze({
  id: 'spire',
  act: 5,
  name: 'The Still Spire',
  music: 'spire',
  bed: 'spire',
  // Cold high air at dusk: the key bleached toward a slate white, a slate-
  // blue sky fill, a dim stone bounce. The fires carry all of the warmth.
  light: Object.freeze({
    keyWhite: 0.55,
    keyTint: '#CBD5E8',
    sky: '#7486AA',
    ground: '#2A2C34',
  }),
});

const HALF_PI = Math.PI / 2;

const GROUND = Object.freeze({
  nightBase: 1,
  h: 40, s: 0.06, l: 0.3,
  shadeH: 216, shadeS: 0.02, shadeL: 0.1, coolLift: 18,
  dirtH: 42, dirtL: 0.5, dirtSMul: 0.3, dirtAMul: 0.5, pathLip: 0.2, mossN: 10, mossOff: 166, mossS: 0.12, mossL: 0.4,
  leafN: 40, litterH: 34, litterS: 0.06, litterL: 0.56, crackN: 30, pebbleN: 50,
  bushOff: 170, bushLitOff: 172, wallMossOff: 170, bladeCool: 'shade', bladeShadeL: 0.26, lift2: 3,
  // Big worn limestone flags split by dark slate joints.
  flagstones: Object.freeze({ size: 1.75, h: 38, s: 0.05, l: 0.5, alpha: 0.86, fill: 1.1, groutH: 220, groutS: 0.16, groutL: 0.1, groutA: 0.62, grout: 2.6 }),
  // Rime in the cracks, frost windrows along the parapets, dropped feathers.
  rime: Object.freeze({ cracks: 22, drifts: 22, feathers: 70, h: 204, s: 0.26, l: 0.84 }),
  // Fallen feathers (foliage 'feather'): pale dove-grey, the shade ones slate.
  blade: Object.freeze({ h: 36, s: 0.05, l: 0.78 }),
});

// A slate-blue dusk sea of cloud far below the parapet.
const APRON = Object.freeze({
  base: 'hsl(224,24%,13%)',
  mottleH: 222,
  mottleS: 0.12,
  crownH: 226,
  crownS: 0.14,
  mist: [150, 162, 188],
  clouds: Object.freeze({ n: 120, h: 228, s: 0.16, l: 0.5, litH: 252, litS: 0.12, litL: 0.66 }),
});
const TREELINE = Object.freeze({
  style: 'spire',
  trunk: hslColor(222, 0.12, 0.2), // distant spires (slate silhouettes)
  crownLit: hslColor(226, 0.1, 0.42), // their lit faces / roofs
  scrub: hslColor(40, 0.07, 0.48), // the balustrade (pale limestone)
  rock: hslColor(36, 0.06, 0.46), // fallen masonry
  stoneDark: hslColor(220, 0.08, 0.32), // arches in shade
  cloud: hslColor(226, 0.18, 0.36), // cloud banks
  cloudLit: hslColor(248, 0.12, 0.62), // their lit tops (lilac dusk)
  rime: hslColor(204, 0.3, 0.86),
  bronze: hslColor(40, 0.36, 0.38),
  timber: hslColor(28, 0.1, 0.22),
});
// Base tones the shared props read (pillar, urn, idol, banner foot, torch
// footing): limestone.
const MATS = Object.freeze({
  stone: hslColor(40, 0.07, 0.48),
  stoneLit: hslColor(42, 0.08, 0.58),
  stoneCool: hslColor(218, 0.08, 0.36),
});

const SHARED = {
  propsAvoidPaths: true,
  grass: 150,
  flowers: 0,
  tuft: 'feather',
  propFamily: 'spire',
  moteTint: [0.78, 0.86, 1.0],
  apron: APRON,
  treeline: TREELINE,
  mats: MATS,
};

const MOOD = Object.freeze({ key: 0.6, fill: 0.92, warmth: 0.0, keyWhite: 0.0, poolGain: 0.72, poolTint: '#E9B25C', poolR: 0.9, torchLightGain: 0.55 });

const ROOMS = Object.freeze({
  boss: {
    clusters: [
      [-9.4, -3.6, 0.5, 'pillar gargoyle'],
      [9.4, -3.6, 0.5, 'gargoyle pillar'],
      [-3.8, -7.0, 0.35, 'pillar'],
      [3.8, -7.0, 0.35, 'pillar'],
      [-9.8, 4.2, 0.45, 'idol urn'],
      [9.8, 4.2, 0.45, 'urn idol'],
      [-4.8, 6.0, 0.45, 'gargoyle'],
      [4.8, 6.0, 0.45, 'gargoyle'],
      [-9.2, 6.8, 0.4, 'drum'],
      [9.2, 6.8, 0.4, 'fallenbell'],
    ],
  },
  shop: {
    stall: [-6.4, -0.6, 0.28],
    clusters: [
      [-6.9, 1.3, 0.55, 'urn sack sack'],
      [-7.2, -2.6, 0.6, 'limeblock crate'],
      [-5.2, -2.9, 0.4, 'spirebanner'],
      [-8.2, -0.4, 0.4, 'sack'],
    ],
  },
});

export const LAYOUT_SPECS = Object.freeze({
  // ---- 29 · Bell Stair: a flight of steps climbs the north parapet to a
  // doorway into the sky; the bell stands at its foot, the cracked bell hangs
  // in the parapet to the north-east.
  29: Object.freeze({
    id: 29,
    name: 'bellstair',
    biome: 'spire',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[0.0, 8.6], [0.5, 4.6], [-0.3, 1.2], [0.2, -2.6], [0.0, -6.2]], w: 1.6 }],
    landmarks: [
      [0.0, -7.6, 0.9, 'stair', 0],
      [8.8, -8.0, 0.8, 'bellframe', 0],
    ],
    ropes: [[-10.4, -6.9], [-4.2, -7.5], [4.4, -7.5], [10.9, -2.0]],
    torches: [[-3.0, -7.2], [3.0, -7.2], [-11.2, 0.0], [11.2, 0.0]],
    lightIdx: [2, 3],
    lanterns: [[-2.6, 7.3, HALF_PI], [8.6, 7.3, HALF_PI]],
    braziers: [[-4.4, 0.8], [4.4, 0.4]],
    clusters: [
      [-8.4, -7.3, 0.5, 'gargoyle limeblock'],
      [-11.1, -5.4, 0.4, 'balustrade'],
      [11.1, -5.4, 0.4, 'gargoyle'],
      [-11.1, 4.8, 0.45, 'bellcage'],
      [11.1, 5.2, 0.45, 'limeblock featherpile'],
      [-7.6, 7.3, 0.5, 'drum urn'],
      [7.2, 7.3, 0.45, 'fallenbell'],
      [2.6, 7.4, 0.4, 'ropecoil featherpile'],
      [-9.6, 0.6, 0.45, 'pillar spirebanner'],
      [9.6, -0.8, 0.45, 'spirebanner pillar'],
    ],
    rooms: ROOMS,
  }),

  // ---- 30 · Rope Walk: a long walk under the hanging ropes; rime ices both
  // ends, the cracked bell hangs in the north-west parapet.
  30: Object.freeze({
    id: 30,
    name: 'ropewalk',
    biome: 'spire',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[-12.6, 0.2], [-6.0, -0.4], [0.0, 0.4], [6.0, -0.2], [12.6, 0.4]], w: 1.6 }],
    landmarks: [[-7.8, -8.0, 0.8, 'bellframe', 0]],
    ropes: [[-1.8, -7.4], [0.2, -7.6], [2.0, -7.3], [-10.8, -6.6], [10.9, -6.2], [-11.0, 1.8], [11.0, -1.6]],
    torches: [[-3.6, -7.3], [3.6, -7.3], [-11.2, 5.4], [11.2, -5.4]],
    lightIdx: [0, 1],
    lanterns: [[-7.4, 7.3, HALF_PI], [9.0, 7.3, HALF_PI]],
    braziers: [[-6.4, -2.6], [6.6, 1.8]],
    clusters: [
      [-10.6, -7.0, 0.4, 'gargoyle'],
      [9.0, -7.3, 0.5, 'bellcage limeblock'],
      [0.0, -7.4, 0.45, 'balustrade'],
      [-10.4, 7.2, 0.45, 'limeblock featherpile'],
      [0.0, 7.4, 0.45, 'drum ropecoil'],
      [2.8, 7.4, 0.4, 'fallenbell'],
      [10.8, 6.8, 0.45, 'gargoyle'],
      [-7.4, 2.0, 0.4, 'pillar spirebanner'],
      [7.8, -2.4, 0.4, 'pillar'],
    ],
    rooms: ROOMS,
  }),

  // ---- 31 · Chime Gallery: a gallery of small bells in timber cages, the
  // cracked bell in the north-west parapet, a bell on the west walk.
  31: Object.freeze({
    id: 31,
    name: 'chimegallery',
    biome: 'spire',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[0.0, 8.6], [-0.4, 4.4], [0.6, 0.6], [-0.4, -2.8], [-4.0, -3.6], [-12.6, -3.2]], w: 1.4 }],
    landmarks: [[-8.0, -8.0, 0.8, 'bellframe', 0]],
    ropes: [[-1.2, -7.4], [0.8, -7.5], [-11.0, -2.2], [10.9, 1.2]],
    torches: [[-2.4, -7.3], [2.6, -7.3], [-11.2, -4.6], [11.2, 5.4]],
    lightIdx: [0, 3],
    lanterns: [[-9.0, 7.3, HALF_PI], [7.6, 7.3, HALF_PI]],
    braziers: [[3.6, 1.2], [-9.0, 1.4]],
    clusters: [
      [-11.0, -0.6, 0.4, 'bellcage'],
      [-11.0, -6.8, 0.4, 'gargoyle'],
      [8.8, -7.3, 0.5, 'bellcage limeblock'],
      [11.0, -1.2, 0.4, 'bellcage'],
      [11.0, 7.0, 0.45, 'bellcage featherpile'],
      [-11.0, 6.8, 0.5, 'limeblock drum'],
      [-2.4, 7.4, 0.45, 'fallenbell'],
      [2.6, 7.4, 0.4, 'ropecoil'],
      [4.4, -2.8, 0.35, 'spirebanner'],
    ],
    rooms: ROOMS,
  }),

  // ---- 32 · Belfry Crown: the GREAT BELL hangs in the north parapet over a
  // frost of rime, its crack the brightest indigo on the Spire. Also Level
  // V's boss room dressing.
  32: Object.freeze({
    id: 32,
    name: 'belfrycrown',
    biome: 'spire',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[0.0, 8.6], [-0.3, 3.6], [0.3, 0.0], [0.0, -4.4]], w: 1.5 }],
    landmarks: [[0.0, -8.0, 0.8, 'greatbell', 0]],
    ropes: [[-10.6, -6.6], [10.6, -6.6], [-5.6, -7.6], [5.6, -7.6]],
    torches: [[-3.2, -7.3], [3.2, -7.3], [-11.2, -5.2], [11.2, -5.2]],
    lightIdx: [0, 1],
    lanterns: [[-2.4, 7.3, HALF_PI], [2.4, 7.3, HALF_PI]],
    braziers: [[-4.4, -1.2], [4.4, -1.2]],
    clusters: [
      [-9.0, -7.2, 0.5, 'gargoyle limeblock'],
      [9.0, -7.2, 0.5, 'gargoyle drum'],
      [-11.1, 1.8, 0.35, 'bellcage'],
      [11.1, -1.8, 0.35, 'balustrade'],
      [-7.4, 7.3, 0.5, 'fallenbell featherpile'],
      [7.4, 7.3, 0.5, 'limeblock ropecoil'],
      [-11.0, 6.6, 0.4, 'urn'],
      [11.0, 6.6, 0.4, 'spirebanner'],
    ],
    rooms: ROOMS,
  }),

  // ---- 33 · Gargoyle Ledge: grotesques crouched along every parapet and
  // on posts at the frost; the cracked bell in the north-east parapet.
  33: Object.freeze({
    id: 33,
    name: 'gargoyleledge',
    biome: 'spire',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [{ pts: [[-12.6, -3.4], [-7.0, -3.0], [-2.0, 0.4], [3.0, -0.4], [8.0, 2.6], [12.6, 3.0]], w: 1.3 }],
    landmarks: [[8.4, -8.0, 0.8, 'bellframe', 0]],
    ropes: [[-3.6, -7.4], [3.8, -7.4], [-11.0, -1.8], [11.0, 0.2]],
    torches: [[-2.4, -7.4], [2.4, -7.4], [-11.2, 0.0], [11.2, -1.2]],
    lightIdx: [0, 1],
    lanterns: [[-8.6, 7.3, HALF_PI], [0.0, 7.3, HALF_PI]],
    braziers: [[-3.6, 0.8], [3.4, 1.6]],
    clusters: [
      [-8.8, -7.2, 0.5, 'gargoyle gargoyle'],
      [-11.0, -5.4, 0.4, 'limeblock'],
      [11.1, -4.8, 0.4, 'gargoyle'],
      [-11.0, 5.6, 0.5, 'gargoyle drum'],
      [11.0, 6.6, 0.45, 'gargoyle'],
      [8.6, 7.4, 0.4, 'balustrade'],
      [2.8, 7.5, 0.35, 'featherpile'],
      [9.2, -1.8, 0.35, 'gargoyle'],
      [-9.0, 1.6, 0.35, 'pillar'],
    ],
    rooms: ROOMS,
  }),

  // ---- 34 · Windward Court (ARENA): an open court on the Spire's windward
  // face; the floor between the vents is clear, the dressing keeps to the
  // parapets. The cracked bell hangs in the north parapet behind the
  // champion's mark.
  34: Object.freeze({
    id: 34,
    name: 'windwardcourt',
    biome: 'spire',
    mood: MOOD,
    ground: GROUND,
    ...SHARED,
    paths: [
      { pts: [[0.0, 8.6], [0.3, 3.0], [-0.3, -1.6], [0.0, -5.2]], w: 1.6 },
      { pts: [[-4.4, 0.0], [0.0, 0.3], [4.4, 0.0]], w: 1.2 },
    ],
    landmarks: [[-3.2, -8.0, 0.75, 'bellframe', 0]],
    ropes: [[1.6, -7.6], [-11.0, -2.4], [11.0, 2.4]],
    torches: [[-11.2, -1.8], [11.2, 1.8], [-1.4, -7.3], [2.6, -7.3]],
    lightIdx: [2, 3],
    lanterns: [[-11.2, 7.3, HALF_PI], [11.2, 7.3, HALF_PI]],
    braziers: [[-8.8, 6.4], [8.8, -6.2]],
    clusters: [
      [-8.6, -7.4, 0.45, 'gargoyle'],
      [10.8, -7.0, 0.4, 'limeblock'],
      [-11.1, -7.0, 0.3, 'balustrade'],
      [-11.2, 2.2, 0.3, 'bellcage'],
      [11.2, -2.2, 0.3, 'bellcage'],
      [-3.2, 7.4, 0.45, 'fallenbell'],
      [3.2, 7.4, 0.45, 'drum featherpile'],
      [8.8, 7.4, 0.4, 'gargoyle'],
      [4.2, -7.5, 0.3, 'urn'],
    ],
    rooms: ROOMS,
  }),
});
