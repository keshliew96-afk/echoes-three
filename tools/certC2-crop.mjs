// crop + nearest-zoom a region of a capture: node tools/certC2-crop.mjs in.png out.png x y w h [zoom]
import sharp from 'sharp';
const [i, o, x, y, w, h, z] = process.argv.slice(2);
const Z = parseInt(z || '3', 10);
await sharp(i).extract({ left: +x, top: +y, width: +w, height: +h })
  .resize(+w * Z, +h * Z, { kernel: 'nearest' }).png().toFile(o);
console.log('wrote', o, `${w}x${h} @${Z}x from (${x},${y})`);
