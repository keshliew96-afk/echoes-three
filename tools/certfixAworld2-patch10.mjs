// A-world r2, step 3d: pool/halo settle at 0.34 / 0.26 toward Parchment.
// At 0.42 / 0.32 the frame's >160 share hit 3.96% (reference 3.42%) but the
// pools desaturated out of the analyzer's amber band — 138848 -> 50330 px —
// and the scorers read that band as the evidence that the warm pools exist at
// all ("box 1250,520,300,180 = warm 70.5%, amber 24921"). 0.34 / 0.26 keeps
// the light and the warmth.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/colors.js', [
  [
`  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.42),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.32),`,
`  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.34),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.26),`,
  ],
]);
