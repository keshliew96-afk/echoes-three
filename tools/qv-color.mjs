#!/usr/bin/env node
// Critic scanner: locate pixels near a target hex (RGB distance) in a PNG.
// usage: node tools/qv-color.mjs <png> <hex> [tol] [--box x,y,w,h] [--diff other.png]
import sharp from 'sharp';
const args = process.argv.slice(2);
const files = []; let tol = 40; let box = null; let diff = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--box') { const p = args[++i].split(',').map(Number); box = { left:p[0], top:p[1], width:p[2], height:p[3] }; }
  else if (a === '--diff') diff = args[++i];
  else files.push(a);
}
const png = files[0]; const hex = files[1]; if (files[2]) tol = Number(files[2]);
const tr = parseInt(hex.slice(1,3),16), tg = parseInt(hex.slice(3,5),16), tb = parseInt(hex.slice(5,7),16);
async function load(f) {
  let img = sharp(f).removeAlpha();
  if (box) img = img.extract(box);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
}
const A = await load(png);
const B = diff ? await load(diff) : null;
let n = 0, sx = 0, sy = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
const pts = [];
for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
  const i = (y*A.w+x)*A.ch;
  const r = A.data[i], g = A.data[i+1], b = A.data[i+2];
  const d = Math.hypot(r-tr, g-tg, b-tb);
  if (d > tol) continue;
  if (B) { const r2=B.data[i],g2=B.data[i+1],b2=B.data[i+2]; if (Math.hypot(r2-tr,g2-tg,b2-tb) <= tol) continue; }
  n++; sx += x; sy += y; pts.push([x,y,r,g,b]);
  if (x<minx) minx=x; if (x>maxx) maxx=x; if (y<miny) miny=y; if (y>maxy) maxy=y;
}
const off = box ? [box.left, box.top] : [0,0];
console.log(JSON.stringify({ file: png, target: hex, tol, matched: n, pctOfFrame: +(100*n/(A.w*A.h)).toFixed(4),
  centroid: n ? [Math.round(sx/n)+off[0], Math.round(sy/n)+off[1]] : null,
  bbox: n ? [minx+off[0], miny+off[1], maxx-minx+1, maxy-miny+1] : null,
  sample: pts.slice(0,6) }, null, 1));
