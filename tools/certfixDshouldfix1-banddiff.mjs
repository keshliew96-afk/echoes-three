// Does the legendary shine band reach CAPTURED pixels? Diffs the same shop
// frame with the band visible and with it hidden, over the card's box, and
// reports the per-column mean |delta| so the sweep's position is visible.
import sharp from 'sharp';
const [, , a, b, box] = process.argv;
const [x, y, w, h] = box.split(',').map(Number);
const load = (p) =>
  sharp(p).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
const A = await load(a);
const B = await load(b);
const cols = new Array(w).fill(0);
let maxD = 0;
let sum = 0;
for (let j = 0; j < h; j++)
  for (let i = 0; i < w; i++) {
    const o = (j * w + i) * A.info.channels;
    const d = (Math.abs(A.data[o] - B.data[o]) + Math.abs(A.data[o + 1] - B.data[o + 1]) + Math.abs(A.data[o + 2] - B.data[o + 2])) / 3;
    cols[i] += d / h;
    sum += d;
    if (d > maxD) maxD = d;
  }
console.log('mean |delta|', (sum / (w * h)).toFixed(3), ' max |delta|', maxD.toFixed(1));
const step = Math.max(1, Math.round(w / 40));
let line = '';
for (let i = 0; i < w; i += step) line += cols[i] > 6 ? '#' : cols[i] > 3 ? '+' : cols[i] > 1 ? '.' : ' ';
console.log('columns 0..' + w + ': [' + line + ']');
console.log('peak column', cols.indexOf(Math.max(...cols)), 'value', Math.max(...cols).toFixed(2));
