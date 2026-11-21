// rec.cjs <outDir> <jobs.json> [only,names]: record Stonehide's review clips in the review build (fake clock -> frames)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const out=process.argv[2], jobs=JSON.parse(fs.readFileSync(process.argv[3],'utf8')), only=process.argv[4]?process.argv[4].split(','):null;
const W=960,H=600;
(async()=>{
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H}});
p.on('pageerror',e=>console.log('err',e.message));
await p.clock.install();
await p.goto('http://127.0.0.1:5199/?scene=arena&fresh=1&menu=0&tripo=1'+(process.env.FLAT?'&flat=1':''),{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.__echoes&&window.__echoes.tick>=30&&window.__tripoTank&&window.__tripoTank.model,null,{timeout:240000});
const X=(fn,arg)=>p.evaluate(fn,arg);
await X(()=>{const E=window.__echoes;E.settings.set('gameplay.playClass','tank');const c=window.__reviewCam;c.fov=28;c.updateProjectionMatrix();
  // hide the HUD chrome that is not the hero's (room title, glint, command bar): the clip shows the fight
  const st=document.createElement('style');st.textContent='#hud-room,.room-title,[class*="roomTitle"],[class*="glint"],[class*="Glint"]{visibility:hidden!important}';document.head.appendChild(st);});
await p.waitForTimeout(2500);
await X(()=>{const d=document.createElement('div');d.id='recov';d.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99999';d.innerHTML='<style>.hud-loc,#fps-meter,#version-label{display:none!important}</style><div id="reccap" style="position:absolute;left:10px;top:8px;max-width:620px;padding:6px 10px;border-radius:6px;background:rgba(14,16,12,.88);font:600 16px system-ui,sans-serif;color:#F4EFE6"></div><div id="recleg" style="position:absolute;right:10px;top:8px;padding:5px 9px;border-radius:6px;background:rgba(14,16,12,.88);font:500 13px system-ui,sans-serif;color:#F4EFE6"></div>';document.body.appendChild(d);});
const proj=(w)=>X(([x,z])=>{const c=window.__reviewCam;const v=c.position.clone().set(x,0,z).project(c);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight];},w);
for(const job of jobs){ if(only&&!only.includes(job.name))continue;
  const t0=Date.now();
  await p.clock.resume();
  await X(j=>{const E=window.__echoes;__SH.reset();globalThis.__reviewQuietAllies=!j.loud;E.cmd('killAllEnemies');try{E.cmd('clearStatus')}catch(e){}
    const st=E.state();const party=st.party||[];
    for(const m of E.content.world().entities())if(m.partyIndex!==undefined){m.hp=m.maxHp;if(m.status)for(const k in m.status)delete m.status[k];}
    const t=j.tank||[0,0];E.cmd('placeAlly',1,t[0],t[1]);
    const h=j.healer||[-9,6];E.cmd('teleport',h[0],h[1]);
    (j.allies||[[9,6],[-9,-5]]).forEach((a,i)=>{E.cmd('placeAlly',i+2,a[0],a[1]);});
    __SH.shield(j.shield!==false);
    {const c=window.__reviewCam;c.fov=j.fov||28;c.updateProjectionMatrix();}
    window.__shGuide&&window.__shGuide(j.guides||[]);
  },job);
  await p.waitForTimeout(job.settle||1200);
  await X(j=>{const E=window.__echoes;const t=j.tank||[0,0];E.cmd('placeAlly',1,t[0],t[1]);(j.allies||[[9,6],[-9,-5]]).forEach((a,i)=>{E.cmd('placeAlly',i+2,a[0],a[1]);});
    const party=E.content.world().entities().filter(e=>e.partyIndex!==undefined);
    for(const m of party){const hp=(j.hp||{})[m.partyIndex];m.hp=m.maxHp*(hp??1);}
    const before=new Set(E.content.world().entities().map(e=>e.id));
    for(const f of (j.foes||[]))E.cmd('spawn',f[0],f[1],f[2],Object.assign({hpMul:8,dmgMul:0.25},f[3]||{}));
    const nw=E.content.world().entities().filter(e=>!before.has(e.id)&&e.faction==='hostile');
    window.__recFoes=nw.map((e,k)=>{const f=(j.foes||[])[k]||[0,e.x,e.z];return {e,x:f[1],z:f[2]};});
    if(j.setup){const w=E.content.world();eval(j.setup);}
  },job);
  await p.waitForTimeout(job.settle2||1500);
  let aimW=job.aim||[0,-3];
  {const s=await proj(aimW);await p.mouse.move(s[0],s[1]);}
  await X(([cap,leg])=>{document.getElementById('reccap').innerHTML=cap;document.getElementById('recleg').innerHTML=leg;},[job.cap,'']);
  for(let k=0;k<6;k++){const now=await X(()=>Date.now());try{await p.clock.pauseAt(now+300*(k+1));break;}catch(e){console.log('pause retry',k);}}
  const dir=path.join(out,job.name);fs.mkdirSync(dir,{recursive:true});for(const f of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,f));
  const fps=job.fps||15, n=Math.round((job.secs||4)*fps), step=1000/fps;
  const held=[];
  for(let i=0;i<n;i++){
    for(const q of (job.seq||[])){const fi=Math.round(q[0]*fps);
      if(i===fi){
        if(q[1]==='cast')await X(([id,a])=>__SH.cast(id,a?{x:a[0],z:a[1]}:null),[q[2],q[3]||null]);
        else if(q[1]==='combo')await X(()=>__SH.combo());
        else if(q[1]==='dash')await X(([d])=>__SH.dash(d[0],d[1]),[q[2]]);
        else if(q[1]==='aim')aimW=q[2];
        else if(q[1]==='eval')await X(code=>{const E=window.__echoes;const w=E.content.world();eval(code);},q[2]);
        else if(q[1]==='hold'){await p.keyboard.down(q[2]);held.push([q[2],fi+Math.max(1,Math.round(q[3]*fps))]);}
        else if(q[1]==='cap')await X(c=>{document.getElementById('reccap').innerHTML=c;},q[2]);
      }}
    for(let h=held.length-1;h>=0;h--)if(held[h][1]===i){await p.keyboard.up(held[h][0]);held.splice(h,1);}
    if(i===0||i<Math.round((job.holdFoes||0)*fps)) await X(()=>{for(const r of (window.__recFoes||[])){if(r.e.hp<=0)continue;r.e.x=r.x;r.e.z=r.z;if('vx'in r.e){r.e.vx=0;r.e.vz=0;}}});
    if(job.pin!==false) await X(j=>{const E=window.__echoes;(j.allies||[[9,6],[-9,-5]]).forEach((a,i)=>E.cmd('placeAlly',i+2,a[0],a[1]));const h=j.healer||[-9,6];E.cmd('teleport',h[0],h[1]);},job);
    {const s=await proj(aimW);await p.mouse.move(s[0],s[1]);}
    await X(()=>{globalThis.__reviewSkipDraw=true});
    await p.clock.runFor(step-17);
    await X(()=>{globalThis.__reviewSkipDraw=false});
    await p.clock.runFor(17);
    await X(()=>{const s=__SH.state();document.getElementById('recleg').innerHTML=`Stone ${s.stone} · takes ${s.dr}% less · HP ${s.hp}/${s.maxHp}`+(s.grudge!=null?` · counted ${s.grudge}`:'')+(s.haste?` · attacks +${s.haste}%`:'');});
    await p.screenshot({path:path.join(dir,String(i).padStart(3,'0')+'.jpg'),type:'jpeg',quality:88,timeout:120000});
  }
  for(const h of held)await p.keyboard.up(h[0]);
  await p.clock.resume();
  console.log(job.name,'frames',n,'secs',((Date.now()-t0)/1000).toFixed(0));
}
await b.close();})();
