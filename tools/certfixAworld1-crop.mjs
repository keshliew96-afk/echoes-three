// certfixAworld1 — crop/zoom helper so the builder can VIEW a region at scale.
import sharp from 'sharp';
const [file, box, out, scaleArg] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const s = Number(scaleArg || 1);
await sharp(file).extract({ left: x, top: y, width: w, height: h })
  .resize({ width: Math.round(w * s), kernel: 'nearest' }).png().toFile(out);
console.log('wrote', out);
