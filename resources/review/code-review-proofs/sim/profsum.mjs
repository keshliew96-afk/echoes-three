import fs from 'fs';
const f=fs.readdirSync(process.argv[2]||'prof').filter(x=>x.endsWith('.cpuprofile')).map(x=>(process.argv[2]||'prof')+'/'+x).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs)[0];
const p=JSON.parse(fs.readFileSync(f));
const self=new Map(); const byId=new Map(p.nodes.map(n=>[n.id,n]));
const dt=p.timeDeltas; const counts=new Map();
for(let i=0;i<p.samples.length;i++){counts.set(p.samples[i],(counts.get(p.samples[i])||0)+(dt[i]||0));}
// self time
for(const [id,t] of counts){const n=byId.get(id); const cf=n.callFrame; const k=`${cf.functionName||'(anon)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber+1}`; self.set(k,(self.get(k)||0)+t);}
// total time incl children
const parent=new Map(); for(const n of p.nodes) for(const c of (n.children||[])) parent.set(c,n.id);
const total=new Map();
for(const [id,t] of counts){ const seen=new Set(); let cur=id; while(cur!==undefined){const n=byId.get(cur); const cf=n.callFrame; const k=`${cf.functionName||'(anon)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber+1}`; if(!seen.has(k)){seen.add(k); total.set(k,(total.get(k)||0)+t);} cur=parent.get(cur);} }
const all=[...counts.values()].reduce((a,b)=>a+b,0);
console.log('total ms',(all/1000).toFixed(0));
console.log('--- self'); for(const [k,t] of [...self].sort((a,b)=>b[1]-a[1]).slice(0,25)) console.log((t/all*100).toFixed(1)+'%',k);
console.log('--- total'); for(const [k,t] of [...total].sort((a,b)=>b[1]-a[1]).slice(0,45)) console.log((t/all*100).toFixed(1)+'%',k);
