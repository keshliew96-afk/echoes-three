  // ---- the Tank's effects, all dim and in his own colours (forge steel for force, earth ochre and brown for the ground):
  // dust thrown up by heavy contacts, cracks in the floor under a slam, a flat shock in front of the shield, sparks when a blow lands on it, a faint steel shell while he holds a stance
  const FXP=[], STEEL=0x9DB8CF, DUST=0x8E7B5E, EARTH=0x5A4632; let shell=null, shellT=-1, shellLife=1, bell=null, bellT=-1, bellSize=0.3, crack=null, crackT=-1, crackLife=1.6; const fxV=new THREE.Vector3(), fxF=new THREE.Vector3();
  function mote(pos,vel,life,size,grav,col,op){ if(FXP.length>260)return; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:col,blending:THREE.NormalBlending,depthWrite:false,transparent:true,opacity:0})); s.scale.setScalar(size); s.position.copy(pos); scene.add(s); FXP.push({s,v:vel,t:0,life,grav:grav||0,op:op||0.5,size}); }
  const rnd=(a)=>(Math.random()-0.5)*2*a;
  const facing=(out)=>{out.set(0,0,1).applyQuaternion(model.quaternion); out.y=0; return out.normalize();};
  // dust: low, thrown outward from a point on the floor, falls back and fades
  function dustAt(c,n,power,spread){ for(let i=0;i<n;i++){const a=Math.random()*6.283, sp=power*(0.5+Math.random()); mote(new THREE.Vector3(c.x+Math.cos(a)*spread*Math.random(),0.03+Math.random()*0.06,c.z+Math.sin(a)*spread*Math.random()),new THREE.Vector3(Math.cos(a)*sp,0.25+Math.random()*0.7*power,Math.sin(a)*sp),0.55+Math.random()*0.45,0.07+Math.random()*0.08,-2.0,DUST,0.5);} }
  // sparks: small, fast, steel-coloured, off the face of the shield
  function sparksAt(c,n,dir){ for(let i=0;i<n;i++){const v=new THREE.Vector3(rnd(1),rnd(1)+0.3,rnd(1)).addScaledVector(dir,0.9).multiplyScalar(1.1+Math.random()*0.9); mote(c.clone(),v,0.18+Math.random()*0.14,0.035+Math.random()*0.03,-3,0xDCE6EE,0.8);} }
  const shieldFace=(out)=>out.set(0,0.5,0.1).applyMatrix4(staff.matrixWorld), shieldFoot=(out)=>out.set(0,0.02,0).applyMatrix4(staff.matrixWorld);
  function makeSoft(){
    shell=new THREE.Mesh(new THREE.SphereGeometry(0.78,28,18,0,6.283,0,1.6),new THREE.MeshBasicMaterial({color:STEEL,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); shell.visible=false; scene.add(shell);
    bell=new THREE.Mesh(new THREE.RingGeometry(0.86,1,40),new THREE.MeshBasicMaterial({color:0xDCE6EE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); bell.visible=false; scene.add(bell);
    // cracks: nine jagged lines running out from the point of impact, each with a short fork
    const pts=[]; for(let k=0;k<9;k++){let d=k/9*6.283+rnd(0.22), x=0,z=0; for(let i=0;i<8;i++){const st=0.07+0.05*Math.random(), nx=x+Math.cos(d)*st, nz=z+Math.sin(d)*st; pts.push(x,0.013,z,nx,0.013,nz); if(i===3){const fd=d+(Math.random()<0.5?0.8:-0.8); pts.push(nx,0.013,nz,nx+Math.cos(fd)*0.12,0.013,nz+Math.sin(fd)*0.12);} x=nx;z=nz; d+=rnd(0.45);} }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pts),3)); crack=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:EARTH,transparent:true,opacity:0})); crack.visible=false; scene.add(crack);
  }
  function crackAt(c,size,life){ crackT=0; crackLife=life||1.6; crack.position.set(c.x,0,c.z); crack.scale.setScalar(size); crack.rotation.y=Math.random()*6.283; }
  function shockAt(c,size){ bellT=0; bellSize=size; bell.position.copy(c); bell.quaternion.copy(model.quaternion); }
  // one-off effects at a move's contact time
  function castFx(key,hitNo,i){ if(!feel||!staff)return; staff.updateWorldMatrix(true,false); facing(fxF);
    if(hitNo===1){ shieldFace(fxV); sparksAt(fxV,8,fxF); shockAt(fxV,0.28); dustAt(fxV.clone().setY(0),5,0.5,0.15); }
    else if(hitNo===2){ model.getObjectByName('handR').getWorldPosition(fxV); sparksAt(fxV,6,fxF); shockAt(fxV,0.16); }
    else if(hitNo===3){ shieldFoot(fxV); crackAt(fxV,1.25); dustAt(fxV,26,1.25,0.25); }
    else if(key==='castPoint'){ shieldFace(fxV); shockAt(fxV,0.42); sparksAt(fxV,6,fxF); dustAt(new THREE.Vector3(model.position.x,0,model.position.z+0.1),8,0.6,0.25); }
    else if(key==='castBloom'){ dustAt(new THREE.Vector3(model.position.x,0,model.position.z+0.05),16,0.9,0.3); roarT=0; }
    else if(key==='castPlant'){ shieldFoot(fxV); crackAt(fxV,1.0,2.0); dustAt(fxV,18,1.0,0.25); shellT=0; shellLife=1.15; }
    else if(key==='castSweep'){ shieldFace(fxV); dustAt(fxV.clone().setY(0),10,0.8,0.3); }
    else if(key==='guard'){ if(i===0){ dustAt(new THREE.Vector3(model.position.x,0,model.position.z+0.15),7,0.6,0.25); shellT=0; shellLife=1.6; } else { shieldFace(fxV); sparksAt(fxV,10,fxF); shockAt(fxV,0.3); } } }
  // effects that run while a move plays: the roar sends out a second, slower ring; a run or a dash kicks up a little dust at each footfall
  let roarT=-1, stepPh=0;
  function ongoingFx(d){ if(!feel||!staff)return;
    if(roarT>=0){ roarT+=d; if(roarT>=0.22){ roarT=-1; ringT=0; ringAt='self'; ringSize=2.6; shake=Math.max(shake,0.35); } }
    const fast=!sel.downed&&!rising&&moving&&(sel.dash||sel.base==='run'); if(fast){ stepPh+=d/0.28; if(stepPh>=1){ stepPh=0; dustAt(new THREE.Vector3(model.position.x+rnd(0.12),0,model.position.z-0.05),3,0.35,0.08); } } }
  function updateSoft(d){
    for(let i=FXP.length-1;i>=0;i--){const m=FXP[i]; m.t+=d; m.v.y+=m.grav*d; m.s.position.addScaledVector(m.v,d); if(m.grav&&m.s.position.y<0.02){m.s.position.y=0.02;m.v.multiplyScalar(0.2);m.v.y=0;}
      const u=m.t/m.life; m.s.material.opacity=m.op*Math.min(1,u*6)*(1-u); m.s.scale.setScalar(m.size*(1+0.8*u)); if(u>=1){scene.remove(m.s);m.s.material.dispose();FXP.splice(i,1);} }
    if(shellT>=0){shellT+=d; const u=shellT/shellLife; shell.visible=true; shell.position.set(model.position.x,0,model.position.z+0.12); shell.material.opacity=0.12*Math.min(1,u*8)*(1-u*u); shell.scale.setScalar(0.92+0.1*Math.min(1,u*6)); if(u>=1){shellT=-1;shell.visible=false;}}
    if(bellT>=0){bellT+=d; const u=bellT/0.26, e=1-Math.pow(1-u,3); bell.visible=true; bell.scale.setScalar(bellSize*(0.25+0.85*e)); bell.material.opacity=0.45*(1-u); if(u>=1){bellT=-1;bell.visible=false;}}
    if(crackT>=0){crackT+=d; const u=crackT/crackLife; crack.visible=true; crack.geometry.setDrawRange(0,Math.ceil(Math.min(1,crackT/0.12)*8)*2*10); crack.material.opacity=0.85*(1-Math.max(0,(u-0.45)/0.55)); if(u>=1){crackT=-1;crack.visible=false;}}
  }
