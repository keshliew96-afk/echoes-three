#!/usr/bin/env node
// Frame analyzer — turns "does it look right?" into numbers, using the same
// measurements the critics run. Builders MUST use this to self-verify before
// returning; critics use it to confirm or refute.
//
// Usage:
//   node tools/analyze.mjs captures/foo.png [more.png ...]
//   node tools/analyze.mjs --ref captures/foo.png     compare against the
//                                                     reference screenshot
//   node tools/analyze.mjs --box x,y,w,h captures/foo.png   region stats only
//
// Reports per image:
//   LUMA      distribution + %above160 / %above200 (value range / "no murk")
//   HUEMIX    warm / foliage-green / cool pixel split (Act-1: warm lit pools
//             must be present, cool reserved for shadow pockets)
//   FLAT      % of 8x8 blocks that are a single flat colour (bar: <20%)
//   SAT       mean saturation of coloured pixels
//   HUES      pixel counts in reserved bands (danger/heal/violet/amber)
// The reference frame (docs/reference/pass-the-fear.png) is the benchmark:
//   LUMA >160 ~3.4%, >200 ~1.4%, all 16 buckets populated.

import { readFileSync } from 'fs';
import sharp from 'sharp';

const REF = 'docs/reference/pass-the-fear.png';
const args = process.argv.slice(2);
let box = null;
let withRef = false;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--box') { box = args[++i].split(',').map(Number); }
  else if (args[i] === '--ref') { withRef = true; }
  else files.push(args[i]);
}
if (withRef) files.push(REF);
if (!files.length) { console.error('usage: analyze.mjs [--box x,y,w,h] [--ref] <png...>'); process.exit(2); }

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}

for (const file of files) {
  let img = sharp(readFileSync(file)).ensureAlpha().removeAlpha();
  if (box) img = img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const N = W * H;

  const buckets = new Array(16).fill(0);
  let above160 = 0, above200 = 0, warm = 0, cool = 0, foliage = 0, satSum = 0, satN = 0;
  const hues = { danger: 0, heal: 0, violet: 0, amber: 0 };

  for (let i = 0; i < N; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const L = luma(r, g, b);
    buckets[Math.min(15, Math.floor(L / 16))]++;
    if (L > 160) above160++;
    if (L > 200) above200++;
    const [h, s] = hsv(r, g, b);
    if (s > 0.12) {
      satSum += s; satN++;
      // Three-way, unambiguous: warm = reds/oranges/ambers, foliage = greens,
      // cool = teal/blue/violet. Greens get their own bucket so a green field
      // never masquerades as "cool light" (or as warm).
      if (h >= 330 || h < 60) warm++;
      else if (h >= 60 && h < 160) foliage++;
      else cool++;
      if (s > 0.35 && L > 40) {
        if (h >= 5 && h < 25) hues.danger++;
        else if (h >= 110 && h < 150) hues.heal++;
        else if (h >= 245 && h < 285) hues.violet++;
        else if (h >= 30 && h < 50) hues.amber++;
      }
    }
  }

  // Flat-block scan: an 8x8 block whose max channel spread is <=4 is "flat".
  let flat = 0, blocks = 0;
  for (let by = 0; by + 8 <= H; by += 8) {
    for (let bx = 0; bx + 8 <= W; bx += 8) {
      let mnR = 255, mxR = 0, mnG = 255, mxG = 0, mnB = 255, mxB = 0;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const i = ((by + y) * W + bx + x) * C;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r < mnR) mnR = r; if (r > mxR) mxR = r;
          if (g < mnG) mnG = g; if (g > mxG) mxG = g;
          if (b < mnB) mnB = b; if (b > mxB) mxB = b;
        }
      }
      blocks++;
      if (mxR - mnR <= 4 && mxG - mnG <= 4 && mxB - mnB <= 4) flat++;
    }
  }

  const pct = (n) => ((n / N) * 100).toFixed(3) + '%';
  const usedBuckets = buckets.filter((b) => b / N > 0.0005).length;
  const tot = warm + cool + foliage || 1;
  const warmPct = ((warm / tot) * 100).toFixed(1);
  const foliagePct = ((foliage / tot) * 100).toFixed(1);
  const coolPct = ((cool / tot) * 100).toFixed(1);

  console.log(`\n=== ${file}  (${W}x${H}${box ? ' box ' + box.join(',') : ''})`);
  console.log(`LUMA     >160 ${pct(above160)}   >200 ${pct(above200)}   buckets used ${usedBuckets}/16`);
  console.log(`         hist ${buckets.map((b) => Math.round((b / N) * 100)).join('|')}`);
  console.log(`HUEMIX   warm ${warmPct}% | foliage ${foliagePct}% | cool ${coolPct}%`);
  console.log(`FLAT     ${((flat / blocks) * 100).toFixed(2)}% of ${blocks} 8x8 blocks`);
  console.log(`SAT      mean ${satN ? (satSum / satN).toFixed(3) : '0'} over ${pct(satN)} coloured px`);
  console.log(`HUES     danger ${hues.danger}  heal ${hues.heal}  violet ${hues.violet}  amber ${hues.amber}`);
}
console.log('\nBenchmark (reference frame): LUMA >160 ~3.4%, >200 ~1.4%, 16/16 buckets.');
