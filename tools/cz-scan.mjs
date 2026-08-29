// Critic tool: dump a pixel scanline (rgb + hsv) — 'h' horizontal, 'v' vertical.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, dir, xs, ys, ns] = process.argv.slice(2);
const x0 = +xs, y0 = +ys, n = +(ns ?? 40);
const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, C = info.channels;
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; };
for (let k = 0; k < n; k++) {
  const x = dir === 'h' ? x0 + k : x0, y = dir === 'v' ? y0 + k : y0;
  const i = (y * W + x) * C;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const [h, s, v] = hsv(r, g, b);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  console.log(`(${x},${y}) rgb=${String(r).padStart(3)},${String(g).padStart(3)},${String(b).padStart(3)}  h=${h.toFixed(1).padStart(6)} s=${s.toFixed(2)} L=${L.toFixed(0)}`);
}
