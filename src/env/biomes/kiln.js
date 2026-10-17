// The Ember Kiln (docs/KILN.md, content plan 5 slice 7): the gods' kiln,
// where the first bells were fired. The fire never went out. Floors of fire
// brick baked black and umber, flagstone walks worn grey, soot blooming out of
// every kiln mouth, hairline cracks in the brick glowing KILN GOLD where the
// heat comes through from below; clay moulds and half-cast bells cooling in
// sand, slag heaps raked out of the furnaces, racks of glazed tiles, tool
// racks of tongs and ladles. Kiln mouths glow in the walls. Beyond the walls a
// dark yard lit from below: brick kiln walls with their own glowing mouths,
// bottle kilns, chimneys and flues, smoke columns standing into the dark.
//
// PALETTE RULE (data/palette.js, env/bandguard.js): this is a fire land beside
// a red-orange threat colour, so the Kiln's own fire, glow and light are KILN
// GOLD (VFX_MATTER.kilngold / kilnheat / sparks, hue 36-46) and its banked
// coals deep CRIMSON (VFX_MATTER.coal, hue 350-358), both outside Ember's
// 5-25 band; the brick and slag bodies stay low chroma (kilnbrick, slag). The
// only red-orange on the floor is an Ember telegraph. Never Bright Heal;
// God-stuff Violet only on the tell.
//
// The act tell (one indigo corruption tell per layout, like the Spire's bells):
// a bell CAST in the kiln's sand whose crack glows indigo — 'castbell' (a bell
// sitting mouth-down in a brick-kerbed casting bed under an iron gantry) in the
// ordinary rooms, the GREAT CAST (a great bell hung from the casting gantry
// over the north wall, 39, also the Kiln's boss room dressing). Both push a
// `monolith` emitter (the indigo-violet halo + floor underglow).
//
// Layouts 36 Stoke Hall · 37 Clay Pits · 38 Glaze Gallery · 39 Firing Floor
// (also the boss room) · 40 Slag Run · 41 Kiln Mouth (the ARENA).
// Spec grammar = env/biomes/spire.js plus the kiln fields:
//   landmarks  [[x, z, r, kind, yaw]] built pieces (props.js kiln branch):
//              'kilnmouth' (a brick kiln face with a glowing fire mouth,
//              straddling a wall: yaw 0 = the north wall, +-PI/2 the sides),
//              'greatmouth' (the kiln's great mouth, 41), 'flue' (a chimney
//              breast with a glowing firebox in a side wall), 'castbell' /
//              'greatcast' (the tell). A mouth, a great mouth or a flue
//              pushes one `flame` emitter (after the torches', so `lightIdx`
//              4+ names them).
//   tuft: 'cinder'    the foliage scatter is ash flakes and cinders
//   moteTint          the drifting motes are gold sparks
//   ground.kiln       the kiln pass (ground.js): soot blooms out of the kiln
//              mouths, scorched halos under every vent and flue crack, flagstone
//              walks, clay spills, slag crusts, glaze chips, cinders and the
//              hot crack network (its glow decal: props.js buildKilnCracks)
//   apron.glow        the yard beyond the walls lit from below (ground.js)
//   treeline 'kiln'   kiln walls with glowing mouths, bottle kilns, chimneys,
//                     smoke columns, slag and coal heaps (treeline.js)
//
// Palette (display-space HSL): fire brick H 12-22 S .1-.2 L .14-.4; soot
// H 24-30 S .04-.1 L .04-.12; clay H 28-36 S .16-.24 L .26-.56; slag H 22-30
// S .04-.08 L .12-.3; flagstone H 30-36 S .04-.06 L .26-.34; gold heat
// H 38-46 (kilngold); coals H 350-356 (coal); the tell's crack TELL indigo.
import { hslColor } from '../colors.js';
import { LAYOUTS } from '../../data/layouts.js';

export const BIOME = Object.freeze({
  id: 'kiln',
  act: 6,
  name: 'The Ember Kiln',
  music: 'kiln',
  bed: 'kiln',
  // Smoky kiln air: a dim, warm key (the fires are the light), an umber sky
  // fill, and a warm bounce from below — the furnace glow on the soot.
  light: Object.freeze({
    keyWhite: 0.25,
    keyTint: '#F2D2A8',
    sky: '#6A5A54',
    ground: '#3A2818',
  }),
});

