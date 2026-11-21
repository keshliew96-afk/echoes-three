  // ---- the Tidecaller's effects, all dim and in her own colours (Deep Cobalt for the water, Sea Foam for its crest, River Pebble for the dust):
  // a short bolt of water off the shell, a ring where the staff strikes the floor, a few drops of foam; the casts add a stream, a ring of rain, a pool that stays, and a wave that rolls out
  const FXP=[], COBALT=0x3F7FE6, FOAM=0xE6F3F7, DUST=0x7C8A93; const SHOTS=[], LATER=[]; let pool=null, poolT=-1, wave=null, waveT=-1; const waveBase=new THREE.Vector3(), waveDir=new THREE.Vector3(); const fxV=new THREE.Vector3(), fxF=new THREE.Vector3(), fxD=new THREE.Vector3(), UPV=new THREE.Vector3(0,1,0);
  function mote(pos,vel,life,size,grav,col,op,stay){ if(FXP.length>260)return; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:col,blending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:0})); s.scale.setScalar(size); s.position.copy(pos); scene.add(s); FXP.push({s,v:vel,t:0,life,grav:grav||0,op:op||0.5,size,stay:!!stay}); }
  const rnd=(a)=>(Math.random()-0.5)*2*a;
  const facing=(out)=>{out.set(0,0,1).applyQuaternion(model.quaternion); out.y=0; return out.normalize();};
  function dustAt(c,n,power,spread){ for(let i=0;i<n;i++){const a=Math.random()*6.283, sp=power*(0.5+Math.random()); mote(new THREE.Vector3(c.x+Math.cos(a)*spread*Math.random(),0.03+Math.random()*0.05,c.z+Math.sin(a)*spread*Math.random()),new THREE.Vector3(Math.cos(a)*sp,0.2+Math.random()*0.5*power,Math.sin(a)*sp),0.4+Math.random()*0.3,0.05+Math.random()*0.06,-2.0,DUST,0.35);} }
  // drops of water: thrown up and out, they fall back
  function dropsAt(c,n,dir,power,col){ for(let i=0;i<n;i++){const v=new THREE.Vector3(rnd(0.6),0.6+Math.random()*0.9,rnd(0.6)).addScaledVector(dir,0.8).multiplyScalar(power*(0.6+Math.random()*0.6)); mote(c.clone(),v,0.35+Math.random()*0.25,0.025+Math.random()*0.02,-5,col||FOAM,0.6);} }
  const shell=(out)=>out.set(0,0.87,0).applyMatrix4(staff.matrixWorld), butt=(out)=>out.set(0,0.02,0).applyMatrix4(staff.matrixWorld);
  function makeSoft(){
    for(let k=0;k<12;k++){ const g=new THREE.Group(); const mat=new THREE.MeshBasicMaterial({color:COBALT,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}); const a=new THREE.Mesh(new THREE.PlaneGeometry(0.05,1),mat); a.geometry.translate(0,-0.5,0); const b=a.clone(); b.rotation.y=Math.PI/2; g.add(a,b); g.visible=false; scene.add(g); SHOTS.push({g,mat,t:-1,life:0.3,v:new THREE.Vector3(),len:0.5,op:0.5,land:false}); }
    pool=new THREE.Mesh(new THREE.RingGeometry(0.72,1,48),new THREE.MeshBasicMaterial({color:COBALT,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); pool.rotation.x=-Math.PI/2; pool.visible=false; scene.add(pool);
    // the wave: a thin slice of a ring lying flat, centred on straight ahead
    wave=new THREE.Mesh(new THREE.RingGeometry(0.86,1,48,1,-Math.PI/2-1.2,2.4),new THREE.MeshBasicMaterial({color:COBALT,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); wave.visible=false; scene.add(wave);
  }
  // one bolt of water in flight: a short soft streak that leaves from 'from' along 'dir'
  function bolt(from,dir,speed,len,life,col,op,land){ const s=SHOTS.find(s=>s.t<0); if(!s)return; s.t=0; s.life=life; s.len=len; s.op=op; s.land=!!land; s.v.copy(dir).normalize().multiplyScalar(speed); s.mat.color.setHex(col); s.g.position.copy(from); s.g.quaternion.setFromUnitVectors(UPV,fxD.copy(dir).normalize()); s.g.scale.set(1,0.01,1); }
  function waveAt(size,life,travel){ facing(fxF); waveT=0; wave.userData={size,life,travel}; waveDir.copy(fxF); waveBase.set(model.position.x,0.02,model.position.z).addScaledVector(fxF,-0.2); wave.quaternion.copy(model.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0))); }
  // one-off effects at a move's contact time
  function castFx(key,hitNo,i){ if(!feel||!staff)return; staff.updateWorldMatrix(true,false); facing(fxF); shell(fxV);
    if(hitNo===1||hitNo===2){ bolt(fxV,fxF,7,0.35,0.3,COBALT,0.45); dropsAt(fxV,4,fxF,0.6); }
    else if(hitNo===3||key==='castPlant'){ butt(fxV); const big=key==='castPlant'; poolT=0; pool.userData={life:big?1.8:0.5,size:big?0.5:0.75,grow:!big}; pool.position.set(fxV.x+(big?fxF.x*0.25:0),0.014,fxV.z+(big?fxF.z*0.25:0));
      dropsAt(new THREE.Vector3(fxV.x,0.05,fxV.z),big?6:9,fxF,big?0.7:1.0); dustAt(new THREE.Vector3(fxV.x,0,fxV.z),4,0.4,0.1);
      if(big)for(let n=0;n<8;n++){const a=n/8*6.283; mote(new THREE.Vector3(pool.position.x+Math.cos(a)*0.3,0.03,pool.position.z+Math.sin(a)*0.3),new THREE.Vector3(-Math.sin(a)*0.5,0,Math.cos(a)*0.5),1.6,0.035,0,FOAM,0.5,true);} }
    else if(key==='castPoint'){ for(let n=0;n<4;n++)LATER.push({t:0.05*n,fn:()=>{ staff.updateWorldMatrix(true,false); shell(fxV); bolt(fxV,fxF,8,0.5,0.3,n%2?FOAM:COBALT,n%2?0.3:0.45); }}); dropsAt(fxV,5,fxF,0.7); dustAt(new THREE.Vector3(model.position.x,0,model.position.z),4,0.4,0.15); }
    else if(key==='castBloom'){ poolT=0; pool.userData={life:0.9,size:0.9,grow:true}; pool.position.set(model.position.x,0.014,model.position.z);
      for(let n=0;n<14;n++){ const a=Math.random()*6.283, r=0.35+Math.random()*0.5; const p=new THREE.Vector3(model.position.x+Math.cos(a)*r,1.5+Math.random()*0.3,model.position.z+Math.sin(a)*r); LATER.push({t:0.03*n,fn:()=>bolt(p,new THREE.Vector3(0.1,-1,0),5,0.16,0.3,n%3?COBALT:FOAM,0.4,true)}); } }
    else if(key==='castSweep'){ waveAt(0.55,0.6,0.6); dropsAt(fxV,6,fxF,0.8); }
    else if(key==='slide'){ dropsAt(new THREE.Vector3(model.position.x,0.05,model.position.z),6,fxF.clone().negate(),0.8); } }
  // effects that run while a move plays: a run, a dash or the slide leaves a little spray
  let stepPh=0;
  function ongoingFx(d){ if(!feel||!staff)return;
    for(let i=LATER.length-1;i>=0;i--){ LATER[i].t-=d; if(LATER[i].t<=0){ LATER[i].fn(); LATER.splice(i,1); } }
    const fast=!sel.downed&&!rising&&moving&&(sel.dash||sel.base==='run'); if(fast){ stepPh+=d/0.2; if(stepPh>=1){ stepPh=0; dustAt(new THREE.Vector3(model.position.x+rnd(0.1),0,model.position.z-0.05),2,0.3,0.06); } } }
  function updateSoft(d){
    for(let i=FXP.length-1;i>=0;i--){const m=FXP[i]; m.t+=d; m.v.y+=m.grav*d; m.s.position.addScaledVector(m.v,d); if(m.grav&&m.s.position.y<0.02){m.s.position.y=0.02; m.v.multiplyScalar(0.2);m.v.y=0;}
      const u=m.t/m.life; m.s.material.opacity=m.stay?m.op*Math.min(1,u*20)*Math.min(1,(1-u)*4):m.op*Math.min(1,u*6)*(1-u); m.s.scale.setScalar(m.stay?m.size:m.size*(1+0.8*u)); if(u>=1){scene.remove(m.s);m.s.material.dispose();FXP.splice(i,1);} }
    SHOTS.forEach(s=>{ if(s.t<0)return; s.t+=d; const u=s.t/s.life; s.g.visible=true; s.g.position.addScaledVector(s.v,d); s.g.scale.set(1,s.len*Math.min(1,u*5),1); s.mat.opacity=s.op*(1-u*u);
      if((s.land&&s.g.position.y<=0.03)||u>=1){s.t=-1;s.g.visible=false;} });
    if(poolT>=0){poolT+=d; const P=pool.userData, u=poolT/P.life, e=1-Math.pow(1-Math.min(1,u),3); pool.visible=true; pool.scale.setScalar(P.size*(P.grow?0.2+0.8*e:0.7+0.3*Math.min(1,u*6))); pool.material.opacity=(P.grow?0.34*(1-u):0.36*Math.min(1,u*10)*Math.min(1,(1-u)*4)); if(u>=1){poolT=-1;pool.visible=false;}}
    if(waveT>=0){waveT+=d; const W=wave.userData, u=waveT/W.life, e=1-Math.pow(1-Math.min(1,u),2); wave.visible=true; wave.position.copy(waveBase).addScaledVector(waveDir,W.travel*e); wave.scale.setScalar(W.size*(0.8+0.5*e)); wave.material.opacity=0.4*(1-u*u); if(u>=1){waveT=-1;wave.visible=false;}}
  }
