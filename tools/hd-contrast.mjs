#!/usr/bin/env node
// Criterion-5 helper: WCAG contrast of HUD ink vs HUD plate, measured off REAL
// captured pixels inside a HUD box (so it measures what the player sees, over
// whatever the environment is doing behind the overlay).
//
//   node tools/hd-contrast.mjs <png> x,y,w,h [label]
//
// Method: inside the box, sort every pixel by relative luminance. The plate is
// the median of the darkest 55% (the charcoal instrument panel dominates the
// box); the ink is the median of the brightest 4% (the Parchment glyph cores).
// Both are converted to WCAG relative luminance and reported as (L1+.05)/(L2+.05).
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [file, boxStr, label = ''] = process.argv.slice(2);
const [x, y, w, h] = boxStr.split(',').map(Number);
const { data, info } = await sharp(readFileSync(file))
  .extract({ left: x, top: y, width: w, height: h })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const srgb = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const relLum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);

const C = info.channels;
const N = info.width * info.height;
const lums = new Float64Array(N);
for (let i = 0; i < N; i++) lums[i] = relLum(data[i * C], data[i * C + 1], data[i * C + 2]);
const sorted = Array.from(lums).sort((a, b) => a - b);
const at = (f) => sorted[Math.min(N - 1, Math.max(0, Math.round(f * (N - 1))))];

const plate = at(0.275); // median of the darkest 55%
const ink = at(0.98); // median of the brightest 4%
const ratio = (ink + 0.05) / (plate + 0.05);
const out = {
  label,
  file,
  box: { x, y, w, h },
  px: N,
  plateLum: +plate.toFixed(5),
  inkLum: +ink.toFixed(5),
  contrast: +ratio.toFixed(2),
  wcag_AA_normal: ratio >= 4.5,
  wcag_AAA_normal: ratio >= 7,
};
console.log(JSON.stringify(out));
