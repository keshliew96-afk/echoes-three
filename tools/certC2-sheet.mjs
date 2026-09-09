// Decode the per-frame canvas crops that certC2-pxgrab emits as [EVAL] data
// URLs into real PNG files under captures/ (3x nearest zoom) plus one contact
// sheet per hit set. usage: node tools/certC2-sheet.mjs captures/certC2-pxgrab.console.txt
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const file = process.argv[2] || 'captures/certC2-pxgrab.console.txt';
const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('[EVAL] '));
const sets = [];
for (const ln of lines) {
  let o;
  try { o = JSON.parse(ln.slice(7)); } catch { continue; }
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { continue; } }
  if (o && Array.isArray(o.frames) && o.frames.length) sets.push(o);
}
console.log('sets:', sets.length);
const Z = 3;
for (const s of sets) {
  const tiles = [];
  for (let i = 0; i < s.frames.length; i++) {
    const f = s.frames[i];
    const buf = Buffer.from(f.url.split(',')[1], 'base64');
    const meta = await sharp(buf).metadata();
    const z = await sharp(buf).resize(meta.width * Z, meta.height * Z, { kernel: 'nearest' }).png().toBuffer();
    const name = `captures/certC2-pxgrab${s.set}-g${String(i).padStart(2, '0')}-t${f.t}-${f.k}.png`;
    writeFileSync(name, z);
    tiles.push({ input: z, top: 4, left: 4 + i * (meta.width * Z + 4) });
  }
  const w0 = (await sharp(Buffer.from(s.frames[0].url.split(',')[1], 'base64')).metadata());
  const sheet = await sharp({ create: { width: 8 + s.frames.length * (w0.width * Z + 4), height: 8 + w0.height * Z, channels: 3, background: { r: 18, g: 18, b: 22 } } })
    .composite(tiles).png().toBuffer();
  const out = `captures/certC2-pxgrab${s.set}-sheet.png`;
  writeFileSync(out, sheet);
  console.log(out, '| id', s.id, 'hitTick', s.hitTick, 'amt', s.amt, '| box0', JSON.stringify(s.frames[0].box));
  console.log('   ', s.frames.map((f) => `${f.k}${f.t}:W${f.st.W}/L${f.st.L}/mx${f.st.mx}`).join('  '));
}
