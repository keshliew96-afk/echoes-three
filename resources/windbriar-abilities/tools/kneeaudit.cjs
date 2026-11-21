const {chromium}=require('playwright');
(async()=>{const [url,out]=process.argv.slice(2);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.goto(url); await p.waitForFunction(()=>window.__ready,null,{timeout:600000});
const r=await p.evaluate(()=>window.__res); require('fs').writeFileSync(out,JSON.stringify(r,null,0)); console.log(Object.keys(r).length,'cards'); await b.close();})();
