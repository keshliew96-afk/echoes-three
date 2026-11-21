// node shots.cjs <prefix> <id,id,...> [N]  : one contact sheet per card into /tmp/s/<id>.jpg (one browser)
const {chromium}=require('playwright');const fs=require('fs');const {execSync}=require('child_process');
(async()=>{const [pre,ids,n]=process.argv.slice(2);const N=+(n||6);fs.mkdirSync('/tmp/s',{recursive:true});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const id of ids.split(',')){const q=pre?pre+':'+id:id;const p=await b.newPage({viewport:{width:660,height:420}});const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push('C '+m.text())});
 await p.goto('http://127.0.0.1:8123/tools/test.html?id='+q);try{await p.waitForFunction(()=>window.__ready,null,{timeout:90000});}catch(e){console.log(id,'FAIL',errs.join(' | '));await p.close();continue;}
 let T;try{T=await p.evaluate(()=>{window.__card.build();return window.__card.T;});}catch(e){console.log(id,'BUILD',e.message.slice(0,300));await p.close();continue;}
 const times=Array.from({length:N},(_,i)=>+((T*(i+0.5)/N).toFixed(2)));const fsn=[];
 for(const [k,t] of times.entries()){try{await p.evaluate(t=>window.__W.stepCard(window.__card,t),t);}catch(e){errs.push('STEP '+e.message.slice(0,200));break;}const d=await p.evaluate(()=>document.getElementById('c').toDataURL('image/jpeg',0.8));const f=`/tmp/s/${id}_${k}.jpg`;fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'));fsn.push(f);}
 if(errs.length)console.log(id,errs.slice(0,4).join(' | '));
 execSync(`python3 ${__dirname}/sheet.py /tmp/s/${id}.jpg ${fsn.join(' ')} --labels ${times.slice(0,fsn.length).join(',')}`);await p.close();}
await b.close();console.log('done');})();
