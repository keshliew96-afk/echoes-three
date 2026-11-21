  // ---- the Archer's effects, all dim and in her own two colours (Wind Jade for the wind on a shot, Feather Bone for the arrows):
  // a pale streak for each arrow that leaves the bow, a few motes off the string, a little dust under fast feet; the casts add a jade streak, a falling volley, a fan and a trap ring on the floor
  const FXP=[], JADE=0x5ED3C0, BONE=0xC9C2B3, DUST=0x9A8F86; const SHOTS=[], LATER=[]; let trap=null, trapT=-1; const fxV=new THREE.Vector3(), fxF=new THREE.Vector3(), fxD=new THREE.Vector3(), UPV=new THREE.Vector3(0,1,0);
  function mote(pos,vel,life,size,grav,col,op,stay){ if(FXP.length>260)return; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:col,blending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:0})); s.scale.setScalar(size); s.position.copy(pos); scene.add(s); FXP.push({s,v:vel,t:0,life,grav:grav||0,op:op||0.5,size,stay:!!stay}); }
  const rnd=(a)=>(Math.random()-0.5)*2*a;
  const facing=(out)=>{out.set(0,0,1).applyQuaternion(model.quaternion); out.y=0; return out.normalize();};
  function dustAt(c,n,power,spread){ for(let i=0;i<n;i++){const a=Math.random()*6.283, sp=power*(0.5+Math.random()); mote(new THREE.Vector3(c.x+Math.cos(a)*spread*Math.random(),0.03+Math.random()*0.05,c.z+Math.sin(a)*spread*Math.random()),new THREE.Vector3(Math.cos(a)*sp,0.2+Math.random()*0.5*power,Math.sin(a)*sp),0.4+Math.random()*0.3,0.05+Math.random()*0.06,-2.0,DUST,0.4);} }
  function sparksAt(c,n,dir,col){ for(let i=0;i<n;i++){const v=new THREE.Vector3(rnd(1),rnd(1)+0.2,rnd(1)).addScaledVector(dir,0.8).multiplyScalar(0.5+Math.random()*0.6); mote(c.clone(),v,0.18+Math.random()*0.14,0.022+Math.random()*0.02,-1.5,col||BONE,0.6);} }
  // where the arrow leaves the bow, and the line it leaves along (the bow's own -x)
  const nock=(out)=>out.set(0.0,0.5,0).applyMatrix4(staff.matrixWorld), aim=(out)=>out.set(-1,0,0).transformDirection(staff.matrixWorld);
  function makeSoft(){
    for(let k=0;k<14;k++){ const g=new THREE.Group(); const mat=new THREE.MeshBasicMaterial({color:BONE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}); const a=new THREE.Mesh(new THREE.PlaneGeometry(0.014,1),mat); a.geometry.translate(0,-0.5,0); const b=a.clone(); b.rotation.y=Math.PI/2; g.add(a,b); g.visible=false; scene.add(g); SHOTS.push({g,mat,t:-1,life:0.3,v:new THREE.Vector3(),len:0.5,op:0.5,land:false}); }
    trap=new THREE.Mesh(new THREE.RingGeometry(0.8,1,40),new THREE.MeshBasicMaterial({color:JADE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); trap.rotation.x=-Math.PI/2; trap.visible=false; scene.add(trap);
  }
  // one arrow in flight: a thin streak that leaves from 'from' along 'dir'
  function arrowFly(from,dir,speed,len,life,col,op,land){ const s=SHOTS.find(s=>s.t<0); if(!s)return; s.t=0; s.life=life; s.len=len; s.op=op; s.land=!!land; s.v.copy(dir).normalize().multiplyScalar(speed); s.mat.color.setHex(col); s.g.position.copy(from); s.g.quaternion.setFromUnitVectors(UPV,fxD.copy(dir).normalize()); s.g.scale.set(1,0.01,1); }
  // one-off effects at a move's contact time
  function castFx(key,hitNo,i){ if(!feel||!staff)return; staff.updateWorldMatrix(true,false); facing(fxF); nock(fxV); const d=aim(new THREE.Vector3()); if(Math.abs(d.y)<0.3){ d.y=0; d.normalize(); } // a level shot flies level, whatever lean the run puts on her
    if(key!=='castPlant')sparksAt(fxV,hitNo===3||key==='castPoint'?6:3,d);
    if(hitNo===1||hitNo===2){ arrowFly(fxV,d,9,0.45,0.3,BONE,0.5); }
    else if(hitNo===3){ for(let n=-1;n<=1;n++){ const dd=d.clone().applyAxisAngle(UPV,n*0.28); arrowFly(fxV,dd,11,0.6,0.32,BONE,0.6); } arrowFly(fxV,d,11,0.9,0.22,JADE,0.25); dustAt(new THREE.Vector3(model.position.x,0,model.position.z),5,0.4,0.15); }
    else if(key==='castPoint'){ arrowFly(fxV,d,12,0.7,0.34,BONE,0.6); arrowFly(fxV,d,12,1.3,0.26,JADE,0.32); dustAt(new THREE.Vector3(model.position.x,0,model.position.z),6,0.5,0.15); }
    else if(key==='castBloom'){ arrowFly(fxV,d,9,0.5,0.34,BONE,0.5);
      // the volley comes down ahead of her a moment later
      for(let n=0;n<6;n++){ const p=new THREE.Vector3(model.position.x,2.4,model.position.z).addScaledVector(fxF,1.3+rnd(0.45)); p.x+=rnd(0.5)*fxF.z; p.z+=rnd(0.5)*fxF.x; LATER.push({t:0.5+0.05*n+Math.random()*0.04,fn:()=>arrowFly(p,new THREE.Vector3(fxF.x*0.25,-1,fxF.z*0.25),9,0.5,0.27,n%2?JADE:BONE,n%2?0.35:0.5,true)}); } }
    else if(key==='castSweep'){ for(let n=-2;n<=2;n++){ const dd=d.clone().applyAxisAngle(UPV,n*0.2); arrowFly(fxV,dd,9,0.42,0.3,n===0?BONE:JADE,n===0?0.5:0.35); } }
    else if(key==='castPlant'){ model.getObjectByName('handR').getWorldPosition(fxV); trapT=0; trap.position.set(fxV.x,0.012,fxV.z); dustAt(new THREE.Vector3(fxV.x,0,fxV.z),4,0.3,0.08); for(let n=0;n<8;n++){const a=n/8*6.283; mote(new THREE.Vector3(fxV.x+Math.cos(a)*0.15,0.03,fxV.z+Math.sin(a)*0.15),new THREE.Vector3(0,0,0),1.7,0.03,0,BONE,0.6,true);} }
    else if(key==='vault'){ arrowFly(fxV,d,10,0.5,0.3,BONE,0.55); } }
  // effects that run while a move plays: a run or a dash kicks up a little dust at each footfall
  let stepPh=0, thPrev=0; const thV=new THREE.Vector3();
  function ongoingFx(d){ if(!feel||!staff)return;
    // idle: a puff of dust at each thump of her back foot
    { const ia=running.get('idle'); if(ia&&!moving&&!sel.downed&&!rising&&running.size===1){ const it=ia.time; [5.26,5.45].forEach(tt=>{ if(thPrev<tt&&it>=tt){ model.getObjectByName('footR').getWorldPosition(thV); dustAt(new THREE.Vector3(thV.x,0,thV.z+0.04),3,0.3,0.05); } }); thPrev=it; } }
    for(let i=LATER.length-1;i>=0;i--){ LATER[i].t-=d; if(LATER[i].t<=0){ LATER[i].fn(); LATER.splice(i,1); } }
    const fast=!sel.downed&&!rising&&moving&&(sel.dash||sel.base==='run'); if(fast){ stepPh+=d/0.2; if(stepPh>=1){ stepPh=0; dustAt(new THREE.Vector3(model.position.x+rnd(0.1),0,model.position.z-0.05),2,0.3,0.06); } } }
  function updateSoft(d){
    for(let i=FXP.length-1;i>=0;i--){const m=FXP[i]; m.t+=d; m.v.y+=m.grav*d; m.s.position.addScaledVector(m.v,d); if(m.grav&&m.s.position.y<0.02){m.s.position.y=0.02; m.v.multiplyScalar(0.2);m.v.y=0;}
      const u=m.t/m.life; m.s.material.opacity=m.stay?m.op*Math.min(1,u*20)*Math.min(1,(1-u)*4):m.op*Math.min(1,u*6)*(1-u); m.s.scale.setScalar(m.stay?m.size:m.size*(1+0.8*u)); if(u>=1){scene.remove(m.s);m.s.material.dispose();FXP.splice(i,1);} }
    SHOTS.forEach(s=>{ if(s.t<0)return; s.t+=d; const u=s.t/s.life; s.g.visible=true; s.g.position.addScaledVector(s.v,d); s.g.scale.set(1,s.len*Math.min(1,u*5),1); s.mat.opacity=s.op*(1-u*u);
      if(s.land&&s.g.position.y<=0.03){ dustAt(new THREE.Vector3(s.g.position.x,0,s.g.position.z),2,0.25,0.04); u>=0&&(s.t=-1,s.g.visible=false); return; }
      if(u>=1){s.t=-1;s.g.visible=false;} });
    if(trapT>=0){trapT+=d; const u=trapT/1.7; trap.visible=true; trap.scale.setScalar(0.17*(0.6+0.4*Math.min(1,u*8))); trap.material.opacity=0.4*Math.min(1,u*10)*Math.min(1,(1-u)*4); if(u>=1){trapT=-1;trap.visible=false;}}
  }
