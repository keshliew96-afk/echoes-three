// usage: node pagetest.js <page dir> <out prefix> [script.js]
// Serves the page dir through Playwright routes (no local server), maps the three.js CDN urls to node_modules,
// then runs the steps: [{do:'click',id or text}, {wait:ms}, {eval:'js'}, {shot:'name'}, {view:'Side'}]
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const dir=process.argv[2], out=process.argv[3], steps=require(path.resolve(process.argv[4]));
const types={'.js':'text/javascript','.html':'text/html','.png':'image/png','.jpg':'image/jpeg'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:+(process.env.W||1280),height:+(process.env.H||1100)},colorScheme:process.env.DARK?'dark':'light'});
const errs=[];p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text());});p.on('pageerror',e=>errs.push('pageerror: '+e.message));
await p.route('**/*',async r=>{const u=new URL(r.request().url());
 if(u.hostname==='cdn.jsdelivr.net'){const f=path.join(__dirname,'node_modules',u.pathname.replace(/^\/npm\/three@0\.147\.0\//,'three/'));return r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(f)});}
 if(u.hostname==='local.test'){let f=path.join(dir,decodeURIComponent(u.pathname));if(u.pathname==='/')f=path.join(dir,'page.html');if(!fs.existsSync(f))return r.fulfill({status:404,body:''});return r.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});}
 return r.fulfill({status:204,body:''});});
fs.writeFileSync(path.join(dir,'page.html'),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'+fs.readFileSync(path.join(dir,'index.html'),'utf8')+'</body></html>');
await p.goto('http://local.test/');try{await p.waitForFunction("window.__review",null,{timeout:60000});}catch(e){console.log(errs.join("\n"));process.exit(1);}
for(const s of steps){
 if(s.click)await p.click(s.click.startsWith('#')?s.click:`button:text-is("${s.click}")`);
 if(s.wait)await p.waitForTimeout(s.wait);
 if(s.eval){const v=await p.evaluate(s.eval);if(s.log!==false)console.log(s.eval.slice(0,60),'=>',JSON.stringify(v));}
 if(s.shot){const el=s.full?p:await p.$('.stage');await el.screenshot({path:out+s.shot+'.png',fullPage:!!s.full});}
}
console.log('errors:',errs.length);errs.slice(0,12).forEach(e=>console.log(' ',e));await b.close();})();
