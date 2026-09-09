// Exact-string patcher for the A-world r2 fix pass. CRLF-aware (the repo's
// source files use CRLF), asserts each search string occurs exactly once, and
// writes nothing unless every edit in the batch matches.
import { readFileSync, writeFileSync } from 'fs';
export function edit(file, pairs) {
  let src = readFileSync(file, 'utf8');
  const crlf = src.includes('\r\n');
  const n = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s.replace(/\r\n/g, '\n'));
  const out = [];
  for (const [a0, b0] of pairs) {
    const a = n(a0), b = n(b0);
    const hits = src.split(a).length - 1;
    if (hits !== 1) { console.error(`${hits === 0 ? 'MISS' : 'AMBIGUOUS(' + hits + ')'} in ${file}:\n---\n${a0.slice(0, 200)}\n---`); process.exit(1); }
    src = src.replace(a, b);
    out.push(a0.split('\n')[0].trim().slice(0, 60));
  }
  writeFileSync(file, src);
  console.log(`patched ${file}: ${out.length} edit(s)`);
}
