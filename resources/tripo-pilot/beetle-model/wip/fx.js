  // ---- the Bellwright's effects, all dim and in her own colours (Bell Brass for a struck note, Verdigris for her own bell answering, Old Bronze for the dust):
  // every stroke leaves one thin ring that opens and fades, like a note leaving a bell; the heavy strokes add a ring on the floor and a little dust
  const FXP=[], BRASS=0xF5D06B, VERD=0x86D3B4, DUST=0x8A6A3E; const RINGS=[], LATER=[]; let wave=null, waveT=-1, bellB=null; const waveBase=new THREE.Vector3(), waveDir=new THREE.Vector3(); const fxV=new THREE.Vector3(), fxF=new THREE.Vector3(), fxB=new THREE.Vector3(), FLAT=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
  function mote(pos,vel,life,size,grav,col,op){ if(FXP.length>200)return; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:col,blending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:0})); s.scale.setScalar(size); s.position.copy(pos); scene.add(s); FXP.push({s,v:vel,t:0,life,grav:grav||0,op:op||0.5,size}); }
  const rnd=(a)=>(Math.random()-0.5)*2*a;
  const facing=(out)=>{out.set(0,0,1).applyQuaternion(model.quaternion); out.y=0; return out.normalize();};
  function dustAt(c,n,power,spread){ for(let i=0;i<n;i++){const a=Math.random()*6.283, sp=power*(0.5+Math.random()); mote(new THREE.Vector3(c.x+Math.cos(a)*spread*Math.random(),0.03+Math.random()*0.05,c.z+Math.sin(a)*spread*Math.random()),new THREE.Vector3(Math.cos(a)*sp,0.2+Math.random()*0.5*power,Math.sin(a)*sp),0.4+Math.random()*0.3,0.05+Math.random()*0.06,-2.0,DUST,0.35);} }
  const head=(out)=>out.set(0,0.83,0).applyMatrix4(staff.matrixWorld);
  const ownBell=(out)=>{ bellB=bellB||model.getObjectByName('bell'); if(!bellB)return out.copy(model.position).setY(0.8); bellB.updateWorldMatrix(true,false); return out.set(0,-0.1,0).applyMatrix4(bellB.matrixWorld); };
  function makeSoft(){
    for(let k=0;k<10;k++){ const mat=new THREE.MeshBasicMaterial({color:BRASS,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}); const r=new THREE.Mesh(new THREE.RingGeometry(0.9,1,40),mat); r.visible=false; scene.add(r); RINGS.push({r,mat,t:-1,life:0.4,s0:0.1,s1:0.5,op:0.4}); }
    wave=new THREE.Mesh(new THREE.RingGeometry(0.86,1,48,1,-Math.PI/2-1.2,2.4),new THREE.MeshBasicMaterial({color:BRASS,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); wave.visible=false; scene.add(wave);
  }
  // one note: a thin ring that opens from s0 to s1 and fades. flat lays it on the floor; otherwise it stands up facing the way she faces
  function note(pos,flat,s0,s1,life,col,op){ const s=RINGS.find(s=>s.t<0); if(!s)return; s.t=0; s.life=life; s.s0=s0; s.s1=s1; s.op=op; s.mat.color.setHex(col); s.r.position.copy(pos); if(flat){s.r.position.y=0.014; s.r.quaternion.copy(FLAT);} else s.r.quaternion.copy(model.quaternion); }
  function waveAt(size,life,travel){ facing(fxF); waveT=0; wave.userData={size,life,travel}; waveDir.copy(fxF); waveBase.set(model.position.x,0.02,model.position.z).addScaledVector(fxF,-0.2); wave.quaternion.copy(model.quaternion).multiply(FLAT); }
  // ---- summoned bells: copies of the bell on her back. One fades in where the stroke will land, she strikes it, it rocks and rings, and it fades out again
  const BELLS=[], SBELL={}; let bellGeo=null, bellSrc=null; const HOOK=[0.305,0.895,-0.235], bQ=new THREE.Quaternion(), bE=new THREE.Euler();
  function initBells(){ if(bellGeo||!model)return; let sm=null; model.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton.bones.some(b=>b.name==='bell'))sm=o;}); if(!sm)return;
    const bi=sm.skeleton.bones.findIndex(b=>b.name==='bell'), g=sm.geometry, P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight, ix=g.index;
    const isB=v=>(SI.getX(v)===bi&&SW.getX(v)>0.6)||(SI.getY(v)===bi&&SW.getY(v)>0.6)||(SI.getZ(v)===bi&&SW.getZ(v)>0.6)||(SI.getW(v)===bi&&SW.getW(v)>0.6);
    const pos=[],nor=[],uv=[], n=ix?ix.count:P.count;
    for(let f=0;f<n;f+=3){ const a=ix?ix.getX(f):f,b=ix?ix.getX(f+1):f+1,c=ix?ix.getX(f+2):f+2; if(isB(a)&&isB(b)&&isB(c))for(const v of [a,b,c]){pos.push(P.getX(v)-HOOK[0],P.getY(v)-HOOK[1],P.getZ(v)-HOOK[2]);nor.push(N.getX(v),N.getY(v),N.getZ(v));uv.push(U.getX(v),U.getY(v));} }
    bellGeo=new THREE.BufferGeometry(); bellGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); bellGeo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3)); bellGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); bellSrc=sm.material; window.__bellTris=pos.length/9;
    for(let k=0;k<5;k++){ const mat=bellSrc.clone(); mat.skinning=false; mat.transparent=true; mat.opacity=0; mat.depthWrite=true; const g2=new THREE.Group(), m=new THREE.Mesh(bellGeo,mat); g2.add(m); g2.visible=false; scene.add(g2); BELLS.push({g:g2,mat,t:-1,p:new THREE.Vector3(),q:new THREE.Quaternion(),F:new THREE.Vector3(),L:new THREE.Vector3()}); } }
  // local is in her own frame: x to her left, y up, z ahead; the point given is the bell's crown (its top), and the bell hangs below it
  function summon(tag,local,s,life,move){ initBells(); const b=BELLS.find(b=>b.t<0); if(!b)return null; facing(b.F); b.L.set(b.F.z,0,-b.F.x);
    b.p.set(model.position.x,0,model.position.z).addScaledVector(b.L,local[0]).addScaledVector(b.F,local[2]); b.p.y=local[1]; b.q.copy(model.quaternion); b.s=s; b.t=0; b.life=life; b.move=move||null; b.rockT=-1; b.rockA=0; b.rockZ=0; b.tag=tag; b.off=new THREE.Vector3(); b.tilt=0; SBELL[tag]=b; return b; }
  const centre=(b,out)=>out.copy(b.p).add(b.off).setY(b.p.y+b.off.y-0.095*b.s);
  // strike it: it rocks away from the blow and settles, and a note leaves it. side: 0 rocks it forward, -1 to her right, 1 to her left
  function strike(b,amp,side,col,big){ if(!b||b.t<0)return; b.rockT=0; b.rockA=amp; b.rockZ=side||0; note(centre(b,fxB),false,0.07*b.s,(big||0.3)*b.s,0.4,col||BRASS,0.42); }
  function updateBells(d){ for(const b of BELLS){ if(b.t<0)continue; b.t+=d; if(b.move)b.move(b,b.t,d);
      let rx=0,rz=b.tilt; if(b.rockT>=0){ b.rockT+=d; const r=b.rockA*Math.exp(-3.2*b.rockT)*Math.sin(2*Math.PI*b.rockT/0.42); if(b.rockZ)rz+=r*b.rockZ; else rx=-r; }
      b.g.visible=true; b.g.position.copy(b.p).add(b.off); b.g.quaternion.copy(b.q).multiply(bQ.setFromEuler(bE.set(rx,0,rz))); b.g.scale.setScalar(b.s*(0.6+0.4*Math.min(1,b.t/0.12)));
      b.mat.opacity=Math.min(1,b.t/0.12)*Math.min(1,Math.max(0,(b.life-b.t)/0.22)); if(b.t>=b.life){b.t=-1;b.g.visible=false;if(SBELL[b.tag]===b)delete SBELL[b.tag];} } }
  // where each bell comes in, a moment before the stroke that rings it (times in seconds from the start of the move)
  const ease=(u)=>u<0?0:u>1?1:u*u*(3-2*u);
  const B1=()=>summon('h1',[-0.22,0.43,0.53],0.8,0.6), B2=()=>summon('h2',[-0.56,0.50,0.40],1.1,0.62);
  const B3=(wait)=>summon('h3',[-0.2,0.95,0.60],1.8,1.1,(b,t)=>{const u=Math.min(1,Math.max(0,(t-wait)/0.08)); b.off.y=-0.64*u*u;});
  const BCLAP=()=>summon('clap',[-0.22,0.455,0.61],1.2,0.9,(b,t,d)=>{ if(b.fly>0){ b.off.addScaledVector(b.F,b.fly*d); b.fly*=Math.exp(-3*d); } });
  const BSWING=()=>summon('swing',[-0.62,0.62,0.22],1.6,0.9,(b,t)=>{ if(b.go===undefined)return; const u=ease((t-b.go)/0.3), a=Math.PI*u; b.off.copy(b.L).multiplyScalar(0.62*(1-Math.cos(a))).addScaledVector(b.F,0.5*Math.sin(a)); b.tilt=0.5*Math.sin(a)*(u<1?1:0); });
  const BHANG=()=>summon('hang',[0,0.62,0.5],1.3,3.2,(b,t)=>{ const u=ease(t/0.1); b.off.y=-(0.62-0.165*1.3-0.012)*u; });
  const SUMMON={combo:[[0.08,B1],[0.40,B2],[0.74,()=>B3(0.20)]],combo1:[[0.08,B1]],combo2:[[0.12,B2]],combo3:[[0.08,()=>B3(0.20)]],castPoint:[[0.16,BCLAP]],castSweep:[[0.18,BSWING]],castPlant:[[0.30,BHANG]]};
  function watchSummons(){ running.forEach((a,n)=>{ const list=SUMMON[n.replace(/Up$/,'')]; if(!list||!(a.__tw>0)){a.__sp=a.time;return;} const p=a.__sp===undefined||a.__sp>a.time?-1:a.__sp; for(const [t,fn] of list)if(p<t&&a.time>=t)fn(); a.__sp=a.time; }); }
  // one-off effects at a move's contact time
  function castFx(key,hitNo,i){ if(!feel||!staff)return; staff.updateWorldMatrix(true,false); facing(fxF); head(fxV); const feet=new THREE.Vector3(model.position.x,0,model.position.z);
    if(hitNo===1){ strike(SBELL.h1||B1(),0.5,0); if(SBELL.h1)SBELL.h1.life=Math.min(SBELL.h1.life,SBELL.h1.t+0.42); }
    else if(hitNo===2){ strike(SBELL.h2||B2(),0.6,-1); if(SBELL.h2)SBELL.h2.life=Math.min(SBELL.h2.life,SBELL.h2.t+0.44); }
    else if(hitNo===3){ const b=SBELL.h3||B3(0); strike(b,0.3,0,BRASS,0.34); if(b){ b.life=Math.min(b.life,b.t+0.6); centre(b,fxB); note(fxB,true,0.15,0.8,0.55,BRASS,0.4); dustAt(new THREE.Vector3(fxB.x,0,fxB.z),7,0.6,0.16); } LATER.push({t:0.08,fn:()=>note(ownBell(fxB),false,0.06,0.3,0.5,VERD,0.4)}); }
    else if(key==='castPoint'){ const b=SBELL.clap||BCLAP(); strike(b,0.35,0,BRASS,0.36); if(b){ b.fly=5.5; b.life=Math.min(b.life,b.t+0.5); for(let n=1;n<=2;n++)LATER.push({t:0.11*n,fn:()=>{ if(b.t>=0)note(centre(b,fxB),false,0.08,0.3+0.1*n,0.4,BRASS,0.3); }}); } }
    else if(key==='castBloom'){ note(ownBell(fxB),false,0.06,0.3,0.45,VERD,0.42); note(feet,true,0.2,0.75+0.2*i,0.6,i===1?VERD:BRASS,0.3);
      const at=[[-0.5,0.56,0.32],[0,0.66,0.55],[0.5,0.56,0.32]][i]||[0,0.6,0.5]; const b=summon('peal'+i,at,0.9,0.62); LATER.push({t:0.1,fn:()=>strike(b,0.45,i===0?-1:i===2?1:0,i===1?VERD:BRASS)}); if(SBELL.hang)strike(SBELL.hang,0.3,0,VERD); }
    else if(key==='castPlant'){ const b=SBELL.hang||BHANG(); if(i===0){ if(b){ centre(b,fxB); dustAt(new THREE.Vector3(fxB.x,0,fxB.z),4,0.35,0.1); note(new THREE.Vector3(fxB.x,0,fxB.z),true,0.2,0.34,0.5,BRASS,0.3); } } else strike(b,0.28,0,BRASS,0.32); }
    else if(key==='castSweep'){ const b=SBELL.swing||BSWING(); if(b){ b.go=b.t; b.life=Math.min(b.life,b.t+0.6); strike(b,0,0,BRASS,0.3); } waveAt(0.55,0.6,0.6); note(ownBell(fxB),false,0.06,0.28,0.45,VERD,0.36); }
    else if(key==='hop'){ dustAt(feet,i===0?5:7,i===0?0.5:0.7,0.12); if(i===1)note(ownBell(fxB),false,0.05,0.24,0.4,VERD,0.34); } }
  // effects that run while a move plays: a run or a dash kicks up a little dust
  let stepPh=0;
  function ongoingFx(d){ if(!feel||!staff)return; watchSummons();
    for(let i=LATER.length-1;i>=0;i--){ LATER[i].t-=d; if(LATER[i].t<=0){ LATER[i].fn(); LATER.splice(i,1); } }
    const fast=!sel.downed&&!rising&&moving&&(sel.dash||sel.base==='run'); if(fast){ stepPh+=d/0.2; if(stepPh>=1){ stepPh=0; dustAt(new THREE.Vector3(model.position.x+rnd(0.1),0,model.position.z-0.05),2,0.3,0.06); } } }
  function updateSoft(d){ updateBells(d);
    for(let i=FXP.length-1;i>=0;i--){const m=FXP[i]; m.t+=d; m.v.y+=m.grav*d; m.s.position.addScaledVector(m.v,d); if(m.grav&&m.s.position.y<0.02){m.s.position.y=0.02; m.v.multiplyScalar(0.2);m.v.y=0;}
      const u=m.t/m.life; m.s.material.opacity=m.op*Math.min(1,u*6)*(1-u); m.s.scale.setScalar(m.size*(1+0.8*u)); if(u>=1){scene.remove(m.s);m.s.material.dispose();FXP.splice(i,1);} }
    RINGS.forEach(s=>{ if(s.t<0)return; s.t+=d; const u=s.t/s.life, e=1-Math.pow(1-Math.min(1,u),3); s.r.visible=true; s.r.scale.setScalar(s.s0+(s.s1-s.s0)*e); s.mat.opacity=s.op*Math.min(1,u*12)*(1-u); if(u>=1){s.t=-1;s.r.visible=false;} });
    if(waveT>=0){waveT+=d; const W=wave.userData, u=waveT/W.life, e=1-Math.pow(1-Math.min(1,u),2); wave.visible=true; wave.position.copy(waveBase).addScaledVector(waveDir,W.travel*e); wave.scale.setScalar(W.size*(0.8+0.5*e)); wave.material.opacity=0.38*(1-u*u); if(u>=1){waveT=-1;wave.visible=false;}}
  }
