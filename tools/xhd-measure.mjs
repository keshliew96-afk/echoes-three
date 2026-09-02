// Critic pixel measurer: WCAG contrast of HUD ink vs plate inside given boxes,
// plus mean plate colour (tint check). Usage:
//   node tools/xhd-measure.mjs <png> <label> x,y,w,h [x,y,w,h ...]
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [file, label, ...boxes] = process.argv.slice(2);
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const relL = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const img = sharp(readFileSync(file)).ensureAlpha().removeAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const W = info.width, C = info.channels;
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };

for (const b of boxes) {
  const [x0, y0, w, h] = b.split(',').map(Number);
  const list = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const [r, g, bb] = px(x, y);
    list.push({ r, g, b: bb, L: relL(r, g, bb) });
  }
  list.sort((a, c) => a.L - c.L);
  const n = list.length;
  const mean = (arr) => {
    const s = arr.reduce((a, p) => [a[0] + p.r, a[1] + p.g, a[2] + p.b, a[3] + p.L], [0, 0, 0, 0]);
    return { r: Math.round(s[0] / arr.length), g: Math.round(s[1] / arr.length), b: Math.round(s[2] / arr.length), L: s[3] / arr.length };
  };
  const plate = mean(list.slice(0, Math.floor(n * 0.4)));   // darkest 40 % = plate
  const ink = mean(list.slice(Math.floor(n * 0.92)));       // brightest 8 % = ink
  const ratio = (ink.L + 0.05) / (plate.L + 0.05);
  console.log(`${label} box ${b}: plate rgb(${plate.r},${plate.g},${plate.b}) L=${plate.L.toFixed(4)} | ink rgb(${ink.r},${ink.g},${ink.b}) L=${ink.L.toFixed(4)} | contrast ${ratio.toFixed(2)}:1`);
}
