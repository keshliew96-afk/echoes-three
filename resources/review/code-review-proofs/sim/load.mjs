import fs from 'fs'; import path from 'path';
const R='/home/claude/echoes-three/src/';
const files=[...fs.readdirSync(R+'data').map(f=>'data/'+f),...fs.readdirSync(R+'sim').filter(f=>f.endsWith('.js')).map(f=>'sim/'+f),...fs.readdirSync(R+'campaign').map(f=>'campaign/'+f)];
for(const f of files){try{const m=await import(R+f);console.log('ok',f,Object.keys(m).length)}catch(e){console.log('FAIL',f,e.message.split('\n')[0])}}