const HALF_PI = Math.PI / 2;

// The vents and flue cracks of a layout (the kiln pass scorches the floor
// under them and the crack network radiates out of them).
function heatOf(id) {
  const L = LAYOUTS[id];
  const out = [];
  for (const h of L?.hazards ?? []) {
    if (h.type === 'vent') out.push([h.x, h.z, 1.2]);
    else if (h.type === 'gravefire') for (const [x, z] of h.vents) out.push([x, z, 0.75]);
  }
  return Object.freeze(out);
}

const GROUND_BASE = {
  nightBase: 1,
  h: 22, s: 0.12, l: 0.2,
  shadeH: 14, shadeS: 0.0, shadeL: 0.05, coolLift: 9,
  dirtH: 30, dirtL: 0.22, dirtSMul: 0.3, dirtAMul: 0.42, pathLip: 0.5, mossN: 0, mossOff: 12, mossS: 0.2, mossL: 0.2,
  leafN: 90, litterH: 34, litterS: 0.05, litterL: 0.46, crackN: 24, pebbleN: 40,
  bushOff: 10, bushLitOff: 12, wallMossOff: 10, bladeCool: 'shade', bladeShadeL: 0.1, lift2: 2,
  // Fire brick laid in courses: small bricks, tight joints, soot-dark mortar.
  flagstones: Object.freeze({ size: 0.62, h: 16, s: 0.14, l: 0.28, alpha: 0.82, fill: 1.02, groutH: 26, groutS: 0.12, groutL: 0.05, groutA: 0.72, grout: 2.2 }),
  // The cinder scatter (foliage 'cinder'): pale ash, the shade ones soot.
  blade: Object.freeze({ h: 32, s: 0.05, l: 0.5 }),
};

// The kiln pass (env/ground.js paintKiln). Counts per layout below.
const KILN_FLOOR = {
  soot: 26, // soft soot blooms (heaviest at the north wall's mouths)
  scorch: 1, // the scorched halo under every vent / flue crack
  walks: 1, // a flagstone walk laid down every path
  clay: 6, // pale clay spills
  slag: 4, // glassy slag crusts
  glaze: 0, // glazed tile chips (the Glaze Gallery)
  cinders: 900, // cinder and ash speckle
  cracks: 16, // hot cracks (the glow decal lays gold along them)
};

function ground(id, extra = {}) {
  return Object.freeze({
    ...GROUND_BASE,
    kiln: Object.freeze({ ...KILN_FLOOR, ...extra, heat: heatOf(id), mouths: Object.freeze(extra.mouths ?? []) }),
  });
}

// A soot-dark yard lit from below by the other kilns.
const APRON = Object.freeze({
  base: 'hsl(24,16%,6%)',
  mottleH: 22,
  mottleS: 0.08,
  crownH: 18,
  crownS: 0.12,
  mist: [128, 96, 64],
  glow: Object.freeze({ n: 34, h: 40, s: 0.7, l: 0.42, coalH: 354, coalS: 0.5, coalL: 0.26 }),
});
const TREELINE = Object.freeze({
  style: 'kiln',
  trunk: hslColor(18, 0.12, 0.16), // chimneys, distant kilns (soot brick)
  crownLit: hslColor(30, 0.16, 0.3), // their furnace-lit faces
  scrub: hslColor(16, 0.14, 0.26), // the yard walls (fire brick)
  rock: hslColor(26, 0.06, 0.16), // slag heaps
  stoneDark: hslColor(22, 0.08, 0.1), // soot
  brickLit: hslColor(22, 0.18, 0.36),
  smoke: hslColor(24, 0.06, 0.2),
  smokeLit: hslColor(34, 0.18, 0.3),
  coal: hslColor(24, 0.04, 0.08),
  clay: hslColor(32, 0.2, 0.38),
});
// Base tones the shared props read (pillar, urn, idol, torch footing): soot-
// dark brick and fire clay.
const MATS = Object.freeze({
  stone: hslColor(20, 0.1, 0.3),
  stoneLit: hslColor(28, 0.14, 0.4),
  stoneCool: hslColor(24, 0.05, 0.2),
});

const SHARED = {
  propsAvoidPaths: true,
  grass: 260,
  flowers: 0,
  tuft: 'cinder',
  propFamily: 'kiln',
  moteTint: [1.0, 0.74, 0.34],
  apron: APRON,
  treeline: TREELINE,
  mats: MATS,
};

