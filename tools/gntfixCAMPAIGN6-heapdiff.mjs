// gntfixCAMPAIGN6 — COPY of tools/gntccampaign6-heapdiff.mjs (campaign critic r6) — aggregate two V8 heap snapshots by (type, constructor name) and print the biggest growth.
import fs from 'fs';
function agg(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const m = j.snapshot.meta; const nf = m.node_fields; const types = m.node_types[0]; const F = nf.length;
  const iType = nf.indexOf('type'), iName = nf.indexOf('name'), iSize = nf.indexOf('self_size');
  const nodes = j.nodes, strings = j.strings; const out = new Map(); let total = 0;
  for (let i = 0; i < nodes.length; i += F) {
    const t = types[nodes[i + iType]]; let n = strings[nodes[i + iName]];
    if (t === 'string' || t === 'concatenated string' || t === 'sliced string') n = '(string)';
    else if (t === 'code') n = '(code)';
    else if (t === 'number' || t === 'hidden' || t === 'array') n = n.length > 40 ? n.slice(0, 40) : n;
    const k = t + ':' + (n || '').slice(0, 60); const s = nodes[i + iSize]; total += s;
    const o = out.get(k) || { c: 0, s: 0 }; o.c++; o.s += s; out.set(k, o);
  }
  return { out, total };
}
const a = agg(process.argv[2]), b = agg(process.argv[3]);
console.log('total self MB', (a.total / 1048576).toFixed(2), '->', (b.total / 1048576).toFixed(2));
const rows = [];
for (const [k, v] of b.out) { const u = a.out.get(k) || { c: 0, s: 0 }; rows.push({ k, dc: v.c - u.c, ds: v.s - u.s, c: v.c }); }
for (const [k, u] of a.out) if (!b.out.has(k)) rows.push({ k, dc: -u.c, ds: -u.s, c: 0 });
rows.sort((x, y) => y.ds - x.ds);
for (const r of rows.slice(0, 30)) console.log((r.ds / 1024).toFixed(1).padStart(9), 'KB', String(r.dc).padStart(7), 'objs', String(r.c).padStart(8), r.k);
console.log('--- by count');
rows.sort((x, y) => y.dc - x.dc);
for (const r of rows.slice(0, 15)) console.log(String(r.dc).padStart(7), 'objs', (r.ds / 1024).toFixed(1).padStart(9), 'KB', r.k);
