import sharp from 'sharp';
const [file, ...boxes] = process.argv.slice(2);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
for (const b of boxes) {
  const [x0, y0, w, h] = b.split(',').map(Number);
  let s = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * info.width + x) * info.channels;
    s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; n++;
  }
  console.log(`${file} box ${b}: meanLuma ${(s / n).toFixed(1)}`);
}
