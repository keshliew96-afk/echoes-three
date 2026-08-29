import { readFileSync } from 'fs';
import sharp from 'sharp';
const files = process.argv.slice(2);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (const file of files) {
  const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  const L = (x, y) => { const i = (y * W + x) * C; return lum(data[i], data[i + 1], data[i + 2]); };
  let mx = 0, mxx = 0, mxy = 0;
  for (let y = 380; y < 520; y++) for (let x = 830; x < 1570; x++) { const l = L(x, y); if (l > mx) { mx = l; mxx = x; mxy = y; } }
  const T = Math.max(200, mx - 12);
  let cn = 0, csx = 0, csy = 0;
  for (let y = 380; y < 520; y++) for (let x = 830; x < 1570; x++) if (L(x, y) >= T) { cn++; csx += x; csy += y; }
  const cx = Math.round(csx / cn), cy = Math.round(csy / cn);
  const prof = [];
  for (let dy = 0; dy <= 60; dy += 3) { let s = 0; for (let i = -5; i <= 5; i++) s += L(cx + i, cy + dy); prof.push(`${dy}:${(s / 11).toFixed(0)}`); }
  console.log(`${file} maxL=${mx.toFixed(0)}@(${mxx},${mxy}) core=(${cx},${cy}) n=${cn}\n   vprof ${prof.join(' ')}`);
}
