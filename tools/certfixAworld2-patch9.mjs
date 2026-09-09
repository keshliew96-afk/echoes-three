// A-world r2, step 3c (check 7 / check 2): the fire POOLS carry more of the
// frame's light. On the night floor a torch pool is the only thing between the
// black point and the emitter core, and the frame's >160 share (2.70% against
// the reference's 3.42%) is exactly that mid-bright band. The pool/halo tints
// move further toward Parchment — the pools get paler and brighter, they do
// not get more saturated, so the warm:cool funnel is unaffected in hue.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/colors.js', [
  [
`  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.26),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.2),`,
`  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.42),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.32),`,
  ],
]);
