#!/usr/bin/env node
import sharp from 'sharp';
const [f, x, y, w, h, out, scale] = process.argv.slice(2);
const s = Number(scale || 3);
await sharp(f).extract({ left: +x, top: +y, width: +w, height: +h }).resize({ width: +w * s, kernel: 'nearest' }).toFile(out);
console.log('ok', out);
