#!/usr/bin/env node
// Round D F5a proof tool: is the Stag the brightest emitter in its room?
//   node tools/fa-bright.mjs <png> --boss x,y,w,h [--torch x,y ...] [--play y0,y1]
// Reports, per box of the SAME size (the boss box's), the LUMA >200 / >160
// share, and the brightest 24x24 block inside the play area (HUD rows
// excluded) with its position — so "brightest" is one number, not a feeling.
import { readFileSync } from 'fs';
import sharp from 'sharp';

const args = process.argv.slice(2);
const file = args[0];
let boss = null;
const torches = [];
let play = [60, 800];
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--boss') boss = args[++i].split(',').map(Number);
  else if (args[i] === '--torch') torches.push(args[++i].split(',').map(Number));
  else if (args[i] === '--play') play = args[++i].split(',').map(Number);
}
if (!file || !boss) {
  console.error('usage: fa-bright.mjs <png> --boss x,y,w,h [--torch x,y]... [--play y0,y1]');
  process.exit(2);
}
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const L = (x, y) => {
  const i = (y * W + x) * C;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};
function boxStats(x0, y0, w, h) {
  let n = 0, a200 = 0, a160 = 0, peak = 0;
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
      const l = L(x, y);
      n++;
      if (l > 200) a200++;
      if (l > 160) a160++;
      if (l > peak) peak = l;
    }
  return { n, p200: +((100 * a200) / n).toFixed(3), p160: +((100 * a160) / n).toFixed(3), peak: Math.round(peak) };
}
function brightestBlock(x0, y0, x1, y1, size = 24) {
  let best = { mean: -1, x: 0, y: 0 };
  for (let y = y0; y + size <= y1; y += 4)
    for (let x = x0; x + size <= x1; x += 4) {
      let s = 0;
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) s += L(x + xx, y + yy);
      const mean = s / (size * size);
      if (mean > best.mean) best = { mean: Math.round(mean), x, y };
    }
  return best;
}
const [bx, by, bw, bh] = boss;
console.log(`=== ${file} (${W}x${H})`);
console.log('boss box', boss.join(','), boxStats(bx, by, bw, bh));
for (const [tx, ty] of torches) {
  const x0 = Math.round(tx - bw / 2), y0 = Math.round(ty - bh / 2);
  console.log(`torch box @${tx},${ty}`, [x0, y0, bw, bh].join(','), boxStats(x0, y0, bw, bh));
}
const inBoss = (b) => b.x >= bx && b.x + 24 <= bx + bw && b.y >= by && b.y + 24 <= by + bh;
const bestAll = brightestBlock(0, play[0], W, play[1]);
const bestBoss = brightestBlock(bx, by, bx + bw, by + bh);
console.log('brightest 24px block in play area', bestAll, inBoss(bestAll) ? '(INSIDE boss box)' : '(outside boss box)');
console.log('brightest 24px block in boss box ', bestBoss);
