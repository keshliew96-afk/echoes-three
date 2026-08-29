// Critic (skills-block re-verify) helper: build an action JSON from a plain
// source file. Steps separated by a line of "---". A step starting with
// "@wait N" becomes {type:'wait'}; anything else becomes an eval step.
// Step 0 is always the shared probe lib (tools/actions/qw-lib.txt).
import { readFileSync, writeFileSync } from 'fs';
const lib = readFileSync('tools/actions/qw-lib.txt', 'utf8').trim();
const name = process.argv[2];
const src = readFileSync(process.argv[3], 'utf8');
const out = [{ type: 'eval', code: lib }];
for (const raw of src.split(/^---$/m)) {
  const s = raw.trim();
  if (!s) continue;
  const w = s.match(/^@wait\s+(\d+)$/);
  if (w) out.push({ type: 'wait', ms: parseInt(w[1], 10) });
  else out.push({ type: 'eval', code: s });
}
writeFileSync(`tools/actions/${name}.json`, JSON.stringify(out, null, 1));
console.log('wrote tools/actions/' + name + '.json', out.length, 'actions');
