// READ-ONLY critic helper. usage:
//   node tools/certA2-bible-px.mjs mean <png> x,y,w,h [x,y,w,h ...]
//   node tools/certA2-bible-px.mjs prof <png> row|col <index> <from> <to> <step>
import sharp from 'sharp';
const mode = process.argv[2];
const src = process.argv[3];
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
if (mode === 'mean') {
  for (const box of process.argv.slice(4)) {
    const [x, y, w, h] = box.split(',').map(Number);
    let s = 0, n = 0, mx = 0, mn = 255, rs = 0, gs = 0, bs = 0;
    for (let j = y; j < Math.min(y + h, H); j++) for (let i = x; i < Math.min(x + w, W); i++) {
      const p = px(i, j), L = luma(p); s += L; n++; rs += p[0]; gs += p[1]; bs += p[2];
      if (L > mx) mx = L; if (L < mn) mn = L;
    }
    console.log(`${box}  meanLuma ${(s / n).toFixed(1)}  min ${mn.toFixed(0)}  max ${mx.toFixed(0)}  rgb(${(rs/n).toFixed(0)},${(gs/n).toFixed(0)},${(bs/n).toFixed(0)})  n=${n}`);
  }
} else if (mode === 'prof') {
  const [axis, idxS, fromS, toS, stepS] = process.argv.slice(4);
  const idx = +idxS, from = +fromS, to = +toS, step = +(stepS || 10);
  const out = [];
  for (let v = from; v <= to; v += step) {
    const p = axis === 'row' ? px(v, idx) : px(idx, v);
    out.push(`${v}:${luma(p).toFixed(0)}`);
  }
  console.log(out.join(' '));
}
