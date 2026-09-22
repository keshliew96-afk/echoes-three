#!/usr/bin/env node
// Critic-only: HSV histogram of a box (REFERENCE MATCHER r5). usage: node tools/certA5-ref-hsv.mjs img x,y,w,h
import sharp from 'sharp';
const [f, b] = process.argv.slice(2);
const [x0, y0, w, h] = b.split(',').map(Number);
const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
const bins = {}; let n = 0, blueSat = 0; let sumS = 0, cnt = 0; const top = {};
for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
  const i = (y * info.width + x) * info.channels; const r = data[i] / 255, g = data[i + 1] / 255, bl = data[i + 2] / 255;
  const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn; n++;
  if (mx < 0.12 || d / mx < 0.2) continue;
  let hh = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; hh = (hh * 60 + 360) % 360;
  const s = d / mx; const k = Math.floor(hh / 20) * 20; bins[k] = (bins[k] || 0) + 1; cnt++; sumS += s;
  if (hh >= 200 && hh < 240 && s > 0.5 && mx > 0.35) { blueSat++; const hex = '#' + [data[i], data[i + 1], data[i + 2]].map(v => (v >> 4).toString(16)).join(''); top[hex] = (top[hex] || 0) + 1; }
}
console.log(f, b, 'coloured', cnt, 'of', n, 'meanS', (sumS / cnt).toFixed(3), 'hue20bins', JSON.stringify(bins), 'satBlue(200-240,s>.5,v>.35)', blueSat, 'topBlue', JSON.stringify(Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5)));
