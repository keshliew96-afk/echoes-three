#!/usr/bin/env node
// certA1-bible: frame-to-frame pixel change between sequence PNGs (motion proxy).
// Prints % of pixels whose max channel delta > 24, plus the bbox of changed pixels,
// and optionally the same for a --box region.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2); let box = null; const files = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--box') box = args[++i].split(',').map(Number); else files.push(args[i]); }
async function load(f) { let im = sharp(readFileSync(f)).ensureAlpha().removeAlpha(); if (box) im = im.extract({ left: box[0], top: box[1], width: box[2], height: box[3] }); return im.raw().toBuffer({ resolveWithObject: true }); }
let prev = await load(files[0]);
for (let k = 1; k < files.length; k++) {
  const cur = await load(files[k]); const { width: W, height: H, channels: C } = cur.info;
  let changed = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * C; let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(cur.data[o + c] - prev.data[o + c])); if (d > 24) { changed++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  console.log(`${files[k - 1].split('/').pop()} -> ${files[k].split('/').pop()}: changed ${(100 * changed / (W * H)).toFixed(2)}%  bbox ${x0},${y0}-${x1},${y1}`);
  prev = cur;
}
