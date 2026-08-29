// dangergrid.mjs <png> [band=5,25] — 16x9 grid of danger-band pixel counts
// (same gates as tools/analyze.mjs: s>0.35, v>0.25) + top offending cells.
import sharp from 'sharp';
const f = process.argv[2];
const [lo, hi] = (process.argv[3] ?? '5,25').split(',').map(Number);
const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
const C = info.channels, W = info.width, H = info.height;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}
const GX = 16, GY = 9;
const grid = Array.from({ length: GY }, () => new Array(GX).fill(0));
let total = 0;
const samples = new Map();
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, v] = hsv(r, g, b);
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; if (s > 0.35 && L > 40 && h >= lo && h < hi) {
      total++;
      const gx = Math.floor((x / W) * GX), gy = Math.floor((y / H) * GY);
      grid[gy][gx]++;
      const key = `${gx},${gy}`;
      if (!samples.has(key)) samples.set(key, []);
      const arr = samples.get(key);
      if (arr.length < 3) arr.push([x, y, '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join(''), h.toFixed(1), s.toFixed(2), v.toFixed(2)]);
    }
  }
}
console.log(`total danger(${lo}-${hi}) px: ${total}`);
for (let y = 0; y < GY; y++) console.log(grid[y].map(n => String(n).padStart(5)).join(''));
const cells = [];
for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) if (grid[y][x] > 0) cells.push([grid[y][x], x, y]);
cells.sort((a, b) => b[0] - a[0]);
for (const [n, x, y] of cells.slice(0, 6)) {
  const px = Math.round(((x + 0.5) / GX) * W), py = Math.round(((y + 0.5) / GY) * H);
  console.log(`cell(${x},${y}) ~screen(${px},${py}) n=${n} samples=${JSON.stringify(samples.get(`${x},${y}`))}`);
}
