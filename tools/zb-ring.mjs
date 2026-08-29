// Round-D identity-ring measurer. Samples the ring's [inner ink][accent band]
// [outer ink] structure along radial rays and reports it PER OCTANT, so the
// pool-facing arc and the away arc are measured separately (criterion 2).
// Band radii are read from render/critters/common.js RING (fractions of the
// plane half-size, normalised here to the ring's world radius = 0.98 of half).
// usage: node tools/zb-ring.mjs <png> cx cy rxPx --accent #hex --label name
import { readFileSync } from 'fs';
import sharp from 'sharp';
const a = process.argv.slice(2);
const file = a[0], cx = +a[1], cy = +a[2], rx = +a[3];
let label = 'ring', accent = '#FFFFFF';
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--label') label = a[i + 1];
  if (a[i] === '--accent') accent = a[i + 1];
}
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; }
const px = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return null; const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
const SQ = 0.6155; // cos(52 deg) ground foreshortening
const F = { innerInk: [0.530, 0.640], band: [0.700, 0.815], outerInk: [0.885, 0.995], ground: [1.16, 1.34] };
const ah = (() => { const n = parseInt(accent.slice(1), 16); return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255)[0]; })();
const dh = (x, y) => { let d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };
const OCT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const buckets = OCT.map(() => ({ band: [], gnd: [], inkA: [], inkB: [], inkAw: [], inkBw: [] }));
const sampleSeg = (deg, lo, hi) => {
  const t = (deg * Math.PI) / 180, out = [];
  for (let f = lo; f <= hi; f += 0.012) {
    const p = px(cx + rx * f * Math.cos(t), cy + rx * SQ * f * Math.sin(t));
    if (p) out.push(p);
  }
  return out;
};
const mean = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : NaN;
// mean of a hue set, circular
const meanHue = (arr) => {
  if (!arr.length) return NaN;
  let sx = 0, sy = 0;
  for (const h of arr) { sx += Math.cos((h * Math.PI) / 180); sy += Math.sin((h * Math.PI) / 180); }
  let d = (Math.atan2(sy, sx) * 180) / Math.PI; if (d < 0) d += 360; return d;
};
for (let deg = 0; deg < 360; deg += 2) {
  const oi = Math.round(deg / 45) % 8;
  const b = buckets[oi];
  for (const p of sampleSeg(deg, F.band[0], F.band[1])) b.band.push(p);
  for (const p of sampleSeg(deg, F.ground[0], F.ground[1])) b.gnd.push(p);
  for (const p of sampleSeg(deg, F.innerInk[0], F.innerInk[1])) b.inkA.push(p);
  for (const p of sampleSeg(deg, F.outerInk[0], F.outerInk[1])) b.inkB.push(p);
  // ink stroke widths in screen px along this ray
  const t = (deg * Math.PI) / 180;
  const step = 0.4 / rx;
  const wid = (lo, hi) => {
    let n = 0;
    for (let f = lo - 0.06; f <= hi + 0.06; f += step) {
      const p = px(cx + rx * f * Math.cos(t), cy + rx * SQ * f * Math.sin(t));
      if (p && luma(...p) < 70) n++;
    }
    return n * 0.4 * Math.hypot(Math.cos(t), SQ * Math.sin(t));
  };
  b.inkAw.push(wid(F.innerInk[0], F.innerInk[1]));
  b.inkBw.push(wid(F.outerInk[0], F.outerInk[1]));
}
console.log(`\n=== ${label}  ${file}  centre(${cx},${cy}) rx ${rx}  accent ${accent} h${ah.toFixed(1)}`);
for (let i = 0; i < 8; i++) {
  const b = buckets[i];
  const bh = b.band.map((p) => hsv(...p));
  const h = meanHue(bh.map((v) => v[0])), s = mean(bh.map((v) => v[1]));
  const bl = mean(b.band.map((p) => luma(...p)));
  const gl = mean(b.gnd.map((p) => luma(...p)));
  const iaL = mean(b.inkA.map((p) => luma(...p)));
  const ibL = mean(b.inkB.map((p) => luma(...p)));
  console.log(
    `  ${OCT[i].padEnd(2)}  band h${h.toFixed(1).padStart(5)} (d${dh(h, ah).toFixed(1).padStart(4)}) s${s.toFixed(2)} L${bl.toFixed(0).padStart(3)}` +
    `  ground L${gl.toFixed(0).padStart(3)}  ratio ${(bl / gl).toFixed(2)}` +
    `  inkIn L${iaL.toFixed(0).padStart(3)} ${mean(b.inkAw).toFixed(1)}px  inkOut L${ibL.toFixed(0).padStart(3)} ${mean(b.inkBw).toFixed(1)}px`
  );
}
