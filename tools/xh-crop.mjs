#!/usr/bin/env node
// critic crop/zoom: node tools/xh-crop.mjs <in.png> x,y,w,h <scale> [out.png]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [inp, boxs, scaleS, outArg] = process.argv.slice(2);
const [x, y, w, h] = boxs.split(',').map(Number);
const scale = Number(scaleS || 1);
const out = outArg || inp.replace(/\.png$/, `_crop.png`);
const img = sharp(readFileSync(inp)).extract({ left: x, top: y, width: w, height: h });
await img.resize({ width: Math.round(w * scale), height: Math.round(h * scale), kernel: 'nearest' }).toFile(out);
console.log('wrote', out, w * scale + 'x' + h * scale);
