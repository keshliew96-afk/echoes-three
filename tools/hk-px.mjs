#!/usr/bin/env node
// Critic pixel probe. Isolates VFX by diffing a frame against a baseline frame
// of the same scene, then classifies the CHANGED pixels by hue band and by
// nearest BUILD_BRIEF §19.1 palette entry.
//   node tools/hk-px.mjs <base.png> <frame.png> [--thr 22] [--box x,y,w,h]
import { readFileSync } from 'fs';
import sharp from 'sharp';

const args = process.argv.slice(2);
const files = [];
let thr = 22, box = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--thr') thr = Number(args[++i]);
  else if (args[i] === '--box') box = args[++i].split(',').map(Number);
  else files.push(args[i]);
}
const PAL = {
  brightHeal: '#5FE873', hearthAmber: '#E8A23D', emberDanger: '#FF5A36',
  parchment: '#F4EFE6', godstuffViolet: '#B79CF0', signalBlue: '#4FA3D9',
  voidCharcoal: '#221F1B', bone: '#C9C2B3', sageCloak: '#33513C', warmGrey: '#9C9186',
  paleGold: '#D9B872', bruiseUmber: '#4E463F', act1Ground: '#548C38',
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PALV = Object.entries(PAL).map(([k, v]) => [k, hex(v)]);
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx * 255];
}
const load = async (f) => {
  let img = sharp(readFileSync(f)).ensureAlpha().removeAlpha();
  if (box) img = img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
  return img.raw().toBuffer({ resolveWithObject: true });
};
const [A, B] = await Promise.all([load(files[0]), load(files[1])]);
const { width: W, height: H, channels: C } = B.info;
const bands = { 'danger 5-25': 0, 'amber 25-55': 0, 'gold-yellow 55-95': 0, 'grass 95-110': 0, 'heal 110-150': 0, 'teal 150-200': 0, 'blue 200-245': 0, 'violet 245-285': 0, 'magenta 285-330': 0, 'red 330-360/0-5': 0 };
const nearest = {};
let changed = 0, sumR = 0, sumG = 0, sumB = 0, brightChanged = 0;
let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
for (let i = 0; i < W * H; i++) {
  const r = B.data[i * C], g = B.data[i * C + 1], b = B.data[i * C + 2];
  const r0 = A.data[i * C], g0 = A.data[i * C + 1], b0 = A.data[i * C + 2];
  const d = Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0);
  if (d < thr) continue;
  changed++;
  const x = i % W, y = (i / W) | 0;
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
  sumR += r; sumG += g; sumB += b;
  const [h, s, v] = hsv(r, g, b);
  if (s > 0.30 && v > 60) {
    brightChanged++;
    if (h >= 5 && h < 25) bands['danger 5-25']++;
    else if (h < 55) bands['amber 25-55']++;
    else if (h < 95) bands['gold-yellow 55-95']++;
    else if (h < 110) bands['grass 95-110']++;
    else if (h < 150) bands['heal 110-150']++;
    else if (h < 200) bands['teal 150-200']++;
    else if (h < 245) bands['blue 200-245']++;
    else if (h < 285) bands['violet 245-285']++;
    else if (h < 330) bands['magenta 285-330']++;
    else bands['red 330-360/0-5']++;
  }
  let bk = null, bd = 1e9;
  for (const [k, [pr, pg, pb]] of PALV) { const dd = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2; if (dd < bd) { bd = dd; bk = k; } }
  nearest[bk] = (nearest[bk] ?? 0) + 1;
}
console.log(`FRAME ${files[1]}  vs ${files[0]}  (${W}x${H}) thr=${thr}`);
console.log(`CHANGED  ${changed} px (${(changed / (W * H) * 100).toFixed(3)}%)  bbox ${changed ? `${minX},${minY} ${maxX - minX + 1}x${maxY - minY + 1}` : '-'}`);
if (changed) console.log(`MEANRGB  ${(sumR / changed).toFixed(0)},${(sumG / changed).toFixed(0)},${(sumB / changed).toFixed(0)}`);
console.log(`SATBRIGHT ${brightChanged} px  ` + Object.entries(bands).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('  '));
console.log('NEAREST  ' + Object.entries(nearest).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
