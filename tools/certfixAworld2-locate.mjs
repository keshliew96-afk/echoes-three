#!/usr/bin/env node
// Locate reserved-band pixels (danger/heal/violet) in a frame: prints per-cell
// counts on a 32 px grid plus the overall bounding box, so a band leak can be
// attributed to a prop instead of guessed at.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2);
let band = 'danger';
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--band') band = args[++i];
  else files.push(args[i]);
}
const RANGES = { danger: [5, 25], heal: [110, 150], violet: [245, 285], amber: [30, 50] };
const [h0, h1] = RANGES[band];
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}
for (const f of files) {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const cells = new Map();
  let total = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C; const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s] = hsv(r, g, b);
    if (s > 0.35 && luma(r, g, b) > 40 && h >= h0 && h < h1) {
      total++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const k = `${(x >> 5) << 5},${(y >> 5) << 5}`;
      cells.set(k, (cells.get(k) || 0) + 1);
    }
  }
  const top = [...cells.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  console.log(`\n=== ${f} band ${band} (${h0}-${h1})  total ${total}  bbox ${x0},${y0}-${x1},${y1}`);
  console.log('top cells: ' + top.map(([k, v]) => `(${k})=${v}`).join('  '));
}
