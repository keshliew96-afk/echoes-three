const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [w,h,name] of [[1280,900,'desk'],[390,800,'phone']]){const p=await b.newPage({viewport:{width:w,height:h}});const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push('C '+m.text())});
await p.goto('http://127.0.0.1:8123/site/index.html');await p.waitForTimeout(25000);
await p.screenshot({path:`/tmp/s/page_${name}_top.png`});
const info=await p.evaluate(()=>({cards:document.querySelectorAll('.card').length,new20:document.querySelectorAll('.new20').length,flag:document.querySelectorAll('.flag').length,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,txt:[...document.querySelectorAll('.flag')].map(e=>e.textContent.slice(0,40))}));
console.log(name,JSON.stringify(info),errs.slice(0,5).join(' | '));
await p.getByText('全部海啸').first().click();await p.evaluate(()=>document.getElementById('F17').scrollIntoView());await p.waitForTimeout(9000);await p.screenshot({path:`/tmp/s/page_${name}_flag.png`});await p.getByText('English').first().click();await p.getByText('All Flood').first().click().catch(e=>console.log('noflood',e.message.slice(0,80)));await p.evaluate(()=>document.getElementById('F8').scrollIntoView());await p.waitForTimeout(9000);await p.screenshot({path:`/tmp/s/page_${name}_en.png`});
await p.close();}
await b.close();})();
