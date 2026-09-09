// READ-ONLY: mean |luma| delta + % pixels changed >8 inside a box between two PNGs.
import sharp from 'sharp';
const [a, b, ...boxes] = process.argv.slice(2);
const load = async (p) => { const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, W: info.width, C: info.channels }; };
const A = await load(a), B = await load(b);
const L = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
for (const box of boxes) {
  const [x, y, w, h] = box.split(',').map(Number);
  let s = 0, n = 0, c8 = 0, c40 = 0, mx = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const k = (j * A.W + i) * A.C, d = Math.abs(L(A.data, k) - L(B.data, k));
    s += d; n++; if (d > 8) c8++; if (d > 40) c40++; if (d > mx) mx = d;
  }
  console.log(`${box}  meanDelta ${(s / n).toFixed(2)}  >8 ${(100 * c8 / n).toFixed(2)}%  >40 ${(100 * c40 / n).toFixed(2)}%  max ${mx.toFixed(0)}`);
}
