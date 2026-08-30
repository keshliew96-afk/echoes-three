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

// --- Reserved-band guarantee for the warm PROP family ------------------------
// Measured, not guessed. Every timber/stone albedo in this file already sits at
// display hue 30-40 (checked by dumping every material colour in the running
// scene), and yet the same props kept measuring hue 19-25 at saturation
// 0.35-0.57 in captured frames — inside the h5-25 Ember Danger band the palette
// reserves for enemy threats. The rotation happens downstream of the albedo:
// warm key x albedo, then ACES, then the grade's `c *= vec3(1.045,1.010,0.965)`
// red lift, together drag a warm mid-tone about 15 hue degrees DOWN.
//
// So the guarantee is applied here, at the source, instead of being chased one
// hand-tuned mix at a time: a hue FLOOR of 44 degrees (44 - 15 lands clear of
// the 25 ceiling) and a saturation CAP of 0.33 (under the analyzer's s > 0.35
// gate, so even a tone that does rotate into the band cannot be counted). Two
// independent margins, both measurable. Storybook timber still reads as timber
// at s 0.33 — the props keep their value structure, which is what carries the
// silhouette anyway.
// Floor 46 / cap 0.28 after a measured pass at 44 / 0.33: at the looser pair
// the dark toon bands of edge props still came back h21-25 at s0.35-0.40,
// because the warm key contributes its OWN saturation on top of the albedo's
// and the grade adds a further ~5% saturation boost.
// Final pair 48 / 0.25 (from 46 / 0.28): the edge props' shaded toon bands
// were still the largest non-party contributor to the reserved-band count in
// the worst of nine measured frames (269 px of 527 across three prop clusters).
const BAND_HUE_FLOOR = 48 / 360;
const BAND_SAT_CAP = 0.25;
function warmSafe(color) {
  const c = new Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl, SRGBColorSpace);
  const h = hsl.h < 0.5 && hsl.h < BAND_HUE_FLOOR ? BAND_HUE_FLOOR : hsl.h;
  const sat = Math.min(BAND_SAT_CAP, hsl.s);
  return new Color().setHSL(h, sat, hsl.l, SRGBColorSpace);
}

