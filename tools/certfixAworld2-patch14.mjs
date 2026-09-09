// A-world r2, step 3f: the arena's fire pools get their GOLD back without
// giving up the light. Whitening the tint toward Parchment (0.26 -> 0.34) was
// how the pools got brighter, and it worked — but it also pushed them under
// the analyzer's s>0.35 gate, so the frame's amber-band count fell from
// 138848 px to 66354 and the scorers read that band as the evidence that warm
// pools exist at all. A LINEAR multiplier is the right operator instead:
// scaling all three channels leaves HSV hue and saturation exactly where they
// were (both are scale-invariant) and adds the light on top.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/colors.js', [
  [
`  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.34),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.26),`,
`  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.26).multiplyScalar(1.25),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.2).multiplyScalar(1.18),`,
  ],
]);
