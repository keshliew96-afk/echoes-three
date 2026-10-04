// Biome registry (M4b, BUILD_BRIEF §23.1): layout id -> dressing spec, biome
// id -> its palette / light / music / ambient identity. Pure data (no three
// objects beyond Colors), readable by the arena, the layout audit
// (tools/gntM4b-layoutcheck.mjs) and probes.
import * as wood from './wood.js';
import * as mill from './mill.js';
import * as barrow from './barrow.js';
import { LAYOUTS } from '../../data/layouts.js';

export const BIOMES = Object.freeze({ wood: wood.BIOME, mill: mill.BIOME, barrow: barrow.BIOME });

const SPECS = Object.freeze({ ...wood.LAYOUT_SPECS, ...mill.LAYOUT_SPECS, ...barrow.LAYOUT_SPECS });

export const LAYOUT_SPEC_IDS = Object.freeze(Object.keys(SPECS).map(Number).sort((a, b) => a - b));

export function layoutSpec(id) {
  return SPECS[id] ?? null;
}

export function biomeOfLayout(id) {
  // Slice-2 ids (10-15) interleave the acts, so the layout data decides.
  if (LAYOUTS[id]) return LAYOUTS[id].biome;
  if (id >= 7) return 'barrow';
  if (id >= 4) return 'mill';
  return 'wood';
}

export function biomeInfo(id) {
  return BIOMES[biomeOfLayout(id)];
}
