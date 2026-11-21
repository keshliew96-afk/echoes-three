const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const dir=process.argv[2];const types={'.js':'text/javascript','.html':'text/html','.mp4':'video/mp4'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1200,height:1000}});
await p.route('https://cdn.jsdelivr.net/**',r=>{const u=new URL(r.request().url());const f=path.join(__dirname,'../t147/node_modules/three',u.pathname.split('three@0.147.0')[1]);r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(f)});});
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.route('http://local.test/**',async r=>{const u=new URL(r.request().url());let f=path.join(dir,decodeURIComponent(u.pathname));
 if(u.pathname==='/')return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>'+fs.readFileSync(path.join(dir,'index.html'),'utf8')+'</body></html>'});
 if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
p.on('console',m=>{if(m.type()==='error')console.log('console:',m.text())});p.on('pageerror',e=>console.log('err:',e.message));
await p.goto('http://local.test/');await p.waitForFunction('window.__review',null,{timeout:90000});
// pause, then step the mixer by hand to exact times
await p.click('#pause');
const combos=JSON.parse(process.argv[4]);const out=process.argv[3];let i=0;
const cv=await p.$('#cv');
for(const c of combos){
  await p.evaluate(()=>{const r=window.__review;const s=r.sel;if(s.dash)r.pick('dash');if(s.hurt)r.pick('hurt');if(s.action)r.pick(s.action);r.pick('idle');});
  for(const k of c.pick) await p.evaluate(k=>window.__review.pick(k),k);
  for(const t of c.times){
    await p.evaluate(t=>{const r=window.__review;r.mixer.setTime(t);
      // staff: emulate frames up to t so the release offset is captured
      },t);
    await p.evaluate(async t=>{const r=window.__review;const steps=Math.max(1,Math.round(t*60));r.mixer.setTime(0);document.getElementById('pause').click();
      await new Promise(res=>{let n=0;const orig=r.mixer.update.bind(r.mixer);r.mixer.update=function(){ if(n<steps){n++;return orig(1/60);} r.mixer.update=orig; document.getElementById('pause').click(); res(); return this;};});},t);
    await p.waitForTimeout(1200);
    await cv.screenshot({path:`${out}-${i++}.png`});
  }
}
const dis=await p.evaluate(()=>[...document.querySelectorAll('#clips button')].map(b=>b.textContent+(b.disabled?' [off]':'')+(b.getAttribute('aria-pressed')==='true'?' [on]':'')));console.log(dis.join(' | '));
await p.screenshot({path:out+'-page.png'});
await b.close();})();
