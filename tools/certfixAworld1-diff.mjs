// certfixAworld1 — per-box change between two frames (REFERENCE_BAR check 10:
// "is the world behind the page actually moving?"). Read-only.
import sharp from 'sharp';
const [a, b, ...boxes] = process.argv.slice(2);
const load = async (f) => { const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true }); return { data, ...info }; };
const A = await load(a), B = await load(b);
const box = (x, y, w, h, label) => {
  let n = 0, ch = 0, sum = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * A.width + xx) * A.channels;
    const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
    n++; sum += d; if (d > 8) ch++;
  }
  console.log(`${label.padEnd(16)} ${x},${y},${w},${h}  changed ${(ch / n * 100).toFixed(2)}%  mean|d| ${(sum / n / 3).toFixed(2)}`);
};
box(0, 0, A.width, A.height, 'WHOLE');
for (const s of boxes) { const [x, y, w, h, l] = s.split(','); box(+x, +y, +w, +h, l || s); }
