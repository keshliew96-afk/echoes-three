// rec.cjs <outDir> <jobs.json> [only,names]: record Ashfang's review clips in the review build (fake clock -> frames)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const out=process.argv[2], jobs=JSON.parse(fs.readFileSync(process.argv[3],'utf8')), only=process.argv[4]?process.argv[4].split(','):null;
const W=+(process.env.W||960),H=+(process.env.H||540),DSF=+(process.env.DSF||1),FOV=process.env.FOV?+process.env.FOV:null,FROM=+(process.env.FROM||0),TO=+(process.env.TO||9999),EXT=process.env.EXT||'jpg';
(async()=>{
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:DSF});
p.on('pageerror',e=>console.log('err',e.message));
await p.clock.install();
await p.goto('http://127.0.0.1:5199/?scene=arena&fresh=1&menu=0&tripo=1&flat=1',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.__echoes&&window.__echoes.tick>=30&&window.__tripoFox&&window.__tripoFox.model,null,{timeout:300000});
const X=(fn,arg)=>p.evaluate(fn,arg);
await X(()=>{const E=window.__echoes;E.settings.set('gameplay.playClass','swordsman');const c=window.__reviewCam;c.fov=28;c.updateProjectionMatrix();
  const st=document.createElement('style');st.textContent='#hud-room,.room-title,[class*="roomTitle"],[class*="glint"],[class*="Glint"]{visibility:hidden!important}';document.head.appendChild(st);});
