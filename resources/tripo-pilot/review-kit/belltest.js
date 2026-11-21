const fs=require('fs');let src=fs.readFileSync(__dirname+'/dashshot.js','utf8');
const a=src.indexOf("let i=0; for(const t of times){"), b=src.indexOf("await b.close();})();");
src=src.slice(0,a)+`
const S=async(tag)=>console.log(tag,JSON.stringify(await p.evaluate(()=>window.__review.bellS())),'|',await p.textContent('#layers'),'|',await p.textContent('#clipname'),'| moving',JSON.stringify((await p.evaluate(()=>window.__review.dashS())).moving));
const W=(ph,t)=>p.waitForFunction('(()=>{const s=window.__review.bellS();return s.ph==="'+ph+'"&&s.t>='+t+'})()',null,{timeout:60000,polling:8}).catch(()=>console.log('never',ph,t));
const shot=async(n)=>{await p.click('#pause'); await p.locator('#cv').screenshot({path:out+'_'+n+'.png'}); await p.click('#pause');};
await p.click('#clips >> text="Dash"'); await W('call',0.16); await S('call'); console.log(JSON.stringify(await p.evaluate(()=>window.__bigBell))); await shot(0);
await W('call',0.30); await shot(1); await W('in',0.1); await S('in'); await shot(2);
await p.click('#dirs >> text="Left"').catch(e=>console.log('no dir')); await W('in',0.9); await S('left'); await shot(3);
await W('in',2.2); await S('late'); await shot(4);
await p.waitForFunction('window.__review.bellS().ph==="out"',null,{timeout:60000,polling:8}); await S('out'); await shot(5);
await p.waitForFunction('window.__review.bellS().ph===""',null,{timeout:60000}); await S('after');
await p.click('#clips >> text="Dash"'); await W('in',0.4); await p.click('#acts >> text="Tap attack"'); await p.waitForTimeout(300); await S('attack'); await shot(6);
await p.waitForTimeout(4000); await S('end'); await shot(7);
await p.click('#clips >> text="Dash"'); await W('in',0.3); await p.click('#clips >> text="Dash"'); await p.waitForTimeout(200); await S('dash off');
`+src.slice(b);
fs.writeFileSync(__dirname+'/_belltest.js',src); require(__dirname+'/_belltest.js');
