// homshot.js <pageDir> <outPrefix> <cam> <t1,t2,..>: ONE dash at quarter speed, stills at dash times (and after it ends, at seconds after the last dash time)
const fs=require('fs');let src=fs.readFileSync(__dirname+'/dashshot.js','utf8');
const a=src.indexOf("let i=0; for(const t of times){"), b=src.indexOf("await b.close();})();");
src=src.slice(0,a)+`await p.click('#clips >> text="Dash"'); let i=0; for(const t of times){
  await p.waitForFunction('window.__review.dashS().t>='+t,null,{timeout:30000,polling:8}).catch(()=>console.log('never',t));
  await p.click('#pause'); console.log(t,JSON.stringify(await p.evaluate(()=>window.__review.dashS())).slice(0,200));
  await p.locator('#cv').screenshot({path:out+'_'+i+'.png'}); await p.click('#pause'); i++; }
`+src.slice(b);
fs.writeFileSync(__dirname+'/_homshot.js',src); require(__dirname+'/_homshot.js');
