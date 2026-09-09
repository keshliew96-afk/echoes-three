import sharp from 'sharp';
const [src, box, out, scale] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
await sharp(src).extract({ left: x, top: y, width: w, height: h })
  .resize({ width: w * Number(scale || 8), kernel: 'nearest' }).png().toFile(out);
console.log('wrote', out);
