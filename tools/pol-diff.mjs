// pol-diff.mjs <a.png> <b.png> <x,y,w,h>
// Luma difference of two frames inside a box: reports where A is darkest
// relative to B and vice versa, plus the extreme values. Built to prove a
// MOVING contact shadow: the pixel a projectile's blob darkens in frame A is
// undarkened in frame B once the projectile has flown on.
import sharp from 'sharp';
const [fa, fb, boxArg] = process.argv.slice(2);
const [bx, by, bw, bh] = boxArg.split(',').map(Number);
const grab = async (f) =>
  sharp(f).extract({ left: bx, top: by, width: bw, height: bh }).raw().toBuffer({ resolveWithObject: true });
const A = await grab(fa);
const B = await grab(fb);
const C = A.info.channels;
const L = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
let best = { d: 1e9 }, worst = { d: -1e9 };
for (let y = 0; y < bh; y++) {
  for (let x = 0; x < bw; x++) {
    const i = (y * bw + x) * C;
    const la = L(A.data, i), lb = L(B.data, i);
    const d = la - lb;
    if (d < best.d) best = { d, x: bx + x, y: by + y, la, lb };
    if (d > worst.d) worst = { d, x: bx + x, y: by + y, la, lb };
  }
}
console.log(
  `A darkest vs B: (${best.x},${best.y}) A_luma ${best.la.toFixed(0)} vs B_luma ${best.lb.toFixed(0)}  delta ${best.d.toFixed(0)}`
);
console.log(
  `A brightest vs B: (${worst.x},${worst.y}) A_luma ${worst.la.toFixed(0)} vs B_luma ${worst.lb.toFixed(0)}  delta ${worst.d.toFixed(0)}`
);
