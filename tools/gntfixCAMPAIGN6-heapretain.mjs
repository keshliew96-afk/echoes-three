// gntfixCAMPAIGN6 — COPY of tools/gntccampaign6-heapretain.mjs (campaign critic r6) — objects present in snapshot B but not A (stable V8 ids), grouped by their retainer chain.
import fs from 'fs';
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const A = load(process.argv[2]);
const idsA = new Set(); { const m = A.snapshot.meta; const F = m.node_fields.length; const iId = m.node_fields.indexOf('id'); for (let i = 0; i < A.nodes.length; i += F) idsA.add(A.nodes[i + iId]); }
const B = load(process.argv[3]);
const want = process.argv[4] || 'Array';
const m = B.snapshot.meta; const nf = m.node_fields; const F = nf.length; const ef = m.edge_fields; const EF = ef.length;
const types = m.node_types[0]; const etypes = m.edge_types[0];
const iType = nf.indexOf('type'), iName = nf.indexOf('name'), iId = nf.indexOf('id'), iSize = nf.indexOf('self_size'), iEc = nf.indexOf('edge_count');
const eType = ef.indexOf('type'), eName = ef.indexOf('name_or_index'), eTo = ef.indexOf('to_node');
const N = B.nodes.length / F; const S = B.strings;
const firstEdge = new Uint32Array(N + 1); { let e = 0; for (let n = 0; n < N; n++) { firstEdge[n] = e; e += B.nodes[n * F + iEc] * EF; } firstEdge[N] = e; }
// reverse edges (only non-weak)
const retainers = new Map();
for (let n = 0; n < N; n++) {
  for (let e = firstEdge[n]; e < firstEdge[n + 1]; e += EF) {
    const et = etypes[B.edges[e + eType]]; if (et === 'weak' || et === 'shortcut') continue;
    const to = B.edges[e + eTo] / F;
    let arr = retainers.get(to); if (!arr) retainers.set(to, (arr = [])); if (arr.length < 3) arr.push([n, et === 'element' || et === 'hidden' ? '[' + B.edges[e + eName] + ']' : S[B.edges[e + eName]]]);
  }
}
const nm = (n) => { const t = types[B.nodes[n * F + iType]]; return t + ':' + String(S[B.nodes[n * F + iName]]).slice(0, 50); };
const groups = new Map(); let cnt = 0;
for (let n = 0; n < N; n++) {
  const t = types[B.nodes[n * F + iType]]; const name = S[B.nodes[n * F + iName]];
  if (!(t === 'object' && name === want)) continue;
  if (idsA.has(B.nodes[n * F + iId])) continue;
  cnt++;
  // chain of up to 4 retainers
  let chain = []; let cur = n;
  for (let d = 0; d < 5; d++) { const r = retainers.get(cur); if (!r || !r.length) break; const [p, en] = r[0]; chain.push(nm(p) + '.' + en); cur = p; }
  const key = chain.map((c) => c.replace(/\[\d+\]/g, '[i]')).join(' <- ');
  groups.set(key, (groups.get(key) || 0) + 1);
}
console.log('new', want, 'objects:', cnt);
for (const [k, v] of [...groups].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(String(v).padStart(7), k.slice(0, 400));
