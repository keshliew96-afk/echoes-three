#!/usr/bin/env node
// Round D F5b proof: blue (195-244 deg) vs violet (244-275 deg) share of the
// saturated (s > 0.2) pixels in a box — the critic's own measurement.
//   node tools/fa-hue.mjs <png> x,y,w,h [x,y,w,h ...]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, ...boxes] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}
for (const bx of boxes) {
  const [x0, y0, w, h] = bx.split(',').map(Number);
  let sat = 0, blue = 0, violet = 0, blueStrict = 0, violetStrict = 0, warm = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * W + x) * C;
    const [hh, s, v] = hsv(data[i], data[i + 1], data[i + 2]);
    if (s <= 0.2) continue;
    sat++;
    if (hh >= 195 && hh < 244) blue++; else if (hh >= 244 && hh < 275) violet++; else if (hh >= 330 || hh < 60) warm++;
    if (s > 0.35 && v * 255 > 40) { if (hh >= 195 && hh < 245) blueStrict++; else if (hh >= 245 && hh < 285) violetStrict++; }
  }
  const p = (n) => ((100 * n) / Math.max(1, sat)).toFixed(1) + '%';
  console.log(`${file} box ${bx}: sat>0.2 px ${sat} | blue ${blue} (${p(blue)}) | violet ${violet} (${p(violet)}) | warm ${p(warm)} | analyzer-gate blue ${blueStrict} violet ${violetStrict}`);
}
