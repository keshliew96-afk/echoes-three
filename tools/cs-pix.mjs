// pix.mjs <png> <x,y,w,h> — reports the dominant saturated-green pixels (hex + count)
// and the max-saturation green sample inside the box, plus danger-band pixels.
import sharp from 'sharp';
const [f, boxArg] = process.argv.slice(2);
const [bx, by, bw, bh] = boxArg.split(',').map(Number);
const { data, info } = await sharp(f).extract({ left: bx, top: by, width: bw, height: bh }).raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
const counts = new Map();
let danger = 0, green = 0;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}
for (let i = 0; i < info.width * info.height; i++) {
  const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
  const [h, s, v] = hsv(r, g, b);
  if (s > 0.35 && v > 0.5) {
    if (h >= 100 && h < 160) { green++; const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join(''); counts.set(hex, (counts.get(hex) || 0) + 1); }
    if (h >= 5 && h < 25) danger++;
  }
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(JSON.stringify({ box: [bx, by, bw, bh], greenPx: green, dangerPx: danger, topGreens: top }));
