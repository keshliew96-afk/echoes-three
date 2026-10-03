// Act I — The Hollow Wood (BUILD_BRIEF §23.1): the certified v0.4.63 woodland.
// Layouts 1-3 ARE the arena variants of env/variants.js, dressing unchanged
// (their hazard / asset placements live in src/data/layouts.js and were placed
// clear of these props — tools/gntM4b-layoutcheck.mjs). Music theme `wood`,
// ambient bed `wood`.
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

export const LAYOUT_SPECS = Object.freeze({
  1: VARIANTS[1],
  2: VARIANTS[2],
  3: VARIANTS[3],
});
