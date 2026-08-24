// Derived Act-1 environment tones (BUILD_BRIEF §19.3). Everything here is a
// mix of §19.1 palette anchors (same discipline as data/palette.js ACT1_GROUND:
// derived from the brief's ranges, never invented hexes). Color families in an
// Act-1 combat frame: green-woodland (ground/foliage), warm-party
// (wood/amber/gold props + light pools), ember-danger reserved for enemy
// telegraphs — the monolith's God-stuff Violet is the act's single corruption
// accent.
//
// VALUE NOTE: the stage key light is a 2.4-intensity directional plus a 1.0
// hemisphere fill, so an up-facing toon surface receives >1.0 irradiance before
// ACES compresses it. Albedos here are therefore authored a stop or two BELOW
// their nominal palette value — measured against captured pixels, not guessed —
// so props land in the woodland value range instead of blowing to near-white.
import { Color, SRGBColorSpace } from 'three';
import { PALETTE } from '../data/palette.js';

const mix = (a, b, t) => new Color(a).lerp(new Color(b), t);
// Scale a colour in the linear working space. f = 0.5 reads as roughly one
// display value step down (0.5^(1/2.2) ~= 0.73 of the sRGB value).
const shade = (c, f) => c.clone().multiplyScalar(f);

// HSL authored in DISPLAY space. three's Color.setHSL defaults to the LINEAR
// working space, which silently renders an "l = 0.18" tone brighter than an
// sRGB-authored "l = 0.30" canvas fill — that mismatch is exactly what made the
// arena walls read LIGHTER than the floor they were derived from. Always go
// through this helper when a colour has to match a CSS hsl() the ground canvas
// painted.
export const hslColor = (h, s, l) => new Color().setHSL(h / 360, s, l, SRGBColorSpace);

export const ENV = Object.freeze({
  // Woods & timber (warm family: bruise umber lifted toward hearth amber).
  bark: shade(mix(PALETTE.bruiseUmber, PALETTE.hearthAmber, 0.22), 0.8),
  plank: shade(mix(PALETTE.bruiseUmber, PALETTE.hearthAmber, 0.38), 0.8),
  stumpTop: shade(mix(PALETTE.bone, PALETTE.hearthAmber, 0.35), 0.5),
  // Stone (neutral family: warm grey / bone / charcoal blends).
  stone: shade(mix(PALETTE.warmGrey, PALETTE.bone, 0.5), 0.42),
  stoneCool: shade(mix(PALETTE.warmGrey, PALETTE.voidCharcoal, 0.25), 0.55),
  iron: shade(mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.4), 0.85),
  // Lantern glass: pale gold pushed past 1.0 so the bloom pass catches it
  // (§19.3: every light emitter carries a glow).
  glassLit: mix(PALETTE.paleGold, PALETTE.parchment, 0.35).multiplyScalar(1.55),
  // Corruption monolith stone — dark, desaturated, cool-neutral.
  monolith: shade(mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.4), 0.7),
});

// Flower blossom tints. Strictly warm-family gold/amber: a previous cut used
// near-white and bone tints, which at gameplay zoom read as frozen confetti
// sprinkled on the grass (and, under bloom, could be mistaken for the
// corruption violet). These sit well below the emitter values so they dress the
// ground instead of competing with the light sources.
export const FLOWER_TINTS = Object.freeze([
  shade(mix(PALETTE.paleGold, PALETTE.bruiseUmber, 0.4), 0.5),
  shade(mix(PALETTE.hearthAmber, PALETTE.bruiseUmber, 0.45), 0.55),
  shade(mix(PALETTE.paleGold, PALETTE.hearthAmber, 0.5), 0.42),
  shade(mix(PALETTE.hearthAmber, PALETTE.voidCharcoal, 0.35), 0.6),
]);

export { mix, shade };
