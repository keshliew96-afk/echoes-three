// Print the luma profile of one image row across an x-range, in 4px steps,
// so a dash trail's per-ghost separation is visible as numbers.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, y0, x0, x1, step] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const m = (x, y) => { let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) { const i = ((+y + dy) * W + x) * C; s += luma(data[i], data[i + 1], data[i + 2]); n++; } return s / n; };
const out = [];
for (let x = +x0; x <= +x1; x += +(step || 4)) out.push(`${x}:${m(x, +y0).toFixed(0)}`);
console.log(`${file} row y=${y0}`);
console.log(out.join(' '));
