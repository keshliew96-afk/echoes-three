  // ---- the Archer's dash: a jump with a somersault, and three homing arrows loosed in the air at the nearest foe (the practice post stands for it).
  // Dust bursts where she pushes off, her shadow shrinks while she is up, each arrow leaves in a spread and bends in on the post, and the landing throws a wide dust ring and shakes the camera.
  const HOM=[]; let homPost=null;
  function homMake(){ for(let k=0;k<3;k++){ const g=new THREE.Group(); const mat=new THREE.MeshBasicMaterial({color:BONE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}); const a=new THREE.Mesh(new THREE.PlaneGeometry(0.03,0.44),mat); a.geometry.translate(0,-0.22,0); const b=a.clone(); b.rotation.y=Math.PI/2; g.add(a,b); g.visible=false; worldG.add(g); HOM.push({g,mat,on:false,p:new THREE.Vector3(),v:new THREE.Vector3(),t:0,puff:0}); } }
  function fireHoming(){ if(!staff)return; if(!HOM.length)homMake(); staff.updateWorldMatrix(true,false); nock(fxV); const from=toW(fxV.clone()), fwd=new THREE.Vector3(dashU[0],0,dashU[1]);
    sparksAt(fxV,7,fwd); const side=(DUMS[0]&&DUMS[0].side)||1;
    HOM.forEach((h,i)=>{ const n=i-1; const dir=fwd.clone().applyAxisAngle(UPV,side*0.12+n*0.7); dir.y=n===0?0.7:0.22; dir.normalize(); h.on=true; h.t=0; h.puff=0; h.p.copy(from); h.v.copy(dir).multiplyScalar(8.5+i*1.2); h.g.visible=true; }); }
  function homStep(d){ const m=DUMS[0]; HOM.forEach((h,i)=>{ if(!h.on){ if(h.mat.opacity>0){ h.mat.opacity=Math.max(0,h.mat.opacity-d*6); h.g.visible=h.mat.opacity>0; } return; }
      h.t+=d; const tgt=(m&&m.on?m.pos.clone():h.p.clone().addScaledVector(h.v,0.3)); tgt.y=m&&m.on?0.42:0.03; const to=tgt.clone().sub(h.p), dist=to.length();
      const sp=h.v.length()+d*12, dir=h.v.clone().normalize().lerp(to.normalize(),Math.min(1,d*(2+600*h.t*h.t))).normalize(); h.v.copy(dir).multiplyScalar(sp); const step=Math.min(dist,sp*d); h.p.addScaledVector(dir,step);
      h.g.position.copy(h.p); h.g.quaternion.setFromUnitVectors(UPV,dir); h.mat.opacity=0.92*Math.min(1,h.t*20);
      h.puff-=d; if(h.puff<=0&&feel){ h.puff=0.01; dpuff(h.p.clone(),JADE,0.06,0.32,{op:0.55,grow:0.3}); }
      if(dist-step<0.05||h.t>1.2){ h.on=false; if(m&&m.on&&feel){ const first=!m.hit; m.hit=true; m.hitT=0; m.tiltV=first?6:4; m.say='Hit '+(HOM.filter(x=>!x.on).length)+' of 3'; const p=tgt.clone(); dpuff(p,BONE,0.09,0.14,{grow:3,op:0.6}); dpuff(p,JADE,0.16,0.22,{grow:2,op:0.26}); for(let k=0;k<4;k++)dpuff(p.clone(),BONE,0.028,0.2+Math.random()*0.1,{op:0.6,vx:dir.x*1.2+rnd(0.8),vy:0.4+rnd(0.5),vz:dir.z*1.2+rnd(0.8),grow:0.6}); } } }); }
  function dashFx(ev){ if(ev==='off'){ blob.scale.setScalar(1); blob.material.opacity=0.16; return; } if(!feel)return;
    if(ev==='start'&&DUMS[0])DUMS[0].say='Nearest foe';
    if(ev==='push'){ dring(heroW(0,0),DUST,0.14,0.62,0.36,{op:0.34}); for(let i=0;i<9;i++){const a=i*0.7; dpuff(heroW(Math.cos(a)*0.12,Math.sin(a)*0.12,0.05),DUST,0.13+Math.random()*0.09,0.55+Math.random()*0.25,{op:0.34,vx:Math.cos(a)*0.5,vz:Math.sin(a)*0.5,vy:0.3,grow:2.3});} shake=Math.max(shake,0.22); }
    if(ev==='loose')fireHoming();
    if(ev==='land'){ dring(heroW(0,0),DUST,0.18,0.95,0.45,{op:0.38}); dring(heroW(0,0),BONE,0.12,0.6,0.32,{op:0.2,delay:0.04}); for(let i=0;i<14;i++){const a=i*0.45+Math.random()*0.3, sp=0.7+Math.random()*0.7; dpuff(heroW(Math.cos(a)*0.16,Math.sin(a)*0.16,0.05),DUST,0.14+Math.random()*0.1,0.6+Math.random()*0.3,{op:0.36,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:0.25+Math.random()*0.3,grow:2.5});} shake=Math.max(shake,0.55); squash=Math.max(squash,1); hitstop=Math.max(hitstop,0.03); }
  }
  function dashUpd(t,d){ homStep(d); if(t<0)return; const u=(t-0.15)/0.60, h=u>0&&u<1?4*u*(1-u):0; blob.scale.setScalar(1-0.5*h); blob.material.opacity=0.16*(1-0.55*h); }
