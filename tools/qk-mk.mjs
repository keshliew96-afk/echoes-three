// Critic helper: expand {"type":"lib"} in a probe template into the aim/event
// helper eval, writing tools/actions/<name>.json.
import { readFileSync, writeFileSync } from 'fs';
const lib = readFileSync('tools/actions/qk-aimlib.txt','utf8').split('\n').filter(Boolean).join('');
const name = process.argv[2];
const src = JSON.parse(readFileSync(process.argv[3],'utf8'));
const out = src.map(a => a.type === 'lib' ? { type:'eval', code:`(()=>{${lib}})()` } : a);
writeFileSync(`tools/actions/${name}.json`, JSON.stringify(out, null, 1));
console.log('wrote tools/actions/'+name+'.json', out.length, 'actions');
