// node checkall.cjs outdir : build and step every card (base, forms, combos), report errors, save mid frames
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:660,height:420}});const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push('C '+m.text().slice(0,200))});
await p.goto('http://127.0.0.1:8123/tools/test.html?id=B');await p.waitForFunction(()=>window.__ready,null,{timeout:120000});
const ids=await p.evaluate(async()=>{const m=await import('./defs.js');const r=Object.keys(m.DEFS);for(const k of Object.keys(m.FORMS))for(const j of Object.keys(m.FORMS[k]))r.push(k+':'+j);return r;});
console.log('cards',ids.length);
for(const id of ids){errs.length=0;let res;
 try{res=await p.evaluate(async(id)=>{const m=await import('./defs.js');const def=id.includes(':')?m.FORMS[id.split(':')[0]][id.split(':')[1]]:m.DEFS[id];const cv=document.getElementById('c');
  if(window.__card&&window.__card.dispose)try{window.__card.dispose()}catch(e){}
  const card=window.__W.addCard(def,cv);window.__card=card;card.build();const T=card.T;const shots=[];
  for(const f of [0.3,0.55,0.8]){window.__W.stepCard(card,T*f);}
  window.__W.stepCard(card,T*0.55);return {T,img:cv.toDataURL('image/jpeg',0.7)};},id);}catch(e){console.log(id,'FAIL',e.message.slice(0,200));continue;}
 fs.writeFileSync(`${out}/${id.replace(':','_')}.jpg`,Buffer.from(res.img.split(',')[1],'base64'));
 if(errs.length)console.log(id,errs.slice(0,3).join(' | '));}
await b.close();console.log('done');})();
