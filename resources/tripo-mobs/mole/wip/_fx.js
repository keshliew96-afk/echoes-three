  // ---- effects (stand-ins, dim on purpose, after the game's own: the floor hides it while it is under, and the earth
  // mound with its clods rides over it, churning as it tunnels and leaving a furrow of loose earth; the Ember ring r 0.8
  // filling over the 60-tick coil while the mound quakes; the burst out of the earth throwing clods and dust, 11 to the
  // hero; the claws raking earth back as it digs in; the indigo claw tips, its tell, brighter from the coil to the
  // landing; a small candle flame on its back)
  const FXP=[], RINGS=[]; let dotTex=null, ring=null, ringFill=null, occ=null, mound=null, flame=null;
  let ringT=-1, tell=0.25, mAmt=0;
  const EARTH=0x3b2d22, EARTHD=0x261c14, SPARK=0xe9dcc0, FLAMEC=0xffd9a0;
  const TEL=1.0, R_EM=0.8, FR=1/30, CYCLE=3.9, DIG_AT=2.8, HX=-0.6, HIP0=0.18*U;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<200;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the floor itself: invisible, but it hides whatever is under it, so the burrowed mole is gone but for its mound
    occ=new THREE.Mesh(new THREE.PlaneGeometry(60,60).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({colorWrite:false})); occ.renderOrder=-1; scene.add(occ);
    const em=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the emerge ring, on the floor round it: the outline and a fill growing out over the coil
    ring=new THREE.Mesh(new THREE.RingGeometry(R_EM-0.04,R_EM,72).rotateX(-Math.PI/2),em(0.5)); ring.position.y=0.012; ring.visible=false; fxG.add(ring);
    ringFill=new THREE.Mesh(new THREE.CircleGeometry(1,72).rotateX(-Math.PI/2),em(0.12)); ringFill.position.y=0.011; ringFill.visible=false; fxG.add(ringFill);
    // the mound: the game's earth hump and six clods round it, sized to this mole
    mound=new THREE.Group(); const hm=new THREE.Mesh(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2).scale(0.46,0.17,0.66),new THREE.MeshStandardMaterial({color:EARTH,roughness:1,flatShading:true})); mound.add(hm);
    const cm=new THREE.MeshStandardMaterial({color:EARTHD,roughness:1,flatShading:true});
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2, cl=new THREE.Mesh(new THREE.IcosahedronGeometry(0.1,0),cm); cl.position.set(Math.cos(a)*0.42,0.03,Math.sin(a)*0.6); cl.rotation.set(a,a*0.7,0); cl.scale.set(1,0.8,1); mound.add(cl);}
    mound.visible=false; scene.add(mound);
    // the grave candle's flame: small and dim
    flame=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:FLAMEC,transparent:true,depthWrite:false,opacity:0.35})); flame.scale.set(0.07,0.11,1); scene.add(flame);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.3,a:0.2,drag:2.6,floor:true,col:col||EARTH});} }
  function clods(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.06),new THREE.Vector3(Math.cos(a)*spd*(0.4+Math.random()),up*(0.6+Math.random()*0.6),Math.sin(a)*spd*(0.4+Math.random())),{life:0.55+Math.random()*0.3,s0:0.07,s1:0.05,a:0.75,col:EARTHD,g:-7,drag:0.4,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(pos).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); ringT=-1; if(ring){ring.visible=ringFill.visible=false;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const hipW=()=>pt(bones.hips,[0,0,0]);
  function ringStart(){ const o=toFloor(new THREE.Vector3(0,0,0)); ring.position.set(o.x,0.012,o.z); ringFill.position.set(o.x,0.011,o.z); ringT=0; ring.visible=ringFill.visible=fxOn; }
  function fxStart(name){
    HOME=name==='emerges'?NEAR:FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=name==='emerges'?HX:0; u.tip=0; dummy.position.set(u.x,0,HOME); }
    if(name==='emerges')ringStart();
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function hitHero(n){ if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.3; u.z+=0.1; u.x-=0.08; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),n,SPARK,1.6,0.25); } }
  function fxContact(name,i){
    if(name==='emerges'){ hitFeel(i===2?0.55:0.4,0.05,i===2?0.55:0.45); hitHero(7);
      if(fxOn){ const c=toFloor(new THREE.Vector3(0,0,0)); ringAt(c,{r0:R_EM*0.9,r1:R_EM*1.1,dur:0.35,a:0.4,col:EMBER}); const h=hipW().setY(0); clods(h,14,1.8,3.2); dust(h,10,1.3,0.5); ringAt(toFloor(h),{r0:0.3,r1:1.1,dur:0.4,a:0.35,col:EARTH}); } }
    if(name==='death'&&i===1){ hitFeel(0.15,0,0.15); if(fxOn)dust(hipW().setY(0),7,0.9,0.3); }
  }
  let prevT=0, dirtAcc=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    const cross=(c)=>pv<c&&t>=c;
    if(n==='emerges'){
      const k=Math.min(2,Math.floor(t/CYCLE)), tt=t-k*CYCLE;
      if(k>0&&cross(k*CYCLE))ringStart();
      // the tell: the claw tips brighten from the coil to the landing
      tell=0.25+0.55*(tt<TEL?sm((tt-0.3)/0.6):1-sm((tt-TEL-0.5)/0.5));
      // the dig back in: earth raked back off the claws, then the mound rises over it
      if(fxOn&&tt>DIG_AT+0.1&&tt<DIG_AT+0.75){ dirtAcc+=d*22; while(dirtAcc>1){ dirtAcc-=1; const cl=pt(bones[Math.random()<0.5?'clawL':'clawR'],[0,0,0.04]).setY(0.05); puff(cl,new THREE.Vector3((Math.random()-0.5)*1.2,1.4+Math.random(),-1.2-Math.random()),{life:0.5,s0:0.06,s1:0.04,a:0.7,col:EARTHD,g:-7,floor:true}); } }
      if(cross(k*CYCLE+DIG_AT+0.75)&&fxOn)dust(hipW().setY(0),6,0.7,0.3);
    }
    if(n==='death'){ tell=0.25*Math.max(0,1-t/0.6); if(t>1.4)cv.style.filter='saturate(0.5)'; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy)HOME=FAR; if(!busy)tell+=((sel.dead?0:0.25)-tell)*Math.min(1,d*4);
    flash=Math.max(0,flash-d*3.2); glowU.value.set(fxOn?tell:0,0,feel?flash:0,0);
    // the mound: up as the body goes under, churning while it tunnels, quaking through the coil
    const h=hipW(), want=c01((HIP0-h.y)/(0.32*U)); mAmt+=(want-mAmt)*Math.min(1,d*10);
    const tun=A.walk?A.walk.__w:0, coil=busy&&shot.name==='emerges'&&((shot.action.time%CYCLE)<TEL)?1:0;
    const ch=0.05*tun*Math.sin(clockT*13), qk=coil*0.05*Math.sin(clockT*47);
    mound.visible=mAmt>0.02; mound.position.set(h.x+qk*0.4,0,h.z); mound.scale.set(1+ch+qk,Math.max(0.01,mAmt)*(1+0.5*coil*Math.abs(Math.sin(clockT*23))),1-ch+qk);
    blob.visible=mAmt<0.5;
    // a furrow of loose earth left behind as it tunnels
    if(fxOn&&tun>0.5&&mAmt>0.5&&!busy){ dirtAcc+=d*16; while(dirtAcc>1){ dirtAcc-=1; const b=pt(bones.hips,[(Math.random()-0.5)*0.35,0,-0.42+(Math.random()-0.5)*0.12]).setY(0.03); puff(b,new THREE.Vector3((Math.random()-0.5)*0.4,0.25,(Math.random()-0.5)*0.3),{life:1.4,s0:0.12,s1:0.2,a:0.4,col:Math.random()<0.5?EARTH:EARTHD,drag:3,floor:true}); } }
    if(fxOn&&coil&&Math.random()<d*10)dust(h.clone().setY(0),1,0.5,0.4);
    // the candle flame on its back, a slow dim flicker
    flame.position.copy(pt(bones.spine,[0,0.37,-0.02])); flame.visible=fxOn&&!sel.dead; flame.material.opacity=0.3+0.08*Math.sin(clockT*11)+0.05*Math.sin(clockT*29); flame.scale.set(0.07,0.1+0.015*Math.sin(clockT*17),1);
    if(ringT>=0){ ringT+=d; const f=c01(ringT/TEL), go=ringT>=TEL, fade=go?1-c01((ringT-TEL-0.1)/0.25):1; ringFill.scale.setScalar(Math.max(0.001,R_EM*f));
      ring.material.opacity=(go?0.75:0.5)*fade; ringFill.material.opacity=(go?0.2:0.12)*fade; if(fade<=0||!fxOn||(busy&&shot.name!=='emerges')){ringT=-1;ring.visible=ringFill.visible=false;} }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData, hx=busy&&shot.name==='emerges'?HX:0; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip;
      u.z+=(HOME-u.z)*Math.min(1,d*1.5); u.x+=(hx-u.x)*Math.min(1,d*2); dummy.position.z=u.z; dummy.position.x=u.x; }
  }
