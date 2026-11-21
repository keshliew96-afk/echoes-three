  // ---- the Duskwing's effects. His attacks leave torn claw marks and a bite mark, in the style of Kesh's picture: tapered, ragged slashes in dark red with a pale torn edge.
  // The casts use his own colours from the game (Dusk Rose, Pale Moon, Dusk Plum, Wing Leather). Nothing glows: flat shapes that tear open and fade.
  const FXP=[], ROSE=0xE0509E, MOON=0xF2D9E6, PLUM=0x55304F, LEATHER=0x7A4E66; const RINGS=[], LATER=[], MARKS=[]; const fxV=new THREE.Vector3(), fxF=new THREE.Vector3(), fxD=new THREE.Vector3(), UPV=new THREE.Vector3(0,1,0);
  // the marks' colours: red as in the picture, or his own Dusk Rose (the Show row switches)
  const PALS={red:{fill:0xA5121F,core:0x5C0912,rim:0xF6ECEE},rose:{fill:0xE0509E,core:0x55304F,rim:0xF2D9E6}}; let pal='red';
  { const b=document.getElementById('rose'); if(b)b.addEventListener('click',()=>{ pal=pal==='red'?'rose':'red'; b.setAttribute('aria-pressed',String(pal==='rose')); }); }
  function mote(pos,vel,life,size,grav,col,op,stay){ if(FXP.length>220)return; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:col,blending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:0})); s.scale.setScalar(size); s.position.copy(pos); scene.add(s); FXP.push({s,v:vel,t:0,life,grav:grav||0,op:op||0.5,size,stay:!!stay}); }
  const rnd=(a)=>(Math.random()-0.5)*2*a;
  const facing=(out)=>{out.set(0,0,1).applyQuaternion(model.quaternion); out.y=0; return out.normalize();};
  let headB=null; const mouth=(out)=>{ headB=headB||model.getObjectByName('head'); headB.updateWorldMatrix(true,false); return out.set(0,0.1,0.22).applyMatrix4(headB.matrixWorld); };
  function dustAt(c,n,power,spread){ for(let i=0;i<n;i++){const a=Math.random()*6.283, sp=power*(0.5+Math.random()); mote(new THREE.Vector3(c.x+Math.cos(a)*spread*Math.random(),0.03+Math.random()*0.05,c.z+Math.sin(a)*spread*Math.random()),new THREE.Vector3(Math.cos(a)*sp,0.2+Math.random()*0.5*power,Math.sin(a)*sp),0.4+Math.random()*0.3,0.05+Math.random()*0.06,-2.0,LEATHER,0.35);} }
  function makeSoft(){ for(let k=0;k<10;k++){ const mat=new THREE.MeshBasicMaterial({color:ROSE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}); const r=new THREE.Mesh(new THREE.RingGeometry(0.9,1,44),mat); r.visible=false; scene.add(r); RINGS.push({r,mat,t:-1,life:0.4,s0:0.1,s1:1,op:0.4,v:new THREE.Vector3()}); } }
  // a thin ring that opens and fades: flat on the floor, or upright facing 'dir' and travelling along it
  function ringFx(pos,dir,s0,s1,life,col,op,speed,thick){ const s=RINGS.find(s=>s.t<0); if(!s)return; s.t=0; s.life=life; s.s0=s0; s.s1=s1; s.op=op; s.mat.color.setHex(col); s.r.position.copy(pos);
    if(!dir){ s.r.position.y=0.014; s.r.rotation.set(-Math.PI/2,0,0); s.v.set(0,0,0); } else { s.r.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),fxD.copy(dir).normalize()); s.v.copy(dir).normalize().multiplyScalar(speed||0); } }
  // ---- torn marks. One slash is a strip along a bent centre line: pointed at both ends (or, for a tooth, blunt at the gum and pointed at the tip), its two edges ragged.
  // It is drawn three times: a pale ragged rim, the colour, and a darker core. It tears open along its length, holds, and fades.
  function rng(seed){ let s=seed*9301+49297; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
  function slashGeo(len,wid,bend,seed,grow,jag,tooth){ const N=20, R=rng(seed), P=[], idx=[];
    for(let i=0;i<=N;i++){ const u=i/N, x=(u-0.5)*len, y=bend*len*4*u*(1-u), dx=len, dy=bend*len*4*(1-2*u), dl=Math.hypot(dx,dy), nx=-dy/dl, ny=dx/dl;
      const prof=tooth?Math.pow(1-u,0.75)*Math.min(1,u*9+0.25):Math.pow(Math.sin(Math.PI*u),0.62)*(0.72+0.28*u); const end=(i===0&&!tooth)||i===N;
      const ht=end?0:wid*prof*(1+jag*(R()-0.5))+grow*Math.min(1,prof*3), hb=end?0:wid*prof*(1+jag*(R()-0.5))+grow*Math.min(1,prof*3);
      P.push(x+nx*ht,y+ny*ht,0, x-nx*hb,y-ny*hb,0); if(i<N){const a=i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2);} }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setIndex(idx); return g; }
  function slash(parent,len,wid,bend,seed,x,y,rot,delay,tooth){ const P=PALS[pal], g=new THREE.Group(); g.position.set(x,y,0); g.rotation.z=rot; const parts=[];
    [[P.rim,0.012,0.9,0.9,0],[P.fill,0,0.5,0.95,0.001],[P.core,-wid*0.55,0.35,0.9,0.002]].forEach(([col,grow,jag,op,z])=>{ const geo=slashGeo(len,Math.max(0.004,wid+Math.min(0,grow)),bend,seed,Math.max(0,grow),jag,tooth);
      const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0,depthWrite:false,depthTest:false,side:THREE.DoubleSide})); m.position.z=z; m.renderOrder=20+z*1000; m.frustumCulled=false; g.add(m); parts.push({m,op}); });
    parent.add(g); return {g,parts,delay}; }
  // a set of marks: always turned to the camera, so it reads from any side
  function markSet(pos,roll,size,life){ const grp=new THREE.Group(); grp.position.copy(pos); grp.scale.setScalar(size); scene.add(grp); const M={grp,roll,t:0,life:life||0.62,open:0.09,items:[],jaws:null,size}; MARKS.push(M); return M; }
  // claws: n torn slashes side by side, the middle ones longest, each starting a moment after the one before
  function clawMark(pos,roll,size,n,bend,seed){ const M=markSet(pos,roll,size); for(let i=0;i<n;i++){ const k=i-(n-1)/2, len=1-0.16*Math.abs(k)-0.05*((seed+i)%3); M.items.push(slash(M.grp,len,0.036-0.004*Math.abs(k),bend*(1+0.12*k),seed+i*7,0.03*k*k-0.02*k,k*0.17,0.05*k,0.022*i)); } return M; }
  // bite: two rows of torn tooth cuts, the fangs longest, that snap shut on each other
  function biteMark(pos,size,seed){ const M=markSet(pos,0,size,0.7); M.open=0.05; M.jaws=[new THREE.Group(),new THREE.Group()]; M.grp.add(M.jaws[0],M.jaws[1]);
    [1,-1].forEach((sgn,j)=>{ const n=j?4:5; for(let i=0;i<n;i++){ const k=i-(n-1)/2, fang=!j&&Math.abs(k)===1||j&&Math.abs(k)===1.5, len=(fang?0.36:0.22)-0.02*Math.abs(k); const x=k*0.19, y=sgn*(0.3-0.065*k*k);
        M.items.push(slash(M.jaws[j],len,fang?0.05:0.04,0.06*k*sgn*-1,seed+i*5+j*40,x,y-sgn*len/2,(sgn>0?-Math.PI/2:Math.PI/2)+0.1*k*sgn*-1,0.004*Math.abs(k),true)); } }); return M; }
  function updateMarks(d){ for(let i=MARKS.length-1;i>=0;i--){ const M=MARKS[i]; M.t+=d; const u=M.t/M.life; M.grp.quaternion.copy(cam.quaternion); M.grp.rotateZ(M.roll); M.grp.scale.setScalar(M.size*(1+0.06*u));
      if(M.jaws){ const c=Math.min(1,M.t/0.07), e=c*c, gap=0.34*(1-e)+(c>=1?0.03*Math.exp(-(M.t-0.07)*30)*Math.cos((M.t-0.07)*60):0); M.jaws[0].position.y=gap; M.jaws[1].position.y=-gap; }
      const fade=feel?Math.min(1,(1-u)/0.45):0; M.items.forEach(it=>{ const r=Math.min(1,Math.max(0,(M.t-it.delay)/M.open)); it.parts.forEach(p=>{ const n=p.m.geometry.index.count; p.m.geometry.setDrawRange(0,M.jaws?n:Math.ceil(r*n/6)*6); p.m.material.opacity=p.op*fade*(M.jaws?Math.min(1,M.t/0.03):Math.min(1,r*4)); }); });
      if(u>=1||!feel){ M.items.forEach(it=>it.parts.forEach(p=>{p.m.geometry.dispose();p.m.material.dispose();})); scene.remove(M.grp); MARKS.splice(i,1); } } }
  const ahead=(reach,h)=>new THREE.Vector3(model.position.x,h,model.position.z).addScaledVector(fxF,reach);
  let seedN=1;
  // one-off effects at a move's contact time
  function castFx(key,hitNo,i){ if(!feel||!staff)return; facing(fxF); const feet=new THREE.Vector3(model.position.x,0,model.position.z); seedN+=11;
    if(hitNo===1){ clawMark(ahead(0.62,0.46),-0.95,0.5,3,0.1,seedN); }
    else if(hitNo===2){ clawMark(ahead(0.66,0.46),0.95,0.5,3,-0.1,seedN); }
    if(hitNo>=1&&hitNo<=3)postHit(0,model.position); else if(hitNo>=4)postHit(1,model.position);
    if(hitNo===4){ clawMark(ahead(0.5,0.46),-0.95,0.5,3,0.1,seedN); }
    else if(hitNo===5){ clawMark(ahead(0.5,0.46),0.95,0.5,3,-0.1,seedN); }
    else if(hitNo===6){ clawMark(ahead(0.5,0.5),-0.2,0.62,4,0.12,seedN); clawMark(ahead(0.5,0.42),0.2,0.62,4,-0.12,seedN+5); shake=Math.max(shake,0.5); }
    else if(hitNo===3){ biteMark(ahead(0.74,0.44),0.42,seedN); for(let n=0;n<5;n++)mote(ahead(0.74,0.44).add(new THREE.Vector3(rnd(0.1),rnd(0.1),rnd(0.1))),new THREE.Vector3(rnd(0.8),0.4+Math.random()*0.8,rnd(0.8)),0.35,0.03,-4,PALS[pal].fill,0.6); }
    else if(key==='castPlant'){ const c=ahead(0.84,0.44); biteMark(c,0.62,seedN); shake=Math.max(shake,0.6);
      // the drain: a thread of rose motes drawn from the bite back to his mouth
      for(let n=0;n<12;n++)LATER.push({t:0.1+0.03*n,fn:()=>{ mouth(fxV); const p=c.clone().add(new THREE.Vector3(rnd(0.08),rnd(0.08),rnd(0.08))); mote(p,fxV.clone().sub(p).multiplyScalar(3.4),0.3,0.035,0,n%3?ROSE:MOON,0.55); }}); }
    else if(key==='castSweep'){ clawMark(ahead(0.8,0.48),0.12,0.95,4,0.16,seedN); dustAt(feet,4,0.5,0.2); }
    else if(key==='castPoint'){ mouth(fxV); const from=fxV.clone(); for(let n=0;n<4;n++)LATER.push({t:0.07*n,fn:()=>ringFx(from,fxF,0.12,0.75+0.1*n,0.5,n%2?ROSE:MOON,n%2?0.3:0.38,4.4)}); }
    else if(key==='castBloom'){ ringFx(feet,null,0.3,2.0,0.8,PLUM,0.5); ringFx(feet,null,0.2,1.7,0.65,ROSE,0.28); for(let n=0;n<18;n++){ const a=Math.random()*6.283, r=0.4+Math.random()*1.3; mote(new THREE.Vector3(feet.x+Math.cos(a)*r,0.05,feet.z+Math.sin(a)*r),new THREE.Vector3(Math.cos(a)*0.3,0.5+Math.random()*0.7,Math.sin(a)*0.3),0.7+Math.random()*0.4,0.09+Math.random()*0.08,0,PLUM,0.42); } }
    else if(key==='dive'){ const c=feet.clone().addScaledVector(fxF,0.25); ringFx(c,null,0.2,1.2,0.5,ROSE,0.4); ringFx(c,null,0.1,0.8,0.4,PLUM,0.4); dustAt(c,10,0.9,0.25); } }
  // effects that run while a move plays: a run or a dash leaves a little dust
  let stepPh=0;
  function ongoingFx(d){ if(!feel||!staff)return;
    for(let i=LATER.length-1;i>=0;i--){ LATER[i].t-=d; if(LATER[i].t<=0){ LATER[i].fn(); LATER.splice(i,1); } }
    const fast=!sel.downed&&!rising&&moving&&(sel.dash||sel.base==='run'); if(fast){ stepPh+=d/0.2; if(stepPh>=1){ stepPh=0; dustAt(new THREE.Vector3(model.position.x+rnd(0.1),0,model.position.z-0.05),2,0.3,0.06); } } }
  function updateSoft(d){ updateMarks(d);
    for(let i=FXP.length-1;i>=0;i--){const m=FXP[i]; m.t+=d; m.v.y+=m.grav*d; m.s.position.addScaledVector(m.v,d); if(m.grav&&m.s.position.y<0.02){m.s.position.y=0.02; m.v.multiplyScalar(0.2);m.v.y=0;}
      const u=m.t/m.life; m.s.material.opacity=m.op*Math.min(1,u*6)*(1-u); m.s.scale.setScalar(m.size*(1+0.8*u)); if(u>=1){scene.remove(m.s);m.s.material.dispose();FXP.splice(i,1);} }
    RINGS.forEach(s=>{ if(s.t<0)return; s.t+=d; const u=s.t/s.life, e=1-Math.pow(1-Math.min(1,u),3); s.r.visible=true; s.r.position.addScaledVector(s.v,d); s.r.scale.setScalar(s.s0+(s.s1-s.s0)*e); s.mat.opacity=s.op*Math.min(1,u*12)*(1-u); if(u>=1){s.t=-1;s.r.visible=false;} });
  }

