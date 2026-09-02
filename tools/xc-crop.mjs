import sharp from 'sharp';
const [,, file, x, y, w, h, scale, out] = process.argv;
await sharp(file).extract({ left:+x, top:+y, width:+w, height:+h })
  .resize(+w * +scale, +h * +scale, { kernel: 'nearest' })
  .toFile(out);
console.log('->', out);
