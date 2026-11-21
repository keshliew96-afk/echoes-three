// rec.js <outDir> <jobs.json> [only]: record Mosslight's skills in the game (fake clock -> frames)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const out=process.argv[2], jobs=JSON.parse(fs.readFileSync(process.argv[3],'utf8')), only=process.argv[4]?process.argv[4].split(','):null;
const W=+(process.env.W||960),H=+(process.env.H||600),DSF=+(process.env.DSF||1),SX=W/960,SY=H/600,FROM=+(process.env.FROM||0),TO=+(process.env.TO||1e9),EXT=process.env.EXT||'jpg',NOCAP=!!process.env.NOCAP;
function solveH(src,dst){ // homography from 4+ pairs (DLT, least squares via normal eq)
  const A=[],b=[];for(let i=0;i<src.length;i++){const [x,y]=src[i],[u,v]=dst[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}
  const n=8,M=Array.from({length:n},()=>Array(n+1).fill(0));
  for(let r=0;r<A.length;r++)for(let i=0;i<n;i++){for(let j=0;j<n;j++)M[i][j]+=A[r][i]*A[r][j];M[i][n]+=A[r][i]*b[r];}
  for(let i=0;i<n;i++){let p=i;for(let k=i+1;k<n;k++)if(Math.abs(M[k][i])>Math.abs(M[p][i]))p=k;[M[i],M[p]]=[M[p],M[i]];
    for(let k=0;k<n;k++)if(k!==i){const f=M[k][i]/M[i][i];for(let j=i;j<=n;j++)M[k][j]-=f*M[i][j];}}
  const h=M.map((r,i)=>r[n]/r[i]);h.push(1);return h;}
const apply=(h,[x,y])=>{const w=h[6]*x+h[7]*y+h[8];return [(h[0]*x+h[1]*y+h[2])/w,(h[3]*x+h[4]*y+h[5])/w];};
(async()=>{
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:DSF});
p.on('pageerror',e=>console.log('err',e.message));
await p.clock.install();
await p.goto('http://127.0.0.1:'+(process.env.PORT||5199)+'/?scene=arena&fresh=1&menu=0&tripo=1'+(process.env.QS||''),{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.__echoes&&window.__echoes.tick>=30,null,{timeout:180000});
await p.waitForTimeout(1500);
const X=(fn,arg)=>p.evaluate(fn,arg);
await X(()=>{const E=window.__echoes;E.cmd('killAllEnemies');E.cmd('teleport',0,0);});
await p.waitForTimeout(1500);
// calibrate screen <-> world on the floor
const scr=[[260,140],[700,140],[260,470],[700,470],[480,300],[380,220],[600,400]].map(([x,y])=>[x*SX,y*SY]),wld=[];
let Hw2s;
for(let tries=0;tries<4;tries++){
  wld.length=0;
  for(const s of scr){await p.mouse.move(s[0],s[1]);await p.waitForTimeout(1200);
    let a1=null;for(let k=0;k<5;k++){const a2=await X(()=>{const a=window.__echoes.content.world().player.aim;return [a.x,a.z];});if(a1&&Math.hypot(a1[0]-a2[0],a1[1]-a2[1])<0.01)break;a1=a2;await p.waitForTimeout(500);}
    wld.push(a1);}
  Hw2s=solveH(wld,scr);
  const err=Math.max(...wld.map((w,i)=>Math.hypot(apply(Hw2s,w)[0]-scr[i][0],apply(Hw2s,w)[1]-scr[i][1])));
  console.log('calib try',tries,'max err px',err.toFixed(1));
  if(err<6)break;
}
console.log('calib',JSON.stringify(wld.map(w=>w.map(v=>+v.toFixed(2)))), 'check',JSON.stringify(apply(Hw2s,wld[4])));
// overlay
await X(()=>{const d=document.createElement('div');d.id='recov';d.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99999';d.innerHTML='<svg id="recsvg" width="'+innerWidth+'" height="'+innerHeight+'" style="position:absolute;inset:0"></svg><div id="reccap" style="position:absolute;left:10px;top:8px;min-width:290px;max-width:600px;padding:6px 10px;border-radius:6px;background:rgba(14,16,12,.88);font:600 16px system-ui,sans-serif;color:#F4EFE6"></div><div id="recleg" style="position:absolute;right:10px;top:8px;padding:5px 9px;border-radius:6px;background:rgba(14,16,12,.88);font:500 12.5px system-ui,sans-serif;color:#F4EFE6"></div>';document.body.appendChild(d);});
for(const job of jobs){ if(only&&!only.includes(job.name))continue;
  const t0=Date.now();
  await p.clock.resume();
  if(process.env.RELOAD){ // a clean world per job (no seeds, wisps or foes left from the last one); the camera is the same, so the calibration holds
    await p.reload({waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.__echoes&&window.__echoes.tick>=30,null,{timeout:180000});
    await p.waitForTimeout(1500);
    await X(()=>{const E=window.__echoes;E.cmd('killAllEnemies');E.cmd('teleport',0,0);});
    await p.waitForTimeout(800);
    await X(()=>{const d=document.createElement('div');d.id='recov';d.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99999';d.innerHTML='<svg id="recsvg"></svg><div id="reccap"></div><div id="recleg"></div>';document.body.appendChild(d);});
  }
  // stage
  await X(j=>{const E=window.__echoes;E.cmd('killAllEnemies');E.cmd('clearStatus');E.cmd('teleport',0,0);
    const st=E.state();const party=st.party||[];
    (j.allies||[]).forEach((a,i)=>{E.cmd('placeAlly',i+1,a[0],a[1]);const m=party[i+1];if(m)E.cmd('setHp',m.id,a[2]??1);});
    const pl=party[0];if(pl)E.cmd('setHp',pl.id,j.selfHp??1);
    for(const d of (j.dummies||[]))E.cmd('spawn',d[2]||'dummy',d[0],d[1],d[3]||null);
    if(j.earlyHp){const w=E.content.world();for(const e of w.entities())if(e.faction==='hostile'&&e.hittable){e.maxHp=j.earlyHp;e.hp=j.earlyHp;}}
    E.cmd('restoreSkillState',{slots:j.slots?[0,1,2,3].map(i=>j.slots[i]?{id:j.slots[i],remaining:0}:null):[j.skill?{id:j.skill,remaining:0}:null,null,null,null]});
  },job);
  const aimS=apply(Hw2s,job.aim||[0,-3]);
  await p.mouse.move(aimS[0],aimS[1]);
  await p.waitForTimeout(job.settle||900);
  // re-place after settle
  await X(j=>{const E=window.__echoes;E.cmd('teleport',0,0);const party=E.state().party||[];(j.allies||[]).forEach((a,i)=>{E.cmd('placeAlly',i+1,a[0],a[1]);const m=party[i+1];if(m)E.cmd('setHp',m.id,a[2]??1);});},job);
  const replaceDummies=j=>{const w=window.__echoes.content.world();const ds=w.entities().filter(e=>e.kind==='dummy').sort((a,b)=>a.id-b.id);const want=(j.dummies||[]).filter(d=>!d[2]||d[2]==='dummy');ds.forEach((e,i)=>{const d=want[i];if(!d)return;e.x=e.px=d[0];e.z=e.pz=d[1];e.kbVx=e.kbVz=0;e.kbTicks=0;if(e.slipVx!==undefined){e.slipVx=0;e.slipVz=0;}});};
  if(job.earlyHp) await X(replaceDummies,job);
  if(job.setup) await X(code=>{const E=window.__echoes;const w=E.content.world();eval(code);},job.setup);
  // overlay rings
  const ring=(c,r,n=72)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return apply(Hw2s,[c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r]).map(v=>v.toFixed(1)).join(',');}).join(' ');
  const wedge=(c,dir,r,half)=>{const pts=[apply(Hw2s,c)];const a0=Math.atan2(dir[1],dir[0]);for(let i=0;i<=24;i++){const a=a0-half+2*half*i/24;pts.push(apply(Hw2s,[c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r]));}return pts.map(q=>q.map(v=>v.toFixed(1)).join(',')).join(' ');};
  let svg='';
  for(const g of (job.guides||[])){
    const col=g.k==='range'?'rgba(255,255,255,0.75)':'rgba(255,224,140,0.9)';const dash=g.k==='range'?'stroke-dasharray="7 6"':'';
    if(g.rect){const c=g.c||[0,0],d=g.dir||[0,-1],L=g.len,W=g.w/2,px=-d[1],pz=d[0];const q=[[c[0]+px*W,c[1]+pz*W],[c[0]+px*W+d[0]*L,c[1]+pz*W+d[1]*L],[c[0]-px*W+d[0]*L,c[1]-pz*W+d[1]*L],[c[0]-px*W,c[1]-pz*W]].map(v=>apply(Hw2s,v).map(x=>x.toFixed(1)).join(',')).join(' ');svg+=`<polygon points="${q}" fill="none" stroke="${col}" stroke-width="2" ${dash}/>`;}
    else if(g.wedge)svg+=`<polygon points="${wedge(g.c||[0,0],g.dir||[0,-1],g.r,g.wedge*Math.PI/180)}" fill="none" stroke="${col}" stroke-width="2" ${dash}/>`;
    else svg+=`<polygon points="${ring(g.c||[0,0],g.r)}" fill="none" stroke="${col}" stroke-width="2" ${dash}/>`;
  }
  await X(([svg,cap,leg,nocap])=>{document.getElementById('recsvg').innerHTML=svg;document.getElementById('reccap').innerHTML=cap;document.getElementById('recleg').innerHTML=leg;if(nocap){document.getElementById('reccap').style.display='none';document.getElementById('recleg').style.display='none';document.getElementById('recsvg').style.display='none';}},[svg,job.cap,job.leg||'',NOCAP]);
  // record with a paused clock
  for(let k=0;k<6;k++){const now=await X(()=>Date.now());try{await p.clock.pauseAt(now+300*(k+1));break;}catch(e){console.log('pause retry',k);}}
  const dir=path.join(out,job.name);fs.mkdirSync(dir,{recursive:true});for(const f of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,f));
  const fps=job.fps||20, n=Math.round((job.secs||2.4)*fps), step=1000/fps;
  const preN=Math.round((job.pre||0.25)*fps);
  for(let i=0;i<n;i++){
    if(i===preN){ if(job.key==='hold-right'){await p.mouse.down({button:'right'});} else if(job.key){ for(const k of job.key.split('+'))await p.keyboard.down(k);} }
    if(i===preN+3&&job.key&&job.key!=='hold-right'){ for(const k of job.key.split('+').reverse())await p.keyboard.up(k);}
    if(job.key==='hold-right'&&i===n-Math.round(0.5*fps))await p.mouse.up({button:'right'});
    for(const q of (job.seq||[])){const fi=Math.round(q[0]*fps);
      if(i===fi){ if(q[1]==='rdown')await p.mouse.down({button:'right'}); else if(q[1]==='rup')await p.mouse.up({button:'right'}); else if(q[1]==='key')await p.keyboard.down(q[2]); else if(q[1]==='move'){job.allies[q[2]]=q[3];} else if(q[1]==='aim'){const s2=apply(Hw2s,q[2]);await p.mouse.move(s2[0],s2[1]);} else if(q[1]==='eval')await X(code=>{const E=window.__echoes;const w=E.content.world();eval(code);},q[2]); }
      if(i===fi+3&&q[1]==='key')await p.keyboard.up(q[2]);
      if(q[1]==='hold'){ if(i===fi)await p.keyboard.down(q[2]); if(i===fi+Math.max(1,Math.round(q[3]*fps)))await p.keyboard.up(q[2]); } }
    if(i===0&&job.earlyHp){await X(replaceDummies,job);if(job.setup)await X(code=>{const E=window.__echoes;const w=E.content.world();eval(code);},job.setup);}
    if(job.pin) await X(j=>{const E=window.__echoes;(j.allies||[]).forEach((a,i)=>E.cmd('placeAlly',i+1,a[0],a[1]));},job);
    if(job.every) await X(code=>{const E=window.__echoes;const w=E.content.world();eval(code);},job.every);
    await p.clock.runFor(step);
    if(job.live) await X(([e,leg])=>{try{document.getElementById('recleg').innerHTML=leg+(leg?' · ':'')+eval(e);}catch(err){}},[job.live,job.leg||'']);
    if(i>=(job.from??FROM)&&i<=(job.to??TO)&&((i-(job.from??FROM))%(job.shotEvery||1))===0) await p.screenshot(EXT==='png'?{path:path.join(dir,String(i).padStart(3,'0')+'.png'),type:'png',timeout:180000}:{path:path.join(dir,String(i).padStart(3,'0')+'.jpg'),type:'jpeg',quality:90,timeout:180000});
  }
  if(process.env.DUMP) console.log(job.name, JSON.stringify(await X(()=>{const w=window.__echoes.content.world();const h=globalThis.__mossHits||[];globalThis.__mossHits=[];return {hits:h, foes:w.entities().filter(e=>e.faction==="hostile").map(e=>[e.id,e.kind,Math.round(e.x*10)/10,Math.round(e.z*10)/10,e.hp,e.hittable])};})));
  await p.clock.resume();
  const tick=await X(()=>window.__echoes.tick);
  console.log(job.name,'frames',n,'secs',((Date.now()-t0)/1000).toFixed(0),'tick',tick);
}
await b.close();})();
