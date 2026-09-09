// Mean/percentile luma inside boxes — the number the round-1 scorers used for
// contact shadows and bloom blowouts.
// usage: node tools/certfixAvfx1-luma.mjs <png> "x,y,w,h[:label]" ...
import sharp from 'sharp';
const [, , src, ...boxes] = process.argv;
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const L = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
for (const spec of boxes) {
  const [box, label = ''] = spec.split(':');
  const [x, y, w, h] = box.split(',').map(Number);
  let sum = 0, n = 0, over200 = 0, over160 = 0, min = 255, max = 0;
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= info.height) continue;
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= info.width) continue;
      const l = L((yy * info.width + xx) * info.channels);
      sum += l; n++;
      if (l > 200) over200++;
      if (l > 160) over160++;
      if (l < min) min = l;
      if (l > max) max = l;
    }
  }
  console.log(
    `${box}${label ? ' ' + label : ''}  mean ${(sum / n).toFixed(1)}  min ${min.toFixed(0)}  max ${max.toFixed(0)}  >160 ${((100 * over160) / n).toFixed(1)}%  >200 ${((100 * over200) / n).toFixed(1)}%`
  );
}
