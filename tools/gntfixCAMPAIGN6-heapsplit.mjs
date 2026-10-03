// gntfixCAMPAIGN6 — split a V8 heap snapshot's self size into V8 code (JIT / bytecode: node type "code"),
// engine-native data (type "native"), and everything the game's JavaScript allocates (objects, arrays,
// closures, strings, numbers, ...), so a heap trend across campaigns can be read without the JIT warm-up that
// keeps optimising more of the bundle the longer a session runs.
// usage: node --max-old-space-size=12000 tools/gntfixCAMPAIGN6-heapsplit.mjs a.heapsnapshot [b.heapsnapshot ...]
import fs from 'fs';
const MB = (b) => (b / 1048576).toFixed(2);
const rows = [];
for (const file of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const m = j.snapshot.meta; const nf = m.node_fields; const F = nf.length; const types = m.node_types[0];
  const iType = nf.indexOf('type'), iSize = nf.indexOf('self_size');
  const by = {};
  let total = 0;
  for (let i = 0; i < j.nodes.length; i += F) { const t = types[j.nodes[i + iType]]; const s = j.nodes[i + iSize]; by[t] = (by[t] || 0) + s; total += s; }
  const code = by.code || 0; const native = by.native || 0;
  const js = total - code - native;
  rows.push({ file: file.replace(/^.*[\\/]/, ''), total, code, native, js });
  console.log(file.replace(/^.*[\\/]/, '').padEnd(48), 'total', MB(total), 'MB | code', MB(code), '| native', MB(native), '| JS (objects, arrays, closures, strings, numbers)', MB(js));
}
if (rows.length > 1) {
  const a = rows[0], b = rows[rows.length - 1];
  console.log('delta first -> last: total', MB(b.total - a.total), 'MB, code', MB(b.code - a.code), ', native', MB(b.native - a.native), ', JS', MB(b.js - a.js));
}
