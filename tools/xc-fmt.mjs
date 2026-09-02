import { readFileSync } from 'fs';
const s = readFileSync(process.argv[2], 'utf8').replace(/\0/g, '');
for (const l of s.split('\n')) {
  if (!l.startsWith('[EVAL]')) continue;
  let v;
  try { v = JSON.parse(l.slice(7)); } catch (e) { console.log(l.slice(0, 300)); continue; }
  if (typeof v === 'string') { console.log(v); continue; }
  if (v && v.healer) {
    for (const k of Object.keys(v)) {
      console.log(k.toUpperCase(), 'nearest emitter arc =', v[k].pool);
      for (const a of v[k].arcs) console.log('   ', JSON.stringify(a));
    }
    continue;
  }
  console.log(JSON.stringify(v));
}
