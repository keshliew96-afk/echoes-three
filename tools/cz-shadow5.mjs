// Local-contrast contact-shadow test: for a given core, scan rows below it and
// report the row profile so a dip under the bolt is visible against its own
// bloom-lifted neighbourhood.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, cxs, cys] = process.argv.slice(2);
const cx = +cxs, cy = +cys;
const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, C = info.channels;
const L = (x, y) => { const i = (y * W + x) * C; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
for (let dy = 16; dy <= 48; dy += 4) {
  const row = [];
  for (let dx = -60; dx <= 60; dx += 6) row.push(L(cx + dx, cy + dy).toFixed(0).padStart(3));
  console.log(`dy=${String(dy).padStart(2)}  ${row.join(' ')}`);
}
console.log(`         ${Array.from({ length: 21 }, (_, i) => String(-60 + i * 6).padStart(3)).join(' ')}  (dx)`);
