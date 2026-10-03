// gntfixCAMPAIGN6 — where does the heap GROW between two V8 heap snapshots? Every node (optionally filtered by
// type / class name) is keyed by "type:class <- retainer chain" (depth --depth, array indices folded to [i],
// minified scope ids folded), counted in snapshot A and in snapshot B; the keys with the largest NET growth
// (count and self size) are printed. Unlike a "new objects" listing this ignores churn (a dressing rebuilt
// with new ids each campaign nets to 0) and names only what accumulates.
// usage: node --max-old-space-size=12000 tools/gntfixCAMPAIGN6-heapchain.mjs A.heapsnapshot B.heapsnapshot [--depth 4] [--type object] [--name Foo] [--top 30]
import fs from 'fs';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const DEPTH = +opt('depth', 4);
const TYPE = opt('type', null);
const NAME = opt('name', null);
const TOP = +opt('top', 30);
const WIDTH = +opt('width', 300);
function analyse(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const m = j.snapshot.meta; const nf = m.node_fields; const F = nf.length; const ef = m.edge_fields; const EF = ef.length;
  const types = m.node_types[0]; const etypes = m.edge_types[0];
  const iType = nf.indexOf('type'), iName = nf.indexOf('name'), iSize = nf.indexOf('self_size'), iEc = nf.indexOf('edge_count');
  const eType = ef.indexOf('type'), eName = ef.indexOf('name_or_index'), eTo = ef.indexOf('to_node');
  const nodes = j.nodes, edges = j.edges, S = j.strings;
  const N = nodes.length / F;
  const firstEdge = new Uint32Array(N + 1);
  { let e = 0; for (let n = 0; n < N; n++) { firstEdge[n] = e; e += nodes[n * F + iEc] * EF; } firstEdge[N] = e; }
  // first strong retainer of every node (+ the edge name)
  const ret = new Int32Array(N).fill(-1); const retEdge = new Array(N);
  for (let n = 0; n < N; n++) {
    for (let e = firstEdge[n]; e < firstEdge[n + 1]; e += EF) {
      const et = etypes[edges[e + eType]]; if (et === 'weak' || et === 'shortcut') continue;
      const to = edges[e + eTo] / F;
      if (ret[to] !== -1) continue;
      ret[to] = n;
      retEdge[to] = et === 'element' || et === 'hidden' ? '[i]' : String(S[edges[e + eName]]);
    }
  }
  const nm = (n) => { const t = types[nodes[n * F + iType]]; let s = String(S[nodes[n * F + iName]]); s = s.replace(/@\d+/g, '@').slice(0, 40); return t + ':' + s; };
  const out = new Map();
  for (let n = 0; n < N; n++) {
    const t = types[nodes[n * F + iType]];
    if (TYPE && t !== TYPE) continue;
    if (NAME && String(S[nodes[n * F + iName]]) !== NAME) continue;
    if (t === 'hidden' || t === 'synthetic') continue;
    const parts = [nm(n)];
    let cur = n;
    for (let d = 0; d < DEPTH; d++) { const p = ret[cur]; if (p < 0) break; parts.push(nm(p) + '.' + retEdge[cur].replace(/^\d+$/, '[i]').slice(0, 30)); cur = p; }
    const key = parts.join(' <- ');
    const o = out.get(key) || { c: 0, s: 0 }; o.c++; o.s += nodes[n * F + iSize]; out.set(key, o);
  }
  return out;
}
const A = analyse(argv[0]);
const B = analyse(argv[1]);
const rows = [];
for (const [k, b] of B) { const a = A.get(k) || { c: 0, s: 0 }; if (b.c !== a.c || b.s !== a.s) rows.push({ k, dc: b.c - a.c, ds: b.s - a.s, c: b.c }); }
for (const [k, a] of A) if (!B.has(k)) rows.push({ k, dc: -a.c, ds: -a.s, c: 0 });
rows.sort((x, y) => y.ds - x.ds);
console.log('--- net growth by self size');
for (const r of rows.slice(0, TOP)) console.log((r.ds / 1024).toFixed(1).padStart(8), 'KB', String(r.dc).padStart(7), 'objs', String(r.c).padStart(7), r.k.slice(0, WIDTH));
rows.sort((x, y) => y.dc - x.dc);
console.log('--- net growth by count');
for (const r of rows.slice(0, TOP)) console.log(String(r.dc).padStart(7), 'objs', (r.ds / 1024).toFixed(1).padStart(8), 'KB', String(r.c).padStart(7), r.k.slice(0, WIDTH));
