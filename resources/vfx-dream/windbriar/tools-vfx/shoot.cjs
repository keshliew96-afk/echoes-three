// node shoot.cjs <id> <outprefix> t1,t2,...  env W,H (canvas px), EL, AZ, CLOSE
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [id,out,ts]=process.argv.slice(2); const times=ts.split(',').map(Number);
const W=+(process.env.W||1920),H=+(process.env.H||1200);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H}}); p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.goto('http://127.0.0.1:8123/test.html?id='+id); await p.evaluate(([w,h])=>{const c=document.getElementById('c');c.width=w;c.height=h;},[W,H]);
await p.waitForFunction(()=>window.__ready,null,{timeout:90000});
for(const k of ['EL','AZ','CLOSE']) if(process.env[k]) await p.evaluate(([k,v])=>globalThis[{EL:'__camEl',AZ:'__camAz',CLOSE:'__closeCam'}[k]]=+v,[k,process.env[k]]);
if(process.env.CAM) await p.evaluate(c=>{window.__card.def.cam=JSON.parse(c)},process.env.CAM);
for(const t of times){ if(process.env.NOCAP!=='0') await p.evaluate(()=>{const c=window.__card; if(!c.built)c.build(); c.caps.length=0;}); await p.evaluate(t=>window.__W.stepCard(window.__card,t),t); const d=await p.evaluate(()=>document.getElementById('c').toDataURL('image/png')); fs.writeFileSync(`${out}_${t.toFixed(2)}.png`,Buffer.from(d.split(',')[1],'base64')); }
await b.close();})();
