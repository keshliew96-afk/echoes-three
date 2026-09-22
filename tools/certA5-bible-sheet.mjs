#!/usr/bin/env node
// Critic-side helper (art-bible round 5). 2x2 contact sheet of up to 4 PNGs at half size.
// Usage: node tools/certA5-bible-sheet.mjs <out.png> <a.png> [b.png c.png d.png]
import sharp from 'sharp';
const [out, ...ins] = process.argv.slice(2);
const W = 800, H = 450;
const comps = [];
for (let k = 0; k < ins.length; k++) {
  const buf = await sharp(ins[k]).resize({ width: W, height: H }).png().toBuffer();
  comps.push({ input: buf, left: (k % 2) * W, top: Math.floor(k / 2) * H });
}
await sharp({ create: { width: 2 * W, height: Math.ceil(ins.length / 2) * H, channels: 3, background: '#ff00ff' } }).composite(comps).png().toFile(out);
console.log('wrote', out, ins.join(' '));
