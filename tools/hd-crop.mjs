#!/usr/bin/env node
// HUD block helper: crop a region out of a capture and optionally upscale it,
// so the builder can actually LOOK at 60-px HUD chrome. Usage:
//   node tools/hd-crop.mjs <in.png> <x,y,w,h> <out.png> [scale]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [inFile, boxStr, outFile, scaleStr] = process.argv.slice(2);
const [x, y, w, h] = boxStr.split(',').map(Number);
const scale = Number(scaleStr ?? 3);
const img = sharp(readFileSync(inFile)).extract({ left: x, top: y, width: w, height: h });
await img.resize({ width: Math.round(w * scale), kernel: 'nearest' }).png().toFile(outFile);
console.log(`${outFile} ${Math.round(w * scale)}x${Math.round(h * scale)}`);
