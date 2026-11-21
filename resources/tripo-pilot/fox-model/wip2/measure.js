const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const types={'.js':'text/javascript','.html':'text/html','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
await p.route('http://local.test/**',async r=>{const u=new URL(r.request().url());const f=path.join(__dirname,decodeURIComponent(u.pathname));if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});});
p.on('pageerror',e=>console.log('err:',e.message));
await p.goto('http://local.test/measure.html?f='+process.argv[2]);await p.waitForFunction('window.done',null,{timeout:120000});
fs.writeFileSync(process.argv[3],JSON.stringify(await p.evaluate(()=>window.result)));await b.close();})();
