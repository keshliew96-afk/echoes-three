// Locate damage-numeral ink (Parchment cream #F4EFE6 +/- tol) clusters in a frame,
// ignoring the HUD bands, so a numeral can be cited by real pixel coordinates.
import sharp from 'sharp';
const files = process.argv.slice(2);
for (const f of files) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const cell = 16, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
  const grid = new Int32Array(gw * gh);
  for (let y = 0; y < H; y++) {
    if (y < 60 || y > 790) continue;              // skip HUD banner + command bar bands
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.abs(r - 244) < 12 && Math.abs(g - 239) < 12 && Math.abs(b - 230) < 14 && r > g && g > b) {
        grid[(y / cell | 0) * gw + (x / cell | 0)]++;
      }
    }
  }
  const hot = [];
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const n = grid[gy * gw + gx];
    if (n >= 30) hot.push([gx * cell, gy * cell, n]);
  }
  // merge adjacent hot cells into blobs
  const blobs = [];
  for (const h of hot) {
    let m = blobs.find(b => h[0] >= b.x0 - 32 && h[0] <= b.x1 + 32 && h[1] >= b.y0 - 32 && h[1] <= b.y1 + 32);
    if (!m) { m = { x0: h[0], y0: h[1], x1: h[0] + cell, y1: h[1] + cell, n: 0 }; blobs.push(m); }
    m.x0 = Math.min(m.x0, h[0]); m.y0 = Math.min(m.y0, h[1]);
    m.x1 = Math.max(m.x1, h[0] + cell); m.y1 = Math.max(m.y1, h[1] + cell); m.n += h[2];
  }
  console.log(f, blobs.filter(b => b.n >= 60).map(b => `(${b.x0},${b.y0})-(${b.x1},${b.y1}) ink${b.n}`).join(' | ') || 'none');
}
