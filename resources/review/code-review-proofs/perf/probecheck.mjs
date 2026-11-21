// Static staleness check of tools/: unresolved relative imports, named imports a target no longer exports,
// probe references to __echoes.cmd('<name>') names that no case in src handles.
import fs from 'node:fs';
import path from 'node:path';
const REPO = process.argv[2]; const T = path.join(REPO, 'tools');
const exportsOf = (src) => { const n = new Set(); for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/g)) n.add(m[1]); for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const p of m[1].split(',')) { const x = p.trim().split(/\s+as\s+/).pop().trim(); if (x) n.add(x); } if (/export\s+default/.test(src)) n.add('default'); if (/export\s*\*\s*from/.test(src)) n.add('*'); return n; };
const res = (from, spec) => { const p = path.resolve(path.dirname(from), spec); for (const c of [p, p + '.js', p + '.mjs', path.join(p, 'index.js')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; return null; };
const files = fs.readdirSync(T).filter((f) => /\.(mjs|js)$/.test(f)).map((f) => path.join(T, f));
// every cmd case name handled in src
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, o) : p.endsWith('.js') && o.push(p); } return o; };
const caseNames = new Set(); for (const f of walk(path.join(REPO, 'src'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/case\s+'([\w-]+)'/g)) caseNames.add(m[1]);
const cmdSrc = new Set(); for (const f of walk(path.join(REPO, 'src'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/name === '([\w-]+)'|\.has\('([\w-]+)'\)|\[?'([\w-]+)'\]?\s*:\s*\(/g)) cmdSrc.add(m[1] || m[2] || m[3]);
let unresolved = 0, missingNamed = 0, unknownCmd = 0; const brokenFiles = new Set(); const examples = []; const cmdMiss = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s+([^;'"]*?)\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const t = res(f, m[2]);
    if (!t) { unresolved++; brokenFiles.add(f); examples.push(`${path.basename(f)}: unresolved ${m[2]}`); continue; }
    const br = m[1].match(/\{([^}]*)\}/); if (!br) continue;
    const ex = exportsOf(fs.readFileSync(t, 'utf8')); if (ex.has('*')) continue;
    for (const p of br[1].split(',')) { const n = p.trim().split(/\s+as\s+/)[0].trim(); if (n && !ex.has(n)) { missingNamed++; brokenFiles.add(f); examples.push(`${path.basename(f)}: ${n} not exported by ${path.relative(REPO, t)}`); } }
  }
  for (const m of src.matchAll(/\.cmd\(\s*'([\w-]+)'/g)) if (!caseNames.has(m[1]) && !cmdSrc.has(m[1])) { unknownCmd++; brokenFiles.add(f); cmdMiss.set(m[1], (cmdMiss.get(m[1]) || 0) + 1); }
}
console.log(JSON.stringify({ probes: files.length, unresolvedImports: unresolved, missingNamedImports: missingNamed, unknownCmdCalls: unknownCmd, filesWithAnyBreak: brokenFiles.size }));
console.log(examples.slice(0, 15).join('\n'));
console.log('unknown cmds:', [...cmdMiss].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}x${v}`).join(' '));
