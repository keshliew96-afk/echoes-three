// Find every bolt core (bright blob) in the play band and test for a dark
// contact blob directly beneath it.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const L = (x, y) => { const i = (y * W + x) * C; return lum(data[i], data[i + 1], data[i + 2]); };
  const sat = (x, y) => { const i = (y * W + x) * C; const r = data[i], g = data[i + 1], b = data[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const X0 = 830, X1 = 1570, Y0 = 380, Y1 = 520;
  const seen = new Set(); const blobs = [];
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const k = y * W + x;
    if (seen.has(k) || L(x, y) < 244 || sat(x, y) > 0.20) continue;
    const st = [k]; seen.add(k); let n = 0, sx = 0, sy = 0;
    while (st.length) {
      const p = st.pop(); const px = p % W, py = (p / W) | 0; n++; sx += px; sy += py;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy; const nk = ny * W + nx;
        if (nx < X0 || nx >= X1 || ny < Y0 || ny >= Y1 || seen.has(nk) || L(nx, ny) < 244 || sat(nx, ny) > 0.20) continue;
        seen.add(nk); st.push(nk);
      }
    }
    if (n >= 12) blobs.push({ n, cx: Math.round(sx / n), cy: Math.round(sy / n) });
  }
  const parts = blobs.map((b) => {
    // shadow: minimum 9x5 mean in a window 18..50 px below the core
    let best = 1e9, bx = 0, by = 0;
    for (let dy = 18; dy <= 52; dy++) for (let dx = -22; dx <= 22; dx++) {
      let s = 0, cnt = 0;
      for (let j = -2; j <= 2; j++) for (let i = -4; i <= 4; i++) { s += L(b.cx + dx + i, b.cy + dy + j); cnt++; }
      const m = s / cnt; if (m < best) { best = m; bx = b.cx + dx; by = b.cy + dy; }
    }
    // ground reference: same row band, 70..110 px to the LEFT and RIGHT of the shadow
    let rs = 0, rn = 0;
    for (const off of [-110, -95, -80, 80, 95, 110]) for (let j = -6; j <= 6; j += 3) {
      const x = bx + off, y = by + j; if (x < 2 || x >= W - 2) continue; const l = L(x, y); if (l > 230) continue; rs += l; rn++;
    }
    const ref = rs / rn;
    return `core=(${b.cx},${b.cy},n=${b.n}) shadow=(${bx},${by}) dy=${by - b.cy} L=${best.toFixed(0)} groundL=${ref.toFixed(0)} ratio=${(best / ref).toFixed(2)}`;
  });
  console.log(`${file}: ${blobs.length} core(s)\n   ` + (parts.join('\n   ') || 'none'));
}
