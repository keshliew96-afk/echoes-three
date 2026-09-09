#!/usr/bin/env node
// Top-end probe: how many pixels clear 200/220/240/250, the frame max, and the
// 32px cells that hold them (i.e. which emitter owns the frame's highlights).
import { readFileSync } from 'fs';
import sharp from 'sharp';
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let mx = 0, mxAt = [0, 0];
  const t = { 200: 0, 220: 0, 240: 0, 250: 0 };
  const cells = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const L = luma(data[i], data[i + 1], data[i + 2]);
    if (L > mx) { mx = L; mxAt = [x, y]; }
    for (const k of [200, 220, 240, 250]) if (L > k) t[k]++;
    if (L > 220) { const key = `${(x >> 5) << 5},${(y >> 5) << 5}`; cells.set(key, (cells.get(key) || 0) + 1); }
  }
  const N = W * H;
  console.log(`\n=== ${f}`);
  console.log(`max ${mx.toFixed(1)} at ${mxAt}   >200 ${(t[200] / N * 100).toFixed(3)}%  >220 ${(t[220] / N * 100).toFixed(3)}%  >240 ${(t[240] / N * 100).toFixed(3)}%  >250 ${(t[250] / N * 100).toFixed(3)}%`);
  console.log('>220 cells: ' + [...cells.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `(${k})=${v}`).join('  '));
}
