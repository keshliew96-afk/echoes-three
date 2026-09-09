#!/usr/bin/env node
// certA1-ref critic helper: crop + upscale regions of captured PNGs for native-
// resolution inspection, and locate the brightest pixel inside a box (camera-
// motion probe across sequence frames). Read-only on inputs; writes only
// captures/certA1-ref-*.png.
//   node tools/certA1-ref-crop.mjs crop <in.png> <x,y,w,h> <scale> <outName>
//   node tools/certA1-ref-crop.mjs locate <x,y,w,h> <in.png...>
//   node tools/certA1-ref-crop.mjs diff <x,y,w,h> <a.png> <b.png>
import sharp from 'sharp';

const [mode, ...rest] = process.argv.slice(2);
const box = (s) => s.split(',').map(Number);

if (mode === 'crop') {
  const [inp, b, scale, out] = rest;
  const [x, y, w, h] = box(b);
  const sc = Number(scale) || 1;
  const outPath = `captures/certA1-ref-${out}.png`;
  await sharp(inp).extract({ left: x, top: y, width: w, height: h })
    .resize({ width: Math.round(w * sc), height: Math.round(h * sc), kernel: 'nearest' })
    .toFile(outPath);
  console.log(`wrote ${outPath} (${w}x${h} @${sc}x from ${inp} box ${b})`);
} else if (mode === 'locate') {
  const [b, ...files] = rest;
  const [x, y, w, h] = box(b);
  for (const f of files) {
    const { data, info } = await sharp(f).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
    let best = -1, bx = 0, by = 0, sumL = 0, n = 0;
    const ch = info.channels;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const o = (j * w + i) * ch;
      const l = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      sumL += l; n++;
      if (l > best) { best = l; bx = i; by = j; }
    }
    // centroid of pixels above 0.9*best (bright core)
    let cx = 0, cy = 0, c = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const o = (j * w + i) * ch;
      const l = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      if (l >= best * 0.9) { cx += i; cy += j; c++; }
    }
    console.log(`${f}: peak L=${best.toFixed(0)} at (${x + bx},${y + by}) coreCentroid=(${(x + cx / c).toFixed(1)},${(y + cy / c).toFixed(1)}) n=${c} meanL=${(sumL / n).toFixed(1)}`);
  }
} else if (mode === 'diff') {
  const [b, a, c] = rest;
  const [x, y, w, h] = box(b);
  const A = await sharp(a).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(c).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
  const ch = A.info.channels; let changed = 0, n = w * h, sum = 0;
  for (let p = 0; p < n; p++) {
    const o = p * ch;
    const d = Math.abs(A.data[o] - B.data[o]) + Math.abs(A.data[o + 1] - B.data[o + 1]) + Math.abs(A.data[o + 2] - B.data[o + 2]);
    sum += d; if (d > 30) changed++;
  }
  console.log(`diff ${a} vs ${c} box ${b}: changed(>30/3ch) ${(100 * changed / n).toFixed(2)}%  meanAbsDiff ${(sum / n / 3).toFixed(2)}`);
} else {
  console.log('usage: crop|locate|diff');
}
