// Tiny CRLF-safe literal patcher: node tools/certfixDshouldfix4-patch.mjs <file> <json-of-[[old,new],...]>
import { readFileSync, writeFileSync } from 'fs';
const [file, specFile] = process.argv.slice(2);
const raw = readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const pairs = JSON.parse(readFileSync(specFile, 'utf8'));
for (const [a, b] of pairs) {
  const i = s.indexOf(a);
  if (i < 0) throw new Error('missing in ' + file + ': ' + a.slice(0, 80));
  if (s.indexOf(a, i + 1) >= 0) throw new Error('ambiguous in ' + file + ': ' + a.slice(0, 80));
  s = s.slice(0, i) + b + s.slice(i + a.length);
}
writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('patched', file, pairs.length, 'edits', crlf ? '(crlf)' : '(lf)');
