// pol-probe.mjs <png> '[["label",x,y],...]' [radius=2]
// Averages a small square around each point and reports rgb / hsv / luma.
// The polish chain's spot-check: "what colour IS that pool core / that stump /
// that ring band" without eyeballing a screenshot.
import sharp from 'sharp';
const [f, ptsArg, radArg] = process.argv.slice(2);
const pts = JSON.parse(ptsArg);
const R = radArg ? Number(radArg) : 2;
const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
const C = info.channels, W = info.width, H = info.height;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}
for (const [label, x, y] of pts) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const px = Math.min(W - 1, Math.max(0, x + dx));
      const py = Math.min(H - 1, Math.max(0, y + dy));
      const i = (py * W + px) * C;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
  const [h, s, v] = hsv(r, g, b);
  console.log(
    String(label).padEnd(16),
    `rgb(${r},${g},${b})`.padEnd(18),
    `h${h.toFixed(1)} s${s.toFixed(2)} v${v.toFixed(2)}`.padEnd(24),
    `L${(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(0)}`
  );
}
