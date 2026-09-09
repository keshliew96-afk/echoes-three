#!/usr/bin/env node
// certA2-player critic helper (read-only): crop+upscale a region for eyeball
// inspection, report box luma stats, and diff two frames inside a box.
//
//   node tools/certA2-player-px.mjs crop <in.png> <x,y,w,h> <scale> <out.png>
//   node tools/certA2-player-px.mjs stat <in.png> <x,y,w,h>
//   node tools/certA2-player-px.mjs diff <a.png> <b.png> <x,y,w,h>
//   node tools/certA2-player-px.mjs col  <in.png> <x,y,w,h>   dominant colours
import sharp from 'sharp';

const [, , mode, ...rest] = process.argv;
const parseBox = (s) => s.split(',').map(Number);

async function raw(f) {
  const img = sharp(f);
  const meta = await img.metadata();
  const data = await img.ensureAlpha().raw().toBuffer();
  return { data, w: meta.width, h: meta.height };
}
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function boxPixels({ data, w }, [bx, by, bw, bh]) {
  const out = [];
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      const i = (y * w + x) * 4;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}

if (mode === 'crop') {
  const [inp, boxS, scaleS, out] = rest;
  const [x, y, w, h] = parseBox(boxS);
  const s = Number(scaleS);
  await sharp(inp).extract({ left: x, top: y, width: w, height: h })
    .resize({ width: Math.round(w * s), height: Math.round(h * s), kernel: 'nearest' })
    .toFile(out);
  console.log(`crop ${inp} [${x},${y},${w},${h}] x${s} -> ${out}`);
} else if (mode === 'stat') {
  const [inp, boxS] = rest;
  const box = parseBox(boxS);
  const img = await raw(inp);
  const px = boxPixels(img, box);
  const ls = px.map(([r, g, b]) => lum(r, g, b));
  ls.sort((a, b) => a - b);
  const mean = ls.reduce((a, b) => a + b, 0) / ls.length;
  const above = (t) => (ls.filter((v) => v > t).length / ls.length * 100).toFixed(2);
  console.log(`${inp} box ${boxS} n=${px.length} meanLuma=${mean.toFixed(1)} min=${ls[0].toFixed(0)} p50=${ls[Math.floor(ls.length / 2)].toFixed(0)} p95=${ls[Math.floor(ls.length * 0.95)].toFixed(0)} max=${ls[ls.length - 1].toFixed(0)} >160=${above(160)}% >200=${above(200)}% >240=${above(240)}%`);
} else if (mode === 'diff') {
  const [a, b, boxS] = rest;
  const box = parseBox(boxS);
  const A = await raw(a), B = await raw(b);
  const pa = boxPixels(A, box), pb = boxPixels(B, box);
  let sum = 0, changed = 0, big = 0, maxd = 0;
  for (let i = 0; i < pa.length; i++) {
    const d = (Math.abs(pa[i][0] - pb[i][0]) + Math.abs(pa[i][1] - pb[i][1]) + Math.abs(pa[i][2] - pb[i][2])) / 3;
    sum += d; if (d > 8) changed++; if (d > 40) big++; if (d > maxd) maxd = d;
  }
  console.log(`diff ${a} vs ${b} box ${boxS}: meanAbs=${(sum / pa.length).toFixed(2)} changed>8=${(changed / pa.length * 100).toFixed(2)}% >40=${(big / pa.length * 100).toFixed(2)}% max=${maxd.toFixed(0)}`);
} else if (mode === 'col') {
  const [inp, boxS] = rest;
  const box = parseBox(boxS);
  const img = await raw(inp);
  const px = boxPixels(img, box);
  const m = new Map();
  for (const [r, g, b] of px) {
    const k = `${r >> 4},${g >> 4},${b >> 4}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  const top = [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10);
  console.log(`${inp} box ${boxS} top colour bins (r,g,b >>4, count, %):`);
  for (const [k, c] of top) {
    const [r, g, b] = k.split(',').map((v) => Number(v) * 16 + 8);
    console.log(`  rgb(${r},${g},${b})  ${c}  ${(c / px.length * 100).toFixed(2)}%`);
  }
} else {
  console.error('modes: crop | stat | diff | col');
  process.exit(2);
}
