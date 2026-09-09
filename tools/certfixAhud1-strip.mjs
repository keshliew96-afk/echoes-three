// certfixAhud1 — mean luma of named boxes in one PNG (grounding / contact-shadow probe).
// usage: node tools/certfixAhud1-strip.mjs <png> name=x,y,w,h [name=...]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, ...rest] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const L = (o) => 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
for (const spec of rest) {
  const [name, box] = spec.split('=');
  const [x, y, w, h] = box.split(',').map(Number);
  let s = 0, n = 0, mn = 255, mx = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const o = (j * info.width + i) * info.channels; const v = L(o);
    s += v; n++; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  console.log(`${name.padEnd(14)} ${box.padEnd(18)} mean ${(s / n).toFixed(1)}  min ${mn.toFixed(0)}  max ${mx.toFixed(0)}`);
}
