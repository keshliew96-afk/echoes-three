// Critic tool: find warm light pools (bright, warm, brighter than their local
// background) and report centroid + area, so each can be attributed to an emitter.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const file = process.argv[2];
const emArg = process.argv[3]; // "x,y;x,y;..." emitter screen coords
const LT = Number(process.argv[4] ?? 150);
const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const L = new Float32Array(W * H), RB = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
  L[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  RB[i] = r - b;
}
// integral image for box mean
const S = new Float64Array((W + 1) * (H + 1));
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
  S[(y + 1) * (W + 1) + x + 1] = L[y * W + x] + S[y * (W + 1) + x + 1] + S[(y + 1) * (W + 1) + x] - S[y * (W + 1) + x];
const R = 60;
const bgAt = (x, y) => {
  const x0 = Math.max(0, x - R), x1 = Math.min(W, x + R + 1), y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1);
  const a = S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0];
  return a / ((x1 - x0) * (y1 - y0));
};
const mask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  {const r=data[i*C],g=data[i*C+1];if (L[i] > LT && RB[i] > 35 && r >= g - 4 && L[i] - bgAt(x, y) > 14) mask[i] = 1;}
}
// connected components (4-way, iterative)
const lab = new Int32Array(W * H).fill(-1);
const comps = [];
const stack = [];
for (let i = 0; i < W * H; i++) {
  if (!mask[i] || lab[i] >= 0) continue;
  const id = comps.length; let n = 0, sx = 0, sy = 0, minx = W, maxx = 0, miny = H, maxy = 0, sr = 0, sg = 0, sb = 0;
  stack.push(i); lab[i] = id;
  while (stack.length) {
    const p = stack.pop(); const x = p % W, y = (p / W) | 0;
    n++; sx += x; sy += y; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
    sr += data[p * C]; sg += data[p * C + 1]; sb += data[p * C + 2];
    if (x > 0 && mask[p - 1] && lab[p - 1] < 0) { lab[p - 1] = id; stack.push(p - 1); }
    if (x < W - 1 && mask[p + 1] && lab[p + 1] < 0) { lab[p + 1] = id; stack.push(p + 1); }
    if (y > 0 && mask[p - W] && lab[p - W] < 0) { lab[p - W] = id; stack.push(p - W); }
    if (y < H - 1 && mask[p + W] && lab[p + W] < 0) { lab[p + W] = id; stack.push(p + W); }
  }
  comps.push({ n, cx: Math.round(sx / n), cy: Math.round(sy / n), minx, maxx, miny, maxy, rgb: [sr / n | 0, sg / n | 0, sb / n | 0] });
}
const ems = emArg ? emArg.split(';').filter(Boolean).map((s) => s.split(',').map(Number)) : [];
comps.sort((a, b) => b.n - a.n);
console.log(`${file}  ${W}x${H}  blobs>=400px:`);
for (const c of comps) {
  if (c.n < 400) continue;
  let best = null, bd = 1e9;
  for (const e of ems) { const d = Math.hypot(e[0] - c.cx, e[1] - c.cy); if (d < bd) { bd = d; best = e; } }
  console.log(`  area=${String(c.n).padStart(6)} centroid=(${c.cx},${c.cy}) bbox=${c.minx},${c.miny},${c.maxx - c.minx},${c.maxy - c.miny} rgb=${c.rgb.join(',')} nearestEmitter=${best ? best.join(',') : 'n/a'} d=${Math.round(bd)}px`);
}
