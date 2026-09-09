// A-world r2: dated tuning notes for the night floor and the post stack.
import { edit } from './certfixAworld2-patch.mjs';
edit('docs/BUILD_BRIEF.md', [
  [
`- Shop room: one dense stall cluster under a single warm pooled lantern
  (Shopkeep's Lantern), act palette visible at room edges. Boss room: a stop
  darker/desaturated; boss = brightest emitter.`,
`- **Tuning note (certification fix round 2, 2026-09-10):** the run arenas paint
  the floor **night-first**. This section's baseline reads as a saturated green
  field with cool "only in shadow pockets", and round 2 measured what that
  produces: combat HUEMIX **warm 40.0 / foliage 52.0 / cool 8.0** against the
  reference's **22.5 / 1.1 / 76.4**, with the darkest region of the frame
  reading warm 47.1 / cool 13.6 (a brown-olive shadow) and LUMA bucket 0 at 7%
  against 27%. All three scorers rejected check 2 on the same clause: there is
  no cool pole for the fire pools to read against. A field whose BASE is green
  cannot carry that funnel — every shade pocket painted on top of it is a
  puddle on a lawn.
  So the polarity is inverted, which is what all four reference screenshots do:
  the base fill is the SHADE end (a deep saturated indigo-teal, `+'`'+`ground.nightBase`+'`'+`
  in env/variants.js), the §19.3 green arrives as the lit dapple stamps where
  the canopy opens, and the instanced grass tufts + flowers carry the brief's
  hue 70-110 / sat 0.55-0.65 turf on top. Per-variant: lit `+'`'+`l`+'`'+` 0.39/0.42/0.355
  -> 0.30/0.325/0.275, shade 196-197/0.26 -> 202-203/0.38, `+'`'+`coolLift`+'`'+` 6 -> 22,
  `+'`'+`dirtL`+'`'+` 0.255/0.30/0.285 -> 0.20/0.235/0.225 (the beaten track was the frame's
  brightest large surface, i.e. a warm river with no emitter over it).
  Measured after, same seed and same certified frame conditions: combat HUEMIX
  **warm 36.6 / foliage 15.0 / cool 48.4**, LUMA buckets 0+1 = 44% against the
  reference's 48%, an open-grass box (400,120,500,220) at cool 73.4% with SAT
  0.572 — inside this section's 0.55-0.65 grass bar — and the reserved heal
  band on a pure-grass box down from 1032 px to 523. The camp (env/camp/*)
  keeps the authored polarity: its spec is already a night spec and its frame
  scored 20/20.
- Shop room: one dense stall cluster under a single warm pooled lantern
  (Shopkeep's Lantern), act palette visible at room edges. Boss room: a stop
  darker/desaturated; boss = brightest emitter.`,
  ],
  [
`  "cool wash" §19.3 asks the unlit half of an Act-1 room to carry, and it is
  what makes the grade visible in frame at all.`,
`  "cool wash" §19.3 asks the unlit half of an Act-1 room to carry, and it is
  what makes the grade visible in frame at all.

- **Tuning note (certification fix round 2, 2026-09-10):** three numbers move,
  all of them measured against the round-2 combat frame.
  (a) The split-tone's ramp opens at **smoothstep(0.02, 0.55)** with multiplier
  **(0.76, 0.88, 1.18)**, not (0.03, 0.42) / (0.84, 0.90, 1.10). At the old
  ramp a shadow pixel at display 27 received a 1% blue lift — i.e. the "cool
  wash" was invisible exactly where it was needed, and the reference lens's own
  darkest-region probe (box 1100,700,500,200) read warm 47.1 / cool 13.6. After:
  the same box reads **warm 33.1 / cool 40.9**. Above display ~140 the mix
  factor is 0.99, so the fire pools, the party and every emitter core are
  untouched.
  (b) The vignette's COOL TINT is no longer weighted by the shadow-protected
  `+'`'+`ve`+'`'+` — that gave a torch pool near a frame edge the full indigo multiply and a
  dark corner almost none of it, which is backwards. The tint now rides the
  vignette radius and fades out with luminance
  (`+'`'+`min(1, v*1.35) * (1 - smoothstep(0.10, 0.55, vlm))`+'`'+`, multiplier
  (0.66, 0.85, 1.20)); the darkening itself is unchanged.
  (c) Bloom strength **1.22** (was 1.15) and the flame texture's white core
  becomes a plateau (env/flame.js): stops (255,253,248,1.0) / (255,251,240,0.95)
  at 42% / (252,240,205,0.62) at 62%, radius 33 -> 38 px. `+'`'+`GAIN_MAX`+'`'+` is NOT
  touched — its derivation is that no COLOURED stop may clear the bloom
  threshold — and every added stop stays near-neutral (HSV sat 0.06 / 0.19)
  and under that budget. All three lenses scored check 7 down on one number,
  LUMA >200 0.632% against the reference's 1.427% with the top buckets empty;
  after, the combat frame measures **>160 3.421% / >200 0.756% / 16 of 16
  buckets** (reference 3.418 / 1.427 / 16) and the boss frame **3.913 /
  1.402 / 16**. env/colors.js EMBER_GLOW pool/halo also move 0.26/0.20 -> 0.34/
  0.26 toward Parchment: on a night floor the pool is the whole mid-bright band
  between the black point and the core, and a paler pool is brighter without
  being more saturated.`,
  ],
]);
