  // ---- the Bellwright's effects, all dim and in her own colours (Bell Brass for a struck note, Verdigris for her own bell answering, Old Bronze for the dust):
  // every stroke leaves one thin ring that opens and fades, like a note leaving a bell; the heavy strokes add a ring on the floor and a little dust
  const FXP=[], BRASS=0xF5D06B, VERD=0x86D3B4, DUST=0x8A6A3E; const RINGS=[], LATER=[]; const WAVES=[]; let bellB=null; const waveBase=new THREE.Vector3(), waveDir=new THREE.Vector3(); const fxV=new THREE.Vector3(), fxF=new THREE.Vector3(), fxB=new THREE.Vector3(), FLAT=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
  function mote(pos,vel,life,size,grav,col,op){ if(FXP.length>200)return; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:col,blending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:0})); s.scale.setScalar(size); s.position.copy(pos); scene.add(s); FXP.push({s,v:vel,t:0,life,grav:grav||0,op:op||0.5,size}); }
  const rnd=(a)=>(Math.random()-0.5)*2*a;
  const facing=(out)=>{out.set(0,0,1).applyQuaternion(model.quaternion); out.y=0; return out.normalize();};
  function dustAt(c,n,power,spread){ for(let i=0;i<n;i++){const a=Math.random()*6.283, sp=power*(0.5+Math.random()); mote(new THREE.Vector3(c.x+Math.cos(a)*spread*Math.random(),0.03+Math.random()*0.05,c.z+Math.sin(a)*spread*Math.random()),new THREE.Vector3(Math.cos(a)*sp,0.2+Math.random()*0.5*power,Math.sin(a)*sp),0.4+Math.random()*0.3,0.05+Math.random()*0.06,-2.0,DUST,0.35);} }
  const head=(out)=>out.set(0,0.83,0).applyMatrix4(staff.matrixWorld);
  const ownBell=(out)=>{ bellB=bellB||model.getObjectByName('bell'); if(!bellB)return out.copy(model.position).setY(0.8); bellB.updateWorldMatrix(true,false); return out.set(0,-0.1,0).applyMatrix4(bellB.matrixWorld); };
  function makeSoft(){
    for(let k=0;k<10;k++){ const mat=new THREE.MeshBasicMaterial({color:BRASS,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}); const r=new THREE.Mesh(new THREE.RingGeometry(0.9,1,40),mat); r.visible=false; scene.add(r); RINGS.push({r,mat,t:-1,life:0.4,s0:0.1,s1:0.5,op:0.4}); }
    for(let k=0;k<6;k++){ const w=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48,1,-Math.PI/2-0.9,1.8),new THREE.MeshBasicMaterial({color:BRASS,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); w.visible=false; scene.add(w); WAVES.push({w,t:-1,base:new THREE.Vector3(),dir:new THREE.Vector3()}); }
  }
  // one note: a thin ring that opens from s0 to s1 and fades. flat lays it on the floor; otherwise it stands up facing the way she faces
  function note(pos,flat,s0,s1,life,col,op){ const s=RINGS.find(s=>s.t<0); if(!s)return; s.t=0; s.life=life; s.s0=s0; s.s1=s1; s.op=op; s.mat.color.setHex(col); s.r.position.copy(pos); if(flat){s.r.position.y=0.014; s.r.quaternion.copy(FLAT);} else s.r.quaternion.copy(model.quaternion); }
  // a sound wave: an arc lying on the floor that opens out ahead of 'from' in a fan. s0 to s1 is its radius, travel carries its centre forward
  function waveAt(size,life,travel,from,s1,col,op){ const W=WAVES.find(w=>w.t<0); if(!W)return; facing(fxF); W.t=0; W.size=size; W.s1=s1||size*1.3; W.life=life; W.travel=travel; W.op=op||0.38; W.w.material.color.setHex(col||BRASS); W.dir.copy(fxF); if(from)W.base.set(from.x,0.02,from.z); else W.base.set(model.position.x,0.02,model.position.z).addScaledVector(fxF,-0.2); W.w.quaternion.copy(model.quaternion).multiply(FLAT); }
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
    b.p.set(model.position.x,0,model.position.z).addScaledVector(b.L,local[0]).addScaledVector(b.F,local[2]); b.p.y=local[1]; b.q.copy(model.quaternion); b.s=s; b.t=0; b.life=life; b.move=move||null; b.rockT=-1; b.rockA=0; b.rockZ=0; b.tag=tag; b.off=new THREE.Vector3(); b.tilt=0; b.pitch=0; b.alpha=1; b.fin=0.12; b.shot=undefined; b.done=false; b.fly=0; b.go=undefined; SBELL[tag]=b; return b; }
  const centre=(b,out)=>out.copy(b.p).add(b.off).setY(b.p.y+b.off.y-0.095*b.s);
  // strike it: it rocks away from the blow and settles, and a note leaves it. side: 0 rocks it forward, -1 to her right, 1 to her left
  function strike(b,amp,side,col,big){ if(!b||b.t<0)return; b.rockT=0; b.rockA=amp; b.rockZ=side||0; note(centre(b,fxB),false,0.07*b.s,(big||0.3)*b.s,0.4,col||BRASS,0.42); }
  function updateBells(d){ for(const b of BELLS){ if(b.t<0)continue; b.t+=d; if(b.move)b.move(b,b.t,d);
      let rx=b.pitch,rz=b.tilt; if(b.rockT>=0){ b.rockT+=d; const r=b.rockA*Math.exp(-3.2*b.rockT)*Math.sin(2*Math.PI*b.rockT/0.42); if(b.rockZ)rz+=r*b.rockZ; else rx-=r; }
      b.g.visible=true; b.g.position.copy(b.p).add(b.off); b.g.quaternion.copy(b.q).multiply(bQ.setFromEuler(bE.set(rx,0,rz))); b.g.scale.setScalar(b.s*(0.6+0.4*Math.min(1,b.t/b.fin)));
      b.mat.opacity=b.alpha*Math.min(1,b.t/b.fin)*Math.min(1,Math.max(0,(b.life-b.t)/0.22)); if(b.t>=b.life){b.t=-1;b.g.visible=false;if(SBELL[b.tag]===b)delete SBELL[b.tag];} } }
  // where each bell comes in, a moment before the stroke that rings it (times in seconds from the start of the move)
  const ease=(u)=>u<0?0:u>1?1:u*u*(3-2*u);
  // hits 1 and 2: a small faint bell. The stroke sends it flying; at the end of its flight (in the game: when it hits something, or at its longest range) it floats up, grows two and a half times, turns solid, and smashes down
  const RANGE=1.3, TFLY=0.24, TRISE=0.34, THANG=0.1, TFALL=0.09;
  function shotMove(b,t,d){ if(b.shot===undefined)return; const k=t-b.shot, s0=b.s0;
    if(k<TFLY){ const u=k/TFLY; b.off.copy(b.F).multiplyScalar(RANGE*(1-(1-u)*(1-u))); b.pitch=-0.9*Math.sin(Math.PI*Math.min(1,u*1.2)); }
    else if(k<TFLY+TRISE+THANG){ const u=ease((k-TFLY)/TRISE); b.off.copy(b.F).multiplyScalar(RANGE); b.off.y=b.top*u; b.s=s0*(1+1.5*u); b.alpha=0.4+0.6*u; b.pitch=0; b.tilt=0.12*Math.sin(k*30)*(1-u); }
    else { const u=Math.min(1,(k-TFLY-TRISE-THANG)/TFALL); b.s=s0*2.5; b.alpha=1; b.tilt=0; b.off.y=b.top+(b.floor-b.top)*u*u;
      if(u>=1&&!b.done){ b.done=true; b.life=b.t+0.4; centre(b,fxB); const c=new THREE.Vector3(fxB.x,0,fxB.z); note(c,true,0.2,0.95,0.55,BRASS,0.42); note(c,true,0.1,0.6,0.45,VERD,0.3); dustAt(c,9,0.8,0.2); shake=Math.max(shake,0.55); b.rockT=0; b.rockA=0.12; } } }
  function shotBell(tag,local){ const b=summon(tag,local,0.8,3,shotMove); if(b){ b.s0=0.8; b.alpha=0.4; b.top=0.62; b.floor=(0.165*0.8*2.5+0.012)-local[1]; } return b; }
  const B1=()=>shotBell('h1',[-0.233,0.46,0.49]), B2=()=>shotBell('h2',[-0.485,0.492,0.374]);
  const fire=(b)=>{ if(!b)return; b.shot=b.t; note(centre(b,fxB),false,0.05,0.24,0.3,BRASS,0.4); };
  // hit 3: a great bell lying on its side in front of her, its mouth pointing ahead like a horn. She drums on its crown and every stroke sends a sound wave out of its mouth in a fan
  const GS=3.4;
  const B3=()=>{ const b=summon('h3',[-0.223,0.39,0.455],GS,3,(b,t)=>{ const k=b.kick||0; b.kick=k*Math.exp(-14*0.016); b.off.copy(b.F).multiplyScalar(0.05*k); }); if(b){ b.pitch=-1.72; b.fin=0.18; } return b; };
  function drum(n){ const b=SBELL.h3||B3(); if(!b)return; const last=n>=3; b.kick=last?1.6:0.7; fxB.copy(b.p).addScaledVector(b.F,0.165*GS); const mouth=new THREE.Vector3(fxB.x,b.p.y-0.03,fxB.z);
    note(mouth,false,0.2,last?0.75:0.5,0.4,BRASS,last?0.45:0.36); const apex=new THREE.Vector3(b.p.x,0,b.p.z);
    waveAt(0.7,last?0.75:0.5,0,apex,last?2.4:1.7,BRASS,last?0.42:0.3); if(last){ LATER.push({t:0.07,fn:()=>waveAt(0.7,0.7,0,apex,2.1,VERD,0.3)}); LATER.push({t:0.14,fn:()=>waveAt(0.7,0.65,0,apex,1.8,BRASS,0.26)}); dustAt(new THREE.Vector3(mouth.x,0,mouth.z),6,0.6,0.2); b.life=Math.min(b.life,b.t+0.5); note(ownBell(new THREE.Vector3()),false,0.06,0.3,0.5,VERD,0.4); } }
  const BCLAP=()=>summon('clap',[-0.224,0.455,0.555],1.2,0.9,(b,t,d)=>{ if(b.fly>0){ b.off.addScaledVector(b.F,b.fly*d); b.fly*=Math.exp(-3*d); } });
  const BSWING=()=>summon('swing',[-0.074,0.561,0.443],1.6,0.9,(b,t)=>{ if(b.go===undefined)return; const u=ease((t-b.go)/0.3), a=Math.PI*u; b.off.copy(b.L).multiplyScalar(0.5*(1-Math.cos(a))).addScaledVector(b.F,0.4*Math.sin(a)); b.tilt=0.5*Math.sin(a)*(u<1?1:0); });
  const BHANG=()=>summon('hang',[-0.1,0.62,0.50],1.3,3.2,(b,t)=>{ const u=ease(t/0.1); b.off.y=-(0.62-0.165*1.3-0.012)*u; });
  const SUMMON={combo:[[0.08,B1],[0.40,B2],[0.70,B3]],combo1:[[0.08,B1]],combo2:[[0.12,B2]],combo3:[[0.04,B3]],castPoint:[[0.16,BCLAP]],castSweep:[[0.18,BSWING]],castPlant:[[0.30,BHANG]]};
  function watchSummons(){ running.forEach((a,n)=>{ const list=SUMMON[n.replace(/Up$/,'')]; if(!list||!(a.__tw>0)){a.__sp=a.time;return;} const p=a.__sp===undefined||a.__sp>a.time?-1:a.__sp; for(const [t,fn] of list)if(p<t&&a.time>=t)fn(); a.__sp=a.time; }); }
  // one-off effects at a move's contact time
  function castFx(key,hitNo,i){ if(!feel||!staff)return; staff.updateWorldMatrix(true,false); facing(fxF); head(fxV); const feet=new THREE.Vector3(model.position.x,0,model.position.z);
    if(hitNo===1){ fire(SBELL.h1||B1()); delete SBELL.h1; }
    else if(hitNo===2){ fire(SBELL.h2||B2()); delete SBELL.h2; }
    else if(hitNo>=3){ drum(hitNo-3); }
    else if(key==='castPoint'){ const b=SBELL.clap||BCLAP(); strike(b,0.35,0,BRASS,0.36); if(b){ b.fly=5.5; b.life=Math.min(b.life,b.t+0.5); for(let n=1;n<=2;n++)LATER.push({t:0.11*n,fn:()=>{ if(b.t>=0)note(centre(b,fxB),false,0.08,0.3+0.1*n,0.4,BRASS,0.3); }}); } }
    else if(key==='castBloom'){ note(ownBell(fxB),false,0.06,0.3,0.45,VERD,0.42); note(feet,true,0.2,0.75+0.2*i,0.6,i===1?VERD:BRASS,0.3);
      const at=[[-0.5,0.56,0.32],[0,0.66,0.55],[0.5,0.56,0.32]][i]||[0,0.6,0.5]; const b=summon('peal'+i,at,0.9,0.62); LATER.push({t:0.1,fn:()=>strike(b,0.45,i===0?-1:i===2?1:0,i===1?VERD:BRASS)}); if(SBELL.hang)strike(SBELL.hang,0.3,0,VERD); }
    else if(key==='castPlant'){ const b=SBELL.hang||BHANG(); if(i===0){ if(b){ centre(b,fxB); dustAt(new THREE.Vector3(fxB.x,0,fxB.z),4,0.35,0.1); note(new THREE.Vector3(fxB.x,0,fxB.z),true,0.2,0.34,0.5,BRASS,0.3); } } else strike(b,0.28,0,BRASS,0.32); }
    else if(key==='castSweep'){ const b=SBELL.swing||BSWING(); if(b){ b.go=b.t; b.life=Math.min(b.life,b.t+0.6); strike(b,0,0,BRASS,0.3); } waveAt(0.44,0.6,0.6,null,0.72); note(ownBell(fxB),false,0.06,0.28,0.45,VERD,0.36); }
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
    WAVES.forEach(W=>{ if(W.t<0)return; W.t+=d; const u=W.t/W.life, e=1-Math.pow(1-Math.min(1,u),2); W.w.visible=true; W.w.position.copy(W.base).addScaledVector(W.dir,W.travel*e); W.w.scale.setScalar(W.size+(W.s1-W.size)*e); W.w.material.opacity=W.op*Math.min(1,u*10)*(1-u*u); if(u>=1){W.t=-1;W.w.visible=false;} });
  }
