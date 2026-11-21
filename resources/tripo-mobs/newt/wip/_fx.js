  // ---- effects (stand-ins, dim on purpose, after the game's own: its heat in the cracks, spots and spines, a steady
  // coal glow that heats through the crouch, burns brightest on the lunge and pulses with the breath at rest; the
  // belly's glow on the floor; the Ember lane 0.7 u by 3.6 u through the hero filling over the 42-tick crouch; the
  // gold streak laid out behind the lunge; the bite on the hero (7); the skid's scuff and sparks; smoke from its
  // nostrils as it pants)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null, laneEdges=[], streak=null, streakCore=null, floorGlow=null;
  let heat=0.5, heatTo=0.5, eyes=1, eyesTo=1, laneT=-1, sk=0;
  const GOLD=0xffc46a, HOT=0xfff0c8, SMOKE=0x4a4440, SPARK=0xffd9a0, DUSTC=0x6e625a;
  const TEL=42/60, LANE=3.6, LANE_W=0.7, SPEED=13, RUN=LANE/SPEED, STOP=TEL+RUN, RESTT=40/60;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUSTC,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the lane, on the floor: the game's 0.7 u by 3.6 u from it through the hero, filling over the crouch
    lane=new THREE.Group(); fxG.add(lane); lane.visible=false;
    const lm=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    const hw=LANE_W/2, bed=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,LANE).rotateX(-Math.PI/2).translate(0,0,LANE/2),lm(0.08)); lane.add(bed); lane.userData.bed=bed;
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).rotateX(-Math.PI/2).translate(0,0.002,0.5),lm(0.16)); lane.add(laneFill);
    for(const x of [-hw,hw]){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.05,LANE).rotateX(-Math.PI/2).translate(x,0.003,LANE/2),lm(0.45)); lane.add(e); laneEdges.push(e);}
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.05).rotateX(-Math.PI/2).translate(0,0.003,LANE),lm(0.45)); lane.add(cap); laneEdges.push(cap);
    // the lunge streak, laid out behind it on the floor (the game's white-gold smear and its hotter core)
    const am=(col)=>new THREE.MeshBasicMaterial({color:col,map:dotTex,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const sg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2).translate(0,0,-0.5);
    streak=new THREE.Mesh(sg,am(GOLD)); streak.position.y=0.03; scene.add(streak); streakCore=new THREE.Mesh(sg,am(HOT)); streakCore.position.y=0.032; scene.add(streakCore);
    // the belly's glow on the floor under it
    floorGlow=new THREE.Mesh(new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2),am(GOLD)); floorGlow.scale.set(0.28,1,0.5); floorGlow.position.set(0,0.006,0.05); scene.add(floorGlow);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:2.6,floor:true,col:col||DUSTC});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.1,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.04,s1:0.01,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUSTC);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); laneT=-1; if(lane)lane.visible=false; sk=0; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  function laneAt(){ const o=toFloor(new THREE.Vector3(0,0.012,0)); lane.position.copy(o); lane.rotation.set(0,-floorYaw,0); lane.visible=fxOn; laneT=0; }
  function fxStart(name){
    HOME=name==='lunge'?NEAR:FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='lunge')laneAt();
    if(name==='spawn'){ eyes=0; heat=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='lunge'&&i===0){ hitFeel(0.3,0.04,0.4); // the bite as it passes: 7
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.3; u.z-=0.1; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.4),7,SPARK,1.6,0.25); } }
    if(name==='lunge'&&i===1){ hitFeel(0.12,0,0.15); if(fxOn){ const h=pt(bones.chest,[0,0,0]).setY(0); dust(h,8,1.0,0.3); ringAt(h,{r0:0.2,r1:0.7,dur:0.35,a:0.3}); sparks(pt(bones.chest,[0,-0.05,0.05]).setY(0.05),5,SPARK,1.2,0.3); } }
    if(name==='death'&&i===0){ hitFeel(0.1,0,0.12); if(fxOn)dust(pt(bones.spine,[0,0,0]).setY(0),6,0.7,0.25); }
  }
  let prevT=0, acc=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    if(n==='lunge'){
      const prog=c01(t/TEL), rest=t>=STOP&&t<STOP+RESTT, breath=rest?Math.max(0,Math.sin((t-STOP)*(9-3*c01(t-STOP-0.3))+0.5)):0;
      heatTo=t<TEL?0.55+0.5*prog:t<STOP?1.05:rest?0.42+0.25*breath:0.5;
      sk=t>=TEL&&t<STOP?1:t>=STOP&&t<STOP+0.25?1-(t-STOP)*4:0;
      // the crouch: sparks lifting off the spines as it heats
      if(fxOn&&t<TEL&&Math.random()<d*(4+10*prog)) puff(pt(bones[['spine','chest','hips'][Math.floor(Math.random()*3)]],[(Math.random()-0.5)*0.04,0.1,0]),new THREE.Vector3((Math.random()-0.5)*0.2,0.5+Math.random()*0.4,(Math.random()-0.5)*0.2),{life:0.6,s0:0.03,s1:0.01,a:0.6,col:SPARK,drag:1});
      // panting at rest: smoke from the nostrils on each breath
      if(fxOn&&rest&&breath>0.6&&Math.random()<d*14) puff(pt(bones.head,[(Math.random()-0.5)*0.04,0.0,0.11]),new THREE.Vector3((Math.random()-0.5)*0.15,0.25,0.25),{life:0.8,s0:0.03,s1:0.1,a:0.25,col:SMOKE,drag:1.2});
    }
    if(n==='death'){ eyesTo=Math.max(0,1-t/0.6); heatTo=0.5*Math.max(0,1-t/1.2); if(t>1.2)cv.style.filter='saturate(0.5)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; heatTo=t>0.2?0.5:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; heatTo=sel.dead?0:0.5+0.06*Math.sin(clockT*2.3); HOME=FAR; sk=0; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); heat+=(heatTo-heat)*Math.min(1,d*(heatTo>heat&&busy&&shot.name==='lunge'&&shot.action.time>=TEL?30:6)); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?0.42*heat:0,0.32*eyes,feel?flash:0,0);
    const flick=0.85+0.15*Math.sin(clockT*57);
    streak.material.opacity=fxOn?0.22*sk*flick:0; streak.scale.set(0.38,1,0.2+1.5*sk); streakCore.material.opacity=fxOn?0.22*sk*flick:0; streakCore.scale.set(0.14,1,0.15+1.1*sk);
    streak.visible=streakCore.visible=sk>0.01;
    floorGlow.material.opacity=fxOn&&!sel.dead?0.05+0.16*c01(heat-0.3):0;
    if(laneT>=0){ laneT+=d; const f=c01(laneT/TEL), go=laneT>=TEL, fade=go?1-c01((laneT-TEL-RUN)/0.3):1; laneFill.scale.z=Math.max(0.001,LANE*f);
      lane.userData.bed.material.opacity=0.08*fade*(go?1.5:1); laneFill.material.opacity=(go?0.2:0.16)*fade; laneEdges.forEach(e=>e.material.opacity=(go?0.6:0.45)*fade);
      if(fade<=0||!fxOn||(busy&&shot.name!=='lunge')){laneT=-1;lane.visible=false;} }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.6*u.tip;
      if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*1.5); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
