// Decode the PNGn|box|tick|danger|dataURL lines a certC3 console log carries into
// real PNG files under captures/. usage: node tools/certC3-decode.mjs <console.txt> <outPrefix>
import { readFileSync, writeFileSync } from 'fs';
const [, , src, prefix] = process.argv;
const txt = readFileSync(src, 'utf8');
let n = 0;
for (const line of txt.split('\n')) {
  const m = line.match(/"(PNG\d+)\|(\[[^\]]*\])\|(\d+)\|(\d+)\|data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
  if (!m) continue;
  const buf = Buffer.from(m[5], 'base64');
  const file = `captures/${prefix}-${m[1].toLowerCase()}.png`;
  writeFileSync(file, buf);
  console.log(file, 'box', m[2], 'tick', m[3], 'inPageDanger', m[4], buf.length, 'bytes');
  n++;
}
if (!n) console.log('no PNG lines found in', src);
