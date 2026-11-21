// shots.js <pageDir> <outDir> <jobs.json>: stills of the review page at clip times, quarter speed
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const dir=process.argv[2],out=process.argv[3],jobs=JSON.parse(fs.readFileSync(process.argv[4],'utf8'));
const T3=process.env.T3;
const types={'.js':'text/javascript','.html':'text/html','.png':'image/png','.mp4':'video/mp4'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const job of jobs){
const p=await b.newPage({viewport:{width:1400,height:1100},deviceScaleFactor:2});
await p.route('https://cdn.jsdelivr.net/**',r=>{const u=new URL(r.request().url());const f=path.join(T3,u.pathname.split('three@0.147.0')[1]);r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(f)});});
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.route('http://local.test/**',async r=>{const u=new URL(r.request().url());let f=path.join(dir,decodeURIComponent(u.pathname));
 if(u.pathname==='/')return r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(dir,'index.html'),'utf8')});
 if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
p.on('pageerror',e=>console.log('err:',e.message));
await p.goto('http://local.test/');await p.waitForFunction('window.__review&&window.__review.A&&Object.keys(window.__review.A).length',null,{timeout:120000});
if(job.listA){console.log(Object.keys(await p.evaluate(()=>window.__review.A)).join(' '));}
await p.click('#speeds >> text="¼×"'); await p.evaluate(c=>window.__review.cam(c.slice(0,3),c.slice(3)),job.cam);
for(const [row,lab] of (job.pre||[])){await p.click('#'+row+' >> text="'+lab+'"');await p.waitForTimeout(300);}
await p.click('#'+job.row+' >> text="'+job.label+'"');

let i=0; for(const t of job.times){
  await p.waitForFunction('(()=>{const a=window.__review.A["'+job.clip+'"];return a&&a.isRunning()&&a.time>='+t+'})()',null,{timeout:60000,polling:8}).catch(()=>console.log('never',job.name,t));
  await p.click('#pause'); const at=await p.evaluate(n=>window.__review.A[n].time,job.clip); console.log(job.name,t,at.toFixed(3));
  await p.locator('#cv').screenshot({path:path.join(out,job.name+'_'+i+'.png')}); await p.click('#pause'); i++; }
await p.close();}
await b.close();})();
