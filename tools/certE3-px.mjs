#!/usr/bin/env node
// Certification block E round 3 — pixel helper (critic-owned, read-only on captures).
//   node tools/certE3-px.mjs diff  a.png b.png            8x8 block diff + blob grouping
//   node tools/certE3-px.mjs zoom  in.png x,y,w,h k out.png
//   node tools/certE3-px.mjs box   a.png x,y,w,h          mean/max luma + %>160 in a box
//   node tools/certE3-px.mjs col   a.png x0,x1,y0,y1      per-row mean luma of a column strip
//   node tools/certE3-px.mjs ring  a.png cx,cy r0,r1      mean luma in an annulus
import sharp from 'sharp';

const [, , mode, ...rest] = process.argv;
const nums = (s) => s.split(',').map(Number);
const load = async (p) => {
  const img = sharp(p);
  const { width, height } = await img.metadata();
  const data = await img.raw().ensureAlpha().toBuffer();
  return { w: width, h: height, d: data };
};
const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

if (mode === 'diff') {
  const [pa, pb] = rest;
  const A = await load(pa), B = await load(pb);
  const BS = 8, TH = 20, MIN = 8;
  const cols = Math.floor(A.w / BS), rows = Math.floor(A.h / BS);
  const grid = new Float64Array(cols * rows);
  const flag = new Uint8Array(cols * rows);
  let changed = 0;
  for (let by = 0; by < rows; by++) for (let bx = 0; bx < cols; bx++) {
    let n = 0, sum = 0, mx = 0;
    for (let y = 0; y < BS; y++) for (let x = 0; x < BS; x++) {
      const i = ((by * BS + y) * A.w + bx * BS + x) * 4;
      const dl = Math.abs(luma(A.d, i) - luma(B.d, i));
      if (dl > TH) { n++; sum += dl; if (dl > mx) mx = dl; }
    }
    if (n >= MIN) { flag[by * cols + bx] = 1; grid[by * cols + bx] = sum / n; changed++; }
    if (mx > grid[by * cols + bx] && flag[by * cols + bx]) grid[by * cols + bx] = grid[by * cols + bx];
  }
  // blob grouping (4-connected over flagged blocks)
  const seen = new Uint8Array(cols * rows);
  const blobs = [];
  for (let i = 0; i < cols * rows; i++) {
    if (!flag[i] || seen[i]) continue;
    const st = [i]; seen[i] = 1;
    let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1, cnt = 0, sum = 0;
    while (st.length) {
      const k = st.pop(); const bx = k % cols, by = (k / cols) | 0;
      cnt++; sum += grid[k];
      if (bx < minx) minx = bx; if (bx > maxx) maxx = bx;
      if (by < miny) miny = by; if (by > maxy) maxy = by;
      const nb = [k - 1, k + 1, k - cols, k + cols];
      for (const m of nb) {
        if (m < 0 || m >= cols * rows) continue;
        if (Math.abs((m % cols) - bx) > 1) continue;
        if (flag[m] && !seen[m]) { seen[m] = 1; st.push(m); }
      }
    }
    blobs.push({ x: minx * BS, y: miny * BS, w: (maxx - minx + 1) * BS, h: (maxy - miny + 1) * BS, blocks: cnt, meanD: +(sum / cnt).toFixed(1) });
  }
  blobs.sort((a, b) => b.blocks - a.blocks);
  console.log(`${pa} vs ${pb}`);
  console.log(`changed blocks ${changed}/${cols * rows} (${(100 * changed / (cols * rows)).toFixed(2)}%), blobs ${blobs.length}`);
  for (const b of blobs.slice(0, 14)) console.log(`  blob (${b.x},${b.y},${b.w}x${b.h}) blocks ${b.blocks} meanD ${b.meanD}`);
} else if (mode === 'zoom') {
  const [inp, box, k, out] = rest;
  const [x, y, w, h] = nums(box);
  await sharp(inp).extract({ left: x, top: y, width: w, height: h })
    .resize({ width: w * Number(k), height: h * Number(k), kernel: 'nearest' }).toFile(out);
  console.log('wrote', out);
} else if (mode === 'box') {
  const [p, box] = rest;
  const [x, y, w, h] = nums(box);
  const A = await load(p);
  let sum = 0, mx = 0, n = 0, a160 = 0, a200 = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const l = luma(A.d, (yy * A.w + xx) * 4);
    sum += l; n++; if (l > mx) mx = l; if (l > 160) a160++; if (l > 200) a200++;
  }
  console.log(`${p} box(${x},${y},${w}x${h}) mean ${(sum / n).toFixed(1)} max ${mx.toFixed(0)} >160 ${(100 * a160 / n).toFixed(2)}% >200 ${(100 * a200 / n).toFixed(2)}% n ${n}`);
} else if (mode === 'col') {
  const [p, spec] = rest;
  const [x0, x1, y0, y1] = nums(spec);
  const A = await load(p);
  const out = [];
  for (let y = y0; y <= y1; y++) {
    let s = 0, n = 0;
    for (let x = x0; x <= x1; x++) { s += luma(A.d, (y * A.w + x) * 4); n++; }
    out.push(Math.round(s / n));
  }
  console.log(`${p} col x${x0}-${x1} rows ${y0}-${y1}: ${out.join(' ')}`);
} else if (mode === 'ring') {
  const [p, c, r] = rest;
  const [cx, cy] = nums(c); const [r0, r1] = nums(r);
  const A = await load(p);
  let s = 0, n = 0;
  for (let y = Math.max(0, cy - r1); y < Math.min(A.h, cy + r1); y++)
    for (let x = Math.max(0, cx - r1); x < Math.min(A.w, cx + r1); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= r0 && d < r1) { s += luma(A.d, (y * A.w + x) * 4); n++; }
    }
  console.log(`${p} ring c(${cx},${cy}) r${r0}-${r1} mean ${(s / n).toFixed(1)} n ${n}`);
} else if (mode !== 'eprof') {
  console.error('usage: diff | zoom | box | col | ring');
  process.exit(2);
}

// appended: elliptical radial profile (3/4-view blob shadows are ellipses)
if (mode === 'eprof') {
  const [p, c, k, bands] = rest;
  const [cx, cy] = c.split(',').map(Number);
  const ky = Number(k);
  const bs = bands.split(',').map(Number);
  const img = sharp(p);
  const { width, height } = await img.metadata();
  const d = await img.raw().ensureAlpha().toBuffer();
  const L = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  const out = [];
  for (let b = 0; b < bs.length - 1; b++) {
    let s = 0, n = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const r = Math.hypot(x - cx, (y - cy) * ky);
      if (r >= bs[b] && r < bs[b + 1]) { s += L((y * width + x) * 4); n++; }
    }
    out.push(`${bs[b]}-${bs[b + 1]}:${(s / n).toFixed(1)}(n${n})`);
  }
  console.log(`${p} eprof c(${cx},${cy}) ky${ky} ${out.join('  ')}`);
}