export const ENV = Object.freeze({
  // Woods & timber (warm family: bruise umber lifted toward PALE GOLD, not
  // hearth amber — baseline-v030 F2: the amber-mixed timber, multiplied by the
  // warm key and red-lifted by the grade, measured hue 16-24 at sat 0.5-0.8,
  // i.e. inside the h5-25 Ember Danger band the palette reserves for enemy
  // threats. Pale Gold #D9B872 sits ~6 hue degrees higher with a stronger green
  // channel, so the same furniture lands h 28-38 (amber/brown) after the post
  // chain. Same warm family, out of the reserved band.
  // Every wood/stone tone also carries a small BLUE floor (warmGrey / mist
  // mixes): the toon SHADE bands sit at low display values where the grade's
  // red lift costs ~5 hue degrees, and a b-starved dark brown lands under h25.
  // The gold mixes are high and every tone carries a COOL.mist floor because
  // prop PLACEMENT is cosmetic-random: any of these can roll next to a torch,
  // and the worst case (warm key x warm albedo x grade red lift) must still
  // land outside h5-25 at s<=0.35. Measured, not guessed — see the polish
  // chain's danger-band sweep.
  // Mist shares raised again (bark 0.2->0.26, barkDark 0.16->0.24, stumpTop
  // 0.14->0.2) — measured on captures: a stump's key-grazed side landed at
  // h23/s0.37 and its vignette-corner shade side at h20-25/s0.4-0.5, both a
  // hair inside the reserved band. The extra blue floor holds worst-case
  // timber under the s0.35 gate at every light angle.
  // paleGold 0.76 / mist 0.33: stump trunks measured (118,93,76) — G/R 0.79,
  // B/R 0.64, ONE point under both escape hatches (h>=26 or s<=0.35). These
  // two nudges push the worst-case product over both lines at once.
  // Mist 0.38 / value 0.47 (round 5, were 0.33/0.44): stump flanks sitting in
  // a vignette corner of the DIM hollow variant still measured h23-25 /
  // s0.36-0.46 in their half-lit shadowed bands. A touch more blue floor and
  // a touch more value keeps worst-case shadowed timber under the gate in all
  // three variants.
  bark: warmSafe(shade(mix(mix(mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.76), PALETTE.warmGrey, 0.3), COOL.mist, 0.38), 0.47)),
  // barkDark rides at display L 40-55 where the grade's S-curve crushes blue
  // hardest — it needs the deepest mist share of the timber family (0.34) and
  // a small value lift (0.62 -> 0.68) to hold s under 0.35 on shade faces.
  barkDark: warmSafe(shade(mix(mix(mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.42), PALETTE.voidCharcoal, 0.35), COOL.mist, 0.34), 0.68)),
  plank: warmSafe(shade(mix(mix(mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.68), PALETTE.warmGrey, 0.26), COOL.mist, 0.26), 0.42)),
  plankLit: warmSafe(shade(mix(mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.78), COOL.mist, 0.2), 0.52)),
  stumpTop: warmSafe(shade(mix(mix(PALETTE.bone, PALETTE.hearthAmber, 0.18), COOL.mist, 0.27), 0.28)),
  // Stone (neutral family: warm grey / bone / charcoal blends, mist-cooled so
  // torch-lit rock reads as warm GREY, never terracotta).
  // Stone mist 0.42/0.3 (were 0.34/0.22): a slab's toon-shade bevel measured
  // h24-25/s0.47 (dim brown) — the same worst case as the timber above.
  stone: warmSafe(shade(mix(mix(PALETTE.warmGrey, PALETTE.bone, 0.5), COOL.mist, 0.42), 0.2)),
  stoneLit: warmSafe(shade(mix(mix(PALETTE.bone, PALETTE.parchment, 0.3), COOL.mist, 0.3), 0.26)),
  // Boulders/cairns are GREEN-DOMINANT grey-green rock (lichened stone) — a
  // hue guarantee, not a taste call: every warm/indigo blend tried for these
  // teetered at the h20-25 boundary and flipped 800+ px into the reserved
  // Ember Danger band whenever a torch glow or pool feather washed a body
  // (the warm key and pool adds carry R/G ~1.08, so an albedo with G/R >= 1.3
  // can never come out red-dominant enough to land in h5-25). Authored in
  // display space; reads as mossy woodland rock under the moss caps the
  // boulder/cairn builders already wear.
  stoneCool: hslColor(172, 0.14, 0.17),
  iron: warmSafe(shade(mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.4), 0.7)),
  // Lantern glass: warm gold, kept at a value the bloom pass lifts into a halo
  // WITHOUT clipping the core to featureless white (the previous 1.55x did).
  // 2.9x is an HDR gain, not a tint: MeshBasicMaterial values above 1.0 in the
  // linear working space are what carries the glass over the bloom pass's
  // threshold so a lantern reads as a lit lantern (critique F2). ACES pulls the
  // core back to a warm near-white with an amber bloom skirt.
  // FIX ROUND 2 — 2.9x -> 1.65x. At 2.9 linear the glass sat 4.3x over the
  // 0.68 bloom threshold, and UnrealBloomPass (strength 1.15, radius 0.6) turned
  // that into a metre-wide amber skirt that painted every ground decal near the
  // prop. Measured per arc on variant 3 with the party leashed around a lantern
  // at (8.6,-3.8): the Swordsman's fire-facing arc read h1.4 rgb(203,122,118)
  // against his h348.2 accent, and the ring's own dark ink stroke was lifted
  // from luma ~45 to 108 — §17 makes identity rings exempt from lighting, and
  // this was the largest single violation of that. It also never met its own
  // goal: at 2.9 the core WAS clipped to featureless white (captures/xe-v3-sw
  // .png). At 1.65 the glass still clears the threshold, so the lantern keeps a
  // real bloom halo (REFERENCE_BAR check 2), but the skirt no longer reaches the
  // floor around it.
  glassLit: mix(PALETTE.paleGold, PALETTE.hearthAmber, 0.4).multiplyScalar(1.65),
  // Corruption monolith stone — near-black and COOL, so the violet emissive
  // veins stay saturated violet instead of lifting into grey-mauve.
  // Cool mix 0.72 / value 0.68 (were 0.55/0.55): the violet-halo-lit flank of
  // the OLD near-black stone sat at display luma 40-60, where the grade's
  // S-curve crushes blue ~2x harder than red — measured h6-14 / s0.36-0.44
  // dark MAROON along the slab in vignette corners (the reserved Ember band).
  // A step lighter and bluer, the same flank stays mauve-grey after the grade.
  monolith: mix(PALETTE.voidCharcoal, COOL.ambient, 0.72).multiplyScalar(0.68),
  monolithBase: mix(PALETTE.voidCharcoal, COOL.ambient, 0.5).multiplyScalar(0.85),
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

