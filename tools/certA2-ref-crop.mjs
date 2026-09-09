// certA2-ref critic tool: crop + upscale a region of a PNG for close inspection.
// usage: node tools/certA2-ref-crop.mjs <src.png> x,y,w,h <outName> [scale]
import sharp from 'sharp';
const [src, box, outName, scaleArg] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const scale = Number(scaleArg || 3);
const out = `captures/certA2-ref-${outName}.png`;
await sharp(src)
  .extract({ left: x, top: y, width: w, height: h })
  .resize({ width: Math.round(w * scale), height: Math.round(h * scale), kernel: 'nearest' })
  .toFile(out);
console.log('wrote', out, `${w}x${h}@${scale}x`);
