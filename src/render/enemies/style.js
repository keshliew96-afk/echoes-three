// Shared enemy-render style tokens (BUILD_BRIEF §19.2 "Enemies": desaturated
// cool-tinted low-poly silhouettes vs. the party's warmth; §11 Act-1 family
// rules: never the party's round warm low-set eyes, exactly one violet
// corruption tell each; §19.4 enemy shots = white core + Ember glow + trail).
//
// Every colour here is DERIVED from a §19.1 palette anchor (mix/HSL off
// PALETTE), same discipline as env/colors.js — no invented hexes. The hides
// are authored with a real blue tilt (linear B/R well above the warm key's
// R/B ratio) so the §19.3 warm key light can never flip an enemy body into
// the analyzer's warm band: enemies must read COOL in any lit frame.
import { Color, SRGBColorSpace } from 'three';
import { PALETTE } from '../../data/palette.js';
import { exactColor, mix } from '../critters/common.js';

// Cool slate family (voidCharcoal -> signalBlue direction, greyed a touch).
const slate = (blue, grey) =>
  mix(PALETTE.voidCharcoal, PALETTE.signalBlue, blue).lerp(new Color(PALETTE.warmGrey), grey);

// Certification fix round 2 (2026-09-10): every hide value is lifted (mantis
// body x0.5 -> x0.84, mantis dark x0.28 -> x0.46, boar dark x0.55 -> x0.72,
// mantis pale x0.7 -> x1.05 and half a step further toward Bone). All three
// scorers read the enemies as "undifferentiated blue lumps" at 50% zoom, and
// the cause was VALUE, not hue: since the arenas went to a night floor the
// darkest hides sat within a few luma of the ground they stand on, so head /
// thorax / abdomen / limbs had no internal contrast left to read by. The tilt
// stays cool — only the multiplier moves — so nothing can drift warm.
export const HIDE = Object.freeze({
  // Thorn Boar: cold slate hide, darker head/legs, pale cool belly.
  boarBody: slate(0.45, 0.15),
  boarDark: slate(0.4, 0.1).multiplyScalar(0.72),
  boarBelly: slate(0.5, 0.3).multiplyScalar(1.25),
  // Spitting Mantis: teal-slate chitin (sage pulled hard toward cool blue).
  mantisBody: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.55).multiplyScalar(0.84),
  mantisDark: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.5).multiplyScalar(0.46),
  mantisPale: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.6).lerp(new Color(PALETTE.bone), 0.45).multiplyScalar(1.05),
  // Tusks/claws: bone (warm-NEUTRAL — its saturation sits under the analyzer's
  // 0.12 colour gate, so it never counts as party-warm).
  bone: new Color(PALETTE.bone).multiplyScalar(0.85),
});

// The single violet corruption tell (§11): God-stuff Violet with its own hue,
// saturation LIFTED so the tell stays measurably violet after the post chain
// (the raw anchor sits at the analyzer's 0.35 saturation gate; ACES would drop
// it below). Value kept under the bloom threshold — a tell is a taint, not a
// lamp.
function tellViolet(l = 0.55, s = 0.65) {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(PALETTE.godstuffViolet).getHSL(hsl, SRGBColorSpace);
  return exactColor(new Color().setHSL(hsl.h, s, l, SRGBColorSpace).getHex());
}
export const TELL_VIOLET = tellViolet();
export const TELL_VIOLET_DIM = tellViolet(0.34, 0.5);

// --- Regular-enemy corruption tell: INDIGO, not violet -----------------------
// Certification fix round 1 (2026-09-09): all three scorers marked the boar's
// violet thorn ridge and the mantis's violet eye-glint as a §19.1 colour-
// discipline break — "God-stuff Violet: corruption/boss/Defeat ONLY, never
// friendly" is read on the frame as "violet means GOD-STUFF", so a rank-and-
// file boar wearing it makes the Stag's and the monolith's violet mean nothing.
// The rank-and-file tell moves into the indigo-night family the enemy hides
// already live in (hue ~228, one long step off Signal Blue's 200 deg so it can
// never be mistaken for the Rare-frame / mark-reticle accent), lifted in
// saturation and value so it still reads as a lit growth on a dark hide. Violet
// stays exclusive to the Stag, the monolith and spawn corruption.
// Logged as a §11 tuning note in docs/BUILD_BRIEF.md.
function tellIndigo(l = 0.6, s = 0.72) {
  return exactColor(new Color().setHSL(228 / 360, s, l, SRGBColorSpace).getHex());
}
export const TELL_INDIGO = tellIndigo();
export const TELL_INDIGO_DIM = tellIndigo(0.36, 0.6);
// Halo colour for the indigo tell (sprite tint; the additive falloff over dark
// ground must stay in the blue band, never feather toward violet).
export const TELL_INDIGO_GLOW = tellIndigo(0.52, 0.85);

// Enemy attack colour: Ember Danger, post-chain-exact (§19.1 — telegraphs and
// enemy attack VFX are the ONLY red-orange in a frame).
export const EMBER_EXACT = exactColor(PALETTE.emberDanger);
export const SHOT_CORE = exactColor(PALETTE.parchment); // white-hot core (§19.4)
