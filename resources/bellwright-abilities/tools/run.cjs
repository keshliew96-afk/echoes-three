const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('C',m.text())});
await p.goto('http://127.0.0.1:8123/tools/'+process.argv[2]);await p.waitForFunction(()=>window.__out,null,{timeout:60000});console.log(JSON.stringify(await p.evaluate(()=>window.__out)));await b.close();})();
