// Derived Act-1 environment tones (BUILD_BRIEF §19.3). Everything here is a
// mix of §19.1 palette anchors (same discipline as data/palette.js ACT1_GROUND:
// derived from the brief's ranges, never invented hexes). Color families in an
// Act-1 combat frame: green-woodland (ground/foliage), warm-party
// (wood/amber/gold props + light pools), ember-danger reserved for enemy
// telegraphs — the monolith's God-stuff Violet is the act's single corruption
// accent.
import { Color } from 'three';
import { PALETTE } from '../data/palette.js';

const mix = (a, b, t) => new Color(a).lerp(new Color(b), t);

export const ENV = Object.freeze({
  // Woods & timber (warm family: bruise umber lifted toward hearth amber).
  bark: mix(PALETTE.bruiseUmber, PALETTE.hearthAmber, 0.22),
  plank: mix(PALETTE.bruiseUmber, PALETTE.hearthAmber, 0.38),
  stumpTop: mix(PALETTE.bone, PALETTE.hearthAmber, 0.35),
  // Stone (neutral family: warm grey / bone / charcoal blends).
  stone: mix(PALETTE.warmGrey, PALETTE.bone, 0.5),
  stoneCool: mix(PALETTE.warmGrey, PALETTE.voidCharcoal, 0.25),
  iron: mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.4),
  // Lantern glass: pale gold pushed past 1.0 so the bloom pass catches it
  // (§19.3: every light emitter carries a glow).
  glassLit: mix(PALETTE.paleGold, PALETTE.parchment, 0.35).multiplyScalar(1.55),
  // Corruption monolith stone — dark, desaturated, cool-neutral.
  monolith: mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.4),
});

// Flower blossom tints (warm family accents on the green ground).
export const FLOWER_TINTS = Object.freeze([
  mix(PALETTE.bone, '#FFFFFF', 0.4),
  mix(PALETTE.paleGold, PALETTE.parchment, 0.25),
  mix(PALETTE.hearthAmber, PALETTE.parchment, 0.45),
  mix(PALETTE.parchment, '#FFFFFF', 0.2),
]);

export { mix };
