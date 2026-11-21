  // ---- effects (stand-ins, dim on purpose, after the game's own: grave dirt thrown at each chop; the bury, a pat of
  // earth with a bone glint and an indigo wink where the snare goes in 1.8 u toward the hero; the snare, a dark earth
  // disc r 0.55 whose bone teeth break the ash as it arms over 45 ticks and glint indigo once armed; sprung, an Ember
  // ring r 0.95 over 42 ticks with the teeth climbing, then the jaws: an Ember star, bone teeth slashing in, splinters,
  // the hero hit (11) and slowed for 75 ticks; the eyes, the painted cyan, brighten through the dig: its tell)
  const FXP=[], RINGS=[]; let dotTex=null, snare=null, teeth=[], disc=null, sGlow=null, jaw=null, jawFill=null, jawEdge=null, slowRing=null;
  let eye=0, snareT=-1, armT=-1, sprung=-1, slowT=-1;
  const EARTH=0x5a4a3c, BONE=0xc9c2b3, INDIGO=0x4f6de2, IRON=0x8a8580, DUSTC=0x6e625a, SLOWC=0x9fb3c8;
  const SN=1.8, SR=0.55, JR=0.95, ARM=45/60, JAW=42/60, HOLD=75/60;
  const BURY_AT=0.6, TRIP_AT=0.7, SNAP_AT=TRIP_AT+JAW;
  const c01=(x)=>Math.max(0,Math.min(1,x)), easeOut=(k)=>1-(1-k)*(1-k), sm=(k)=>{k=c01(k);return k*k*(3-2*k);};
  // the eyes through the dig (the game's lantern flame: 0.4 on the knee, rising through the chops, full at the pat)
  const eyeDig=(t)=>t<0.12?0.4*t/0.12:t<0.6?0.4+0.4*(t-0.12)/0.48:t<0.74?1:t<1.04?1-(t-0.74)/0.3:0;
  const eyeSpring=(t)=>{const w=sm(t/0.5)*(1-sm((t-SNAP_AT-HOLD)/0.4)), r=c01((t-TRIP_AT)/JAW); return 0.3*w+0.5*r*w;};
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<200;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.95,1,72),new THREE.MeshBasicMaterial({color:DUSTC,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false,y:0.016}); scene.add(m);}
    const mm=(col,o)=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the snare: a dark earth disc, eight bone teeth round it under the ash, a faint indigo glint once armed; the jaws' ring
    snare=new THREE.Group(); fxG.add(snare); snare.visible=false;
    disc=new THREE.Mesh(new THREE.CircleGeometry(SR,40).rotateX(-Math.PI/2).translate(0,0.004,0),mm(0x2e2925,0.75)); snare.add(disc);
    const rim=new THREE.Mesh(new THREE.RingGeometry(SR-0.04,SR,48).rotateX(-Math.PI/2).translate(0,0.005,0),mm(EARTH,0.6)); snare.add(rim);
    const tm=new THREE.MeshStandardMaterial({color:0x8f897d,roughness:1,emissive:INDIGO,emissiveIntensity:0});
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+0.2; const p=new THREE.Group(); p.position.set(Math.cos(a)*0.4,0,Math.sin(a)*0.4); p.rotation.y=-a; const m=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.18,5).translate(0,0.09,0),tm); p.add(m); snare.add(p); teeth.push({p,m,a}); }
    snare.userData.tm=tm;
    sGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:INDIGO,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); sGlow.scale.setScalar(0.9); sGlow.position.y=0.08; snare.add(sGlow);
    jaw=new THREE.Group(); snare.add(jaw); jaw.visible=false;
    jawFill=new THREE.Mesh(new THREE.CircleGeometry(1,64).rotateX(-Math.PI/2).translate(0,0.006,0),mm(EMBER,0.14)); jaw.add(jawFill);
    jawEdge=new THREE.Mesh(new THREE.RingGeometry(JR-0.05,JR,72).rotateX(-Math.PI/2).translate(0,0.007,0),mm(EMBER,0.5)); jaw.add(jawEdge);
    const jb=new THREE.Mesh(new THREE.CircleGeometry(JR,64).rotateX(-Math.PI/2).translate(0,0.005,0),mm(EMBER,0.06)); jaw.add(jb); jaw.userData.bed=jb;
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
    // the hold's slow on the hero: a pale ring at its feet
    slowRing=new THREE.Mesh(new THREE.RingGeometry(0.34,0.38,48).rotateX(-Math.PI/2),mm(SLOWC,0)); slowRing.position.y=0.014; dummy.add(slowRing);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.26,a:0.2,drag:2.6,floor:true,col:col||DUSTC});} }
  function sparks(pos,n,col,spd,life,g){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.1,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.045,s1:0.015,a:0.55,col,g:g??-3,drag:1.4});} }
  // grave dirt: clods thrown up and out from a point
  function clods(pos,n,spd){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(pos.clone().setY(Math.max(0.05,pos.y)),new THREE.Vector3(Math.cos(a)*spd*(0.3+Math.random()*0.7),1.2+Math.random()*1.0,Math.sin(a)*spd*(0.3+Math.random()*0.7)),{life:0.45+Math.random()*0.2,s0:0.06,s1:0.04,a:0.6,col:EARTH,g:-7,drag:0.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUSTC);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(o.y??0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); snareT=armT=sprung=slowT=-1; if(snare){snare.visible=false; jaw.visible=false;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const bladePt=()=>pt(bones.spade,[0,-0.6,0.02]);
  const snareW=()=>new THREE.Vector3(0,0,SN);
  function laySnare(armed){ snare.position.copy(toFloor(snareW())); snare.position.y=0; snare.rotation.set(0,-floorYaw,0); snare.visible=fxOn; snareT=0; armT=armed?ARM:0; sprung=-1; jaw.visible=false; teeth.forEach(o=>{o.p.rotation.z=0; o.p.position.set(Math.cos(o.a)*0.4,0,Math.sin(o.a)*0.4);}); }
  function fxStart(name){
    HOME=FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='spring'){ laySnare(true); }
    else if(name!=='dig'){ snareT=-1; if(snare)snare.visible=false; }
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='dig'){
      if(i<3){ hitFeel(0.12,0.015,0.12); if(fxOn){ const b=bladePt(); clods(b,5+2*i,0.7); dust(b.clone().setY(0),3,0.4,0.2,EARTH); ringAt(b.clone().setY(0),{r0:0.05,r1:0.35+0.1*i,dur:0.3,a:0.3,col:EARTH}); } }
      else { hitFeel(0.15,0.02,0.15); if(fxOn){ const b=bladePt(); dust(b.clone().setY(0),4,0.5,0.25,EARTH); }
        laySnare(false); const w=snareW(); if(fxOn){ ringAt(w,{r0:0.2,r1:SR*1.6,dur:0.35,a:0.45,col:EARTH}); clods(w,6,0.8); sparks(w.clone().setY(0.1),4,BONE,0.5,0.4,-2); } } }
    if(name==='spring'){
      if(i===0){ sprung=0; jaw.visible=fxOn; if(fxOn){ const w=snareW(); sparks(w.clone().setY(0.2),6,EMBER,0.8,0.25,-1); clods(w,5,0.7); ringAt(w,{r0:JR*1.6,r1:JR,dur:0.5,a:0.45,col:EMBER}); } }
      if(i===1){ hitFeel(0.3,0.04,0.35); flash=0.2; slowT=0; // the jaws: 11, and held slowed
        if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.25; u.mat.emissiveIntensity=feel?0.4:0; }
        if(fxOn){ const w=snareW(); sparks(w.clone().setY(0.3),10,EMBER,1.6,0.25,-1); sparks(w.clone().setY(0.3),10,BONE,2.0,0.5,-6); ringAt(w,{r0:0.2,r1:JR*1.05,dur:0.26,a:0.5,col:EMBER}); dust(w,6,0.8,0.3);
          for(const o of teeth){ const a=o.a; for(let s=0;s<5;s++) puff(new THREE.Vector3(Math.sin(a)*0,0,0).add(w).add(new THREE.Vector3(Math.cos(a)*JR*(1-s/5),0.3-0.03*s,Math.sin(a)*JR*(1-s/5))),new THREE.Vector3(),{life:0.12+0.02*s,s0:0.06,s1:0.02,a:0.5,col:BONE}); } } } }
    if(name==='spawn'){ if(fxOn){ const b=bladePt(); dust(b.clone().setY(0),5,0.5,0.2); } }
    if(name==='death'){ if(i===0) hitFeel(0.2,0.03,0.2); else { hitFeel(0.15,0.02,0.15); if(fxOn){ const p=pt(bones.chest,[0,0,0]).setY(0); dust(p,10,1.0,0.3); sparks(bladePt(),6,IRON,1.0,0.35,-5); ringAt(p,{r0:0.2,r1:1.2,dur:0.6,a:0.3}); } } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time; prevT=t;
    if(n==='dig'&&t>0.12&&t<0.6&&fxOn&&Math.random()<d*10){ const b=bladePt(); puff(b.clone().setY(0.05),new THREE.Vector3((Math.random()-0.5)*0.6,0.6,(Math.random()-0.5)*0.6),{life:0.4,s0:0.05,s1:0.03,a:0.45,col:EARTH,g:-5}); }
    if(n==='death'){ if(t>1.3)cv.style.filter='saturate(0.5)'; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done, n=busy?shot.name:'', t=busy?shot.action.time:0; if(!busy){ HOME=FAR; }
    flash=Math.max(0,flash-d*3.2);
    const want=n==='dig'?eyeDig(t):n==='spring'?eyeSpring(t):0; eye+=(want-eye)*Math.min(1,d*20);
    glowU.value.set(fxOn?0.25+0.75*eye:0,0,feel?flash:0,0);
    // the snare: the teeth break the ash as it arms, glint indigo once armed; sprung, they climb and lean in, then snap
    if(snareT>=0&&snare){ snareT+=d; if(armT<ARM)armT+=d; const ak=c01(armT/ARM), armed=armT>=ARM, inK=c01(snareT/0.17);
      disc.material.opacity=0.75*inK; let rise=0, shut=0;
      if(sprung>=0){ sprung+=d; rise=c01(sprung/JAW); shut=c01((sprung-JAW)/(11/60));
        const f=easeOut(rise); jawFill.scale.setScalar(Math.max(0.001,JR*f)); const go=sprung>=JAW, fade=go?1-c01((sprung-JAW-0.1)/0.2):1;
        jaw.userData.bed.material.opacity=0.06*fade; jawFill.material.opacity=(go?0.22:0.14)*fade; jawEdge.material.opacity=(go?0.6:0.5)*fade; if(fade<=0)jaw.visible=false; }
      teeth.forEach(o=>{ o.p.position.y=-0.18+0.09*ak+0.26*rise-0.25*c01((sprung-JAW-0.3)/0.4)*(sprung>=0?1:0); o.p.rotation.z=0; o.m.rotation.z=0; o.p.rotation.x=0; const lean=0.5*rise+0.6*shut; o.p.children[0].rotation.x=0; o.p.rotation.set(0,-o.a,0); o.p.rotateZ(lean); o.p.position.x=Math.cos(o.a)*0.4*(1-0.6*shut); o.p.position.z=Math.sin(o.a)*0.4*(1-0.6*shut); });
      snare.userData.tm.emissiveIntensity=armed?(0.08+0.04*Math.sin(clockT*3)+0.3*rise):0; sGlow.material.opacity=fxOn&&armed?(0.08+0.03*Math.sin(clockT*3))*(1-rise):0;
      if(sprung>JAW+0.8){ snareT=-1; snare.visible=false; }
      if(!fxOn) snare.visible=false; }
    if(slowT>=0){ slowT+=d; const a=c01(slowT/0.15)*(1-c01((slowT-HOLD+0.2)/0.2)); slowRing.material.opacity=fxOn?0.45*a:0; if(slowT>HOLD){slowT=-1; slowRing.material.opacity=0;} }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.6*u.tip;
      if(n==='spring'){ // the hero walks onto the snare, is held there, then walks off slowly
        const back=c01((t-SNAP_AT-HOLD)/0.45); u.z=t<TRIP_AT?FAR+(SN-FAR)*sm(t/TRIP_AT):SN+(FAR-SN)*0.25*back*back; }
      else { u.z+=(HOME-u.z)*Math.min(1,d*2); }
      u.x+=(0-u.x)*Math.min(1,d*2); dummy.position.z=u.z; dummy.position.x=u.x; }
  }
