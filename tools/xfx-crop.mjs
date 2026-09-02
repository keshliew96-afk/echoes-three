// usage: node tools/xfx-crop.mjs <in.png> <x,y,w,h> <scale> <out.png>
import sharp from 'sharp';
const [inp, box, scale, out] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const s = Number(scale);
await sharp(inp).extract({ left: x, top: y, width: w, height: h }).resize(w * s, h * s, { kernel: 'nearest' }).toFile(out);
console.log('wrote', out);
