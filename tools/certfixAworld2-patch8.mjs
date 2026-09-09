// A-world r2, step 3b: the flame's white core becomes a PLATEAU, not a needle.
// Measured (tools/certfixAworld2-peak.mjs): the combat frame carries 0.033% of
// its pixels above display 240 against the reference's 0.132%, so LUMA bucket
// 15 stays under the analyzer's 0.05% "used" threshold and check 7 reads
// 15/16. The peak value is already right (max 249 vs the reference's 255) —
// what is missing is AREA. Reference D paints every fireball with a broad
// white-hot centre; this core fell off from opaque at r=0 to 0.78 alpha by
// 45% of a 38 px radius, i.e. ~11 screen px per torch.
// Every added stop stays near-neutral (HSV sat 0.06 / 0.19 / 0.43 with alpha
// 0.24) and under the GAIN_MAX bloom-threshold budget documented above:
//   rgba(255,251,240,.95) lum 0.966 x .95 x .96 = 0.881  (sat 0.059 — cream)
//   rgba(252,240,205,.62) lum 0.873 x .62 x .96 = 0.520  (under 0.68)
//   rgba(246,214,140,.24) lum 0.680 x .24 x .96 = 0.157  (under 0.68)
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/flame.js', [
  [
`  g.addColorStop(0, 'rgba(255,253,248,1.0)');
  g.addColorStop(0.45, 'rgba(252,242,214,0.78)');
  g.addColorStop(0.78, 'rgba(246,214,140,0.26)');
  g.addColorStop(1, 'rgba(240,180,90,0)');`,
`  g.addColorStop(0, 'rgba(255,253,248,1.0)');
  g.addColorStop(0.42, 'rgba(255,251,240,0.95)');
  g.addColorStop(0.62, 'rgba(252,240,205,0.62)');
  g.addColorStop(0.85, 'rgba(246,214,140,0.24)');
  g.addColorStop(1, 'rgba(240,180,90,0)');`,
  ],
]);
