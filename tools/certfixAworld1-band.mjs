// certfixAworld1 — WHERE are the reserved-band pixels? Prints a coarse grid of
// counts for one band so a stray hue can be located on the frame. Read-only.
import sharp from 'sharp';
const [file, band = 'danger', gx = '10', gy = '6'] = process.argv.slice(2);
const RANGES = { danger: [5, 25], heal: [110, 150], violet: [245, 285], amber: [30, 50] };
const [lo, hi] = RANGES[band];
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const cw = Math.floor(W / +gx), chh = Math.floor(H / +gy);
const grid = Array.from({ length: +gy }, () => new Array(+gx).fill(0));
let tot = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) continue;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  const s = d / mx, L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (s > 0.35 && L > 40 && h >= lo && h < hi) { grid[Math.min(+gy - 1, (y / chh) | 0)][Math.min(+gx - 1, (x / cw) | 0)]++; tot++; }
}
console.log(`${file}  band ${band} h${lo}-${hi}  total ${tot}  cell ${cw}x${chh}`);
grid.forEach((row, i) => console.log(`y${String(i * chh).padStart(4)} ` + row.map((v) => String(v).padStart(6)).join('')));
