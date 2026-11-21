// node shot.cjs <query> <out.jpg> [t1,t2,...|N]  : contact sheet of a card (query: id=F1 or clip=castPoint&face=0); env SIDE=w for a side camera, CLOSE=w close
const {chromium}=require('playwright');const fs=require('fs');const {execSync}=require('child_process');
(async()=>{const [qs,out,ts]=process.argv.slice(2);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:660,height:420}}); const errs=[]; p.on('pageerror',e=>errs.push('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
await p.goto('http://127.0.0.1:8123/tools/test.html?'+qs); try{await p.waitForFunction(()=>window.__ready,null,{timeout:90000});}catch(e){console.log('FAIL',errs.join('\n'));process.exit(1);}
if(process.env.SIDE)await p.evaluate(c=>globalThis.__sideCam=+c,process.env.SIDE); if(process.env.CLOSE)await p.evaluate(c=>globalThis.__closeCam=+c,process.env.CLOSE);
const T=await p.evaluate(()=>{window.__card.build();return window.__card.T;}); let times; if(!ts||/^\d+$/.test(ts)){const N=+(ts||9); times=Array.from({length:N},(_,i)=>+((T*(i+0.5)/N).toFixed(2)));} else times=ts.split(',').map(Number);
const imgs=[]; for(const t of times){ await p.evaluate(t=>window.__W.stepCard(window.__card,t),t); const d=await p.evaluate(()=>document.getElementById('c').toDataURL('image/jpeg',0.85)); imgs.push(Buffer.from(d.split(',')[1],'base64')); }
fs.mkdirSync('/tmp/shots',{recursive:true}); const safe=qs.replace(/[^A-Za-z0-9]/g,'_'); imgs.forEach((b,i)=>fs.writeFileSync(`/tmp/shots/${safe}_${i}.jpg`,b));
await b.close(); if(errs.length) console.log(errs.slice(0,8).join('\n'));
execSync(`python3 ${__dirname}/sheet.py ${out} ${imgs.map((_,i)=>`/tmp/shots/${safe}_${i}.jpg`).join(' ')} --labels ${times.join(',')}`); console.log('ok',T);
})();
