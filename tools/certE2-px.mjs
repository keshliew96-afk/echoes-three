// certE2 pixel helpers (critic-only, block E round 2).
//   node tools/certE2-px.mjs zoom <png> x y w h scale <out.png>
//   node tools/certE2-px.mjs diff <a.png> <b.png>            8x8 block diff + top blobs
//   node tools/certE2-px.mjs shadow <png> cx feetY           luma rings around a foot point
//   node tools/certE2-px.mjs box <png> x y w h               mean/min/max luma of a box
import sharp from 'sharp';

const [mode, ...a] = process.argv.slice(2);
const load = async (p) => {
  const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height, c: info.channels };
};
const luma = (img, x, y) => {
  const i = (y * img.w + x) * img.c;
  return 0.2126 * img.d[i] + 0.7152 * img.d[i + 1] + 0.0722 * img.d[i + 2];
};

if (mode === 'zoom') {
  const [p, x, y, w, h, s, out] = a;
  await sharp(p).extract({ left: +x, top: +y, width: +w, height: +h })
    .resize(Math.round(+w * +s), Math.round(+h * +s), { kernel: 'nearest' }).toFile(out);
  console.log('wrote', out);
} else if (mode === 'diff') {
  const [pa, pb] = a;
  const A = await load(pa), B = await load(pb);
  const bw = Math.floor(A.w / 8), bh = Math.floor(A.h / 8);
  const grid = [];
  let changed = 0;
  for (let by = 0; by < bh; by++) {
    grid[by] = [];
    for (let bx = 0; bx < bw; bx++) {
      let n = 0, sum = 0, mx = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const dl = Math.abs(luma(A, bx * 8 + x, by * 8 + y) - luma(B, bx * 8 + x, by * 8 + y));
        if (dl > 20) { n++; sum += dl; if (dl > mx) mx = dl; }
      }
      const hit = n >= 8;
      grid[by][bx] = hit ? { n, mean: sum / n, mx } : null;
      if (hit) changed++;
    }
  }
  // flood-fill the changed blocks into blobs
  const seen = grid.map((r) => r.map(() => false));
  const blobs = [];
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    if (!grid[by][bx] || seen[by][bx]) continue;
    const st = [[bx, by]]; seen[by][bx] = true;
    let x0 = bx, x1 = bx, y0 = by, y1 = by, cnt = 0, sm = 0, mx = 0;
    while (st.length) {
      const [cx, cy] = st.pop(); const g = grid[cy][cx];
      cnt++; sm += g.mean; if (g.mx > mx) mx = g.mx;
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < bw && ny < bh && grid[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; st.push([nx, ny]); }
      }
    }
    blobs.push({ blocks: cnt, box: [x0 * 8, y0 * 8, (x1 - x0 + 1) * 8, (y1 - y0 + 1) * 8], meanD: +(sm / cnt).toFixed(1), maxD: +mx.toFixed(0) });
  }
  blobs.sort((p, q) => q.blocks - p.blocks);
  console.log(`${pa} vs ${pb}: ${changed}/${bw * bh} blocks changed (${(100 * changed / (bw * bh)).toFixed(2)}%), ${blobs.length} blobs`);
  console.log('top 12 by size:'); for (const b of blobs.slice(0, 12)) console.log('  ', JSON.stringify(b));
  const byD = [...blobs].sort((p, q) => q.maxD - p.maxD);
  console.log('top 6 by maxD:'); for (const b of byD.slice(0, 6)) console.log('  ', JSON.stringify(b));
} else if (mode === 'shadow') {
  const [p, cx, cy] = a;
  const img = await load(p);
  const rings = [[0, 12], [12, 20], [20, 30], [30, 44], [44, 60], [60, 80]];
  const out = [];
  for (const [r0, r1] of rings) {
    let s = 0, n = 0;
    for (let y = -r1; y <= r1; y++) for (let x = -r1; x <= r1; x++) {
      const r = Math.hypot(x, y * 1.9); // squashed ellipse: ground plane is foreshortened
      if (r < r0 || r >= r1) continue;
      const px = +cx + x, py = +cy + y;
      if (px < 0 || py < 0 || px >= img.w || py >= img.h) continue;
      s += luma(img, px, py); n++;
    }
    out.push(`r${r0}-${r1}: ${(s / n).toFixed(1)} (n=${n})`);
  }
  console.log(p, `foot(${cx},${cy})`, out.join(' | '));
} else if (mode === 'box') {
  const [p, x, y, w, h] = a;
  const img = await load(p);
  let s = 0, n = 0, mn = 999, mx = -1, over160 = 0;
  for (let yy = +y; yy < +y + +h; yy++) for (let xx = +x; xx < +x + +w; xx++) {
    if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
    const l = luma(img, xx, yy); s += l; n++; if (l < mn) mn = l; if (l > mx) mx = l; if (l > 160) over160++;
  }
  console.log(p, `box(${x},${y},${w},${h})`, `mean ${(s / n).toFixed(1)} min ${mn.toFixed(0)} max ${mx.toFixed(0)} >160 ${(100 * over160 / n).toFixed(2)}% n=${n}`);
} else {
  console.error('modes: zoom | diff | shadow | box');
  process.exit(2);
}
