// certE1 pixel helpers (critic-only): crop+zoom, frame diff by 8x8 blocks, luma
// profile under the player's feet. Usage:
//   node tools/certE1-px.mjs zoom <png> x y w h scale <out.png>
//   node tools/certE1-px.mjs diff <a.png> <b.png> [excludeBoxes x,y,w,h;...]
//   node tools/certE1-px.mjs shadow <png> cx feetY   (luma rings around the foot point)
//   node tools/certE1-px.mjs box <png> x y w h        (mean luma + min/max of a box)
import sharp from 'sharp';

const [mode, ...a] = process.argv.slice(2);
const load = async (p) => { const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true }); return { d: data, w: info.width, h: info.height, c: info.channels }; };
const luma = (img, x, y) => { const i = (y * img.w + x) * img.c; return 0.2126 * img.d[i] + 0.7152 * img.d[i + 1] + 0.0722 * img.d[i + 2]; };

if (mode === 'zoom') {
  const [p, x, y, w, h, s, out] = a;
  await sharp(p).extract({ left: +x, top: +y, width: +w, height: +h }).resize(Math.round(+w * +s), Math.round(+h * +s), { kernel: 'nearest' }).toFile(out);
  console.log('wrote', out);
} else if (mode === 'diff') {
  const [pa, pb, ex = ''] = a;
  const A = await load(pa), B = await load(pb);
  const excl = ex ? ex.split(';').map((s) => s.split(',').map(Number)) : [];
  const inEx = (x, y) => excl.some(([ex0, ey0, ew, eh]) => x >= ex0 && x < ex0 + ew && y >= ey0 && y < ey0 + eh);
  const bw = Math.floor(A.w / 8), bh = Math.floor(A.h / 8);
  let blocks = 0, changed = 0, big = 0; const hot = [];
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    if (inEx(bx * 8 + 4, by * 8 + 4)) continue;
    blocks++;
    let n = 0, sum = 0;
    for (let y = by * 8; y < by * 8 + 8; y++) for (let x = bx * 8; x < bx * 8 + 8; x++) { const d = Math.abs(luma(A, x, y) - luma(B, x, y)); sum += d; if (d > 20) n++; }
    if (n >= 8) { changed++; hot.push([bx * 8, by * 8, n, +(sum / 64).toFixed(1)]); }
    if (n >= 32) big++;
  }
  hot.sort((p, q) => q[2] - p[2]);
  console.log(JSON.stringify({ a: pa, b: pb, blocks, changedBlocks: changed, changedPct: +(100 * changed / blocks).toFixed(2), bigBlocks: big, top: hot.slice(0, 40) }));
} else if (mode === 'blobs') {
  // connected components (8-neighbour) of changed 8x8 blocks between two frames
  const [pa, pb] = a;
  const A = await load(pa), B = await load(pb);
  const bw = Math.floor(A.w / 8), bh = Math.floor(A.h / 8);
  const ch = new Uint8Array(bw * bh); const md = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    let n = 0, sum = 0;
    for (let y = by * 8; y < by * 8 + 8; y++) for (let x = bx * 8; x < bx * 8 + 8; x++) { const d = Math.abs(luma(A, x, y) - luma(B, x, y)); sum += d; if (d > 20) n++; }
    if (n >= 8) { ch[by * bw + bx] = 1; md[by * bw + bx] = sum / 64; }
  }
  const seen = new Uint8Array(bw * bh); const blobs = [];
  for (let i = 0; i < bw * bh; i++) {
    if (!ch[i] || seen[i]) continue;
    const st = [i]; seen[i] = 1; let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, s = 0;
    while (st.length) { const j = st.pop(); n++; const bx = j % bw, by = (j / bw) | 0; s += md[j]; x0 = Math.min(x0, bx); y0 = Math.min(y0, by); x1 = Math.max(x1, bx); y1 = Math.max(y1, by);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = bx + dx, ny = by + dy; if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue; const k = ny * bw + nx; if (ch[k] && !seen[k]) { seen[k] = 1; st.push(k); } } }
    blobs.push({ blocks: n, box: [x0 * 8, y0 * 8, (x1 - x0 + 1) * 8, (y1 - y0 + 1) * 8], meanDiff: +(s / n).toFixed(1) });
  }
  blobs.sort((p, q) => q.blocks - p.blocks);
  const total = blobs.reduce((t, b) => t + b.blocks, 0);
  console.log(JSON.stringify({ a: pa, b: pb, blobs: blobs.length, changedBlocks: total, singles: blobs.filter((b) => b.blocks <= 2).length, top: blobs.slice(0, 16) }));
} else if (mode === 'shadow') {
  const [p, cx, fy] = a;
  const I = await load(p);
  const ring = (r0, r1) => { let s = 0, n = 0; for (let y = -r1; y <= r1; y++) for (let x = -r1; x <= r1; x++) { const r = Math.hypot(x, y * 2); if (r < r0 || r > r1) continue; const X = +cx + x, Y = +fy + y; if (X < 0 || Y < 0 || X >= I.w || Y >= I.h) continue; s += luma(I, X, Y); n++; } return n ? +(s / n).toFixed(1) : null; };
  // elliptical rings (2:1) around the foot point: core, inner, ring, outside
  const rows = []; for (let y = -14; y <= 14; y += 2) { const r = []; for (let x = -40; x <= 40; x += 4) r.push(Math.round(luma(I, +cx + x, +fy + y))); rows.push([y, r.join(' ')]); }
  console.log(JSON.stringify({ p, cx: +cx, feetY: +fy, core0_6: ring(0, 6), r6_12: ring(6, 12), r12_20: ring(12, 20), r20_30: ring(20, 30), r30_44: ring(30, 44), r44_60: ring(44, 60) }));
  for (const [y, r] of rows) console.log(String(y).padStart(4), r);
} else if (mode === 'box') {
  const [p, x, y, w, h] = a;
  const I = await load(p);
  let s = 0, n = 0, mn = 999, mx = -1, hi = 0;
  for (let Y = +y; Y < +y + +h; Y++) for (let X = +x; X < +x + +w; X++) { const l = luma(I, X, Y); s += l; n++; if (l < mn) mn = l; if (l > mx) mx = l; if (l > 160) hi++; }
  console.log(JSON.stringify({ p, box: [+x, +y, +w, +h], mean: +(s / n).toFixed(1), min: +mn.toFixed(0), max: +mx.toFixed(0), over160: hi, pct160: +(100 * hi / n).toFixed(2) }));
}
