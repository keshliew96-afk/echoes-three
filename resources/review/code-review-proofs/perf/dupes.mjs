// Duplicate-block finder: 10-line windows of normalized code (identifiers/numbers abstracted)
// that occur in 2+ places. Reports duplicated lines per file and top cross-file clusters.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.argv[2]; const W = +(process.argv[3] || 10);
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.js')) out.push(p); } return out; };
const norm = (l) => l.trim().replace(/\/\/.*$/, '').replace(/'[^']*'|"[^"]*"|`[^`]*`/g, 'S').replace(/\b\d+(\.\d+)?\b/g, 'N').replace(/\s+/g, ' ');
const files = walk(ROOT); const map = new Map(); const linesOf = {};
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8').split('\n');
  const L = raw.map((l, i) => [norm(l), i]).filter(([n]) => n.length > 12 && !/^[})\];,]*$/.test(n));
  linesOf[f] = L;
  for (let i = 0; i + W <= L.length; i++) {
    const key = L.slice(i, i + W).map((x) => x[0]).join('\n');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push([f, L[i][1] + 1, i]);
  }
}
const dupLines = {}; const pairs = {};
for (const [, occ] of map) {
  if (occ.length < 2) continue;
  const fs_ = [...new Set(occ.map((o) => o[0]))];
  for (const [f, , i] of occ) { const s = dupLines[f] || (dupLines[f] = new Set()); for (let k = 0; k < W; k++) s.add(i + k); }
  if (fs_.length > 1) for (let a = 0; a < fs_.length; a++) for (let b = a + 1; b < fs_.length; b++) { const k = [fs_[a], fs_[b]].map((x) => path.relative(ROOT, x)).sort().join(' <> '); pairs[k] = (pairs[k] || 0) + 1; }
}
let tot = 0, totL = 0;
const rows = Object.entries(dupLines).map(([f, s]) => { tot += s.size; return [path.relative(ROOT, f), s.size, linesOf[f].length]; });
for (const f of files) totL += linesOf[f].length;
console.log(`window=${W} significant lines=${totL} duplicated=${tot} (${(100 * tot / totL).toFixed(1)}%)`);
console.log('--- top files by duplicated lines'); rows.sort((a, b) => b[1] - a[1]).slice(0, 18).forEach((r) => console.log(String(r[1]).padStart(6), String(r[2]).padStart(6), r[0]));
console.log('--- top cross-file pairs (shared windows)'); Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log(String(v).padStart(6), k));
