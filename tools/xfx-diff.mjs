// A/B diff of an effect: captures/<name>_00.png (effect on) vs _01.png (effect off).
// usage: node tools/xfx-diff.mjs <name> [--box x,y,w,h] [--crop x,y,w,h --scale 3 --out file]
// Reports: pixels changed, their hue-band split, bbox, and (optionally) writes a 3x crop of the ON frame,
// plus <out>-mask.png showing only the effect pixels over a dim background.
import sharp from 'sharp';
import { loadPng, hsv, luma } from './xfx-lib.mjs';

const args = process.argv.slice(2);
const name = args[0];
const opt = { box: null, crop: null, scale: 3, out: null, thr: 24 };
for (let i = 1; i < args.length; i += 2) {
  const k = args[i].replace(/^--/, '');
  opt[k] = k === 'box' || k === 'crop' ? args[i + 1].split(',').map(Number) : k === 'out' ? args[i + 1] : Number(args[i + 1]);
}
const on = await loadPng(`captures/${name}_00.png`);
const off = await loadPng(`captures/${name}_01.png`);
const [bx, by, bw, bh] = opt.box ?? [0, 0, on.W, on.H];
let n = 0, danger = 0, heal = 0, violet = 0, amber = 0, other = 0, bright = 0, satSum = 0;
let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
const hues = [];
const maskBuf = Buffer.alloc(on.W * on.H * 3);
for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
  const p = on.px(x, y), q = off.px(x, y);
  const i = (y * on.W + x) * 3;
  maskBuf[i] = q[0] * 0.25; maskBuf[i + 1] = q[1] * 0.25; maskBuf[i + 2] = q[2] * 0.25;
  const d = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
  if (d <= opt.thr) continue;
  maskBuf[i] = p[0]; maskBuf[i + 1] = p[1]; maskBuf[i + 2] = p[2];
  n++;
  const [h, s] = hsv(...p); const L = luma(...p);
  if (L > 200) bright++;
  satSum += s;
  if (s > 0.35 && L > 40) {
    if (h >= 5 && h < 25) danger++; else if (h >= 110 && h < 150) heal++; else if (h >= 245 && h < 285) violet++; else if (h >= 30 && h < 50) amber++; else other++;
    hues.push(h);
  }
  if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
}
const hist = new Array(12).fill(0);
for (const h of hues) hist[Math.floor(h / 30)]++;
console.log(`${name}: changed px ${n} (thr ${opt.thr}) bbox [${minx},${miny}]-[${maxx},${maxy}] (${maxx - minx + 1}x${maxy - miny + 1})  L>200 ${bright}  meanSat ${(satSum / (n || 1)).toFixed(2)}`);
console.log(`  reserved bands among changed px: danger ${danger} heal ${heal} violet ${violet} amber ${amber} otherSat ${other}`);
console.log(`  hue hist (30deg bins, sat>0.35): ${hist.join('|')}`);
if (opt.out) {
  const [cx, cy, cw, ch] = opt.crop ?? [minx, miny, maxx - minx + 1, maxy - miny + 1];
  await sharp(`captures/${name}_00.png`).extract({ left: cx, top: cy, width: cw, height: ch }).resize(cw * opt.scale, ch * opt.scale, { kernel: 'nearest' }).toFile(opt.out);
  await sharp(maskBuf, { raw: { width: on.W, height: on.H, channels: 3 } }).extract({ left: cx, top: cy, width: cw, height: ch }).resize(cw * opt.scale, ch * opt.scale, { kernel: 'nearest' }).toFile(opt.out.replace(/\.png$/, '-mask.png'));
  console.log(`  wrote ${opt.out} and mask`);
}
