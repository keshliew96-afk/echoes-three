// A-world r2, step 3e: the white-hot core gets reliable headroom.
// tools/certfixAworld2-peak.mjs across four captures: pixels above display 240
// land at 0.042-0.055%, i.e. straddling the analyzer's 0.0005 "bucket used"
// threshold, so the same build reports 15/16 or 16/16 depending on where the
// camera sits. The reference carries 0.132%. Widening the core's plateau from
// 42% to 50% of a 43 px (was 38) radius roughly doubles the blown-out area per
// emitter without adding a single saturated stop.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/flame.js', [
  [
`  g = ctx.createRadialGradient(W / 2, H - 46, 0, W / 2, H - 46, 38);
  g.addColorStop(0, 'rgba(255,253,248,1.0)');
  g.addColorStop(0.42, 'rgba(255,251,240,0.95)');
  g.addColorStop(0.62, 'rgba(252,240,205,0.62)');
  g.addColorStop(0.85, 'rgba(246,214,140,0.24)');`,
`  g = ctx.createRadialGradient(W / 2, H - 46, 0, W / 2, H - 46, 43);
  g.addColorStop(0, 'rgba(255,253,248,1.0)');
  g.addColorStop(0.5, 'rgba(255,251,240,0.96)');
  g.addColorStop(0.7, 'rgba(252,240,205,0.6)');
  g.addColorStop(0.88, 'rgba(246,214,140,0.22)');`,
  ],
]);
