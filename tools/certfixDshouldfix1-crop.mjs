// Crop/zoom helper for the A-vfx fix builder.
// usage: node tools/certfixAvfx1-crop.mjs <in.png> <x,y,w,h> <scale> <out.png>
import sharp from 'sharp';
const [, , src, box, scaleArg, out] = process.argv;
const [x, y, w, h] = box.split(',').map(Number);
const scale = parseFloat(scaleArg || '1');
const img = sharp(src).extract({ left: x, top: y, width: w, height: h });
if (scale !== 1) img.resize(Math.round(w * scale), Math.round(h * scale), { kernel: 'nearest' });
await img.png().toFile(out);
console.log('wrote', out, `${Math.round(w * scale)}x${Math.round(h * scale)}`);
