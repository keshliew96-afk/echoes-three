// Round D critic: isolate an above-plane VFX slice by A/B (frame _00 shipped,
// frame _01 with the named meshes hidden) and report its pixel footprint,
// contrast and bbox. usage: node tools/zc-abdiff.mjs <seqName> [thresh]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const name = process.argv[2];
const TH = +(process.argv[3] || 12);
const load = async (f) => { const { data, info } = await sharp(readFileSync(f)).raw().toBuffer({ resolveWithObject: true }); return { data, W: info.width, H: info.height, C: info.channels }; };
const A = await load(`captures/${name}_00.png`);
const B = await load(`captures/${name}_01.png`);
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; }
let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, dsum = 0, dmax = 0;
let hueSum = { x: 0, y: 0 }, hn = 0, lift = 0;
const rows = new Map();
for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
  const i = (y * A.W + x) * A.C;
  const a = [A.data[i], A.data[i + 1], A.data[i + 2]];
  const b = [B.data[i], B.data[i + 1], B.data[i + 2]];
  const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  if (d <= TH) continue;
  n++; dsum += d; if (d > dmax) dmax = d;
  if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  const [h, s] = hsv(...a);
  if (s > 0.10) { hueSum.x += Math.cos(h * Math.PI / 180); hueSum.y += Math.sin(h * Math.PI / 180); hn++; }
  rows.set(y, (rows.get(y) || 0) + 1);
  // "above the plane" proxy: the slice pixel is brighter than what it replaced
  if (luma(...a) > luma(...b) + 6) lift++;
}
const mh = hn ? ((Math.atan2(hueSum.y / hn, hueSum.x / hn) * 180 / Math.PI) + 360) % 360 : NaN;
console.log(`${name}: changed px ${n} (thr ${TH})  bbox ${x0},${y0} ${x1 - x0 + 1}x${y1 - y0 + 1}  meanΔ ${(dsum / (n || 1)).toFixed(1)} maxΔ ${dmax}  meanHue(A) ${mh.toFixed(1)}  brighter-than-base ${(100 * lift / (n || 1)).toFixed(0)}%`);
// vertical profile: how many changed pixels per 20px row band
const bands = [];
for (const [y, c] of [...rows.entries()].sort((a, b) => a[0] - b[0])) { const k = Math.floor(y / 20) * 20; bands[k] = (bands[k] || 0) + c; }
console.log('  rows: ' + bands.map((c, y) => c ? `${y}:${c}` : null).filter(Boolean).join(' '));
