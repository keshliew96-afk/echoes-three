// press Dash, then Tap attack, and take stills through the jump
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const dir=process.argv[2],out=process.argv[3],camS=process.argv[4].split(',').map(Number),times=process.argv[5].split(',').map(Number);
const types={'.js':'text/javascript','.html':'text/html','.png':'image/png','.mp4':'video/mp4'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1200,height:1000}});
await p.route('https://cdn.jsdelivr.net/**',r=>{const u=new URL(r.request().url());const f=path.join(__dirname,'t147/node_modules/three',u.pathname.split('three@0.147.0')[1]);r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(f)});});
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.route('http://local.test/**',async r=>{const u=new URL(r.request().url());let f=path.join(dir,decodeURIComponent(u.pathname));
 if(u.pathname==='/')return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>'+fs.readFileSync(path.join(dir,'index.html'),'utf8')+'</body></html>'});
 if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))console.log('console:',m.text())});p.on('pageerror',e=>console.log('err:',e.message));
await p.goto('http://local.test/');await p.waitForFunction('window.__review',null,{timeout:90000});
await p.click('#speeds >> text="¼×"'); await p.evaluate(c=>window.__review.cam(c.slice(0,3),c.slice(3)),camS);
await p.click('#clips >> text="Dash"'); await p.click('#acts >> text="Tap attack"'); let i=0;
for(const t of times){ await p.waitForFunction('window.__review.dashS().t>='+t,null,{timeout:30000,polling:8}).catch(()=>console.log('never',t));
  if(i===2||i===4)await p.click('#acts >> text="Tap attack"');
  await p.click('#pause'); console.log(t,JSON.stringify(await p.evaluate(()=>({t:window.__review.dashS().t,run:window.__review.running()}))),'|',await p.textContent('#layers'),'|',await p.textContent('#clipname'));
  await p.locator('#cv').screenshot({path:out+'_'+i+'.png'}); await p.click('#pause'); i++; }
await b.close();})();