// Darker than the Spire (the kiln is lit by its fires): a dimmer key, the
// fires' pools a deep kiln gold.
const MOOD = Object.freeze({ key: 0.52, fill: 0.8, warmth: 0.0, keyWhite: 0.0, poolGain: 0.92, poolTint: '#F0B44C', poolR: 1.0, torchLightGain: 0.55 });

const ROOMS = Object.freeze({
  boss: {
    clusters: [
      [-9.6, -3.8, 0.45, 'slagheap coalheap'],
      [9.6, -3.8, 0.45, 'brickstack slagheap'],
      [-5.2, -7.2, 0.35, 'coolbell'],
      [5.2, -7.2, 0.35, 'mould'],
      [-9.8, 4.4, 0.45, 'coalheap brickstack'],
      [9.8, 4.4, 0.45, 'crucible slagheap'],
      [-5.6, 5.6, 0.4, 'mould'],
      [5.6, 5.6, 0.4, 'coolbell'],
    ],
  },
  shop: {
    stall: [-8.8, -3.6, 0.28],
    clusters: [
      [-8.4, -1.6, 0.45, 'brickstack crate'],
      [-10.4, -4.8, 0.45, 'sack crucible'],
      [-7.0, -4.6, 0.35, 'urn'],
    ],
  },
});

