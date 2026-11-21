// node kneeview.cjs <page url base> <id> <out.jpg> t1,t2,... [side 1|2]: before (top) and after (bottom) knee pairs
const {chromium}=require('playwright');const fs=require('fs');const {execSync}=require('child_process');
(async()=>{const [base,id,out,ts,side]=process.argv.slice(2); const times=ts.split(',').map(Number);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:300,height:300}}); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(base+(base.includes('?')?'&':'?')+'id='+encodeURIComponent(id)); await p.waitForFunction(()=>window.__ready,null,{timeout:120000});
const files=[]; fs.mkdirSync('/tmp/kv',{recursive:true});
for(const off of [1,0]) for(const t of times){ const d=await p.evaluate(([t,off,s])=>window.__shot(t,off,s),[t,off,+(side||1)]); const f=`/tmp/kv/${files.length}.jpg`; fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64')); files.push(f); }
await b.close();
execSync(`python3 /home/user/work/grid.py ${out} ${times.length} ${files.join(' ')}`);})();
