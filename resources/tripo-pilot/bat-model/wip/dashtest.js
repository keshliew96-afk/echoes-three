const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const dir=process.argv[2];const types={'.js':'text/javascript','.html':'text/html','.png':'image/png','.mp4':'video/mp4'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1200,height:1000}});
await p.route('https://cdn.jsdelivr.net/**',r=>{const u=new URL(r.request().url());const f=path.join(__dirname,'../t147/node_modules/three',u.pathname.split('three@0.147.0')[1]);r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(f)});});
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.route('http://local.test/**',async r=>{const u=new URL(r.request().url());let f=path.join(dir,decodeURIComponent(u.pathname));
 if(u.pathname==='/')return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body>'+fs.readFileSync(path.join(dir,'index.html'),'utf8')+'</body></html>'});
 if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))console.log('console:',m.text())});p.on('pageerror',e=>console.log('err:',e.message));
await p.goto('http://local.test/');await p.waitForFunction('window.__review',null,{timeout:90000});
const st=async(tag)=>console.log(tag,'|',await p.evaluate(()=>window.__review.running().join(',')),'|',await p.textContent('#layers'),'|',await p.textContent('#clipname'));
const acts=process.argv.slice(3);
for(const [lab,wait] of acts.map(a=>a.split('@'))){
  await p.click('#acts >> text="'+lab+'"'); await p.waitForTimeout(+wait); await st('playing '+lab);
  await p.click('#clips >> text="Dash"'); await p.waitForTimeout(350); await st(' dash pressed');
  if(lab===acts[0].split('@')[0])await p.locator('#cv').screenshot({path:'dash.png'});
  await p.click('#clips >> text="Dash"'); await p.waitForTimeout(400); await st(' dash off');
}
await b.close();})();
