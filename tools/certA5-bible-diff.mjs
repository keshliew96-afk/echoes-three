#!/usr/bin/env node
// Critic-side helper (art-bible round 5). Frame-to-frame luma delta for the motion check.
// Usage: node tools/certA5-bible-diff.mjs <a.png> <b.png> [threshold] [--box x,y,w,h]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2);
let box = null; const files = []; let thr = 8;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--box') box = args[++i].split(',').map(Number);
  else if (/^\d+$/.test(args[i])) thr = Number(args[i]);
  else files.push(args[i]);
}
const [fa, fb] = files;
const load = async (f) => {
  let img = sharp(readFileSync(f)).ensureAlpha().removeAlpha();
  if (box) img = img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
  return img.raw().toBuffer({ resolveWithObject: true });
};
const A = await load(fa), B = await load(fb);
const { width: W, height: H, channels: C } = A.info;
const L = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
let changed = 0, big = 0, sum = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * C; const d = Math.abs(L(A.data, i) - L(B.data, i)); sum += d;
  if (d > thr) { changed++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (d > 40) big++;
}
const N = W * H; const ox = box ? box[0] : 0, oy = box ? box[1] : 0;
console.log(`${fa} vs ${fb}${box ? ` box ${box.join(',')}` : ''}`);
console.log(`  changed(dL>${thr}) ${(changed / N * 100).toFixed(3)}%   strong(dL>40) ${(big / N * 100).toFixed(3)}%   meanAbsdL ${(sum / N).toFixed(2)}`);
if (maxX >= 0) console.log(`  change bbox ${minX + ox},${minY + oy} -> ${maxX + ox},${maxY + oy}`);
