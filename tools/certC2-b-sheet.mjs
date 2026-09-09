// Decode the 480x360 canvas-region triptychs emitted by certC2-b-shots as [EVAL]
// data URLs into real PNGs under captures/ (pre / flash / post per non-killing
// MELEE hit). usage: node tools/certC2-b-sheet.mjs captures/certC2-b-shots.console.txt
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const file = process.argv[2] || 'captures/certC2-b-shots.console.txt';
const lines = readFileSync(file, 'latin1').split(/\r?\n/).filter((l) => l.startsWith('[EVAL] '));
let n = 0;
for (const ln of lines) {
  let o;
  try { o = JSON.parse(ln.slice(7)); } catch { continue; }
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { continue; } }
  if (!o || !Array.isArray(o.frames) || !o.frames.length) continue;
  n++;
  const tiles = [];
  for (const f of o.frames) {
    const buf = Buffer.from(f.url.split(',')[1], 'base64');
    const name = `captures/certC2-b-trip${o.set}-${f.k}-t${f.t}.png`;
    writeFileSync(name, buf);
    tiles.push({ name, ...f });
  }
  console.log(`set ${o.set}: hit t${o.t} ${o.src} ${o.amt} on enemy ${o.tgt}`);
  console.log('   pre W', JSON.stringify(o.pre), 'post W', JSON.stringify(o.post));
  for (const t of tiles) console.log('   ', t.name, 'tick', t.t, 'box', JSON.stringify(t.box), 'W', t.W);
}
console.log('sets decoded:', n);
