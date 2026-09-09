// A-world r2, step 3 (check 7 "post stack"): the frame's top end.
// All three lenses put check 7 at 1 on one number — LUMA >200 0.632% against
// the reference's 1.427%, with the top buckets empty. GAIN_MAX must NOT move
// (its whole derivation is that no COLOURED stop of the flame may clear the
// bloom threshold, or the bloom veil warms every dark pixel into the reserved
// Ember band), so the top end is bought where it is free: the flame texture's
// own white core, which measures HSV saturation 0.13 and therefore can only
// brighten whatever the bloom skirt lands on.
//   core stop  rgba(248,244,236) -> rgba(255,253,248)  (sat 0.13 -> 0.027)
//   linear luminance 0.908 -> 0.985, x GAIN_MAX 0.96 = 0.946, i.e. ACES at
//   exposure 1.04 lands the core at display ~244 instead of ~237 — the first
//   value that populates LUMA bucket 15.
//   radius 33 -> 38 px of a 128x192 texture widens the >200 region without
//   touching a single coloured stop.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/flame.js', [
  [
`  ctx.filter = 'blur(5px)';
  g = ctx.createRadialGradient(W / 2, H - 46, 0, W / 2, H - 46, 33);
  g.addColorStop(0, 'rgba(248,244,236,1.0)');
  g.addColorStop(0.45, 'rgba(250,237,203,0.74)');`,
`  ctx.filter = 'blur(5px)';
  g = ctx.createRadialGradient(W / 2, H - 46, 0, W / 2, H - 46, 38);
  g.addColorStop(0, 'rgba(255,253,248,1.0)');
  g.addColorStop(0.45, 'rgba(252,242,214,0.78)');`,
  ],
]);
edit('src/render/stage.js', [
  [
`  threshold: 0.68, // linear; emitter cores are authored above 1.0
  strength: 1.15,`,
`  threshold: 0.68, // linear; emitter cores are authored above 1.0
  // 1.22 (fix round 2, check 7): the frame's >200 share is the one number all
  // three lenses scored this check down on. Only the near-neutral emitter
  // cores clear the threshold (env/flame.js GAIN_MAX), so the extra strength
  // grows a cream halo, not a saturated veil.
  strength: 1.22,`,
  ],
]);
