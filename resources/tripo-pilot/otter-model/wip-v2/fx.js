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
    stream=makeRibbon(SN,COBALT,0.36); core=makeRibbon(SN,FOAM,0.34); orb=new THREE.Sprite(new THREE.SpriteMaterial({map:glow.material.map,color:COBALT,depthWrite:false,transparent:true,opacity:0})); orb.visible=false; scene.add(orb); makeWall();
    wave=new THREE.Mesh(new THREE.RingGeometry(0.86,1,48,1,-Math.PI/2-1.2,2.4),new THREE.MeshBasicMaterial({color:COBALT,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); wave.visible=false; scene.add(wave);
  }
  // ---- the held stream: two crossed ribbons from the shell, a little arc and a slow weave, with a thin pale core. It grows out from the shell when she starts
  // and its tail lets go and flies on when she stops. A soft ball of water at the shell swells as the 5 seconds fill.
  const SN=22, RANGE=2.6, SSPEED=9; let stream=null, core=null, orb=null, sHead=0, sTail=0, sFlow=false, sClock=0, sDrip=0; const sP0=new THREE.Vector3(), sF=new THREE.Vector3(), sR=new THREE.Vector3(), sPt=new THREE.Vector3();
  function makeRibbon(n,col,op){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*12),3)); g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*16),4)); const idx=[]; for(let k=0;k<2;k++)for(let i=0;i<n-1;i++){const a=k*n*2+i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2);} g.setIndex(idx);
    const c=new THREE.Color(col), C=g.attributes.color; for(let i=0;i<n*4;i++)C.setXYZW(i,c.r,c.g,c.b,1);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide})); m.frustumCulled=false; m.visible=false; m.userData.op=op; scene.add(m); return m; }
  function streamPoint(dist,out){ const s=dist/RANGE; out.copy(sP0).addScaledVector(sF,dist); out.y-=0.2*s*s; out.addScaledVector(sR,Math.sin(s*8-sClock*13)*0.022*s); out.y+=Math.cos(s*6-sClock*10)*0.016*s; if(out.y<0.03)out.y=0.03; return out; }
  function layRibbon(m,w){ const P=m.geometry.attributes.position, C=m.geometry.attributes.color; for(let i=0;i<SN;i++){ const u=i/(SN-1), dist=sTail+(sHead-sTail)*u; streamPoint(dist,sPt); const ww=w*(0.55+0.45*Math.min(1,dist/0.5)), al=Math.min(1,(sHead-dist)/0.35+0.15)*Math.min(1,(dist-sTail)/0.08+0.3);
      P.setXYZ(i*2,sPt.x-sR.x*ww,sPt.y,sPt.z-sR.z*ww); P.setXYZ(i*2+1,sPt.x+sR.x*ww,sPt.y,sPt.z+sR.z*ww); P.setXYZ(SN*2+i*2,sPt.x,sPt.y-ww,sPt.z); P.setXYZ(SN*2+i*2+1,sPt.x,sPt.y+ww,sPt.z);
      C.setW(i*2,al); C.setW(i*2+1,al); C.setW(SN*2+i*2,al); C.setW(SN*2+i*2+1,al); } P.needsUpdate=true; C.needsUpdate=true; }
  function streamOn(){ const a=running.get('stream')||running.get('streamUp'); return !!(feel&&staff&&a&&a.__tw>0&&a.__w>0.75); }
  function tsuAct(){ const a=running.get('tsunami')||running.get('tsunamiUp'); return a&&a.__tw>0?a:null; }
  function updateStream(d){ if(!stream)return; sClock+=d; const on=streamOn(), charge=Math.min(1,holdT/HOLDMAX);
    if(on){ staff.updateWorldMatrix(true,false); shell(sP0); facing(sF); sR.set(sF.z,0,-sF.x); sP0.addScaledVector(sF,0.07); if(!sFlow){sFlow=true; sHead=0; sTail=0; dropsAt(sP0,5,sF,0.7);} sHead=Math.min(RANGE,sHead+SSPEED*d); }
    else if(sFlow){ sFlow=false; }
    if(!on&&sHead>0){ sTail+=SSPEED*d; sHead=Math.min(RANGE,sHead+SSPEED*d); if(sTail>=sHead-0.02){sHead=0;sTail=0;} }
    const vis=sHead>0.02; stream.visible=core.visible=vis; if(vis){ const w=0.034+0.03*charge; layRibbon(stream,w); layRibbon(core,w*0.36);
      if(sHead>=RANGE-0.01){ sDrip+=d; if(sDrip>0.06){ sDrip=0; streamPoint(RANGE,sPt); dropsAt(sPt.clone(),2,sF,0.55+0.3*charge,Math.random()<0.5?FOAM:COBALT); } } }
    // the ball of water at the shell: small while she streams, swelling over the 5 seconds; in the tsunami it is hauled up with the staff, swells, and is thrown into the wave
    const ta=tsuAct(), gather=ta&&ta.time<0.68&&feel; if(on||gather){ staff.updateWorldMatrix(true,false); shell(fxV); orb.visible=true; orb.position.copy(fxV); const g=gather?Math.min(1,ta.time/0.56):0; orb.scale.setScalar(0.1+0.16*charge+0.3*g); orb.material.opacity=0.14+0.14*charge+0.14*g;
      if(gather&&Math.random()<d*26){ const a=Math.random()*6.283, r=0.35+Math.random()*0.25; const p=new THREE.Vector3(fxV.x+Math.cos(a)*r,fxV.y+rnd(0.25),fxV.z+Math.sin(a)*r); mote(p,fxV.clone().sub(p).multiplyScalar(3.2),0.28,0.03,0,Math.random()<0.4?FOAM:COBALT,0.5); } }
    else orb.visible=false; }
  // ---- the tsunami: a low wall of water, bowed like a breaking wave with a pale crest that curls forward. It stands up in front of her, rolls away widening, then sinks and fades.
  const PROF=[[-1.0,0],[-0.6,0.42],[-0.22,0.84],[0.06,1],[0.24,0.78]]; const WU=26, WV=5, TSU={life:1.25,dist:3.0,h:0.7,w0:0.8,w1:1.55}; let wall=null, tsuT=-1; const tsuO=new THREE.Vector3(), tsuF=new THREE.Vector3(), tsuR=new THREE.Vector3();
  function makeWall(){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(WU*WV*3),3)); g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(WU*WV*4),4)); const idx=[]; for(let i=0;i<WU-1;i++)for(let j=0;j<WV-1;j++){const a=i*WV+j,b=a+WV; idx.push(a,b,a+1,b,b+1,a+1);} g.setIndex(idx);
    const cb=new THREE.Color(COBALT), cf=new THREE.Color(FOAM), C=g.attributes.color; for(let i=0;i<WU;i++)for(let j=0;j<WV;j++){ const v=j/(WV-1), edge=1-Math.pow(Math.abs(i/(WU-1)*2-1),4), c=j>=WV-2?cf:cb; C.setXYZW(i*WV+j,c.r,c.g,c.b,[0.12,0.4,0.5,0.8,0.5][j]*edge); }
    wall=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide})); wall.frustumCulled=false; wall.visible=false; scene.add(wall); }
  function tsunamiAt(){ facing(tsuF); tsuR.set(tsuF.z,0,-tsuF.x); tsuO.set(model.position.x,0,model.position.z).addScaledVector(tsuF,0.5); tsuT=0; }
  function updateWall(d){ if(tsuT<0)return; if(!feel){tsuT=-1;wall.visible=false;return;} tsuT+=d; const u=Math.min(1,tsuT/TSU.life), go=1-Math.pow(1-u,1.6), rise=Math.min(1,tsuT/0.14), sink=u>0.78?1-(u-0.78)/0.22:1;
      const H=TSU.h*(1-Math.pow(1-rise,2))*(0.25+0.75*sink), W=TSU.w0+(TSU.w1-TSU.w0)*go, P=wall.geometry.attributes.position;
      for(let i=0;i<WU;i++){ const x=i/(WU-1)*2-1; for(let j=0;j<WV;j++){ const v=j/(WV-1); const hh=H*(1-0.5*x*x)*(1+0.07*Math.sin(x*7+sClock*9)), y=hh*PROF[j][1], z=TSU.dist*go-0.22*W*x*x+hh*PROF[j][0];
        P.setXYZ(i*WV+j,tsuO.x+tsuR.x*x*W+tsuF.x*z,0.02+y,tsuO.z+tsuR.z*x*W+tsuF.z*z); } } P.needsUpdate=true; wall.visible=true; wall.material.opacity=Math.min(1,tsuT/0.08)*Math.min(1,(1-u)/0.16);
      if(u<0.8&&Math.random()<d*30){ const x=rnd(0.85), z=TSU.dist*go-0.22*W*x*x-0.08; mote(new THREE.Vector3(tsuO.x+tsuR.x*x*W+tsuF.x*z,0.025,tsuO.z+tsuR.z*x*W+tsuF.z*z),new THREE.Vector3(tsuF.x*0.3,0,tsuF.z*0.3),0.7,0.05,0,FOAM,0.3,true); }
      if(u<0.85&&Math.random()<d*40){ const x=rnd(0.9), z=TSU.dist*go-0.22*W*x*x; const p=new THREE.Vector3(tsuO.x+tsuR.x*x*W+tsuF.x*z,0.04+H*(1-0.5*x*x)*Math.random(),tsuO.z+tsuR.z*x*W+tsuF.z*z); mote(p,new THREE.Vector3(tsuF.x*1.2+rnd(0.3),0.5+Math.random()*0.8,tsuF.z*1.2+rnd(0.3)),0.4,0.03,-4,FOAM,0.5); }
      if(u>=1){tsuT=-1;wall.visible=false;} }
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
    else if(key==='tsunami'){ tsunamiAt(); const c=new THREE.Vector3(model.position.x,0.05,model.position.z).addScaledVector(fxF,0.5); dropsAt(c,12,fxF,1.2); dropsAt(c,6,fxF,0.8,COBALT); dustAt(c,5,0.5,0.2); poolT=0; pool.userData={life:0.55,size:0.8,grow:true}; pool.position.set(c.x,0.014,c.z); }
    else if(key==='castSweep'){ waveAt(0.55,0.6,0.6); dropsAt(fxV,6,fxF,0.8); }
    else if(key==='slide'){ dropsAt(new THREE.Vector3(model.position.x,0.05,model.position.z),6,fxF.clone().negate(),0.8); } }
  // effects that run while a move plays: a run, a dash or the slide leaves a little spray
  let stepPh=0;
  function ongoingFx(d){ if(!feel||!staff)return;
    for(let i=LATER.length-1;i>=0;i--){ LATER[i].t-=d; if(LATER[i].t<=0){ LATER[i].fn(); LATER.splice(i,1); } }
    const fast=!sel.downed&&!rising&&moving&&(sel.dash||sel.base==='run'); if(fast){ stepPh+=d/0.2; if(stepPh>=1){ stepPh=0; dustAt(new THREE.Vector3(model.position.x+rnd(0.1),0,model.position.z-0.05),2,0.3,0.06); } } }
  function updateSoft(d){ updateStream(d); updateWall(d);
    for(let i=FXP.length-1;i>=0;i--){const m=FXP[i]; m.t+=d; m.v.y+=m.grav*d; m.s.position.addScaledVector(m.v,d); if(m.grav&&m.s.position.y<0.02){m.s.position.y=0.02; m.v.multiplyScalar(0.2);m.v.y=0;}
      const u=m.t/m.life; m.s.material.opacity=m.stay?m.op*Math.min(1,u*20)*Math.min(1,(1-u)*4):m.op*Math.min(1,u*6)*(1-u); m.s.scale.setScalar(m.stay?m.size:m.size*(1+0.8*u)); if(u>=1){scene.remove(m.s);m.s.material.dispose();FXP.splice(i,1);} }
    SHOTS.forEach(s=>{ if(s.t<0)return; s.t+=d; const u=s.t/s.life; s.g.visible=true; s.g.position.addScaledVector(s.v,d); s.g.scale.set(1,s.len*Math.min(1,u*5),1); s.mat.opacity=s.op*(1-u*u);
      if((s.land&&s.g.position.y<=0.03)||u>=1){s.t=-1;s.g.visible=false;} });
    if(poolT>=0){poolT+=d; const P=pool.userData, u=poolT/P.life, e=1-Math.pow(1-Math.min(1,u),3); pool.visible=true; pool.scale.setScalar(P.size*(P.grow?0.2+0.8*e:0.7+0.3*Math.min(1,u*6))); pool.material.opacity=(P.grow?0.34*(1-u):0.36*Math.min(1,u*10)*Math.min(1,(1-u)*4)); if(u>=1){poolT=-1;pool.visible=false;}}
    if(waveT>=0){waveT+=d; const W=wave.userData, u=waveT/W.life, e=1-Math.pow(1-Math.min(1,u),2); wave.visible=true; wave.position.copy(waveBase).addScaledVector(waveDir,W.travel*e); wave.scale.setScalar(W.size*(0.8+0.5*e)); wave.material.opacity=0.4*(1-u*u); if(u>=1){waveT=-1;wave.visible=false;}}
  }
