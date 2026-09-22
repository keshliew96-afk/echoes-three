// Certification block D round 3 — crop + upscale a region of a capture so the critic can read it.
// usage: node tools/certD3-crop.mjs <src.png> <x> <y> <w> <h> <scale> <outName>
import sharp from 'sharp';
const [src, x, y, w, h, scale, out] = process.argv.slice(2);
const S = Number(scale) || 6;
await sharp(`captures/${src}.png`)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize({ width: +w * S, height: +h * S, kernel: 'nearest' })
  .toFile(`captures/${out}.png`);
console.log(`captures/${out}.png  <- ${src} [${x},${y},${w},${h}] x${S}`);
