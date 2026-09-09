#!/usr/bin/env node
// certA1-bible: per-box mean luma + reserved-band counts + 10-degree hue histogram of saturated px.
// Usage: node tools/certA1-bible-hue.mjs <png> [--grid N] box1 box2 ...   (box = x,y,w,h[:label])
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2); const file = args.shift(); let grid = 0; const boxes = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--grid') grid = Number(args[++i]); else boxes.push(args[i]); }
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, C = info.channels;
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx]; }
function stats(x, y, w, h) {
  let sum = 0, n = 0, danger = 0, heal = 0, violet = 0, amber = 0, sat = 0; const hist = new Array(36).fill(0);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const o = (j * W + i) * C; const r = data[o], g = data[o + 1], b = data[o + 2]; const L = luma(r, g, b); sum += L; n++; const [hh, s] = hsv(r, g, b); if (s > 0.35 && L > 40) { sat++; hist[Math.floor(hh / 10)]++; if (hh >= 5 && hh < 25) danger++; else if (hh >= 110 && hh < 150) heal++; else if (hh >= 245 && hh < 285) violet++; else if (hh >= 30 && hh < 50) amber++; } }
  return { mean: sum / n, n, danger, heal, violet, amber, sat, hist };
}
if (grid) { const H = info.height; const out = []; for (let y = 0; y + grid <= H; y += grid) for (let x = 0; x + grid <= W; x += grid) { const s = stats(x, y, grid, grid); if (s.danger > 20) out.push(`(${x},${y}) danger ${s.danger}`); } console.log(`grid ${grid}: boxes with danger>20: ` + (out.join(' | ') || 'none')); }
for (const bx of boxes) { const [b, label] = bx.split(':'); const [x, y, w, h] = b.split(',').map(Number); const s = stats(x, y, w, h); const top = s.hist.map((v, i) => [i * 10, v]).filter(v => v[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(v => `${v[0]}-${v[0] + 10}:${(100 * v[1] / (s.sat || 1)).toFixed(0)}%`).join(' '); console.log(`${label || b}: mean luma ${s.mean.toFixed(1)}  sat px ${s.sat}/${s.n}  danger ${s.danger} heal ${s.heal} violet ${s.violet} amber ${s.amber}  top hue bins ${top}`); }