export const LAYOUT_SPECS = Object.freeze({
  // ---- 36 · Stoke Hall: the stokers' hall before the kiln's north mouth,
  // the bell in front of it; a flue breast in the west wall, the cast bell in
  // the north-east corner.
  36: Object.freeze({
    id: 36,
    name: 'stokehall',
    biome: 'kiln',
    mood: MOOD,
    ground: ground(36, { mouths: [[0.0, -8.0], [-12.0, -4.6]] }),
    ...SHARED,
    paths: [{ pts: [[0.0, 8.6], [0.3, 4.4], [-0.2, 1.0], [0.2, -2.6], [0.0, -4.6]], w: 1.6 }],
    landmarks: [
      [0.0, -8.0, 1.0, 'kilnmouth', 0],
      [-12.0, -4.6, 0.8, 'flue', HALF_PI],
      [10.4, -6.4, 0.7, 'castbell', -0.5],
    ],
    torches: [[-2.4, -7.3], [2.4, -7.3], [-11.2, 2.2], [11.2, 2.2]],
    lightIdx: [4, 3],
    lanterns: [[-6.0, 7.3, HALF_PI], [6.0, 7.3, HALF_PI]],
    braziers: [[-4.0, 1.6], [4.0, 1.4]],
    clusters: [
      [-8.6, -7.2, 0.5, 'brickstack mould'],
      [-6.0, -7.4, 0.35, 'toolrack'],
      [-11.0, 5.6, 0.5, 'coalheap brickstack'],
      [11.0, 5.6, 0.5, 'mould coolbell'],
      [-8.6, 7.3, 0.45, 'tilerack'],
      [8.6, 7.3, 0.45, 'crucible coalheap'],
      [2.6, 7.4, 0.4, 'brickstack'],
      [-2.8, 7.4, 0.4, 'coolbell'],
      [6.6, -7.3, 0.4, 'toolrack slagheap'],
      [11.0, -1.8, 0.4, 'slagheap'],
    ],
    rooms: ROOMS,
  }),

  // ---- 37 · Clay Pits: where the moulds were dug and shaped. Clay heaps and
  // moulds along every wall, a clay spill across the floor; the north kiln
  // mouth, the cast bell in the north-west corner.
  37: Object.freeze({
    id: 37,
    name: 'claypits',
    biome: 'kiln',
    mood: MOOD,
    ground: ground(37, { mouths: [[0.0, -8.0]], clay: 18, soot: 18 }),
    ...SHARED,
    paths: [{ pts: [[-12.6, -0.6], [-8.0, -0.8], [-3.0, 0.4], [3.0, 0.2], [8.0, -0.6], [12.6, -0.4]], w: 1.4 }],
    landmarks: [
      [0.0, -8.0, 1.0, 'kilnmouth', 0],
      [-10.4, -6.4, 0.7, 'castbell', 0.5],
    ],
    torches: [[-2.4, -7.3], [2.4, -7.3], [-11.2, -3.2], [11.2, -2.2]],
    lightIdx: [4, 3],
    lanterns: [[-4.0, 7.3, HALF_PI], [4.0, 7.3, HALF_PI]],
    braziers: [[-9.4, 1.8], [9.4, -2.6]],
    clusters: [
      [-7.4, -7.3, 0.45, 'clayheap mould'],
      [8.4, -7.2, 0.5, 'mould clayheap'],
      [-11.0, 5.8, 0.45, 'clayheap'],
      [11.0, 6.0, 0.45, 'brickstack clayheap'],
      [-6.4, 7.4, 0.4, 'mould coolbell'],
      [6.6, 7.4, 0.35, 'coolbell'],
      [-11.0, 1.6, 0.35, 'toolrack'],
      [11.0, 2.0, 0.4, 'clayheap'],
      [-4.4, -7.4, 0.35, 'brickstack'],
      [4.6, -7.4, 0.35, 'toolrack'],
    ],
    rooms: ROOMS,
  }),

  // ---- 38 · Glaze Gallery: racks of glazed tiles drying along the walls,
  // glaze chips across the floor; a small glaze kiln's mouth in the north-
  // east, the cast bell by the south-west wall.
  38: Object.freeze({
    id: 38,
    name: 'glazegallery',
    biome: 'kiln',
    mood: MOOD,
    ground: ground(38, { mouths: [[6.4, -8.0]], glaze: 140, clay: 4 }),
    ...SHARED,
    paths: [{ pts: [[0.0, 8.6], [0.4, 4.6], [-0.4, 1.2], [0.0, -3.4]], w: 1.4 }],
    landmarks: [
      [6.4, -8.0, 0.9, 'kilnmouth', 0],
      [-10.6, 6.0, 0.7, 'castbell', 2.6],
    ],
    torches: [[-3.0, -7.3], [3.0, -7.3], [-11.2, -4.4], [11.2, 4.4]],
    lightIdx: [4, 2],
    lanterns: [[-6.0, 7.3, HALF_PI], [6.8, 7.3, HALF_PI]],
    braziers: [[-6.4, 2.6], [4.4, 1.6]],
    clusters: [
      [-8.6, -7.3, 0.5, 'tilerack tilerack'],
      [-5.0, -7.4, 0.4, 'tilerack'],
      [10.6, -6.8, 0.4, 'crucible'],
      [-11.0, 2.6, 0.45, 'tilerack'],
      [11.0, -3.0, 0.4, 'brickstack'],
      [11.0, 6.8, 0.4, 'tilerack coalheap'],
      [-2.6, 7.4, 0.4, 'tilerack'],
      [2.4, 7.4, 0.4, 'brickstack'],
      [9.0, 7.4, 0.4, 'mould'],
      [-7.8, 7.4, 0.35, 'crucible'],
    ],
    rooms: ROOMS,
  }),

  // ---- 39 · Firing Floor: the floor before the great kiln where the bells
  // were fired. The GREAT CAST hangs in the north wall's casting gantry over
  // the flue cracks, its crack the brightest indigo in the Kiln, two kiln
  // mouths flanking it. Also the Kiln's boss room dressing.
  39: Object.freeze({
    id: 39,
    name: 'firingfloor',
    biome: 'kiln',
    mood: MOOD,
    ground: ground(39, { mouths: [[-6.6, -8.0], [6.6, -8.0]], soot: 30 }),
    ...SHARED,
    paths: [{ pts: [[0.0, 8.6], [-0.3, 4.4], [0.3, 0.0], [0.0, -4.4]], w: 1.5 }],
    landmarks: [
      [-6.6, -8.0, 0.9, 'kilnmouth', 0],
      [6.6, -8.0, 0.9, 'kilnmouth', 0],
      [0.0, -8.3, 0.8, 'greatcast', 0],
    ],
    torches: [[-3.4, -7.3], [3.4, -7.3], [-11.2, -4.4], [11.2, -4.4]],
    lightIdx: [4, 5],
    lanterns: [[-6.4, 7.3, HALF_PI], [6.4, 7.3, HALF_PI]],
    braziers: [[-4.6, -2.6], [4.6, -2.6]],
    clusters: [
      [-9.6, -7.2, 0.45, 'slagheap brickstack'],
      [9.6, -7.2, 0.45, 'brickstack slagheap'],
      [-11.1, 3.6, 0.4, 'coalheap'],
      [11.1, 3.6, 0.4, 'crucible'],
      [-3.0, 7.4, 0.4, 'coolbell mould'],
      [3.0, 7.4, 0.4, 'mould coolbell'],
      [-9.6, 7.2, 0.45, 'toolrack'],
      [9.6, 7.2, 0.45, 'tilerack'],
    ],
    rooms: ROOMS,
  }),

  // ---- 40 · Slag Run: the run where the furnaces were raked out — slag
  // heaps along a diagonal track, slag crusts on the floor, a kiln mouth in
  // the north-west, a tapping flue in the east wall, the cast bell in the
  // south-east corner.
  40: Object.freeze({
    id: 40,
    name: 'slagrun',
    biome: 'kiln',
    mood: MOOD,
    ground: ground(40, { mouths: [[-8.0, -8.0], [12.0, -1.0]], slag: 16, cinders: 1300 }),
    ...SHARED,
    paths: [{ pts: [[-12.6, 5.6], [-8.4, 4.8], [-2.6, 1.4], [1.6, -0.6], [7.8, -4.8], [12.6, -5.6]], w: 1.3 }],
    landmarks: [
      [-8.0, -8.0, 0.9, 'kilnmouth', 0],
      [12.0, -1.0, 0.8, 'flue', -HALF_PI],
      [10.4, 6.2, 0.7, 'castbell', -2.4],
    ],
    torches: [[-3.0, -7.3], [3.0, -7.3], [-11.2, -4.4], [11.2, 2.4]],
    lightIdx: [4, 5],
    lanterns: [[-4.0, 7.3, HALF_PI], [1.6, 7.3, HALF_PI]],
    braziers: [[-8.4, 1.2], [8.6, -1.0]],
    clusters: [
      [-10.8, -6.6, 0.45, 'slagheap slagheap'],
      [-10.6, 7.2, 0.45, 'slagheap coalheap'],
      [6.6, -7.2, 0.45, 'slagheap toolrack'],
      [10.4, -6.6, 0.4, 'slagheap'],
      [-7.4, 7.4, 0.4, 'brickstack slagheap'],
      [4.6, 7.5, 0.3, 'coolbell'],
      [-5.6, -7.4, 0.35, 'brickstack'],
    ],
    rooms: ROOMS,
  }),

  // ---- 41 · Kiln Mouth (ARENA): the open floor before the kiln's GREAT
  // MOUTH (the north wall), flue cracks running out of it; a flue breast in
  // the east wall, the cast bell by the west wall. The floor between the
  // vents is clear; the dressing keeps to the walls and off the spawn ring.
  41: Object.freeze({
    id: 41,
    name: 'kilnmouth',
    biome: 'kiln',
    mood: MOOD,
    ground: ground(41, { mouths: [[0.0, -8.0], [12.0, 0.0]], soot: 30 }),
    ...SHARED,
    paths: [
      { pts: [[0.0, 8.6], [0.3, 3.0], [-0.3, -1.6], [0.0, -4.6]], w: 1.6 },
      { pts: [[-4.6, 0.0], [0.0, 0.3], [4.6, 0.0]], w: 1.2 },
    ],
    landmarks: [
      [0.0, -8.3, 0.8, 'greatmouth', 0],
      [12.0, 0.0, 0.8, 'flue', -HALF_PI],
      [-10.8, -0.2, 0.7, 'castbell', 1.2],
    ],
    torches: [[-3.4, -7.3], [3.4, -7.3], [-11.2, -2.4], [11.2, 2.6]],
    lightIdx: [4, 5],
    lanterns: [[-3.2, 7.3, HALF_PI], [3.2, 7.3, HALF_PI]],
    braziers: [[-8.8, 6.0], [8.8, 6.0]],
    clusters: [
      [-8.4, -7.4, 0.35, 'brickstack'],
      [8.4, -7.4, 0.35, 'slagheap'],
      [-11.2, -7.2, 0.3, 'coalheap'],
      [11.2, -7.2, 0.3, 'crucible'],
      [-11.2, 7.2, 0.3, 'mould'],
      [11.2, 7.2, 0.3, 'coolbell'],
      [-11.2, 2.2, 0.3, 'toolrack'],
    ],
    rooms: ROOMS,
  }),
});
