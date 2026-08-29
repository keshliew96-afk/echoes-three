// Criterion-3 seq measurer. Player stands at spawn (no teleport => camera
// fixed, allies idle), so frame_00 — captured BEFORE the first scheduled shot —
// is a valid same-load baseline. In every later frame:
//   BOLT   = strongest positive 9x9 luma delta in the flight band
//   SHADOW = strongest negative 9x9 luma delta in the ground band beneath it
// and the shadow's depth is re-measured against the untouched baseline pixel.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [base, ...files] = process.argv.slice(2);
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const load = async (f) => { const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, W: info.width, C: info.channels }; };
const B = await load(base);
const L = (im, x, y) => { const i = (y * im.W + x) * im.C; return luma(im.data[i], im.data[i + 1], im.data[i + 2]); };
const m9 = (im, x, y) => { let s = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) s += L(im, x + dx, y + dy); return s / 81; };
const X0 = +process.argv[1] || 0;
let prev = null;
for (const f of files) {
  const A = await load(f);
  let bx = 0, by = 0, bv = -1e9;
  for (let y = 380; y <= 445; y++) for (let x = 860; x <= 1500; x++) { const v = m9(A, x, y) - m9(B, x, y); if (v > bv) { bv = v; bx = x; by = y; } }
  let sx = 0, sy = 0, sv = 1e9;
  for (let y = by + 12; y <= by + 55; y++) for (let x = bx - 45; x <= bx + 45; x++) { const v = m9(A, x, y) - m9(B, x, y); if (v < sv) { sv = v; sx = x; sy = y; } }
  const bl = m9(B, sx, sy), nl = m9(A, sx, sy);
  const mv = prev ? `  moved bolt ${bx - prev[0] >= 0 ? '+' : ''}${bx - prev[0]} / shadow ${sx - prev[1] >= 0 ? '+' : ''}${sx - prev[1]}` : '';
  console.log(`${f}  bolt(${bx},${by}) +${bv.toFixed(0)}L  shadow(${sx},${sy}) ${sv.toFixed(1)}L  ground ${bl.toFixed(0)}->${nl.toFixed(0)} = ${(100 * (1 - nl / bl)).toFixed(1)}% darker  under-bolt dx${sx - bx} dy${sy - by}${mv}`);
  prev = [bx, sx];
}
