// A/B visibility of a VFX shape: how many pixels does it actually paint, how
// hard, and where. A = shipped frame, B = same frozen frame with skillfx hidden.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [aF, bF, boxArg] = process.argv.slice(2);
const load = async (f) => { const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: data, W: info.width, H: info.height, C: info.channels }; };
const A = await load(aF), B = await load(bF);
const box = boxArg ? boxArg.split(',').map(Number) : [0, 0, A.W, A.H];
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; }
let n8 = 0, n20 = 0, n40 = 0, hueSum = [0, 0], deltas = [];
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
const heat = new Map();
for (let y = box[1]; y < box[1] + box[3]; y++) {
  for (let x = box[0]; x < box[0] + box[2]; x++) {
    const i = (y * A.W + x) * A.C;
    const a = [A.d[i], A.d[i + 1], A.d[i + 2]], b = [B.d[i], B.d[i + 1], B.d[i + 2]];
    const dl = Math.abs(luma(a) - luma(b));
    const dmax = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    if (dmax > 8) { n8++; if (dmax > 20) n20++; if (dmax > 40) { n40++; const [h] = hsv(a[0], a[1], a[2]); hueSum[0] += Math.cos(h * Math.PI / 180); hueSum[1] += Math.sin(h * Math.PI / 180); } }
    if (dmax > 20) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; deltas.push(dl); const k = `${Math.floor(y / 40)}`; heat.set(k, (heat.get(k) ?? 0) + 1); }
  }
}
deltas.sort((a, b) => a - b);
let hm = Math.atan2(hueSum[1], hueSum[0]) * 180 / Math.PI; if (hm < 0) hm += 360;
console.log(`${aF}: painted px >8 ${n8}  >20 ${n20}  >40 ${n40}`);
console.log(`  bbox of >20 px: x ${minX}-${maxX}  y ${minY}-${maxY}`);
console.log(`  |dLuma| median ${deltas.length ? deltas[Math.floor(deltas.length / 2)].toFixed(1) : 'n/a'}  p90 ${deltas.length ? deltas[Math.floor(deltas.length * 0.9)].toFixed(1) : 'n/a'}  max ${deltas.length ? deltas[deltas.length - 1].toFixed(1) : 'n/a'}`);
console.log(`  mean hue of strongly-painted px: ${n40 ? hm.toFixed(1) : 'n/a'}`);
