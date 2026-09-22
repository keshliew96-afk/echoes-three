#!/usr/bin/env node
// Critic-side helper (art-bible round 5). Crop a region and nearest-neighbour upscale.
// Usage: node tools/certA5-bible-crop.mjs <in.png> x,y,w,h <scale> <out.png>
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [inFile, boxStr, scaleStr, outFile] = process.argv.slice(2);
if (!inFile || !boxStr || !outFile) { console.error('usage: certA5-bible-crop.mjs <in.png> x,y,w,h <scale> <out.png>'); process.exit(2); }
const [x, y, w, h] = boxStr.split(',').map(Number);
const scale = Number(scaleStr) || 2;
await sharp(readFileSync(inFile)).ensureAlpha().removeAlpha()
  .extract({ left: x, top: y, width: w, height: h })
  .resize({ width: Math.round(w * scale), height: Math.round(h * scale), kernel: 'nearest' })
  .png().toFile(outFile);
console.log(`wrote ${outFile} <- ${inFile} box ${x},${y},${w},${h} x${scale}`);
