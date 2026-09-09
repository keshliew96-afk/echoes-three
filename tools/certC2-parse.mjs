// Pretty-print [EVAL] payloads from a certC2 console log.
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const filter = process.argv[3] || null;
const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.startsWith('[EVAL] '));
console.log('# evals', lines.length);
for (let i = 0; i < lines.length; i++) {
  let o; try { o = JSON.parse(lines[i].slice(7)); } catch { o = lines[i].slice(7, 300); }
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch {} }
  const s = JSON.stringify(o);
  if (filter && !s.includes(filter)) continue;
  console.log(`--- [${i}] ---`);
  console.log(JSON.stringify(o, null, 1).slice(0, 6000));
}
