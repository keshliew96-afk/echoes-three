// Critic tool: elliptical radial profile around a ground point — used to find the
// identity-ring band, its hue, and its luma vs the adjacent ground.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, cxs, cys, maxRs, asp] = process.argv.slice(2);
const cx = +cxs, cy = +cys, maxR = +(maxRs ?? 70), a = +(asp ?? 0.5);
const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const px = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return null; const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; };
const bins = [];
for (let t = 3; t <= maxR; t += 1) {
  const hs = [], ss = [], ls = [], cols = [];
  for (let k = 0; k < 180; k++) {
    const th = (k / 180) * Math.PI * 2;
    const p = px(cx + Math.cos(th) * t, cy + Math.sin(th) * t * a);
    if (!p) continue;
    const [h, s, l] = hsv(p[0], p[1], p[2]);
    hs.push(h); ss.push(s); ls.push(l); cols.push(p);
  }
  if (!hs.length) continue;
  // circular mean hue weighted by saturation
  let sx = 0, sy = 0, wsum = 0;
  for (let i = 0; i < hs.length; i++) { const w = ss[i]; sx += Math.cos(hs[i] * Math.PI / 180) * w; sy += Math.sin(hs[i] * Math.PI / 180) * w; wsum += w; }
  let mh = Math.atan2(sy, sx) * 180 / Math.PI; if (mh < 0) mh += 360;
  const mean = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length;
  bins.push({ t, h: mh, s: mean(ss), l: mean(ls), n: hs.length });
}
console.log(`${file} center=(${cx},${cy}) aspect=${a}`);
for (const b of bins) console.log(`  r=${String(b.t).padStart(3)} hue=${b.h.toFixed(1).padStart(6)} sat=${b.s.toFixed(3)} luma=${b.l.toFixed(1)}`);
