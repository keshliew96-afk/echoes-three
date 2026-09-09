// certA2 — frame-to-frame motion proof: % of pixels whose luma changed by >8
// between consecutive frames of a sequence. Read-only, judges pixels only.
import sharp from 'sharp';

const files = process.argv.slice(2);
const imgs = [];
for (const f of files) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  imgs.push({ f, p: { data, width: info.width, height: info.height, ch: info.channels } });
}
const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
for (let k = 1; k < imgs.length; k++) {
  const a = imgs[k - 1].p, b = imgs[k].p;
  const C = a.ch;
  let ch = 0, big = 0, n = a.width * a.height;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(lum(a.data, i * C) - lum(b.data, i * C));
    if (d > 8) ch++;
    if (d > 40) big++;
  }
  console.log(`${imgs[k - 1].f.split(/[\\/]/).pop()} -> ${imgs[k].f.split(/[\\/]/).pop()}  changed>8 ${(100 * ch / n).toFixed(3)}%  changed>40 ${(100 * big / n).toFixed(3)}%`);
}
