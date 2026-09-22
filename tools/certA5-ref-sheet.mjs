#!/usr/bin/env node
// Critic-only contact sheet (REFERENCE MATCHER r5): 2x2 grid of 800x450 thumbnails with frame labels.
// usage: node tools/certA5-ref-sheet.mjs out.png a.png b.png [c.png d.png]
import sharp from 'sharp';
const [out, ...files] = process.argv.slice(2);
const comps = [];
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(files[i]).resize(800, 450).png().toBuffer();
  const label = Buffer.from(`<svg width="300" height="34"><rect width="300" height="34" fill="black" opacity="0.7"/><text x="6" y="24" font-size="20" fill="yellow" font-family="monospace">${files[i].split('/').pop()}</text></svg>`);
  comps.push({ input: buf, left: (i % 2) * 800, top: Math.floor(i / 2) * 450 });
  comps.push({ input: label, left: (i % 2) * 800 + 250, top: Math.floor(i / 2) * 450 + 416 });
}
await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#000' } }).composite(comps).png().toFile(out);
console.log('OK', out);
