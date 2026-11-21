  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember ring r 2.2 round him filling over the 60-tick
  // coil, water flung off the stone as it whirls, the ring flashing as the sweep lands and a scuff of dust round it, the
  // slam's thump into the floor; the sack (drawn here: the one on his hip stays) lobbed 60 ticks onto the hero with the
  // Ember ring r 1.1 marking where it lands, a burst of wet flour and the pale paste it leaves (r 1.2, 5 s); the hero hit)
  const FXP=[], RINGS=[]; let dotTex=null, ring=null, ringFill=null, sackRing=null, sackFill=null, sack=null, paste=null;
  let ringT=-1, sackT=-1, pasteT=-1, sackFrom=null, sackTo=null;
  const WATER=0xA9B8B0, FLOUR=0xe8e2d4, SACKC=0x9c937f, SPARK=0xe9dcc0;
  const ONE=1.75, TEL=1.0, R_SWEEP=2.2, TCYCLE=1.8833, REACH=0.35, FLIGHT=1.0, R_SACK=1.1, R_PASTE=1.2;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<180;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const em=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the sweep's ring round him, on the floor: the outline and a fill growing out over the coil
    ring=new THREE.Mesh(new THREE.RingGeometry(R_SWEEP-0.05,R_SWEEP,96).rotateX(-Math.PI/2),em(0.5)); ring.position.y=0.012; ring.visible=false; fxG.add(ring);
    ringFill=new THREE.Mesh(new THREE.CircleGeometry(1,96).rotateX(-Math.PI/2),em(0.12)); ringFill.position.y=0.011; ringFill.visible=false; fxG.add(ringFill);
    // the sack's landing ring
    sackRing=new THREE.Mesh(new THREE.RingGeometry(R_SACK-0.04,R_SACK,72).rotateX(-Math.PI/2),em(0.5)); sackRing.position.y=0.012; sackRing.visible=false; fxG.add(sackRing);
    sackFill=new THREE.Mesh(new THREE.CircleGeometry(1,72).rotateX(-Math.PI/2),em(0.12)); sackFill.position.y=0.011; sackFill.visible=false; fxG.add(sackFill);
    // the sack itself: a sodden flour sack tied at the neck
    sack=new THREE.Group(); const sm1=new THREE.MeshStandardMaterial({color:SACKC,roughness:1}); const bag=new THREE.Mesh(new THREE.IcosahedronGeometry(0.13,1),sm1); bag.scale.set(1,1.15,0.85); const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,0.06,6),new THREE.MeshStandardMaterial({color:0x8a7a5a,roughness:1})); neck.position.y=0.15; sack.add(bag,neck); sack.visible=false; scene.add(sack);
    // the paste of wet flour it leaves
    paste=new THREE.Mesh(new THREE.CircleGeometry(R_PASTE,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:FLOUR,transparent:true,opacity:0,depthWrite:false})); paste.position.y=0.008; paste.visible=false; fxG.add(paste);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.3,a:0.2,drag:2.6,floor:true,col:col||DUST});} }
  function drops(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(pos,new THREE.Vector3(Math.cos(a)*spd*(0.3+Math.random()),up*(0.6+Math.random()*0.6),Math.sin(a)*spd*(0.3+Math.random())),{life:0.5+Math.random()*0.3,s0:0.05,s1:0.025,a:0.55,col:WATER,g:-6,drag:0.6});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(pos).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); ringT=sackT=pasteT=-1; if(ring){ring.visible=ringFill.visible=sackRing.visible=sackFill.visible=sack.visible=paste.visible=false;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const stonePt=()=>pt(bones.stone,[0,0,0]);
  function ringStart(){ const o=toFloor(new THREE.Vector3(0,0,0)); ring.position.set(o.x,0.012,o.z); ringFill.position.set(o.x,0.011,o.z); ringT=0; ring.visible=ringFill.visible=fxOn; }
  function fxStart(name){
    HOME=name==='tosses'?FAR:NEAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='sweeps')ringStart();
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function hitHero(n){ if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.3; u.z+=0.12; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),n,SPARK,1.6,0.25); } }
  function fxContact(name,i){
    if(name==='sweeps'){ hitFeel(i===2?0.6:0.4,0.06,i===2?0.6:0.45); hitHero(7);
      if(fxOn){ const c=toFloor(new THREE.Vector3(0,0,0)); ringAt(c,{r0:R_SWEEP*0.9,r1:R_SWEEP*1.08,dur:0.35,a:0.4,col:EMBER}); const s=stonePt(); drops(s,10,1.6,1.4);
        if(i===2){ const f=s.clone().setY(0); dust(f,10,1.3,0.5); ringAt(toFloor(f),{r0:0.2,r1:1.0,dur:0.4,a:0.4}); }
        else dust(s.clone().setY(0),4,0.9,0.3); } }
    if(name==='tosses'){ hitFeel(0.15,0.02,0.2);
      // the sack leaves his hand on a 60-tick lob onto the hero
      sackFrom=pt(bones.handL,[0.01,0.02,0.04]); sackTo=targetW().setY(0.12); sackT=0; sack.visible=fxOn;
      const o=toFloor(sackTo); sackRing.position.set(o.x,0.012,o.z); sackFill.position.set(o.x,0.011,o.z); sackRing.visible=sackFill.visible=fxOn; }
    if(name==='death'&&i===1){ hitFeel(0.15,0,0.15); if(fxOn){ const s=stonePt().setY(0); dust(s,6,0.9,0.3); drops(stonePt(),6,1,1.4); } }
    if(name==='death'&&i===2){ hitFeel(0.25,0.03,0.3); if(fxOn){ dust(pt(bones.chest,[0,0,0]).setY(0),10,1.1,0.35); drops(pt(bones.chest,[0,0.05,0]),8,1.2,1.6); } }
  }
  let prevT=0, dropAcc=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    const cross=(c)=>pv<c&&t>=c;
    if(n==='sweeps'){
      const k=Math.min(2,Math.floor(t/ONE)), tt=t-k*ONE;
      if(k>0&&cross(k*ONE))ringStart();
      // water flung off the stone while the chain is out and it whirls
      if(fxOn&&tt>0.25&&tt<TEL+0.35){ dropAcc+=d*(tt<TEL?10+18*tt:20); while(dropAcc>1){ dropAcc-=1; const s=stonePt(); puff(s,new THREE.Vector3((Math.random()-0.5)*1.2,0.6+Math.random()*0.6,(Math.random()-0.5)*1.2),{life:0.5,s0:0.05,s1:0.02,a:0.5,col:WATER,g:-6,drag:0.5}); } }
    }
    if(n==='tosses'){
      const k=Math.min(2,Math.floor(t/TCYCLE)), tt=t-k*TCYCLE;
      // the sack in his hand from the reach until it leaves
      if(sackT<0||sackT>FLIGHT){ const hold=tt>REACH*0.8&&tt<REACH+0.13; if(hold){ sack.visible=fxOn; sack.position.copy(pt(bones.handL,[0.01,0.02,0.04])); } else if(sackT<0)sack.visible=false; }
    }
    if(n==='death'){ if(t>1.4)cv.style.filter='saturate(0.5)'; }
    if(n==='walk'){}
  }
  function updateFx(d){
    const busy=shot&&!shot.done;
    flash=Math.max(0,flash-d*3.2); glowU.value.set(0,0,feel?flash:0,0);
    if(ringT>=0){ ringT+=d; const f=c01(ringT/TEL), go=ringT>=TEL, fade=go?1-c01((ringT-TEL-0.1)/0.25):1; ringFill.scale.setScalar(Math.max(0.001,R_SWEEP*f));
      ring.material.opacity=(go?0.75:0.5)*fade; ringFill.material.opacity=(go?0.2:0.12)*fade; if(fade<=0||!fxOn||(busy&&shot.name!=='sweeps')){ringT=-1;ring.visible=ringFill.visible=false;} }
    if(sackT>=0){ sackT+=d; const u=sackT/FLIGHT;
      if(u<1){ const p=sackFrom.clone().lerp(sackTo,u); p.y+=Math.sin(Math.PI*u)*1.3; sack.position.copy(p); sack.rotation.x+=d*5; sack.rotation.z+=d*3; sack.visible=fxOn;
        sackFill.scale.setScalar(Math.max(0.001,R_SACK*u)); sackRing.material.opacity=0.5; sackFill.material.opacity=0.12; }
      else { sack.visible=false; sackRing.visible=sackFill.visible=false; sackT=-1; hitFeel(0.2,0.03,0.2);
        if(dummy&&showTarget){ const du=dummy.userData; du.tip=0.25; du.mat.emissiveIntensity=feel?0.45:0; }
        if(fxOn){ dust(sackTo,12,1.4,0.6,FLOUR); ringAt(toFloor(sackTo),{r0:0.3,r1:R_SACK,dur:0.35,a:0.4,col:FLOUR}); const o=toFloor(sackTo); paste.position.set(o.x,0.008,o.z); pasteT=0; } } }
    if(pasteT>=0){ pasteT+=d; const u=pasteT/5; if(u>=1||!fxOn){pasteT=-1;paste.visible=false;} else { paste.visible=true; paste.material.opacity=0.32*(u<0.03?u/0.03:1-u*u); } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip;
      if(!busy||shot.name==='sweeps'||shot.name==='tosses'){ u.z+=(HOME-u.z)*Math.min(1,d*1.5); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
