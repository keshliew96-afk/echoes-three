// Decode certC2-telepx / certC2-telefull [EVAL] crop data URLs into PNGs.
import { readFileSync, writeFileSync } from 'node:fs';
const lines = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(l => l.startsWith('[EVAL] '));
let n = 0;
for (const ln of lines) {
  let o; try { o = JSON.parse(ln.slice(7)); } catch { continue; }
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { continue; } }
  if (!o || o.telepx === undefined || o.none) continue;
  const buf = Buffer.from(o.url.split(',')[1], 'base64');
  const name = `captures/certC2-telepx-${o.telepx}.png`;
  writeFileSync(name, buf);
  n++;
  console.log(name, '| id', o.id, 'start', o.start, 'resolveTick', o.resolveTick, 'shotTick', o.t,
    'ticksLeft', o.left, '| world', JSON.stringify(o.world), '| fullFrameBox', JSON.stringify(o.box),
    '| danger', o.st.danger, 'violet', o.st.violet, 'amber', o.st.amber, 'heal', o.st.heal,
    '>160', (100 * o.st.a160 / o.st.n).toFixed(2) + '%', '>200', (100 * o.st.a200 / o.st.n).toFixed(2) + '%');
}
console.log('decoded', n);
