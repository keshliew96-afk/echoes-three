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
  // --- Gauntlet archetypes (M4b, BUILD_BRIEF §23.5): same cool-slate family,
  // each with its own VALUE structure so the five read apart at 50% zoom.
  // Quillback: grey-blue dome under pale cool quills.
  quillBody: slate(0.36, 0.3).multiplyScalar(0.95),
  quillDark: slate(0.42, 0.12).multiplyScalar(0.62),
  quillSpine: mix(PALETTE.bone, PALETTE.signalBlue, 0.22).multiplyScalar(0.92),
  // Mire Toad: murky teal-slate back, a pale cool throat sac.
  toadBody: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.36).lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.82),
  toadDark: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.42).lerp(new Color(PALETTE.warmGrey), 0.2).multiplyScalar(0.46),
  toadSac: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.55).lerp(new Color(PALETTE.bone), 0.55).multiplyScalar(1.02),
  // Gloam Moth: a dark thin body under pale dusty-blue wings.
  mothBody: slate(0.5, 0.12).multiplyScalar(0.55),
  mothWing: mix(PALETTE.warmGrey, PALETTE.signalBlue, 0.42).multiplyScalar(0.98),
  mothWingDark: slate(0.46, 0.22).multiplyScalar(0.72),
  // Barrow Ram: a grey block with a dark face and legs; bone horns.
  ramBody: slate(0.28, 0.38).multiplyScalar(0.9),
  ramDark: slate(0.4, 0.1).multiplyScalar(0.55),
  ramHorn: new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.25).multiplyScalar(0.92),
  // Grave Mole: near-black cool fur, a pale snout, bone claws; earth mound.
  moleBody: slate(0.3, 0.12).multiplyScalar(0.5),
  moleSnout: mix(PALETTE.warmGrey, PALETTE.signalBlue, 0.3).multiplyScalar(1.0),
  moleClaw: new Color(PALETTE.bone).multiplyScalar(0.88),
  earth: mix(PALETTE.bruiseUmber, PALETTE.warmGrey, 0.55).multiplyScalar(0.92),
  earthDark: mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.6),
  // --- Content slice 1 (docs/CONTENT_PLAN.md §3), same cool families.
  // Rotcap: a pale cool-grey cap over a dark stalk, pale gills.
  rotCap: slate(0.32, 0.42).multiplyScalar(0.92),
  rotStalk: mix(PALETTE.warmGrey, PALETTE.signalBlue, 0.25).lerp(new Color(PALETTE.bone), 0.35).multiplyScalar(0.9),
  rotGill: slate(0.4, 0.15).multiplyScalar(0.5),
  // Lantern Snail: a dark coiled shell, a pale slug body.
  snailShell: slate(0.38, 0.18).multiplyScalar(0.62),
  snailShellDark: slate(0.42, 0.1).multiplyScalar(0.42),
  snailBody: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.5).lerp(new Color(PALETTE.bone), 0.4).multiplyScalar(0.95),
  // Barrow Crow: near-black feathers with a slate sheen, a pale bone beak.
  crowBody: slate(0.42, 0.12).multiplyScalar(0.4),
  crowWing: slate(0.46, 0.18).multiplyScalar(0.55),
  // Brood Spider: a bloated grey-blue abdomen over dark legs.
  broodBody: slate(0.36, 0.28).multiplyScalar(0.78),
  broodDark: slate(0.4, 0.1).multiplyScalar(0.42),
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

// --- Act IV, the Hollow Heart (docs/ACT_IV.md) ------------------------------
// Down here the corruption is not a tell, it is the body: the Heart's
// creatures wear its violet in their veins and crystal over dark bruised
// flesh, black cloth and old bone. Threat stays Ember — the violet never
// warns, it only says WHERE you are. The hue is pushed a step past God-stuff
// Violet toward purple (~282 deg) because the Heart's own air is blue-violet:
// at the raw anchor's hue a vein glowing over that floor reads BLUE. A rose
// second tone belongs to the Censer's mend alone. Bodies keep a hard value
// split (pale ash / bone against near-black plum) so they cut out of a floor
// that is already violet.
const heartHsl = (h, s, l) => exactColor(new Color().setHSL(h / 360, s, l, SRGBColorSpace).getHex());
export const HEART = Object.freeze({
  vein: heartHsl(282, 0.82, 0.62), // resting vein / crystal glow
  veinDim: heartHsl(284, 0.6, 0.4), // between beats
  veinHot: heartHsl(286, 0.9, 0.82), // the swell before a surge, a lit coal
  glow: heartHsl(286, 0.95, 0.6), // halo sprites
  rose: heartHsl(318, 0.66, 0.72), // the Censer's mend
  // Bodies.
  ash: heartHsl(268, 0.1, 0.6), // husk skin: pale, bloodless, faintly lilac
  flesh: heartHsl(284, 0.22, 0.3), // bruised plum
  fleshDark: heartHsl(286, 0.25, 0.17),
  bone: heartHsl(40, 0.12, 0.74), // old bone (warm-neutral, under the colour gate)
  cloth: heartHsl(280, 0.18, 0.11), // near-black plum
  stone: heartHsl(250, 0.07, 0.34), // dark slate rock
  stoneDark: heartHsl(255, 0.08, 0.2),
  crystal: heartHsl(274, 0.66, 0.66),
});
