// A-vfx r2 pixel probe: hue-band hunt (bbox + 32px cell map), box luma/row
// profiles, and crops. Usage:
//   node tools/certfixAvfx2-px.mjs hunt <png> [band]        band: danger|amber|heal|violet
//   node tools/certfixAvfx2-px.mjs box  <png> x,y,w,h       luma + band counts
//   node tools/certfixAvfx2-px.mjs crop <png> x,y,w,h k out.png
//   node tools/certfixAvfx2-px.mjs rows <png> x,y,w,h       per-row mean luma
//   node tools/certfixAvfx2-px.mjs cols <png> x,y,w,h       per-col mean luma
//   node tools/certfixAvfx2-px.mjs diff <a.png> <b.png> [x,y,w,h] [thr]
import { readFileSync } from 'fs';
import sharp from 'sharp';

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}
const BANDS = { danger: [5, 25], amber: [30, 50], heal: [110, 150], violet: [245, 285] };
function inBand(h, s, L, band) {
  const [a, b] = BANDS[band];
  return s > 0.35 && L > 40 && h >= a && h < b;
}
async function load(f, box) {
  let img = sharp(readFileSync(f)).ensureAlpha().removeAlpha();
  if (box) img = img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, C: info.channels };
}
const nums = (s) => s.split(',').map(Number);
const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'hunt') {
  const band = rest[1] || 'danger';
  const { data, W, H, C } = await load(rest[0]);
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const cells = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const [h, s] = hsv(data[i], data[i + 1], data[i + 2]);
    const L = luma(data[i], data[i + 1], data[i + 2]);
    if (!inBand(h, s, L, band)) continue;
    n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    const k = `${Math.floor(x / 32) * 32},${Math.floor(y / 32) * 32}`;
    cells.set(k, (cells.get(k) || 0) + 1);
  }
  const top = [...cells].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log(`${rest[0]} band=${band} total=${n} bbox=${x0},${y0}-${x1},${y1}`);
  console.log('top cells: ' + top.map(([k, v]) => `(${k})=${v}`).join(' '));
} else if (cmd === 'box') {
  const box = nums(rest[1]);
  const { data, W, H, C } = await load(rest[0], box);
  let sum = 0, a160 = 0, a200 = 0, mn = 255, mx = 0;
  const counts = { danger: 0, amber: 0, heal: 0, violet: 0 };
  const N = W * H;
  for (let i = 0; i < N; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const L = luma(r, g, b); sum += L; if (L > 160) a160++; if (L > 200) a200++;
    if (L < mn) mn = L; if (L > mx) mx = L;
    const [h, s] = hsv(r, g, b);
    for (const k of Object.keys(counts)) if (inBand(h, s, L, k)) counts[k]++;
  }
  console.log(`${rest[0]} box ${box.join(',')} mean=${(sum / N).toFixed(1)} min=${mn.toFixed(0)} max=${mx.toFixed(0)} >160=${(a160 / N * 100).toFixed(3)}% >200=${(a200 / N * 100).toFixed(3)}% danger=${counts.danger} amber=${counts.amber} heal=${counts.heal} violet=${counts.violet}`);
} else if (cmd === 'crop') {
  const box = nums(rest[1]); const k = Number(rest[2] || 4); const out = rest[3];
  await sharp(readFileSync(rest[0])).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .resize(box[2] * k, box[3] * k, { kernel: 'nearest' }).toFile(out);
  console.log('wrote ' + out);
} else if (cmd === 'rows' || cmd === 'cols') {
  const box = nums(rest[1]);
  const { data, W, H, C } = await load(rest[0], box);
  const out = [];
  if (cmd === 'rows') for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * C; s += luma(data[i], data[i + 1], data[i + 2]); } out.push(`${box[1] + y}:${(s / W).toFixed(1)}`); }
  else for (let x = 0; x < W; x++) { let s = 0; for (let y = 0; y < H; y++) { const i = (y * W + x) * C; s += luma(data[i], data[i + 1], data[i + 2]); } out.push(`${box[0] + x}:${(s / H).toFixed(1)}`); }
  console.log(out.join(' '));
} else if (cmd === 'diff') {
  const box = rest[2] ? nums(rest[2]) : null; const thr = Number(rest[3] || 8);
  const A = await load(rest[0], box); const B = await load(rest[1], box);
  let ch = 0, sum = 0; const N = A.W * A.H;
  for (let i = 0; i < N; i++) {
    const la = luma(A.data[i * A.C], A.data[i * A.C + 1], A.data[i * A.C + 2]);
    const lb = luma(B.data[i * B.C], B.data[i * B.C + 1], B.data[i * B.C + 2]);
    const d = Math.abs(la - lb); sum += d; if (d > thr) ch++;
  }
  console.log(`diff ${rest[0]} vs ${rest[1]}${box ? ' box ' + box.join(',') : ''} changed>${thr}=${(ch / N * 100).toFixed(2)}% meanAbs=${(sum / N).toFixed(2)}`);
} else { console.error('unknown cmd'); process.exit(2); }
