// Critic helper: build an actions JSON = [lib eval, body eval(s)] from a body file.
// usage: node tools/hk-mk.mjs <name> <bodyfile>
import { readFileSync, writeFileSync } from 'fs';
const [name, body] = process.argv.slice(2);
const lib = readFileSync('tools/actions/hk-lib.txt', 'utf8');
const src = readFileSync(body, 'utf8');
writeFileSync(`tools/actions/${name}.json`, JSON.stringify([
  { type: 'eval', code: lib },
  { type: 'eval', code: `(async()=>{try{return await (async()=>{${src}})()}catch(e){return 'ERR '+e.message+' | '+e.stack}})()` },
]));
console.log(`tools/actions/${name}.json`);
