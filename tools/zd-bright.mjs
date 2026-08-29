// Where are the >200-luma pixels? 16x9 grid + totals, for A/B between builds.
import { readFileSync } from 'fs';
import sharp from 'sharp';
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const GX = 16, GY = 9;
  const g = Array.from({ length: GY }, () => new Array(GX).fill(0));
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const L = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (L > 200) { n++; g[Math.floor(y / H * GY)][Math.floor(x / W * GX)]++; }
  }
  console.log(`\n=== ${f}  >200 ${n} (${(n / (W * H) * 100).toFixed(3)}%)`);
  for (let y = 0; y < GY; y++) console.log('  ' + g[y].map((v) => String(v).padStart(5)).join(''));
}
