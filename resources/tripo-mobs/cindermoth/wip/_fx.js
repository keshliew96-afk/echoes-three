  // ---- effects (stand-ins, dim on purpose: the Ember ring round it, the heat in its fire as the game drives it, its halo
  // and floor light, cinders dripping while it burns, the flare's burst, the grey husk while spent)
  const FXP=[], RINGS=[]; let dotTex=null, ring=null, halo=null, pool=null;
  let litK=1, kinK=0, burstT=9, dripT=0, eyes=1, eyesTo=1, mode='flutter', creep=0, prog=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,64),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning: the game's Ember ring r 1.2 round itself, filling over its 48 ticks
    ring=new THREE.Group(); const rf=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.1,depthWrite:false})); rf.rotation.x=-Math.PI/2;
    const re=new THREE.Mesh(new THREE.RingGeometry(RAD-0.05,RAD,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.5,depthWrite:false})); re.rotation.x=-Math.PI/2;
    ring.add(rf,re); ring.userData={rf,re}; ring.position.y=0.012; ring.visible=false; scene.add(ring);
    // its heat: a soft gold halo round the body and a pool of light on the floor under it
    halo=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:GOLD,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); scene.add(halo);
    pool=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({map:dotTex,color:GOLD,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); pool.rotation.x=-Math.PI/2; pool.position.y=0.008; scene.add(pool);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0,side:0,tip:0,dm}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.05,s1:0.18,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.flat=!!o.flat; r.delay=o.delay||0; r.m.material.color.setHex(o.col||GOLD); scene.add(r.m); r.m.position.copy(pos); r.m.rotation.set(o.flat?-Math.PI/2:0,0,0); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(ring)ring.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const bodyPt=()=>pt(bones.sq,[0,0,0]), tailPt=()=>pt(bones.sq,[0,-0.07,-0.2]);
  function fxStart(name){
    HOME=NEAR; ring.visible=false;
    if(name==='kindle'&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; dummy.position.set(0,0,NEAR); }
    if(name==='spawn'){ eyes=0; litK=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='kindle'){ ring.visible=false; burstT=0; hitFeel(0.25,0.04,0.4); flash=0.08;
      if(dummy&&Math.hypot(dummy.position.x,dummy.position.z)<=RAD+0.25)hitDummy();
      if(fxOn){ const b=bodyPt(); ringAt(new THREE.Vector3(b.x,0.03,b.z),{r0:0.2,r1:RAD,dur:0.3,a:0.3,flat:true}); ringAt(b,{r0:0.1,r1:0.8,dur:0.3,a:0.3,bill:true,col:HEAT}); sparks(b,10,GOLD,1.6,0.35); if(showTarget)sparks(targetW().setY(0.6),4,GOLD,1.2,0.22); } }
    if(name==='death'){ hitFeel(0.1,0,0.15); if(fxOn)dust(bodyPt().setY(0),6,0.45,0.2); }
  }
  // the flare scorches him: a jolt back and a warm flash
  function hitDummy(){ if(!dummy||!showTarget)return; const u=dummy.userData; u.kick=0.12; u.tip=0.2; u.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='kindle'){ mode=t<TEL?'kindle':t<TEL+SPENT?'spent':'flutter'; prog=t<TEL?t/TEL:0; creep=mode==='spent'?0.35*Math.min(1,Math.max(0,1-(TEL+SPENT-t)/(40/60))):0;
      if(t<TEL){ const kk=t/TEL; ring.visible=fxOn; ring.userData.rf.scale.setScalar(Math.max(0.01,RAD*kk)); ring.userData.rf.material.opacity=0.05+0.1*kk; ring.userData.re.material.opacity=0.3+0.35*kk; } else ring.visible=false; }
    if(n==='death'){ mode='dead'; eyesTo=Math.max(0,1-t/0.6); if(t>1.2)cv.style.filter='saturate(0.6)'; }
    if(n==='spawn'){ mode='flutter'; eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done;
    if(!busy||shot.name==='hurt'){ mode=sel.dead?'dead':'flutter'; eyesTo=sel.dead?0:1; prog=0; creep=0; if(ring&&!busy)ring.visible=false; }
    // the game's heat: litK out at 7/s when spent (only the creep left), back at 3/s; kindleK at 9/s; the flare e^(-7t) for 0.5 s
    const spent=mode==='spent'||mode==='dead'; litK+=((spent?(mode==='dead'?0:creep):1)-litK)*(1-Math.exp(-(spent?7:3)*d)); kinK+=((mode==='kindle'?1:0)-kinK)*(1-Math.exp(-9*d));
    burstT+=d; const burst=burstT<0.5?Math.exp(-7*burstT):0;
    const flick=0.08*Math.sin(clockT*11)+0.05*Math.sin(clockT*27);
    const heat=litK*(0.62+flick+kinK*(0.1+0.4*prog)+0.12*kinK*prog*Math.sin(clockT*40))+1.2*burst;
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const grey=1-Math.min(1,litK*1.4);
    glowU.value.set((fxOn?1:0)*0.45*Math.min(1.6,heat),(fxOn?1:0)*0.25*eyes*(0.4+0.6*litK),feel?flash:0,grey);
    if(halo){ const b=bodyPt(); halo.position.copy(b); halo.visible=fxOn; halo.material.opacity=0.35*Math.min(1,0.05+0.25*heat*litK+0.5*burst); halo.scale.setScalar(0.5+0.3*heat+0.4*kinK*prog+1.1*burst);
      pool.position.x=b.x; pool.position.z=b.z; pool.visible=fxOn; pool.material.opacity=0.45*Math.min(1,0.06+0.22*heat*litK+0.4*burst); pool.scale.setScalar(0.6*(1.2+0.8*kinK*prog+1.2*burst)); }
    // cinders dripping off the abdomen while it burns
    dripT+=d; if(fxOn&&litK>0.5&&dripT>0.22){ dripT=0; puff(tailPt(),new THREE.Vector3((Math.random()-0.5)*0.1,-0.2,(Math.random()-0.5)*0.1),{life:0.9,s0:0.05,s1:0.02,a:0.6*Math.min(1,litK*2-0.4),col:GOLD,g:-1.2,drag:0.5}); }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.kick>0){ u.z+=u.kick*d*6; u.kick=Math.max(0,u.kick-d*1.5); } u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.5*u.tip;
      if(!busy){ u.hold=0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
