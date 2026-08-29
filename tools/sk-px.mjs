#!/usr/bin/env node
// Skill-VFX pixel probe (skills block). analyze.mjs reports whole-frame hue
// bands; an Act-1 frame is mostly GRASS, whose green sits in the same 110-150
// band as Bright Heal, so a heal effect is invisible in that total. This tool
// isolates the effect layer instead: it counts only BRIGHT, saturated pixels
// per reserved band (value > --v, default 0.75), which grass under this
// lighting never reaches, and prints a per-band count for each image so a
// cast frame can be differenced against a control frame of the same scene.
//
// Bands (BUILD_BRIEF §19.1 hues, same edges analyze.mjs uses):
//   heal    h 110-150  Bright Heal #5FE873  (h 129)
//   danger  h   5-25   Ember Danger #FF5A36 (h  11)
//   amber   h  30-50   Hearth Amber #E8A23D (h  37)
//   violet  h 245-285  God-stuff Violet
//   white   s < 0.18   parchment / white-hot cores
//
// Usage: node tools/sk-px.mjs [--box x,y,w,h] [--v 0.75] [--s 0.35] <png...>
import { readFileSync } from 'fs';
import sharp from 'sharp';

const args = process.argv.slice(2);
let box = null;
let vMin = 0.75;
let sMin = 0.35;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--box') box = args[++i].split(',').map(Number);
  else if (args[i] === '--v') vMin = parseFloat(args[++i]);
  else if (args[i] === '--s') sMin = parseFloat(args[++i]);
  else files.push(args[i]);
}
if (!files.length) {
  console.error('usage: sk-px.mjs [--box x,y,w,h] [--v 0.75] [--s 0.35] <png...>');
  process.exit(2);
}

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
  const n = { heal: 0, danger: 0, amber: 0, violet: 0, white: 0 };
  let healSum = [0, 0, 0];
  for (let i = 0; i < W * H; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const [h, s, v] = hsv(r, g, b);
    if (v <= vMin) continue;
    if (s < 0.18) { n.white++; continue; }
    if (s < sMin) continue;
    if (h >= 110 && h < 150) { n.heal++; healSum = [healSum[0] + r, healSum[1] + g, healSum[2] + b]; }
    else if (h >= 5 && h < 25) n.danger++;
    else if (h >= 30 && h < 50) n.amber++;
    else if (h >= 245 && h < 285) n.violet++;
  }
  const mean = n.heal
    ? '#' + healSum.map((c) => Math.round(c / n.heal).toString(16).padStart(2, '0')).join('')
    : '-';
  console.log(
    `${file}${box ? ` box ${box.join(',')}` : ''} (${W}x${H}, v>${vMin})  ` +
      `heal ${n.heal} (mean ${mean})  danger ${n.danger}  amber ${n.amber}  violet ${n.violet}  white ${n.white}`
  );
}
