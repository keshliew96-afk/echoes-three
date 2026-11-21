// stills.cjs <jobs.json> <outDir>: lay a skill's aim indicator on a real Level I room (review-only build) and shoot it
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')), out=process.argv[3];
const SK={};JSON.parse(fs.readFileSync(path.join(__dirname,'skills.json'),'utf8')).forEach(h=>h.skills.forEach(s=>{s.cls=h.cls;SK[s.id]=s;}));
fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-renderer-backgrounding','--disable-background-timer-throttling']});
for(const job of jobs){
  const t0=Date.now();
  const ctx=await b.newContext({viewport:{width:1280,height:720},deviceScaleFactor:2});const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('err',e.message));
  const url='http://127.0.0.1:5199/?fresh=1&menu=0&aimrev=1'+(job.flags||'');
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.__echoes&&window.__echoes.tick>=30&&window.__aimrev,null,{timeout:400000});
  await p.evaluate(j=>{const s=window.__echoes.settings;s.set('gameplay.playClass',j.cls);if(j.team!==undefined)s.set('gameplay.team',j.team);s.persist();},job);
  await p.goto(url.replace('fresh=1&',''),{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.__echoes&&window.__echoes.tick>=30&&window.__aimrev,null,{timeout:400000});
  const r=await p.evaluate(()=>JSON.stringify(window.__echoes.cmd('startCampaign',{level:1})));
  await p.waitForFunction(()=>window.__echoes.entityCount>4,null,{timeout:400000});
  const tk=await p.evaluate(()=>window.__echoes.tick);
  await p.waitForFunction(t=>window.__echoes.tick>=t+(240),tk,{timeout:600000});
  const pc=await p.evaluate(()=>{const E=window.__echoes;E.sim.freeze();return E.playClass();});
  console.log(job.cls,'class',JSON.stringify(pc).slice(0,120),'start',r.slice(0,80));
  for(const sh of job.shots){
    const s={...SK[sh.skill]};
    const info=await p.evaluate(([sh,s])=>{const E=window.__echoes;const st=E.state();const hero=E.controls.state().body;
      const foes=(st.enemies||[]).map(e=>({x:e.x,z:e.z})).sort((a,b)=>Math.hypot(a.x-hero.x,a.z-hero.z)-Math.hypot(b.x-hero.x,b.z-hero.z));
      const heroes=(st.party||[]).filter(m=>m.hp>0).map(m=>({x:m.x,z:m.z,hp:m.hp/(m.maxHp||1),cls:m.classId||'healer',self:Math.hypot(m.x-hero.x,m.z-hero.z)<1e-3}));
      let aim;
      if(sh.aim)aim={x:hero.x+sh.aim[0],z:hero.z+sh.aim[1]};
      else{const n=foes.slice(0,3);aim=n.length?{x:n.reduce((a,f)=>a+f.x,0)/n.length,z:n.reduce((a,f)=>a+f.z,0)/n.length}:{x:hero.x,z:hero.z-3};}
      const bells=(sh.bells||[]).map(([x,z])=>({x:hero.x+x,z:hero.z+z}));
      window.__aimrev.set({skill:s,hero,aim,live:sh.live!==false,heroes,bells,foes});
      return {hero,aim,nf:foes.length,nh:heroes.length};},[sh,s]);
    for(let i=0;i<4;i++)await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));
    const f=path.join(out,sh.name+'.jpg');await p.screenshot({path:f,type:'jpeg',quality:86,timeout:300000});
    console.log(' shot',sh.name,JSON.stringify(info));
  }
  await ctx.close();console.log(job.cls,'secs',((Date.now()-t0)/1000).toFixed(0));
}
await b.close();})();
