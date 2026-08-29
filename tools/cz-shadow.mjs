// Critic tool: locate the bolt core (brightest blob) and test for a dark contact
// blob under it — reports core centroid, shadow centroid, and shadow depth.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const files = process.argv.slice(2);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (const file of files) {
  const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const L = (x, y) => { const i = (y * W + x) * C; return lum(data[i], data[i + 1], data[i + 2]); };
  // search band: right of the player, mid-screen
  let cn = 0, csx = 0, csy = 0;
  for (let y = 380; y < 520; y++) for (let x = 830; x < 1500; x++) if (L(x, y) > 248) { cn++; csx += x; csy += y; }
  if (!cn) { console.log(`${file}: no bolt core found`); continue; }
  const cx = Math.round(csx / cn), cy = Math.round(csy / cn);
  // shadow search: below the core, 10..45 px down, +-30 px across — find min-luma centroid
  let best = 1e9, bx = 0, by = 0;
  for (let dy = 8; dy <= 50; dy++) for (let dx = -35; dx <= 35; dx++) {
    let s = 0, n = 0;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { s += L(cx + dx + i, cy + dy + j); n++; }
    const m = s / n;
    if (m < best) { best = m; bx = cx + dx; by = cy + dy; }
  }
  // reference ground: ring 55..75 px from the shadow centre, excluding the bright core side
  let rs = 0, rn = 0;
  for (let a = 0; a < 360; a += 5) for (let r = 55; r <= 75; r += 4) {
    const x = Math.round(bx + Math.cos(a * Math.PI / 180) * r), y = Math.round(by + Math.sin(a * Math.PI / 180) * r * 0.6);
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
    const l = L(x, y); if (l > 235) continue; rs += l; rn++;
  }
  const ref = rs / rn;
  console.log(`${file}: core=(${cx},${cy}) corePx=${cn}  shadow=(${bx},${by}) shadowL=${best.toFixed(1)} groundL=${ref.toFixed(1)} ratio=${(best / ref).toFixed(2)} dy=${by - cy}`);
}
