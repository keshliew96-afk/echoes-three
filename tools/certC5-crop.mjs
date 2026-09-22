// certC5 crop helper: node tools/certC5-crop.mjs in.png x y w h scale out.png  (nearest-neighbour upscale)
import sharp from 'sharp';
const [inp, x, y, w, h, scale, out] = process.argv.slice(2);
await sharp(inp).extract({ left: +x, top: +y, width: +w, height: +h })
  .resize(Math.round(+w * +scale), Math.round(+h * +scale), { kernel: 'nearest' }).png().toFile(out);
console.log('wrote', out, [x, y, w, h].join(','), 'x' + scale);
