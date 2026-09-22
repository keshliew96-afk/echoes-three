// crop + optional nearest-neighbour zoom, for viewing exact boxes with the Read tool.
// usage: node tools/certC3-crop.mjs <in.png> <x,y,w,h> <out.png> [zoom]
import sharp from 'sharp';
const [, , src, boxs, out, z] = process.argv;
const [x, y, w, h] = boxs.split(',').map(Number);
const zoom = Number(z || 1);
let img = sharp(src).extract({ left: x, top: y, width: w, height: h });
if (zoom !== 1) img = img.resize({ width: Math.round(w * zoom), height: Math.round(h * zoom), kernel: 'nearest' });
await img.png().toFile(out);
console.log('wrote', out, `${w}x${h} @${zoom}x from ${src} box ${boxs}`);