await p.waitForTimeout(2500);
await X(()=>{const d=document.createElement('div');d.id='recov';d.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99999';d.innerHTML='<style>.hud-loc,#fps-meter,#version-label{display:none!important}</style><div id="reccap" style="position:absolute;left:10px;top:8px;max-width:600px;padding:6px 10px;border-radius:6px;background:rgba(14,16,12,.88);font:600 16px system-ui,sans-serif;color:#F4EFE6"></div><div id="recleg" style="position:absolute;right:10px;top:8px;padding:5px 9px;border-radius:6px;background:rgba(14,16,12,.88);font:500 13px system-ui,sans-serif;color:#F4EFE6"></div>';document.body.appendChild(d);});
const proj=(w)=>X(([x,z])=>{const c=window.__reviewCam;const v=c.position.clone().set(x,0,z).project(c);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight];},w);
for(const job of jobs){ if(only&&!only.includes(job.name))continue; if(FOV)job.fov=FOV;
  const t0=Date.now();
  await p.clock.resume();
  await X(j=>{const E=window.__echoes;__AF.reset();globalThis.__reviewQuietAllies=true;E.cmd('killAllEnemies');try{E.cmd('clearStatus')}catch(e){}
    for(const m of E.content.world().entities())if(m.partyIndex!==undefined){m.hp=m.maxHp;if(m.status)for(const k in m.status)delete m.status[k];}
    const t=j.fox||[0,0];E.cmd('placeAlly',2,t[0],t[1]);E.cmd('teleport',-11,7);E.cmd('placeAlly',1,11,7);E.cmd('placeAlly',3,-11,-7);
    const c=window.__reviewCam;c.fov=j.fov||21;c.updateProjectionMatrix();
    const t2=j.fox||[0,0],a2=j.aim||[t2[0]+2,t2[1]];const fc=j.focus||[t2[0]+(a2[0]-t2[0])*0.35,t2[1]+(a2[1]-t2[1])*0.35];window.__afFocus(fc[0],fc[1]);
  },job);
  await p.waitForTimeout(job.settle||1200);
  await X(j=>{const E=window.__echoes;const t=j.fox||[0,0];E.cmd('placeAlly',2,t[0],t[1]);
    const f=E.content.world().entities().find(e=>e.partyIndex===2);if(f){const a=j.aim||[t[0],t[1]-2];const dx=a[0]-t[0],dz=a[1]-t[1],l=Math.hypot(dx,dz)||1;f.faceX=dx/l;f.faceZ=dz/l;}
    for(const f of (j.foes||[]))E.cmd('spawn',f[0],f[1],f[2],Object.assign({hpMul:10,dmgMul:0},f[3]||{}));
    if(j.setup){const w=E.content.world();eval(j.setup);}
  },job);
  await p.waitForTimeout(job.settle2||2000);
  let aimW=job.aim||[0,-3];
  {const s=await proj(aimW);await p.mouse.move(s[0],s[1]);}
  await X(([cap])=>{document.getElementById('reccap').innerHTML=cap;document.getElementById('recleg').innerHTML='';},[job.cap]);
  for(let k=0;k<6;k++){const now=await X(()=>Date.now());try{await p.clock.pauseAt(now+300*(k+1));break;}catch(e){console.log('pause retry',k);}}
  const dir=path.join(out,job.name);fs.mkdirSync(dir,{recursive:true});if(!process.env.KEEP)for(const f of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,f));
  const fps=job.fps||15, n=Math.round((job.secs||4)*fps), step=1000/fps;
  for(let i=0;i<n;i++){
    for(const q of (job.seq||[])){const fi=Math.round(q[0]*fps);
      if(i===fi){
        if(q[1]==='cast')await X(([id,a,s])=>__AF.cast(id,a?{x:a[0],z:a[1]}:null,s||null),[q[2],q[3]||null,q[4]||null]);
        else if(q[1]==='cut')await X(n=>__AF.cut(n),q[2]||1);
        else if(q[1]==='combo')await X(()=>__AF.combo());
        else if(q[1]==='dash')await X(([d])=>__AF.dash(d[0],d[1]),[q[2]]);
        else if(q[1]==='shoot')await X(k=>__AF.shoot(k),q[2]||0);
        else if(q[1]==='aim')aimW=q[2];
        else if(q[1]==='face')await X(d=>{const f=window.__echoes.content.world().entities().find(e=>e.partyIndex===2);const l=Math.hypot(d[0],d[1]);f.faceX=d[0]/l;f.faceZ=d[1]/l;},q[2]);
        else if(q[1]==='eval')await X(code=>{const E=window.__echoes;const w=E.content.world();eval(code);},q[2]);
        else if(q[1]==='cap')await X(c=>{document.getElementById('reccap').innerHTML=c;},q[2]);
      }}
    // keep the fox facing the aim between casts (he is the human seat with no input)
    await X(j=>{const E=window.__echoes;(j.allies||[]).length;E.cmd('teleport',-11,7);E.cmd('placeAlly',1,11,7);E.cmd('placeAlly',3,-11,-7);},job);
    {const s=await proj(aimW);await p.mouse.move(s[0],s[1]);}
    { const ms=Math.round((i+1)*step)-Math.round(i*step);
      if(ms>20){await X(()=>{globalThis.__reviewSkipDraw=true});await p.clock.runFor(ms-17);await X(()=>{globalThis.__reviewSkipDraw=false});await p.clock.runFor(17);}
      else await p.clock.runFor(ms); }
    await X(()=>{const s=__AF.state();const N={fire:'剑',wind:'热',earth:'屈',water:'水'};
      const orbs=s.orbs.length?s.orbs.map(o=>`<span style="color:${'#E7E3F0'}">${N[o]}</span>`).join(' '):'none';
      document.getElementById('recleg').innerHTML=`Will marks: ${orbs}`;});
    if(i>=FROM&&i<=TO){if(process.env.NOCAP)await X(()=>{const r=document.getElementById('recov');if(r)r.style.display='none';});await p.screenshot({path:path.join(dir,String(i).padStart(3,'0')+'.'+EXT),...(EXT==='jpg'?{type:'jpeg',quality:90}:{}),timeout:300000});}
  }
  await p.clock.resume();
  console.log(job.name,'frames',n,'secs',((Date.now()-t0)/1000).toFixed(0));
}
await b.close();})();
