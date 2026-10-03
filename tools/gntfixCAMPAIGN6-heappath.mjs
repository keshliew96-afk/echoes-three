// gntfixCAMPAIGN6 — the SHORTEST strong path from the GC roots to one heap-snapshot node (by its V8 id, as the
// other heap tools print "@<id>"), i.e. why it is alive. BFS over non-weak edges from the synthetic root.
// usage: node --max-old-space-size=12000 tools/gntfixCAMPAIGN6-heappath.mjs X.heapsnapshot <id> [<id> ...]
import fs from 'fs';
const [file, ...ids] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const m = j.snapshot.meta; const nf = m.node_fields; const F = nf.length; const ef = m.edge_fields; const EF = ef.length;
const types = m.node_types[0]; const etypes = m.edge_types[0];
const iType = nf.indexOf('type'), iName = nf.indexOf('name'), iId = nf.indexOf('id'), iEc = nf.indexOf('edge_count'), iSize = nf.indexOf('self_size');
const eType = ef.indexOf('type'), eName = ef.indexOf('name_or_index'), eTo = ef.indexOf('to_node');
const nodes = j.nodes, edges = j.edges, S = j.strings;
const N = nodes.length / F;
const firstEdge = new Uint32Array(N + 1);
{ let e = 0; for (let n = 0; n < N; n++) { firstEdge[n] = e; e += nodes[n * F + iEc] * EF; } firstEdge[N] = e; }
const prev = new Int32Array(N).fill(-2); const prevEdge = new Int32Array(N).fill(-1);
prev[0] = -1;
let q = [0];
while (q.length) {
  const nq = [];
  for (const n of q) {
    for (let e = firstEdge[n]; e < firstEdge[n + 1]; e += EF) {
      const et = etypes[edges[e + eType]]; if (et === 'weak' || et === 'shortcut') continue;
      const to = edges[e + eTo] / F;
      if (prev[to] !== -2) continue;
      prev[to] = n; prevEdge[to] = e; nq.push(to);
    }
  }
  q = nq;
}
const nm = (n) => `${types[nodes[n * F + iType]]}:${String(S[nodes[n * F + iName]]).slice(0, 60)} @${nodes[n * F + iId]}`;
const edgeName = (e) => { const et = etypes[edges[e + eType]]; return et === 'element' || et === 'hidden' ? `[${edges[e + eName]}]` : `${et === 'property' ? '.' : '(' + et + ')'}${String(S[edges[e + eName]]).slice(0, 50)}`; };
for (const id of ids) {
  let n = -1;
  for (let k = 0; k < N; k++) if (nodes[k * F + iId] === +id) { n = k; break; }
  if (n < 0) { console.log('id', id, 'not found'); continue; }
  if (prev[n] === -2) { console.log('id', id, nm(n), 'unreachable by strong edges'); continue; }
  const path = [];
  for (let cur = n; cur > 0; cur = prev[cur]) path.push(`${nm(prev[cur])} -${edgeName(prevEdge[cur])}->`);
  console.log(`=== ${nm(n)} (self ${nodes[n * F + iSize]} B), ${path.length} hops from the root:`);
  for (const p of path.reverse()) console.log('   ', p);
}
