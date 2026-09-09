#!/usr/bin/env node
// certA1-bible critic helper: crop a box from a capture and upscale it (nearest)
// so small features (halos, contact shadows, outlines) can be inspected with the
// Read tool. Also prints per-column / per-row mean luma profiles for the box when
// --profile is passed, and a luma+hue summary of the box.
// Usage: node tools/certA1-bible-crop.mjs <png> x,y,w,h <out.png> [--scale N] [--profile]
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [,, file, boxStr, out, ...rest] = process.argv;
if (!file || !boxStr || !out) { console.error('usage: crop.mjs <png> x,y,w,h <out.png> [--scale N] [--profile]'); process.exit(2); }
const [x, y, w, h] = boxStr.split(',').map(Number);
let scale = 4; let profile = false;
for (let i = 0; i < rest.length; i++) { if (rest[i] === '--scale') scale = Number(rest[++i]); else if (rest[i] === '--profile') profile = true; }

const img = sharp(readFileSync(file)).ensureAlpha().removeAlpha().extract({ left: x, top: y, width: w, height: h });
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
let mn = 255, mx = 0, sum = 0;
const cols = new Array(W).fill(0), rows = new Array(H).fill(0);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const o = (j * W + i) * C; const L = luma(data[o], data[o + 1], data[o + 2]);
  sum += L; if (L < mn) mn = L; if (L > mx) mx = L; cols[i] += L; rows[j] += L;
}
console.log(`box ${x},${y},${w},${h}  luma mean ${(sum / (W * H)).toFixed(1)}  min ${mn.toFixed(0)}  max ${mx.toFixed(0)}`);
if (profile) {
  const step = Math.max(1, Math.floor(W / 24));
  console.log('cols(mean luma every ' + step + 'px): ' + cols.filter((_, i) => i % step === 0).map(v => (v / H).toFixed(0)).join(' '));
  const rstep = Math.max(1, Math.floor(H / 24));
  console.log('rows(mean luma every ' + rstep + 'px): ' + rows.filter((_, i) => i % rstep === 0).map(v => (v / W).toFixed(0)).join(' '));
}
await sharp(data, { raw: { width: W, height: H, channels: C } }).resize(W * scale, H * scale, { kernel: 'nearest' }).png().toFile(out);
console.log('wrote ' + out + ' (' + W * scale + 'x' + H * scale + ')');