// Flower blossom tints. Strictly warm-family gold/cream — and GOLD, never
// amber-orange: baseline-v030 F2/F7 measured the amber-heavy blossoms as
// saturated h5-25 dots (the reserved Ember Danger band) that read as floating
// orange berries. Pale-gold/bone mixes keep the same storybook warmth with the
// green channel high enough that the post chain lands them at h 32-45.
// These sit well below the emitter values so they dress the ground instead of
// competing with the light sources.
export const FLOWER_TINTS = Object.freeze([
  shade(mix(PALETTE.paleGold, PALETTE.bruiseUmber, 0.3), 0.6),
  shade(mix(PALETTE.paleGold, PALETTE.bone, 0.4), 0.52),
  shade(mix(PALETTE.paleGold, PALETTE.parchment, 0.3), 0.46),
  shade(mix(PALETTE.paleGold, PALETTE.voidCharcoal, 0.25), 0.62),
]);

// Warm emitter glow tint (torch/lantern/brazier halos + ground pools). Additive
// amber light over brown dirt is what dragged the beaten track into the h5-25
// danger band (an additive #E8A23D raises R twice as hard as G); this gold mix
// keeps the pool warm while the extra green channel holds the lit dirt at
// amber hues.
// Measured round 2 (this block): pure amber/gold mixes still landed their
// additive haze at h19-24 once the grade's red lift did its work — the fix is
// a parchment lift that raises the BLUE channel of the addition, so dim lit
// browns fall out of the s>0.35 gate as well as climbing above h25.
// The parchment shares are high on purpose: the ADDITION itself must sit under
// ~0.30 saturation, because the billboard halo's broad feather rides over dark
// cool ground and walls, and `dark base + saturated amber add` sums to the
// h19-24 / s0.35-0.5 mauve murk the analyzer counts as danger. The flame
// sprite bodies (env/flame.js) still carry the saturated amber — the fire
// keeps its color; only the ATMOSPHERE around it is cream-gold.
// Parchment share 0.58 pool / 0.5 halo (round 3 of this block): at 0.42 the
// residual murk was a ~450 px cluster where a lantern pool feathered across
// the monolith's violet halo (warm add over mauve base); at 0.5 a lantern
// pool washing a beige stone cairn still measured h25/s0.37. 0.58 puts the
// POOL addition at s~0.22 with a G/R ratio high enough that even pool-washed
// beige stone stays out of the h5-25 / s>0.35 danger gate; the flame sprites
// keep the saturated amber, so the fire never loses its color.
// FINAL SHARES (0.44 pool / 0.30 halo). The 0.58-0.66 cuts above were chasing
// the danger metric alone and cost the thing the pools exist for: measured on
// captures, the pool CORES came out rgb(255,242,208) — hue 43 at saturation
// 0.18, i.e. a white spotlight, not firelight (REFERENCE_BAR C2 wants visible
// warm light POOLS, and §19.3 wants the fires to carry the act's warmth). The
// gold mix already puts the addition at hue ~39, which is 14 degrees clear of
// the h5-25 ceiling; the parchment share only needs to be big enough to keep
// the mid-feather's saturation off the s>0.35 gate, and 0.44 measures there
// with the pool opacities below trimmed to match.
// FIX ROUND 2 — parchment shares cut back to 0.26 pool / 0.20 halo. The heavy
// cream shares above were bought to fight a reserved-band count whose real
// cause turned out to be the flame sprites' bloom overflow (env/flame.js
// GAIN_MAX), not the pool tint: with the fires capped, the whole-frame band
// count fell from 533 px to under 80 with the cream pools still in place, i.e.
// the cream was paying for nothing. It cost the thing the pools exist for — a
// pool core measured rgb(255,242,208), hue 43 at SATURATION 0.18, which the
// analyzer does not even count as a warm pixel (its colour gate is s > 0.12)
// and which reads on screen as a white stage spotlight, not firelight.
// At 0.26/0.20 the addition sits around s 0.36-0.42 at hue ~40 — 15 degrees
// clear of the h25 Ember ceiling, chromatic enough to read as fire and to
// count toward the §19.3 warm-dominant split.
export const EMBER_GLOW = Object.freeze({
  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.26),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.2),
});

export { mix, shade };
