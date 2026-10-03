#!/usr/bin/env node
// M4b helper: crop a region of a capture and rescale it (nearest for >1,
// lanczos for <1 — the "identifiable at 50% zoom" read).
//   node tools/gntM4b-crop.mjs <in.png> x,y,w,h <scale> <out.png>
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
const [inFile, boxStr, scaleStr, outFile] = process.argv.slice(2);
if (!inFile || !boxStr || !outFile) {
  console.error('usage: gntM4b-crop.mjs <in.png> x,y,w,h <scale> <out.png>');
  process.exit(2);
}
const [x, y, w, h] = boxStr.split(',').map(Number);
const scale = Number(scaleStr) || 1;
await sharp(readFileSync(inFile))
  .ensureAlpha()
  .removeAlpha()
  .extract({ left: x, top: y, width: w, height: h })
  .resize({ width: Math.round(w * scale), height: Math.round(h * scale), kernel: scale >= 1 ? 'nearest' : 'lanczos3' })
  .png()
  .toFile(outFile);
console.log(`wrote ${outFile} <- ${inFile} box ${x},${y},${w},${h} x${scale}`);
