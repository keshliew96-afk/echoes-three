// certE1 column scan: for a PNG and column x, print warm-dirt rows (hue 15-55, sat>0.18) in [y0,y1].
import sharp from 'sharp';
const [p, xs, y0s, y1s] = process.argv.slice(2);
const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
const x = +xs, y0 = +y0s, y1 = +y1s;
const px = (X, Y) => { const i = (Y * info.width + X) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; };
const rows = []; let firstWarm = null, lastWarm = null;
for (let y = y0; y <= y1; y += 2) {
  // average 5 px wide to suppress grass tufts
  let R = 0, G = 0, B = 0; for (let dx = -2; dx <= 2; dx++) { const [r, g, b] = px(x + dx, y); R += r; G += g; B += b; }
  const [h, s, v] = hsv(R / 5, G / 5, B / 5); const warm = h >= 15 && h < 55 && s > 0.18;
  if (warm) { if (firstWarm === null) firstWarm = y; lastWarm = y; }
  rows.push(`${y}:${Math.round(h)}/${s.toFixed(2)}/${(v * 255).toFixed(0)}${warm ? '*' : ''}`);
}
console.log(JSON.stringify({ p, x, firstWarm, lastWarm }));
console.log(rows.join(' '));
