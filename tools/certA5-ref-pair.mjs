#!/usr/bin/env node
// Critic-only: side-by-side crop of the same box from two PNGs at scale s.
// usage: node tools/certA5-ref-pair.mjs a.png b.png x,y,w,h out.png [scale]
import sharp from 'sharp';
const [a, b, boxStr, out, s = '2'] = process.argv.slice(2);
const [x, y, w, h] = boxStr.split(',').map(Number); const k = Number(s);
const ca = await sharp(a).extract({ left: x, top: y, width: w, height: h }).resize(w * k, h * k, { kernel: 'nearest' }).png().toBuffer();
const cb = await sharp(b).extract({ left: x, top: y, width: w, height: h }).resize(w * k, h * k, { kernel: 'nearest' }).png().toBuffer();
await sharp({ create: { width: w * k * 2 + 8, height: h * k, channels: 3, background: '#f0f' } }).composite([{ input: ca, left: 0, top: 0 }, { input: cb, left: w * k + 8, top: 0 }]).png().toFile(out);
console.log('OK', out);
