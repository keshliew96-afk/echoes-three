// node shot.cjs <id> <out.jpg> t1,t2,...  : contact sheet of a card at the given times
const {chromium}=require('playwright');const fs=require('fs');const {execSync}=require('child_process');
(async()=>{const [id,out,ts]=process.argv.slice(2); const times=(ts||'0,0.5,1,1.5,2,2.5').split(',').map(Number);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:660,height:420}}); p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE',m.text())});
await p.goto('http://127.0.0.1:8123/dw/tools/test.html?id='+encodeURIComponent(id)); await p.waitForFunction(()=>window.__ready,null,{timeout:90000});
if(process.env.SIDE)await p.evaluate(c=>globalThis.__sideCam=+c,process.env.SIDE); if(process.env.CLOSE)await p.evaluate(c=>globalThis.__closeCam=+c,process.env.CLOSE); const imgs=[]; for(const t of times){ await p.evaluate(t=>window.__W.stepCard(window.__card,t),t); const d=await p.evaluate(()=>document.getElementById('c').toDataURL('image/jpeg',0.85)); imgs.push(Buffer.from(d.split(',')[1],'base64')); }
fs.mkdirSync('/tmp/shots',{recursive:true}); const safe=id.replace(/[^A-Za-z0-9]/g,'_'); imgs.forEach((b,i)=>fs.writeFileSync(`/tmp/shots/${safe}_${i}.jpg`,b));
await b.close();
execSync(`python3 /home/user/dw/tools/sheet.py ${out} ${imgs.map((_,i)=>`/tmp/shots/${safe}_${i}.jpg`).join(' ')} --labels ${times.join(',')}`);
})();
