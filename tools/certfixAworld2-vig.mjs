#!/usr/bin/env node
// Vignette probe: mean luma of a centre box vs the four corners and the four
// mid-edges of the same size, on the same frame — the measurement all three
// round-2 lenses used for REFERENCE_BAR check 7.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const S = 140;
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const mean = (x, y) => {
    let s = 0, n = 0;
    for (let j = y; j < y + S; j++) for (let i = x; i < x + S; i++) { const k = (j * W + i) * C; s += luma(data[k], data[k + 1], data[k + 2]); n++; }
    return s / n;
  };
  const c = mean((W - S) >> 1, (H - S) >> 1);
  const pts = {
    TL: mean(20, 20), TR: mean(W - S - 20, 20), BL: mean(20, H - S - 20), BR: mean(W - S - 20, H - S - 20),
    T: mean((W - S) >> 1, 20), B: mean((W - S) >> 1, H - S - 20), L: mean(20, (H - S) >> 1), R: mean(W - S - 20, (H - S) >> 1),
  };
  console.log(`\n=== ${f}  centre ${c.toFixed(1)}`);
  console.log(Object.entries(pts).map(([k, v]) => `${k} ${v.toFixed(1)} (${((v / c) * 100).toFixed(0)}%)`).join('  '));
}
