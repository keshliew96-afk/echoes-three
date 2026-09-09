// certA1 crop helper: node tools/certA1-crop.mjs <in.png> <out.png> x,y,w,h [scale]
import sharp from 'sharp';
const [inp, out, box, scale] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const s = scale ? parseFloat(scale) : 1;
let img = sharp(inp).extract({ left: x, top: y, width: w, height: h });
if (s !== 1) img = img.resize(Math.round(w * s), Math.round(h * s), { kernel: 'nearest' });
await img.png().toFile(out);
console.log('wrote', out, box, 'x', s);
