#!/usr/bin/env node
// Frame-to-frame delta: % of pixels changed above a threshold, whole frame and
// per named box — the measurement the round-2 lenses used for check 10 and for
// "the world keeps breathing" behind the shop shelf.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2);
let thr = 8; const boxes = []; const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--thr') thr = Number(args[++i]);
  else if (args[i] === '--box') boxes.push(args[++i].split(',').map(Number));
  else files.push(args[i]);
}
if (!boxes.length) boxes.push(null);
const raw = async (f) => sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 1; i < files.length; i++) {
  const a = await raw(files[i - 1]); const b = await raw(files[i]);
  const { width: W, height: H, channels: C } = a.info;
  const out = [];
  for (const box of boxes) {
    const [x0, y0, w, h] = box ?? [0, 0, W, H];
    let n = 0, tot = 0, sum = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const k = (y * W + x) * C;
      const d = Math.max(Math.abs(a.data[k] - b.data[k]), Math.abs(a.data[k + 1] - b.data[k + 1]), Math.abs(a.data[k + 2] - b.data[k + 2]));
      sum += d; tot++; if (d > thr) n++;
    }
    out.push(`${box ? box.join(',') : 'frame'} ${(n / tot * 100).toFixed(2)}% (meanAbs ${(sum / tot).toFixed(2)})`);
  }
  console.log(`${files[i - 1].split(/[\/]/).pop()} -> ${files[i].split(/[\/]/).pop()}  ` + out.join('   '));
}
