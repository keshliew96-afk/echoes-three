// Sample a vertical column of pixels: rgb, hue, HSV saturation, luma.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, x, y0, y1, step] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0]; };
for (let y = +y0; y <= +y1; y += +(step || 6)) {
  const i = (y * W + +x) * C; const r = data[i], g = data[i + 1], b = data[i + 2];
  const [h, s] = hsv(r, g, b);
  console.log(`y${String(y).padStart(4)}  rgb(${r},${g},${b})  h${h.toFixed(0).padStart(3)} s${s.toFixed(2)} L${(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(0)}`);
}
