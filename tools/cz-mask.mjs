// Critic tool: ASCII map of a region, classifying pixels by simple rules.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, xs, ys, ws, hs] = process.argv.slice(2);
const X = +xs, Y = +ys, Wd = +ws, Hd = +hs;
const { data, info } = await sharp(readFileSync(file)).removeAlpha().extract({ left: X, top: Y, width: Wd, height: Hd }).raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; };
let out = '    ' + Array.from({ length: Wd }, (_, i) => ((X + i) % 10)).join('') + '\n';
for (let y = 0; y < Hd; y++) {
  let row = String(Y + y).padStart(4) + ' ';
  for (let x = 0; x < Wd; x++) {
    const i = (y * Wd + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, v] = hsv(r, g, b);
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let ch = '.';
    if (L < 55 && s < 0.35) ch = '#';                 // ink / dark
    else if (h >= 60 && h < 170 && s > 0.25) ch = 'g'; // ground green
    else if (h >= 20 && h < 60 && s > 0.30) ch = 'W';  // wood / tan
    else if (s < 0.22 && L > 120) ch = 'p';            // pale fur
    else ch = '?';
    row += ch;
  }
  out += row + '\n';
}
console.log(out);
