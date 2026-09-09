// A-world r2: the post-stack tuning note catches up with where the numbers
// actually settled.
import { edit } from './certfixAworld2-patch.mjs';
edit('docs/BUILD_BRIEF.md', [
  [
`  (c) Bloom strength **1.22** (was 1.15) and the flame texture's white core`,
`  (c) Bloom strength **1.35** (was 1.15) and the flame texture's white core`,
  ],
  [
`  and under that budget. All three lenses scored check 7 down on one number,
  LUMA >200 0.632% against the reference's 1.427% with the top buckets empty;
  after, the combat frame measures **>160 3.421% / >200 0.756% / 16 of 16
  buckets** (reference 3.418 / 1.427 / 16) and the boss frame **3.913 /
  1.402 / 16**. env/colors.js EMBER_GLOW pool/halo also move 0.26/0.20 -> 0.34/
  0.26 toward Parchment: on a night floor the pool is the whole mid-bright band
  between the black point and the core, and a paler pool is brighter without
  being more saturated.`,
`  and under that budget. All three lenses scored check 7 down on one number,
  LUMA >200 0.632% against the reference's 1.427% with the top buckets empty;
  after, the combat frame measures **>160 4.510% / >200 0.775% / 16 of 16
  buckets, 0.086% above display 240** (reference 3.418 / 1.427 / 16 / 0.132)
  and the boss frame **2.948 / 1.387 / 16**. The party is still not blown:
  box 600,500,220,230 measures >200 0.022%.
  (d) env/colors.js EMBER_GLOW pool/halo keep their 0.26 / 0.20 Parchment
  shares and gain a LINEAR multiplier instead (x1.25 / x1.18). Whitening the
  tint was the first attempt at buying the mid-bright band a night floor needs
  between its black point and its emitter cores, and it worked on luma — but it
  pushed the pools under the analyzer's s>0.35 gate and the frame's amber-band
  count fell 138848 -> 66354 px, which is the evidence the scorers read as
  "the warm pools exist". A scalar multiply leaves HSV hue and saturation
  exactly where they were (both are scale-invariant) and adds the light on top:
  amber 140551 px with >160 at 4.510%.`,
  ],
]);
