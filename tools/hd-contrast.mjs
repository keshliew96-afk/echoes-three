#!/usr/bin/env node
// HUD legibility probe (criterion 5): WCAG contrast between the INK pixels and
// the PLATE pixels inside a HUD box, measured off real rendered pixels.
//   node tools/hd-contrast.mjs <png> "x,y,w,h:label" ...
// Ink = the brightest 15% of the box, plate = the darkest 50%; the ratio is
// computed from their mean sRGB relative luminances.
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [inp, ...boxes] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(inp))
  .ensureAlpha()
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const lin = (v) => {
  v /= 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const rel = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

for (const spec of boxes) {
  const [bs, label = ''] = spec.split(':');
  const [x, y, w, h] = bs.split(',').map(Number);
  const px = [];
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const o = (j * W + i) * C;
      px.push([data[o], data[o + 1], data[o + 2]]);
    }
  px.sort((a, b) => lum(...b) - lum(...a));
  const nInk = Math.max(1, Math.round(px.length * 0.15));
  const nPlate = Math.max(1, Math.round(px.length * 0.5));
  const mean = (arr) => {
    const s = [0, 0, 0];
    for (const p of arr) {
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
    }
    return s.map((v) => Math.round(v / arr.length));
  };
  const ink = mean(px.slice(0, nInk));
  const plate = mean(px.slice(-nPlate));
  const L1 = rel(...ink);
  const L2 = rel(...plate);
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  console.log(
    JSON.stringify({
      label,
      box: [x, y, w, h],
      ink: `rgb(${ink.join(',')})`,
      inkLuma: Math.round(lum(...ink) * 10) / 10,
      plate: `rgb(${plate.join(',')})`,
      plateLuma: Math.round(lum(...plate) * 10) / 10,
      contrast: Math.round(ratio * 100) / 100,
    })
  );
}
