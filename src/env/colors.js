// Derived Act-1 environment tones (BUILD_BRIEF §19.3). Everything here is a
// mix of §19.1 palette anchors (same discipline as data/palette.js ACT1_GROUND:
// derived from the brief's ranges, never invented hexes). Color families in an
// Act-1 combat frame: green-woodland (ground/foliage), warm-party
// (wood/amber/gold props + light pools) and the COOL indigo-teal fill that the
// warm pools read against — the monolith's God-stuff Violet is the act's single
// corruption accent and the only violet allowed in frame.
//
// LIGHT MODEL (§19.3 "warm:cool light ratio ~= 70:30"): the arena drives a warm
// amber directional key at ~70% of the ground irradiance and an indigo-teal
// hemisphere fill at ~30%, tuned so the BLUE channel of the total is a hair
// ABOVE the red on an unlit up-facing surface. Warmth then arrives only where a
// torch pool, a lantern pool or a canopy dapple lands — that contrast IS the
// warm:cool story. Consequence for authoring: the shade end of every ground /
// foliage ramp is a desaturated blue-green, never a dark warm green, or the
// amber pools have nothing to be warm against.
//
// VALUE NOTE: an up-facing toon surface still receives >1.0 irradiance before
// ACES compresses it, so albedos here are authored a stop or two BELOW their
// nominal palette value — measured against captured pixels, not guessed.
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

// The cool half of the Act-1 light/value story. `ambient` is the critic-bound
// indigo-teal target for unlit ground; everything else is derived from it so
// the exterior, the mist and the canopy stay one family.
export const COOL = Object.freeze({
  ambient: '#1B2438', // indigo-teal cool fill target for shade
  sky: '#7E9AD2', // hemisphere sky tint (desaturated Signal Blue direction)
  apron: '#181d25', // exterior forest floor base — cool blue-grey, never green
  apronLift: '#242c37', // its lit mottle
  mist: '#78889E', // fog band just beyond the wall
  // Canopy tones sit CLOSE together and deep: a bright lit lobe over a dark
  // one, at tree scale, reads from a top-down camera as a pale plate floating
  // on dark water rather than as a forest. Two near values + no ink keeps the
  // surround a soft mass.
  canopy: '#1e242e', // treetop shadow mass
  canopyLit: '#2c3540', // treetop lit lobe (teal, still cool)
  trunk: '#171b22',
});

export const ENV = Object.freeze({
  // Woods & timber (warm family: bruise umber lifted toward hearth amber).
  bark: shade(mix(PALETTE.bruiseUmber, PALETTE.hearthAmber, 0.2), 0.42),
  barkDark: shade(mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.35), 0.6),
  plank: shade(mix(PALETTE.bruiseUmber, PALETTE.hearthAmber, 0.3), 0.4),
  plankLit: shade(mix(PALETTE.bruiseUmber, PALETTE.hearthAmber, 0.44), 0.52),
  stumpTop: shade(mix(PALETTE.bone, PALETTE.hearthAmber, 0.35), 0.28),
  // Stone (neutral family: warm grey / bone / charcoal blends).
  stone: shade(mix(PALETTE.warmGrey, PALETTE.bone, 0.5), 0.2),
  stoneLit: shade(mix(PALETTE.bone, PALETTE.parchment, 0.3), 0.26),
  stoneCool: shade(mix(PALETTE.warmGrey, COOL.ambient, 0.42), 0.3),
  iron: shade(mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.4), 0.7),
  // Lantern glass: warm gold, kept at a value the bloom pass lifts into a halo
  // WITHOUT clipping the core to featureless white (the previous 1.55x did).
  glassLit: mix(PALETTE.paleGold, PALETTE.hearthAmber, 0.4).multiplyScalar(0.95),
  // Corruption monolith stone — near-black and COOL, so the violet emissive
  // veins stay saturated violet instead of lifting into grey-mauve.
  monolith: mix(PALETTE.voidCharcoal, COOL.ambient, 0.55).multiplyScalar(0.55),
  monolithBase: mix(PALETTE.voidCharcoal, COOL.ambient, 0.35).multiplyScalar(0.8),
});

// Wall stone: the built boundary. Warm-neutral grey-green so it separates from
// the COOL exterior by hue as well as by value (the previous cut let the wall
// and the void read as one continuous dark mass).
export const WALL = Object.freeze({
  // Multipliers applied to the variant's floor tone in LINEAR space. 0.60
  // linear ~= 0.80 of the displayed value = the §19.3 "exactly one value step
  // darker than the adjoining floor".
  bodyFactor: 0.78,
  capFactor: 0.86, // coping course: a lighter rim so the top edge reads built
  stoneMix: 0.42, // how far the floor tone is pulled toward dry-stone grey
});

// Flower blossom tints. Strictly warm-family gold/amber: a previous cut used
// near-white and bone tints, which at gameplay zoom read as frozen confetti
// sprinkled on the grass (and, under bloom, could be mistaken for the
// corruption violet). These sit well below the emitter values so they dress the
// ground instead of competing with the light sources.
export const FLOWER_TINTS = Object.freeze([
  shade(mix(PALETTE.paleGold, PALETTE.bruiseUmber, 0.4), 0.55),
  shade(mix(PALETTE.hearthAmber, PALETTE.bruiseUmber, 0.45), 0.6),
  shade(mix(PALETTE.paleGold, PALETTE.hearthAmber, 0.5), 0.46),
  shade(mix(PALETTE.hearthAmber, PALETTE.voidCharcoal, 0.35), 0.65),
]);

export { mix, shade };
