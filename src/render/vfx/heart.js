// VFX HEARTS (docs/VFX_READABILITY.md). Every template piece (tplkit.js: the
// beams, blazes, blasts and bolt heads) carries a hot core, its heart: the
// core colour times the piece's gain, mixed in over its hottest texels. A
// heart is authored above the bloom threshold on purpose, so every beat
// blooms (docs/gauntlet/design-VFX.md §11), and the pieces add: a hero's
// basic melee that kills lands a swing tip, an impact and a kill blast at one
// point in one tick, about 4 linear before the bloom, which spread into a
// cream blob the size of the hero beside it (v0.5.329, Kesh: "the light
// effect too bright, player cannot see clearly"). Two rules bound that:
//
//   1. A heart is capped at HEART_MAX linear luminance. One piece still
//      blooms (HEART_MAX sits above the threshold) but no piece starts at the
//      2.4x the old cores reached.
//   2. The hearts within HEART_RADIUS of a point share HEART_BUDGET. A piece
//      landing where hearts already glow gets only the share that is left,
//      never under HEART_FLOOR, and its share dims the core toward the
//      piece's own body colour (the shaders mix by uHeart), never toward
//      black, so the piece keeps its shape and tone.
//
// The crowd dimming of the whole piece (tplkit crowd()) is unchanged and
// stacks with this. Pure module, no DOM: tools/vfx-readability-probe.mjs
// imports it.
import { BLOOM } from '../stage.js';

export const HEART_MAX = 1.0; // linear luminance of one heart after its gain
export const HEART_BUDGET = 1.25; // summed heart load the pieces within HEART_RADIUS share
export const HEART_FLOOR = 0.2; // the least share a new piece keeps
export const HEART_RADIUS = 2; // u (the crowd dimming's reach)

export const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// The heart colour as [r, g, b] linear: the core times its gain, scaled down
// so its luminance is at most HEART_MAX. `core` is [r, g, b] linear (an
// exactColor, which may already sit above 1.0).
export function heartColor(core, gain = 1) {
  let r = core[0] * gain;
  let g = core[1] * gain;
  let b = core[2] * gain;
  const l = lum(r, g, b);
  if (l > HEART_MAX) {
    const k = HEART_MAX / l;
    r *= k;
    g *= k;
    b *= k;
  }
  return [r, g, b];
}

// The share (0..1) a new heart gets: `load` is its luminance times its
// opacity, `sum` the load already glowing within HEART_RADIUS.
export function heartShare(sum, load) {
  if (!(load > 0)) return 1;
  if (!(sum >= 0)) sum = 0; // a NaN neighbour never poisons the share
  return Math.min(1, Math.max(HEART_FLOOR, (HEART_BUDGET - sum) / load));
}
// A moving piece takes its share again once it has travelled this far (u)
// from where it last took it (bolt heads and held trails leave the release
// blast behind; a travelling streak leaves its launch point).
export const HEART_REFRESH = 0.5;

// Whether a heart still clears the bloom threshold on its own (the probe
// checks every template core keeps its hot core after the cap).
export const heartHot = (c) => lum(c[0], c[1], c[2]) > BLOOM.threshold;
