// Dead-export finder: exported names in src/ that no src/ module imports.
// Resolves relative import paths; handles named, default, namespace (ns.X), re-exports, dynamic import(m).X (approx).
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.argv[2];
const EXTRA = process.argv[3]; // optional: tools dir, counted separately
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(m?js)$/.test(e.name)) out.push(p); } return out; };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
function exportsOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s+(?:const|let|var)\s*\{([^}]*)\}/gm)) for (const p of m[1].split(',')) { const n = p.split(':').pop().trim().split('=')[0].trim(); if (n) names.add(n); }
  for (const m of src.matchAll(/^\s*export\s*\{([^}]*)\}(?!\s*from)/gm)) for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/).pop().trim(); if (n) names.add(n); }
  if (/^\s*export\s+default\b/m.test(src)) names.add('default');
  return names;
}
function resolveSpec(from, spec) {
  if (!spec.startsWith('.')) return null;
  let p = path.resolve(path.dirname(from), spec);
  for (const c of [p, p + '.js', p + '.mjs', path.join(p, 'index.js')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}
function usesOf(file, src, used) {
  const mark = (target, n) => { if (!target) return; (used.get(target) || used.set(target, new Set()).get(target)).add(n); };
  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const t = resolveSpec(file, m[2]); const cl = m[1];
    const def = cl.match(/^([A-Za-z_$][\w$]*)\s*(,|$)/); if (def) mark(t, 'default');
    const br = cl.match(/\{([^}]*)\}/); if (br) for (const p of br[1].split(',')) { const n = p.trim().split(/\s+as\s+/)[0].trim(); if (n) mark(t, n); }
    const ns = cl.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/); if (ns) { for (const u of src.matchAll(new RegExp(`\\b${ns[1]}\\.([A-Za-z_$][\\w$]*)`, 'g'))) mark(t, u[1]); if (new RegExp(`\\b${ns[1]}\\b(?!\\.)`).test(src.replace(m[0], ''))) mark(t, '*'); }
  }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) { const t = resolveSpec(file, m[2]); for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/)[0].trim(); if (n) mark(t, n); } }
  for (const m of src.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) mark(resolveSpec(file, m[1]), '*');
  for (const m of src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) mark(resolveSpec(file, m[1]), '*dyn');
}
const files = walk(ROOT);
const srcs = new Map(files.map((f) => [f, strip(fs.readFileSync(f, 'utf8'))]));
const used = new Map();
for (const [f, s] of srcs) usesOf(f, s, used);
const usedTools = new Map();
if (EXTRA) for (const f of EXTRA.split(',').flatMap((d) => walk(d))) usesOf(f, strip(fs.readFileSync(f, 'utf8')), usedTools);
let total = 0, dead = 0, deadNoLocal = 0, toolsOnly = 0; const rows = []; const perFile = {};
for (const [f, s] of srcs) {
  const ex = exportsOf(s); const u = used.get(f) || new Set(); const ut = usedTools.get(f) || new Set();
  if (u.has('*') || u.has('*dyn')) { total += ex.size; continue; } // namespace-spread / dynamic: assume all used
  for (const n of ex) {
    total++;
    if (u.has(n)) continue;
    dead++;
    const localUses = n === 'default' ? 1 : (s.match(new RegExp(`(?<![\\w$.])${n.replace(/\$/g, '\\$')}(?![\\w$])`, 'g')) || []).length - 1;
    const tools = ut.has(n) || ut.has('*') || ut.has('*dyn');
    if (tools) toolsOnly++;
    if (localUses <= 0 && !tools) deadNoLocal++;
    rows.push(`${path.relative(ROOT, f)}\t${n}\t${localUses <= 0 ? 'UNUSED-ANYWHERE' : 'used-locally'}${tools ? '\ttools-only' : ''}`);
    perFile[path.relative(ROOT, f)] = (perFile[path.relative(ROOT, f)] || 0) + 1;
  }
}
fs.writeFileSync(process.argv[4] || '/dev/stdout', rows.join('\n') + '\n');
console.error(JSON.stringify({ files: files.length, exports: total, notImportedBySrc: dead, ofWhichToolsOnly: toolsOnly, unusedEvenLocally_notTools: deadNoLocal }));
console.error(Object.entries(perFile).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${v}\t${k}`).join('\n'));
