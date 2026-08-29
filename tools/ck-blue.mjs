#!/usr/bin/env node
// Critic scanner: count pixels near a target hex, report count + bbox + centroid.
// usage: node tools/ck-blue.mjs <png> [hex=4FA3D9] [tol=48] [--box x,y,w,h]
import sharp from 'sharp';
const [file, hex = '4FA3D9', tolS = '48', ...rest] = process.argv.slice(2);
const tol = parseFloat(tolS);
let box = null;
const bi = rest.indexOf('--box');
if (bi >= 0) box = rest[bi + 1].split(',').map(Number);
const tr = parseInt(hex.slice(0, 2), 16), tg = parseInt(hex.slice(2, 4), 16), tb = parseInt(hex.slice(4, 6), 16);
let img = sharp(file);
if (box) img = img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
let n = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1, sx = 0, sy = 0;
// hue-based match too: report both strict-rgb and "blue-ish" (b>r+30 && b>g+10 && b>90)
let blueish = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.hypot(r - tr, g - tg, b - tb);
    if (b > r + 30 && b > g + 10 && b > 90) blueish++;
    if (d <= tol) {
      n++; sx += x; sy += y;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
}
const off = box ? { x: box[0], y: box[1] } : { x: 0, y: 0 };
console.log(JSON.stringify({
  file, hex, tol, dims: [info.width, info.height],
  match: n, pct: +(100 * n / (info.width * info.height)).toFixed(4),
  blueish, blueishPct: +(100 * blueish / (info.width * info.height)).toFixed(4),
  bbox: n ? [minx + off.x, miny + off.y, maxx - minx + 1, maxy - miny + 1] : null,
  centroid: n ? [Math.round(sx / n) + off.x, Math.round(sy / n) + off.y] : null,
}));
