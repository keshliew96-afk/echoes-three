#!/usr/bin/env node
// Critic-only frame differ (REFERENCE MATCHER r3): counts pixels whose |dLuma|>thr in a box.
// usage: node tools/certA3-ref-diff.mjs a.png b.png [x,y,w,h] [thr]
import sharp from 'sharp';
const [a, b, boxStr, thrStr] = process.argv.slice(2);
const thr = Number(thrStr || 12);
async function raw(p) {
  const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, c: info.channels };
}
const A = await raw(a), B = await raw(b);
let x0 = 0, y0 = 0, w = A.w, h = A.h;
if (boxStr && boxStr.includes(',')) { const p = boxStr.split(',').map(Number); [x0, y0, w, h] = p; }
let changed = 0, total = 0, sum = 0, maxd = 0, maxAt = null;
for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
  const i = (y * A.w + x) * A.c;
  const la = 0.2126 * A.data[i] + 0.7152 * A.data[i + 1] + 0.0722 * A.data[i + 2];
  const lb = 0.2126 * B.data[i] + 0.7152 * B.data[i + 1] + 0.0722 * B.data[i + 2];
  const d = Math.abs(la - lb); total++; sum += d;
  if (d > maxd) { maxd = d; maxAt = [x, y]; }
  if (d > thr) changed++;
}
console.log(`${a} vs ${b} box ${x0},${y0},${w},${h} thr${thr}: changed ${changed}px (${(100*changed/total).toFixed(2)}%) meanDelta ${(sum/total).toFixed(2)} maxDelta ${maxd.toFixed(0)} at ${maxAt}`);
