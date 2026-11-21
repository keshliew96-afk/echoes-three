const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const dir=process.argv[2],out=process.argv[3];const types={'.js':'text/javascript','.html':'text/html','.mp4':'video/mp4','.png':'image/png'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1200,height:1000}});
await p.route('https://cdn.jsdelivr.net/**',r=>{const u=new URL(r.request().url());const f=path.join(__dirname,'../t147/node_modules/three',u.pathname.split('three@0.147.0')[1]);r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(f)});});
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.route('http://local.test/**',async r=>{const u=new URL(r.request().url());let f=path.join(dir,decodeURIComponent(u.pathname));
 if(u.pathname==='/')return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>'+fs.readFileSync(path.join(dir,'index.html'),'utf8')+'</body></html>'});
 if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
p.on('console',m=>{if(m.type()==='error')console.log('console:',m.text())});p.on('pageerror',e=>console.log('err:',e.message));
await p.goto('http://local.test/');await p.waitForFunction('window.__review',null,{timeout:90000});
const st=async(tag)=>console.log(tag,'|',await p.evaluate(()=>window.__review.running().join(',')),'|',await p.textContent('#layers'),'|',JSON.stringify(await p.evaluate(()=>window.__review.state())));
const off=async()=>console.log('disabled:',(await p.evaluate(()=>[...document.querySelectorAll('#clips button,#acts button')].filter(b=>b.disabled).map(b=>b.textContent))).join(','));
const R=(n)=>p.evaluate(n=>{const r=window.__review;const a=r.A[n];return a?a.time:-2},n);
await st('start');await p.screenshot({path:out+'-page.png',fullPage:true});
// every action button once, standing
for(const k of ['Shield combo','Cast: thrust','Cast: roar','Cast: plant','Cast: sweep','Wave','Guard']){await p.click('#acts >> text='+k);await p.waitForTimeout(2500);await st(k);await p.click('#acts >> text='+k);}
await p.click('#acts >> text=Hurt');await p.waitForTimeout(1500);await st('hurt');await p.click('#acts >> text=Hurt');
await p.click('#acts >> text=Tap attack');await st('tap1');
for(let i=0;i<60;i++){await p.waitForTimeout(500);const r=await p.evaluate(()=>{const R=window.__review;const a=R.A['combo'+R.sel.tap];return R.sel.tap?a.time:-1});if(r>0.3||r<0)break;}
await p.click('#acts >> text=Tap attack');await st('tap2');await p.screenshot({path:out+'-tap.png'});
await p.waitForTimeout(15000);await st('after');
await p.click('#clips >> text=Walk');for(const d of ['Backward','Left','Right','Back-right','Forward-left']){await p.click('#dirs >> text='+d);await p.waitForTimeout(1200);await st(d);}
await p.click('#acts >> text=Cast: sweep');await p.waitForTimeout(4000);await st('walk+sweep');await off();await p.screenshot({path:out+'-diag.png'});
await p.click('#acts >> text=Cast: sweep');await p.click('#clips >> text=Dash');await p.waitForTimeout(2500);await st('dash');await p.click('#clips >> text=Dash');
await p.click('#clips >> text=Downed');await p.waitForTimeout(16000);await st('down');await off();
await p.click('#clips >> text=Crawl');await p.waitForTimeout(4000);await st('crawl');await p.screenshot({path:out+'-crawl.png'});
await p.click('#clips >> text=Downed');await p.waitForTimeout(18000);await st('revived');
await p.click('#clips >> text=Spawn');await p.waitForTimeout(1500);await st('spawn');
await p.click('#clips >> text=Idle');await p.click('#bones');await p.waitForTimeout(1500);await (await p.$('#cv')).screenshot({path:out+'-bones.png'});
await b.close();})();
