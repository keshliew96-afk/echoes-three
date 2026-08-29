// pol-shadow.mjs <png> <sx> <sy> [search=26] [ringIn=45] [ringOut=70]
// Is there a contact shadow at this screen point? Reports the darkest luma in a
// small box centred on the point, against the MEDIAN luma of an annulus of
// nearby ground. Used to prove a projectile's blob shadow exists and tracks:
// the point comes from projecting the bolt's own sim position to screen.
import sharp from 'sharp';
const [f, sxA, syA, sA, riA, roA] = process.argv.slice(2);
const sx = +sxA, sy = +syA;
const S = sA ? +sA : 26, RI = riA ? +riA : 45, RO = roA ? +roA : 70;
const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
const C = info.channels, W = info.width, H = info.height;
const L = (x, y) => {
  const i = (y * W + x) * C;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};
let min = 1e9, mx = 0, my = 0;
for (let y = Math.max(0, sy - S); y < Math.min(H, sy + S); y++) {
  for (let x = Math.max(0, sx - S); x < Math.min(W, sx + S); x++) {
    const l = L(x, y);
    if (l < min) { min = l; mx = x; my = y; }
  }
}
const ring = [];
for (let y = Math.max(0, sy - RO); y < Math.min(H, sy + RO); y++) {
  for (let x = Math.max(0, sx - RO); x < Math.min(W, sx + RO); x++) {
    const d = Math.hypot(x - sx, y - sy);
    if (d >= RI && d <= RO) ring.push(L(x, y));
  }
}
ring.sort((a, b) => a - b);
const med = ring[Math.floor(ring.length / 2)] ?? 0;
console.log(
  `${f} @(${sx},${sy}): darkest ${min.toFixed(0)} at (${mx},${my}) | surrounding ground median ${med.toFixed(0)} | shadow is ${(100 - (min / med) * 100).toFixed(0)}% darker`
);
