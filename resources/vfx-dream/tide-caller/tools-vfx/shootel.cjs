// node shootel.cjs <jobs.json> <outdir> : play-camera frames (FOV 45, dist 12, 52 deg; 2x crop = fov 23.3) at 1920x1080 DSF1
// job: {name, id, t:[..], x, z, fov}
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [jf,out]=process.argv.slice(2);const jobs=JSON.parse(fs.readFileSync(jf));fs.mkdirSync(out,{recursive:true});
const W=+(process.env.W||1920),H=+(process.env.H||1080);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const j of jobs){const p=await b.newPage({viewport:{width:W,height:H}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8123/tools/test.html?id='+j.id);await p.waitForFunction(()=>window.__ready,null,{timeout:120000});
 await p.evaluate(([W,H,j])=>{const c=document.getElementById('c');c.width=W;c.height=H;globalThis.__playCam={fov:j.fov||23.3,x:j.x,z:j.z,nocap:true};window.__card.build();},[W,H,j]);
 for(const t of j.t){await p.evaluate(t=>window.__W.stepCard(window.__card,t),t);const d=await p.evaluate(()=>document.getElementById('c').toDataURL('image/png'));fs.writeFileSync(`${out}/${j.name}_${t}.png`,Buffer.from(d.split(',')[1],'base64'));}
 if(errs.length)console.log(j.name,errs.slice(0,3));await p.close();console.log('ok',j.name);}
await b.close();})();
