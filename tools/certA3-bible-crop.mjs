#!/usr/bin/env node
// Critic-side helper (art-bible round 3). Crops a region out of a capture and
// upscales it so the critic can LOOK at pixels the full frame hides.
// Usage: node tools/certA3-bible-crop.mjs <in.png> x,y,w,h <scale> <out.png>
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [inFile, boxStr, scaleStr, outFile] = process.argv.slice(2);
if (!inFile || !boxStr || !outFile) {
  console.error('usage: certA3-bible-crop.mjs <in.png> x,y,w,h <scale> <out.png>');
  process.exit(2);
}
const [x, y, w, h] = boxStr.split(',').map(Number);
const scale = Number(scaleStr) || 2;
const img = sharp(readFileSync(inFile)).ensureAlpha().removeAlpha()
  .extract({ left: x, top: y, width: w, height: h })
  .resize({ width: Math.round(w * scale), height: Math.round(h * scale), kernel: 'nearest' });
await img.png().toFile(outFile);
console.log(`wrote ${outFile} <- ${inFile} box ${x},${y},${w},${h} x${scale}`);
