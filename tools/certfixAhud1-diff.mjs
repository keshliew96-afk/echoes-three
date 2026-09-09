// certfixAhud1 — box pixel diff between two PNGs (the hover / buy / deny proofs).
// usage: node tools/certfixAhud1-diff.mjs a.png b.png [--box x,y,w,h] [--thr 12]
// prints % of pixels whose max-channel abs diff exceeds thr, and the mean abs diff.
import { readFileSync } from 'fs';
import sharp from 'sharp';

const args = process.argv.slice(2);
let box = null;
let thr = 12;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--box') box = args[++i].split(',').map(Number);
  else if (args[i] === '--thr') thr = Number(args[++i]);
  else files.push(args[i]);
}
if (files.length < 2) {
  console.error('usage: certfixAhud1-diff.mjs a.png b.png [--box x,y,w,h] [--thr n]');
  process.exit(2);
}
async function load(f) {
  let img = sharp(readFileSync(f)).ensureAlpha().removeAlpha();
  if (box) img = img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
  return img.raw().toBuffer({ resolveWithObject: true });
}
const a = await load(files[0]);
const b = await load(files[1]);
if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
  console.error('size mismatch');
  process.exit(1);
}
const N = a.info.width * a.info.height;
let changed = 0;
let sum = 0;
for (let i = 0; i < N; i++) {
  const o = i * 3;
  const d = Math.max(
    Math.abs(a.data[o] - b.data[o]),
    Math.abs(a.data[o + 1] - b.data[o + 1]),
    Math.abs(a.data[o + 2] - b.data[o + 2])
  );
  sum += d;
  if (d > thr) changed++;
}
console.log(
  `${files[0]} vs ${files[1]}${box ? ` box ${box.join(',')}` : ''}: changed ${((changed / N) * 100).toFixed(2)}% (thr ${thr}), meanAbs ${(sum / N).toFixed(2)}`
);
