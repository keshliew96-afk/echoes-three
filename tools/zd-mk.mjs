// Action-JSON generator for the Round-D polish probes. Actions are built
// programmatically (docs/TESTING.md: hand-escaped regex in JSON breaks the
// harness) and every eval body is wrapped in an IIFE (the capture harness
// shares one page scope across evals).
import { readFileSync, writeFileSync } from 'fs';
const [, , name, probeFile, x, z, ...rest] = process.argv;
const acts = [{ type: 'wait', ms: 400 }];
if (x !== undefined) {
  acts.push({ type: 'eval', code: `window.__echoes.cmd('teleport',${x},${z})` });
  acts.push({ type: 'wait', ms: 3000 });
}
for (const r of rest) {
  if (r.startsWith('wait:')) acts.push({ type: 'wait', ms: Number(r.slice(5)) });
  else if (r.startsWith('key:')) { const [k, ms] = r.slice(4).split('@'); acts.push({ type: 'key', key: k, ms: Number(ms || 90) }); }
  else if (r.startsWith('eval:')) acts.push({ type: 'eval', code: `(()=>{${r.slice(5)}})()` });
  else if (r.startsWith('file:')) acts.push({ type: 'eval', code: readFileSync(r.slice(5), 'utf8') });
  else if (r.startsWith('move:')) { const [mx, my] = r.slice(5).split(','); acts.push({ type: 'mousemove', x: Number(mx), y: Number(my) }); }
}
if (probeFile !== '-') acts.push({ type: 'eval', code: readFileSync(probeFile, 'utf8') });
acts.push({ type: 'wait', ms: 200 });
writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
console.log(`tools/actions/${name}.json  ${acts.length} actions`);
