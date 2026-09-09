// certD1: console census across captures/certD1-*.console.txt — lines per level, page errors, unexpected warnings.
import { readFileSync, readdirSync } from 'fs';
const dir = 'captures';
const files = readdirSync(dir).filter(f => /^certD1-.*\.console\.txt$/.test(f)).sort();
const tot = {}; const unexpected = {}; const perFile = [];
for (const f of files) {
  const lines = readFileSync(`${dir}/${f}`, 'utf8').split('\n');
  const c = {};
  for (const l of lines) {
    const m = l.match(/^\[([A-Za-z-]+)\]/); if (!m) continue; const lv = m[1];
    c[lv] = (c[lv] || 0) + 1; tot[lv] = (tot[lv] || 0) + 1;
    if ((lv === 'warn' || lv === 'warning' || lv === 'error' || lv === 'PAGEERROR' || lv === 'HARNESS-ERROR' || lv === 'REQFAIL') && !/flatShading|X3595|X4000/.test(l)) { const k = l.slice(0, 160); unexpected[k] = (unexpected[k] || 0) + 1; }
  }
  perFile.push(`${f.padEnd(44)} ${Object.entries(c).map(([k, v]) => k + ':' + v).join(' ')}`);
}
console.log(perFile.join('\n'));
console.log('\nTOTAL', files.length, 'files:', JSON.stringify(tot));
console.log('UNEXPECTED (non-shader warn/error/pageerror/harness):', Object.keys(unexpected).length ? '' : 'none');
for (const [k, v] of Object.entries(unexpected)) console.log(`  x${v}  ${k}`);
// shader-warning census
let flat = 0, x3595 = 0, x4000 = 0;
for (const f of files) for (const l of readFileSync(`${dir}/${f}`, 'utf8').split('\n')) { if (/flatShading/.test(l)) flat++; if (/X3595/.test(l)) x3595++; if (/X4000/.test(l)) x4000++; }
console.log(`shader-noise lines: flatShading ${flat}, X3595 ${x3595}, X4000 ${x4000}`);
