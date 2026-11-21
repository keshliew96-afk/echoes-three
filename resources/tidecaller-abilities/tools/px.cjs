const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8123/tools/poses_x.html#'+encodeURIComponent(process.argv[2]));await p.waitForFunction(()=>window.__out,null,{timeout:60000});const o=await p.evaluate(()=>window.__out);
for(const [c,ts] of Object.entries(o)){for(const [t,r] of Object.entries(ts)){console.log(c,t,JSON.stringify(r));}}await b.close();})();
