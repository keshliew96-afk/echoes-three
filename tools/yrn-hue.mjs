#!/usr/bin/env node
// Round D2 antler-hue proof: dominant hue (5-degree bins) of the saturated pixels in a box,
// overall and restricted to the cool half (180-300), plus band counts.
//   node tools/yrn-hue.mjs <png> x,y,w,h [x,y,w,h ...]
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
  const bins = new Array(72).fill(0);
  let sat = 0, cyan = 0, blue = 0, violet = 0, blueG = 0, violetG = 0, warm = 0, green = 0, other = 0;
  for (let y = Math.max(0, y0); y < y0 + h; y++) for (let x = Math.max(0, x0); x < x0 + w; x++) {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [hh, s, v] = hsv(r, g, b);
    if (s <= 0.2 || v < 0.15) continue;
    sat++;
    bins[Math.floor(hh / 5) % 72]++;
    if (hh >= 180 && hh < 195) cyan++; else if (hh >= 195 && hh < 244) blue++; else if (hh >= 244 && hh < 285) violet++; else if (hh >= 330 || hh < 60) warm++; else if (hh >= 60 && hh < 160) green++; else other++;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (s > 0.35 && L > 40) { if (hh >= 195 && hh < 245) blueG++; else if (hh >= 245 && hh < 285) violetG++; }
  }
  const top = bins.map((n, i) => [i * 5, n]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d, n]) => `${d}-${d + 5}:${n}`);
  const cool = bins.map((n, i) => [i * 5, n]).filter(([d]) => d >= 180 && d < 300).sort((a, b) => b[1] - a[1]);
  const coolTot = cool.reduce((t, x) => t + x[1], 0);
  const p = (n) => ((100 * n) / Math.max(1, sat)).toFixed(1) + '%';
  console.log(`${file} box ${bx}: sat px ${sat} | top bins ${top.join(' ')} | dominant cool bin ${cool[0][0]}-${cool[0][0] + 5} (${cool[0][1]} of ${coolTot} cool px) | cyan180-195 ${cyan} | blue195-244 ${blue} (${p(blue)}) | violet244-285 ${violet} (${p(violet)}) | warm ${p(warm)} green ${p(green)} | analyzer-gate blue ${blueG} violet ${violetG}`);
}
