// Act I — The Hollow Wood (BUILD_BRIEF §23.1): the certified v0.4.63 woodland.
// Layouts 1-3 ARE the arena variants of env/variants.js, dressing unchanged
// (their hazard / asset placements live in src/data/layouts.js and were placed
// clear of these props — tools/gntM4b-layoutcheck.mjs). Music theme `wood`,
// ambient bed `wood`. Layouts 10-11 (slice 2) are authored below on the same
// grammar.
import { VARIANTS } from '../variants.js';

export const BIOME = Object.freeze({
  id: 'wood',
  act: 1,
  name: 'The Hollow Wood',
  music: 'wood',
  bed: 'wood',
  // Floor-box reference for the HUEMIX difference gate (G4b.4): measured, not
  // assumed — see tools/gntM4b-biomes.mjs.
  light: null, // the certified ACT1_LIGHT rig (scenes/arena.js)
});

// Slice 2 (docs/CONTENT_PLAN.md §4): two more woodland rooms. Each keeps a
// certified variant's ground, mood and boss/shop rooms and authors its own
// tracks, lights, fire bowls, monolith and prop clusters (clear of the
// placements in data/layouts.js — tools/gntM4b-layoutcheck.mjs).
//   10 Bramble Maze — the hollow's deep green; a track through the hedge gate.
//   11 Fallen Oak   — the clearing's timber yard; a track round the oak's root.
const BRAMBLE_MAZE = Object.freeze({
  ...VARIANTS[3],
  id: 10,
  name: 'bramblemaze',
  paths: [
    { pts: [[0.2, -8.6], [0.0, -4.4], [-0.2, 0.4], [0.6, 4.2], [0.2, 8.6]], w: 1.5 },
    { pts: [[-12.6, -3.6], [-8.6, -3.0], [-4.6, -2.6]], w: 1.2 },
  ],
  torches: [[-11.2, 1.6], [11.2, -3.4], [-4.0, -7.2], [4.4, 7.2]],
  lightIdx: [2, 1],
  lanterns: [[2.6, -7.3, -1.5708], [-6.2, 7.3, 1.5708]],
  braziers: [[-3.4, 1.6], [3.6, -1.6], [-4.6, -2.8], [4.4, 2.2]],
  monolith: [-7.6, -6.9, 0.3],
  clusters: [
    [-2.4, -7.3, 0.6, 'bush bush log'],
    [5.0, -7.3, 0.7, 'stump bush'],
    [8.0, -7.3, 0.6, 'bush boulder'],
    [11.2, 6.9, 0.6, 'bush bush'],
    [-11.2, 6.9, 0.6, 'log bush'],
    [-3.4, 7.4, 0.7, 'stump bush boulder'],
    [2.6, 7.4, 0.6, 'bush log'],
    [-11.3, -3.8, 0.5, 'bush'],
    [11.3, 1.0, 0.5, 'boulder bush'],
    [-8.8, -0.4, 0.6, 'tower stump'],
    [8.8, -0.4, 0.6, 'banner bush'],
    [-3.9, 6.1, 0.55, 'barricade bush'],
    [3.8, 5.8, 0.55, 'tower log'],
    [-9.2, 4.6, 0.5, 'bush banner'],
    [9.2, 4.6, 0.5, 'stump bush'],
  ],
});

const FALLEN_OAK = Object.freeze({
  ...VARIANTS[1],
  id: 11,
  name: 'fallenoak',
  paths: [{ pts: [[-12.6, -1.6], [-10.6, -2.6], [-9.6, -5.6], [-8.4, -8.6]], w: 1.4 }, { pts: [[-10.6, -2.6], [-5.6, -0.4], [0.6, 0.6], [6.4, 3.2], [12.6, 4.4]], w: 1.6 }],
  torches: [[-5.6, -7.2], [5.2, 7.2], [11.2, -1.6], [-11.2, 4.8]],
  lightIdx: [0, 2],
  lanterns: [[8.8, -7.3, -1.5708], [-3.4, 7.3, 1.5708]],
  braziers: [[-4.6, 1.8], [3.4, -1.6], [-7.0, 0.4], [7.0, -1.4]],
  monolith: [8.6, -5.4, -0.3],
  clusters: [
    [-1.2, -7.3, 0.6, 'stump bush'],
    [4.6, -7.3, 0.6, 'log log bush'],
    [11.2, -6.8, 0.5, 'stump'],
    [11.2, 1.0, 0.6, 'crate barrel'],
    [11.2, 6.6, 0.6, 'fence stump'],
    [-11.2, 6.9, 0.6, 'log bush'],
    [-6.0, 7.3, 0.7, 'fence fence stump'],
    [0.4, 7.4, 0.6, 'crate crate barrel'],
    [8.4, 7.3, 0.6, 'stump bush'],
    [-8.8, 2.0, 0.6, 'tower stump'],
    [8.6, -2.2, 0.55, 'banner crate'],
    [-3.2, 5.8, 0.55, 'barricade stump'],
    [3.4, 5.6, 0.55, 'tower crate'],
  ],
});

export const LAYOUT_SPECS = Object.freeze({
  1: VARIANTS[1],
  2: VARIANTS[2],
  3: VARIANTS[3],
  10: BRAMBLE_MAZE,
  11: FALLEN_OAK,
});
