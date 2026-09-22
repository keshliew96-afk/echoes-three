// Certification block D round 5 — crop + nearest-neighbour upscale a region of a capture.
// usage: node tools/certD5-crop.mjs <src.png-name> <x> <y> <w> <h> <scale> <outName>
import sharp from 'sharp';
const [src, x, y, w, h, scale, out] = process.argv.slice(2);
const S = Number(scale) || 6;
await sharp(`captures/${src}.png`)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize({ width: +w * S, height: +h * S, kernel: 'nearest' })
  .toFile(`captures/${out}.png`);
console.log(`captures/${out}.png  <- ${src} [${x},${y},${w},${h}] x${S}`);
