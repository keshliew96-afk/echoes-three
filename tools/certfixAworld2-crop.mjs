#!/usr/bin/env node
// Crop + nearest-neighbour upscale so a small region can be judged by eye.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, boxs, zs, out] = process.argv.slice(2);
const [x, y, w, h] = boxs.split(',').map(Number);
const z = Number(zs || 4);
await sharp(readFileSync(file)).extract({ left: x, top: y, width: w, height: h })
  .resize({ width: w * z, height: h * z, kernel: 'nearest' })
  .toFile(out);
console.log('wrote ' + out);
