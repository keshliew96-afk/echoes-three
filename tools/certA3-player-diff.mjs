// certA3-player critic tool: pixel diff between two PNGs (same size).
// usage: node tools/certA3-player-diff.mjs <a.png> <b.png> [threshold] [--box x,y,w,h]
// prints changed-pixel count/%, max per-channel delta, and a 8x6 grid map of where the change is.
import sharp from 'sharp';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const boxArg = args.find((a) => a.startsWith('--box'));
const [a, b] = files;
const thr = Number(files[2] || 18);
let box = null;
if (boxArg) {
  const v = boxArg.split('=')[1] || args[args.indexOf(boxArg) + 1];
  const [x, y, w, h] = String(v).split(',').map(Number);
  box = { left: x, top: y, width: w, height: h };
}
async function raw(f) {
  let img = sharp(f);
  if (box) img = img.extract(box);
  return img.raw().toBuffer({ resolveWithObject: true });
}
const A = await raw(a);
const B = await raw(b);
const { width: W, height: H, channels: C } = A.info;
let changed = 0;
let maxD = 0;
let sumD = 0;
const GX = 8;
const GY = 6;
const grid = new Array(GX * GY).fill(0);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const d = Math.max(
      Math.abs(A.data[i] - B.data[i]),
      Math.abs(A.data[i + 1] - B.data[i + 1]),
      Math.abs(A.data[i + 2] - B.data[i + 2])
    );
    if (d > maxD) maxD = d;
    sumD += d;
    if (d >= thr) {
      changed++;
      grid[Math.min(GY - 1, (y * GY / H) | 0) * GX + Math.min(GX - 1, (x * GX / W) | 0)]++;
    }
  }
}
const total = W * H;
console.log(`DIFF ${a} vs ${b}${box ? ` box ${box.left},${box.top},${box.width},${box.height}` : ''}`);
console.log(`  size ${W}x${H}  thr ${thr}  changed ${changed} px (${(100 * changed / total).toFixed(3)}%)  maxDelta ${maxD}  meanDelta ${(sumD / total).toFixed(2)}`);
for (let gy = 0; gy < GY; gy++) {
  const row = [];
  for (let gx = 0; gx < GX; gx++) {
    const n = grid[gy * GX + gx];
    const cell = total / (GX * GY);
    const pct = 100 * n / cell;
    row.push(pct.toFixed(1).padStart(6));
  }
  console.log(`  ${row.join(' ')}`);
}
