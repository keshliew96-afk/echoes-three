#!/usr/bin/env node
// Count pixels close to a target hex (RGB distance) and report their bbox +
// centroid. Usage: node tools/zq-hue.mjs <hex> <tol> <png...>
import sharp from 'sharp';
const [hex, tolS, ...files] = process.argv.slice(2);
const tol = Number(tolS);
const tr = parseInt(hex.slice(1, 3), 16), tg = parseInt(hex.slice(3, 5), 16), tb = parseInt(hex.slice(5, 7), 16);
for (const f of files) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let n = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, sx = 0, sy = 0;
  let best = 1e9, bestPx = null;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * ch;
      const d = Math.hypot(data[i] - tr, data[i + 1] - tg, data[i + 2] - tb);
      if (d < best) { best = d; bestPx = [x, y, data[i], data[i + 1], data[i + 2]]; }
      if (d <= tol) { n++; sx += x; sy += y; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }
  console.log(`${f}: match=${n} bbox=${n ? `${minX},${minY} ${maxX - minX + 1}x${maxY - minY + 1}` : '-'} centroid=${n ? `${Math.round(sx / n)},${Math.round(sy / n)}` : '-'} closest=${best.toFixed(1)}@${bestPx}`);
}
