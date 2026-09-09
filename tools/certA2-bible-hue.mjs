// READ-ONLY: locate reserved-band pixels. usage: node tools/certA2-bible-hue.mjs <png> danger|heal|violet|amber
import sharp from 'sharp';
const BANDS = { danger: [5, 25], heal: [110, 150], violet: [245, 285], amber: [30, 50] };
const [src, band] = process.argv.slice(2);
const [lo, hi] = BANDS[band];
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; };
const GX = 16, GY = 9, gw = W / GX, gh = H / GY;
const grid = Array.from({ length: GY }, () => new Array(GX).fill(0));
let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * C, [h, s, L] = hsv(data[i], data[i + 1], data[i + 2]);
  if (s > 0.35 && L > 40 && h >= lo && h < hi) { n++; grid[Math.floor(y / gh)][Math.floor(x / gw)]++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
console.log(`${src} band ${band}(${lo}-${hi}) total ${n} bbox ${n ? `${x0},${y0}-${x1},${y1}` : 'none'}`);
console.log('grid (16x9 cells, counts):');
for (let r = 0; r < GY; r++) console.log(' y' + Math.round(r * gh).toString().padStart(3) + ' ' + grid[r].map(v => String(v).padStart(6)).join(''));
