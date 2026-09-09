#!/usr/bin/env node
// A-world r2 pixel probe: hue histogram + family split + mean colour for a box,
// plus a coarse per-cell family map so a frame's cool/warm geography is visible.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2);
let box = null, mode = 'hist';
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--box') box = args[++i].split(',').map(Number);
  else if (args[i] === '--mode') mode = args[++i];
  else files.push(args[i]);
}
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
  let img = sharp(readFileSync(f)).ensureAlpha().removeAlpha();
  if (box) img = img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const N = W * H;
  console.log(`\n=== ${f} (${W}x${H}${box ? ' box ' + box.join(',') : ''})`);
  if (mode === 'hist') {
    const hb = new Array(24).fill(0); // 15-degree buckets
    let sr = 0, sg = 0, sb = 0, sl = 0, col = 0;
    let warm = 0, fol = 0, cool = 0, heal = 0;
    for (let i = 0; i < N; i++) {
      const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
      sr += r; sg += g; sb += b; sl += luma(r, g, b);
      const [h, s, v] = hsv(r, g, b);
      if (s > 0.12) {
        col++;
        hb[Math.min(23, Math.floor(h / 15))]++;
        if (h >= 330 || h < 60) warm++; else if (h < 160) fol++; else cool++;
        if (s > 0.35 && luma(r, g, b) > 40 && h >= 110 && h < 150) heal++;
      }
    }
    console.log(`mean rgb ${(sr / N).toFixed(1)},${(sg / N).toFixed(1)},${(sb / N).toFixed(1)}  meanLuma ${(sl / N).toFixed(1)}`);
    console.log(`coloured ${((col / N) * 100).toFixed(1)}%  warm ${((warm / (col || 1)) * 100).toFixed(1)} | foliage ${((fol / (col || 1)) * 100).toFixed(1)} | cool ${((cool / (col || 1)) * 100).toFixed(1)}   healband ${heal}`);
    console.log('hue15 ' + hb.map((n, i) => (n / (col || 1) > 0.005 ? `${i * 15}:${((n / col) * 100).toFixed(1)}` : null)).filter(Boolean).join('  '));
  } else if (mode === 'map') {
    // 10x6 grid of family dominance + mean luma
    const gx = 10, gy = 6;
    for (let cy = 0; cy < gy; cy++) {
      const row = [];
      for (let cx = 0; cx < gx; cx++) {
        const x0 = Math.floor((cx * W) / gx), x1 = Math.floor(((cx + 1) * W) / gx);
        const y0 = Math.floor((cy * H) / gy), y1 = Math.floor(((cy + 1) * H) / gy);
        let warm = 0, fol = 0, cool = 0, sl = 0, n = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * C; const r = data[i], g = data[i + 1], b = data[i + 2];
          sl += luma(r, g, b); n++;
          const [h, s] = hsv(r, g, b);
          if (s > 0.12) { if (h >= 330 || h < 60) warm++; else if (h < 160) fol++; else cool++; }
        }
        const t = warm + fol + cool || 1;
        const dom = warm >= fol && warm >= cool ? 'W' : fol >= cool ? 'F' : 'C';
        row.push(`${dom}${Math.round((Math.max(warm, fol, cool) / t) * 99).toString().padStart(2)}/${Math.round(sl / n).toString().padStart(3)}`);
      }
      console.log(' ' + row.join(' '));
    }
  }
}
