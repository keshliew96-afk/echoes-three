  // ---- the Swordsman's effects, all dim and in his own two colours (Fox Crimson for the edge, Moon Silver for steel):
  // a thin arc where each cut passes, silver sparks at a contact, a straight streak down a thrust, a low crescent that travels out, caltrops that land and stay a moment, a little dust under fast feet
  const FXP=[], CRIM=0xE8577A, MOON=0xE7E3F0, DUST=0x9A8F86, IRON=0x8C8A96; const ARCS=[]; let streak=null, streakT=-1, streakLife=0.2, edgeT=-1, edge=null; const fxV=new THREE.Vector3(), fxF=new THREE.Vector3(), fxQ=new THREE.Quaternion(), fxE=new THREE.Euler();
  function mote(pos,vel,life,size,grav,col,op,stay){ if(FXP.length>260)return; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:col,blending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:0})); s.scale.setScalar(size); s.position.copy(pos); scene.add(s); FXP.push({s,v:vel,t:0,life,grav:grav||0,op:op||0.5,size,stay:!!stay}); }
  const rnd=(a)=>(Math.random()-0.5)*2*a;
  const facing=(out)=>{out.set(0,0,1).applyQuaternion(model.quaternion); out.y=0; return out.normalize();};
  function dustAt(c,n,power,spread){ for(let i=0;i<n;i++){const a=Math.random()*6.283, sp=power*(0.5+Math.random()); mote(new THREE.Vector3(c.x+Math.cos(a)*spread*Math.random(),0.03+Math.random()*0.05,c.z+Math.sin(a)*spread*Math.random()),new THREE.Vector3(Math.cos(a)*sp,0.2+Math.random()*0.5*power,Math.sin(a)*sp),0.4+Math.random()*0.3,0.05+Math.random()*0.06,-2.0,DUST,0.4);} }
  function sparksAt(c,n,dir,col){ for(let i=0;i<n;i++){const v=new THREE.Vector3(rnd(1),rnd(1)+0.3,rnd(1)).addScaledVector(dir,1.1).multiplyScalar(1.2+Math.random()*1.0); mote(c.clone(),v,0.16+Math.random()*0.14,0.03+Math.random()*0.025,-3,col||MOON,0.8);} }
  const tip=(out)=>out.set(0,0.98,0).applyMatrix4(staff.matrixWorld), mid=(out)=>out.set(0,0.7,0).applyMatrix4(staff.matrixWorld);
  function makeSoft(){
    // three reusable arcs: a thin slice of a ring, centred on straight ahead when it lies flat
    for(let k=0;k<3;k++){ const len=k===2?6.283:2.5; const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48,1,-Math.PI/2-len/2,len),new THREE.MeshBasicMaterial({color:CRIM,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; scene.add(m); ARCS.push({m,t:-1,life:0.2,size:1,op:0.4,travel:0,dir:new THREE.Vector3(),base:new THREE.Vector3()}); }
    streak=new THREE.Mesh(new THREE.PlaneGeometry(0.035,1),new THREE.MeshBasicMaterial({color:MOON,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); streak.geometry.translate(0,0.5,0); streak.visible=false; scene.add(streak);
    // the drawn edge: a thin crimson line laid along the blade, it stays for a moment after the edge draw
    edge=new THREE.Mesh(new THREE.PlaneGeometry(0.03,0.62),new THREE.MeshBasicMaterial({color:CRIM,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); edge.position.set(0,0.69,0.03); edge.visible=false; staff.add(edge); const e2=edge.clone(); e2.material=edge.material; e2.position.set(0,0,-0.06); edge.add(e2);
  }
  // an arc in front of him: roll tilts it off level (0 = flat, 90 = upright), size is its radius, travel moves it forward as it fades
  function arcAt(k,h,size,roll,life,col,op,travel,fwd){ const a=ARCS[k]; facing(fxF); a.t=0; a.life=life; a.size=size; a.op=op; a.travel=travel||0; a.dir.copy(fxF); a.base.set(model.position.x,h,model.position.z).addScaledVector(fxF,fwd||0); a.m.material.color.setHex(col);
    fxE.set(-Math.PI/2,0,0); a.m.quaternion.copy(model.quaternion).multiply(fxQ.setFromEuler(new THREE.Euler(0,0,roll*Math.PI/180))).multiply(new THREE.Quaternion().setFromEuler(fxE)); }
  function streakAt(len,life){ streakT=0; streakLife=life; facing(fxF); mid(fxV); streak.position.copy(fxV).addScaledVector(fxF,-0.25); streak.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),fxF); streak.scale.set(1,len,1); }
  // one-off effects at a move's contact time
  function castFx(key,hitNo,i){ if(!feel||!staff)return; staff.updateWorldMatrix(true,false); facing(fxF);
    if(hitNo===1){ arcAt(0,0.52,0.55,-52,0.16,MOON,0.4,0,0.02); mid(fxV); sparksAt(fxV,5,fxF); }
    else if(hitNo===2){ arcAt(1,0.56,0.55,58,0.16,MOON,0.4,0,0.02); mid(fxV); sparksAt(fxV,5,fxF); }
    else if(hitNo===3){ streakAt(1.1,0.14); tip(fxV); sparksAt(fxV,5,fxF); }
    else if(hitNo===4){ arcAt(2,0.56,0.74,0,0.24,CRIM,0.36,0,0); tip(fxV); sparksAt(fxV,9,fxF); dustAt(new THREE.Vector3(model.position.x,0,model.position.z),8,0.6,0.2); }
    else if(key==='castPoint'){ streakAt(1.5,0.18); tip(fxV); sparksAt(fxV,7,fxF); dustAt(new THREE.Vector3(model.position.x,0,model.position.z-0.05),6,0.5,0.15); }
    else if(key==='castBloom'){ edgeT=0; tip(fxV); for(let n=0;n<7;n++)mote(fxV.clone().add(new THREE.Vector3(rnd(0.05),rnd(0.05),rnd(0.05))),new THREE.Vector3(rnd(0.25),0.3+Math.random()*0.4,rnd(0.25)),0.5+Math.random()*0.3,0.035,0,CRIM,0.55); }
    else if(key==='castPlant'){ model.getObjectByName('handL').getWorldPosition(fxV); for(let n=0;n<6;n++){const v=fxF.clone().multiplyScalar(1.5+Math.random()*1.2); v.x+=rnd(0.9); v.z+=rnd(0.9); v.y=0.8+Math.random()*0.8; mote(fxV.clone(),v,1.7+Math.random()*0.4,0.05,-5,IRON,0.85,true);} }
    else if(key==='castSweep'){ arcAt(0,0.52,0.62,0,0.34,CRIM,0.42,1.5,0.05); tip(fxV); sparksAt(fxV,5,fxF); }
    else if(key==='castParry'){ if(i===0){ mid(fxV); sparksAt(fxV,10,fxF.clone().negate()); arcAt(1,0.6,0.16,90,0.2,MOON,0.5,0,0.3); } else { arcAt(0,0.6,0.58,-10,0.18,CRIM,0.42,0,0.02); tip(fxV); sparksAt(fxV,6,fxF,CRIM); } }
    else if(key==='bladeStorm'){ arcAt(2,0.5+0.05*i,0.72+0.06*i,rnd(8),0.2,i===2?CRIM:MOON,0.32,0,0); tip(fxV); sparksAt(fxV,4,fxF); } }
  // effects that run while a move plays: a run or a dash kicks up a little dust at each footfall
  let stepPh=0;
  function ongoingFx(d){ if(!feel||!staff)return;
    const fast=!sel.downed&&!rising&&moving&&(sel.dash||sel.base==='run'); if(fast){ stepPh+=d/0.2; if(stepPh>=1){ stepPh=0; dustAt(new THREE.Vector3(model.position.x+rnd(0.1),0,model.position.z-0.05),2,0.3,0.06); } } }
  function updateSoft(d){
    for(let i=FXP.length-1;i>=0;i--){const m=FXP[i]; m.t+=d; m.v.y+=m.grav*d; m.s.position.addScaledVector(m.v,d); if(m.grav&&m.s.position.y<0.02){m.s.position.y=0.02; if(m.stay)m.v.set(0,0,0); else {m.v.multiplyScalar(0.2);m.v.y=0;}}
      const u=m.t/m.life; m.s.material.opacity=m.stay?m.op*Math.min(1,u*20)*Math.min(1,(1-u)*4):m.op*Math.min(1,u*6)*(1-u); m.s.scale.setScalar(m.stay?m.size:m.size*(1+0.8*u)); if(u>=1){scene.remove(m.s);m.s.material.dispose();FXP.splice(i,1);} }
    ARCS.forEach(a=>{ if(a.t<0)return; a.t+=d; const u=a.t/a.life, e=1-Math.pow(1-Math.min(1,u),3); a.m.visible=true; a.m.position.copy(a.base).addScaledVector(a.dir,a.travel*e); a.m.scale.setScalar(a.size*(0.8+0.25*e)); a.m.material.opacity=a.op*(1-u*u); if(u>=1){a.t=-1;a.m.visible=false;} });
    if(streakT>=0){streakT+=d; const u=streakT/streakLife; streak.visible=true; streak.material.opacity=0.45*(1-u); if(u>=1){streakT=-1;streak.visible=false;}}
    if(edgeT>=0){edgeT+=d; const u=edgeT/1.5; edge.visible=true; edge.material.opacity=0.5*Math.min(1,u*10)*(1-u*u); if(u>=1){edgeT=-1;edge.visible=false;}}
  }
