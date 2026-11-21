// node sweep.cjs : build every card of every style in one page and step it at 5 times; prints errors only
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:660,height:420}});const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push('C '+m.text())});
await p.goto('http://127.0.0.1:8123/tools/test.html?id=B');await p.waitForFunction(()=>window.__ready,null,{timeout:90000});
const list=await p.evaluate(async()=>{const m=await import('./defs.js');const out=Object.keys(m.DEFS).map(k=>k);for(const f of Object.keys(m.FORMS))for(const k of Object.keys(m.FORMS[f]))out.push(f+':'+k);return out;});
console.log('cards',list.length);let bad=0;
for(const id of list){const r=await p.evaluate(async(id)=>{const m=await import('./defs.js');const W=window.__W;const def=id.includes(':')?m.FORMS[id.split(':')[0]][id.split(':')[1]]:m.DEFS[id];const cv=document.createElement('canvas');cv.width=320;cv.height=200;try{const c=W.addCard(def,cv);c.build();for(let i=0;i<5;i++)W.stepCard(c,c.T*(i+0.5)/5);for(const lang of ['zh','en']){}return 'ok '+c.T;}catch(e){return 'FAIL '+String(e.stack||e).slice(0,400);}},id);
 if(!r.startsWith('ok')||errs.length){bad++;console.log(id,r,errs.splice(0).slice(0,3).join(' | '));}}
console.log('bad',bad);await b.close();})();
