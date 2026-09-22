#!/usr/bin/env node
// Critic-side helper (art-bible round 5). Locates reserved-hue pixels (same bands as
// tools/analyze.mjs HUES) on a coarse grid so a critic can prove WHERE danger/heal/violet
// pixels live. Usage: node tools/certA5-bible-hue.mjs <png> [cell=50] [band=danger|heal|violet|amber|all]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, cellStr, bandArg] = process.argv.slice(2);
const cell = Number(cellStr) || 50; const want = bandArg || 'all';
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx]; }
const GX = Math.ceil(W / cell), GY = Math.ceil(H / cell);
const bands = ['danger', 'heal', 'violet', 'amber'];
const grid = {}; for (const b of bands) grid[b] = new Int32Array(GX * GY);
const tot = { danger: 0, heal: 0, violet: 0, amber: 0 };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * C; const r = data[i], g = data[i + 1], b = data[i + 2];
  const L = luma(r, g, b); const [h, s] = hsv(r, g, b);
  if (s > 0.35 && L > 40) {
    let k = null;
    if (h >= 5 && h < 25) k = 'danger'; else if (h >= 110 && h < 150) k = 'heal'; else if (h >= 245 && h < 285) k = 'violet'; else if (h >= 30 && h < 50) k = 'amber';
    if (k) { grid[k][Math.floor(y / cell) * GX + Math.floor(x / cell)]++; tot[k]++; }
  }
}
console.log(`${file} ${W}x${H} cell ${cell}: totals danger ${tot.danger} heal ${tot.heal} violet ${tot.violet} amber ${tot.amber}`);
for (const b of bands) {
  if (want !== 'all' && want !== b) continue;
  const cells = [];
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) { const n = grid[b][gy * GX + gx]; if (n > 0) cells.push({ x: gx * cell, y: gy * cell, n }); }
  cells.sort((a, c) => c.n - a.n);
  console.log(`  ${b}: ${cells.length} cells with px; top: ` + cells.slice(0, 14).map(c => `(${c.x},${c.y})=${c.n}`).join(' '));
}
