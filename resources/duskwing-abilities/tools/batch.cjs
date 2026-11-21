// node batch.cjs out_dir id1,id2,... [frames]   -> out_dir/<id>.jpg contact sheets (frames evenly over the card, or times from env T_<id>)
const {chromium}=require('playwright');const fs=require('fs');const {execSync}=require('child_process');
(async()=>{const [out,ids,fr]=process.argv.slice(2); const N=+(fr||9); fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const id of ids.split(',')){ const p=await b.newPage({viewport:{width:660,height:420}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://127.0.0.1:8123/tools/test.html?id='+encodeURIComponent(id)); try{await p.waitForFunction(()=>window.__ready,null,{timeout:90000});}catch(e){console.log(id,'FAIL',errs.join(' | '));await p.close();continue;}
  const T=await p.evaluate(()=>{window.__card.build();return window.__card.T;}); const env=process.env['T_'+id.replace(/\W/g,'_')]; const times=env?env.split(',').map(Number):Array.from({length:N},(_,i)=>+((T*(i+0.5)/N).toFixed(2)));
  const safe=id.replace(/\W/g,'_'); const files=[]; for(const t of times){ await p.evaluate(t=>window.__W.stepCard(window.__card,t),t); const d=await p.evaluate(()=>document.getElementById('c').toDataURL('image/jpeg',0.82)); const f=`/tmp/shots/${safe}_${t}.jpg`; fs.mkdirSync('/tmp/shots',{recursive:true}); fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64')); files.push(f); }
  execSync(`python3 /home/user/dw/tools/sheet.py ${out}/${safe}.jpg ${files.join(' ')} --labels ${times.join(',')}`); console.log(id,'ok',T, errs.length?'ERR '+errs.join(' | '):''); await p.close(); }
await b.close();})();
