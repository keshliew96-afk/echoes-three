  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember lane 0.7 wide through the hero and 1 u past,
  // filling over its 54 ticks; the whip, a violet tendril streak from the sac down the lane, the lane's Ember edge
  // flashing; a miss slaps the floor at the lane's end in a violet splash; a hit latches: a violet burst closing on the
  // hero and the vein tether, a violet bead running up it to the sac on every drink with a small Ember flash on the hero
  // and a violet ring at the sac; let go, the tether parts in violet sparks; the veins brighten as it coils, its tell;
  // dying, the sac splats in violet drops and a dark stain)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null, laneEdges=[], streak=null, tether=null, stain=null;
  let veins=0.35, eyes=1, streakT=-1, edgeT=-1, latched=false, tetherA=0, stainT=-1, beads=[];
  const HV=0xb565f5, HVP=0xf4e8ff, FLESH=0x54465e, SPARK=0xe9dcc0;
  const TEL=54/60, ONE=1.7, LANE=4.0, LANE_W=0.7, SPEED=28, DRINK0=TEL+0.1, DRAIN=0.5, LETGO_AT=DRINK0+3.0+0.15, LAND_AT=0.95;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  const coilC=(k)=>{const c=c01(k); return 0.85*(1-(1-Math.min(1,c/0.4))**2)+0.15*c;};
  // the tell through a lash (the game's: 0.35 + 0.55 tell + 0.4 reach + 0.3 gulp): up through the coil, 0.7 at the whip, off by the settle
  const tellLash=(tt)=>tt<TEL?coilC(tt/TEL):tt<TEL+0.2?0.7-1.6*(tt-TEL):Math.max(0,0.38-1.2*(tt-TEL-0.2));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<180;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:HV,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const lm=(o,col)=>new THREE.MeshBasicMaterial({color:col||EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the lane: 0.7 wide, through the hero (3 u off) and 1 u past it, filling toward the far end over the 54 ticks
    lane=new THREE.Group(); fxG.add(lane); lane.visible=false;
    const hw=LANE_W/2, bed=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,LANE).rotateX(-Math.PI/2).translate(0,0,LANE/2),lm(0.08)); lane.add(bed); lane.userData.bed=bed;
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).rotateX(-Math.PI/2).translate(0,0.002,0.5),lm(0.16)); lane.add(laneFill);
    for(const x of [-hw,hw]){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.05,LANE).rotateX(-Math.PI/2).translate(x,0.003,LANE/2),lm(0.45)); lane.add(e); laneEdges.push(e);}
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.05).rotateX(-Math.PI/2).translate(0,0.003,LANE),lm(0.45)); lane.add(cap); laneEdges.push(cap);
    // the whip: a violet streak from the sac down the lane; the tether: a vein from the sac to the hero
    streak=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.03,1,8,1,true).translate(0,0.5,0).rotateX(Math.PI/2),lm(0,HV)); streak.visible=false; scene.add(streak);
    tether=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,1,8,1,true).translate(0,0.5,0).rotateX(Math.PI/2),lm(0,HV)); tether.visible=false; scene.add(tether);
    stain=new THREE.Mesh(new THREE.CircleGeometry(1,40).rotateX(-Math.PI/2),lm(0,FLESH)); stain.visible=false; fxG.add(stain);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.24,a:0.18,drag:2.6,floor:true,col:col||DUST});} }
  function sparks(pos,n,col,spd,life,g){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:g??-2.5,drag:1.6});} }
  function drops(pos,n,spd){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(pos,new THREE.Vector3(Math.cos(a)*spd*(0.4+Math.random()*0.6),0.6+Math.random()*1.0,Math.sin(a)*spd*(0.4+Math.random()*0.6)),{life:0.5+Math.random()*0.3,s0:0.07,s1:0.04,a:0.6,col:HV,g:-6,drag:0.4});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||HV);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(o.y??0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane)lane.visible=false; streakT=edgeT=stainT=-1; latched=false; beads=[]; if(streak){streak.visible=tether.visible=stain.visible=false;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const sacPt=()=>pt(bones.sac,[0,0.2,0.05]);
  const heroPt=()=>targetW().setY(0.55);
  function laneAt(){ const o=toFloor(new THREE.Vector3(0,0.012,0)); lane.position.copy(o); lane.rotation.set(0,-floorYaw,0); lane.visible=fxOn; edgeT=-1; }
  function aim(m,a,b){ const d=b.clone().sub(a); m.position.copy(a); m.scale.set(1,1,Math.max(0.01,d.length())); m.lookAt(b); }
  function fxStart(name){
    HOME=(name==='lash'||name==='drink')?NEAR:FAR; prevT=0; latched=false; beads=[];
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='lash'||name==='drink') laneAt();
    if(name==='spawn'){ cv.style.filter=''; stainT=-1; stain.visible=false; }
  }
  function fxContact(name,i){
    if(name==='lash'||(name==='drink'&&i===0)){ // the whip down the lane
      edgeT=0; streakT=0; hitFeel(0.15,0.02,0.2);
      if(fxOn){ const s=sacPt(); sparks(s,5,HV,1.2,0.25); puff(s,new THREE.Vector3(),{life:0.18,s0:0.25,s1:0.5,a:0.45,col:HVP}); }
      const hit=name==='drink'||Math.abs(dummy.position.x)<LANE_W/2+0.2;
      if(hit&&dummy&&showTarget){ hitFeel(0.25,0.04,0.3); const u=dummy.userData; u.tip=0.25; u.mat.emissiveIntensity=feel?0.4:0; if(fxOn){ sparks(heroPt(),6,EMBER,1.2,0.25); } }
      if(name==='drink'){ latched=true; tetherA=0; if(fxOn){ const h=heroPt(); ringAt(h,{r0:0.9,r1:0.35,dur:0.3,a:0.45,col:HV,bill:true}); sparks(h,6,HV,0.8,0.4); } }
      else if(!hit&&fxOn){ const e=lane.localToWorld(new THREE.Vector3(0,0,LANE)); setTimeout(()=>{ if(!fxOn)return; puff(e.clone().setY(0.3),new THREE.Vector3(),{life:0.14,s0:0.3,s1:0.5,a:0.5,col:HV}); drops(e.clone().setY(0.3),4,0.8); ringAt(e,{r0:0.1,r1:0.6,dur:0.4,a:0.35,col:HV}); },(LANE/SPEED)*1000); } }
    if(name==='drink'&&i>=1&&i<=6){ // a drink: 2 from the hero, a bead up the tether, the sac heals as much
      if(dummy&&showTarget){ const u=dummy.userData; u.mat.emissiveIntensity=feel?0.25:0; }
      if(fxOn){ const h=heroPt(); puff(h,new THREE.Vector3(),{life:0.1,s0:0.2,s1:0.32,a:0.45,col:EMBER}); sparks(h,3,EMBER,0.6,0.25); beads.push(0); } }
    if(name==='drink'&&i===7){ latched=false; if(fxOn){ const m=sacPt().lerp(heroPt(),0.5); sparks(m,6,HV,1.0,0.45); puff(m,new THREE.Vector3(),{life:0.14,s0:0.2,s1:0.35,a:0.4,col:HV}); } }
    if(name==='spawn'){ if(fxOn){ ringAt(sacPt().setY(0),{r0:0.2,r1:1.0,dur:0.6,a:0.3,col:HV}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.2,0.03,0.2); if(fxOn) sparks(sacPt(),6,HV,1.0,0.3); }
      else { hitFeel(0.2,0.03,0.25); if(fxOn){ const p=sacPt().setY(0.15); puff(p.clone().setY(0.3),new THREE.Vector3(),{life:0.16,s0:0.4,s1:0.7,a:0.45,col:HVP}); drops(p,12,1.4); dust(p,5,0.8,0.25,FLESH); ringAt(p,{r0:0.3,r1:1.4,dur:0.5,a:0.35,col:HV}); }
        stain.position.copy(toFloor(new THREE.Vector3(0,0.006,0))); stain.position.y=0.006; stainT=0; } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    if(n==='lash'){ const k=Math.min(2,Math.floor(t/ONE)), tt=t-k*ONE; veins=0.35+0.55*tellLash(tt);
      if(k>0&&pv<k*ONE&&t>=k*ONE) laneAt();
      // on the second lash the hero stand-in sidesteps out of the lane late in the coil (the counterplay) and it misses
      if(dummy){ const u=dummy.userData; const out=k===1&&tt>0.45&&tt<TEL+0.5?1:0; u.x+=((out?0.95:0)-u.x)*Math.min(1,d*6); u.z+=(NEAR-u.z)*Math.min(1,d*3); }
      laneFade(tt); }
    if(n==='drink'){ const tt=t; veins=tt<TEL+0.2?0.35+0.55*tellLash(tt):tt<LETGO_AT?0.75+0.3*Math.max(0,1-((tt-DRINK0-0.5)%DRAIN+DRAIN)%DRAIN/0.25):0.35+0.55*Math.max(0,0.6-(tt-LETGO_AT)*1.5);
      if(dummy){ const u=dummy.userData; u.x+=(0-u.x)*Math.min(1,d*6); u.z+=(NEAR-u.z)*Math.min(1,d*3); }
      laneFade(tt); }
    if(n==='death'){ veins=Math.max(0,0.35+0.5*Math.max(0,1-t/0.3)-t*0.5); eyes=Math.max(0,1-t/0.8); if(t>1.4)cv.style.filter='saturate(0.5)'; }
    if(n==='spawn'){ veins=0.35+0.45*Math.max(0,1-Math.abs(t-0.5)/0.4); eyes=c01((t-0.2)/0.3); }
  }
  function laneFade(tt){ if(!lane||!lane.visible)return; const f=c01(tt/TEL), go=tt>=TEL, fade=go?1-c01((tt-TEL-0.24)/0.2):1; laneFill.scale.z=Math.max(0.001,LANE*f);
    const hot=edgeT>=0&&edgeT<0.24?1-edgeT/0.24:0; lane.userData.bed.material.opacity=(0.08+0.2*hot)*fade; laneFill.material.opacity=(0.16+0.15*hot)*fade; laneEdges.forEach(e=>e.material.opacity=Math.min(0.8,0.45+0.3*hot)*fade); if(fade<=0)lane.visible=false; }
  function updateFx(d){
    const busy=shot&&!shot.done, n=busy?shot.name:'';
    if(!busy||(n!=='lash'&&n!=='drink'&&n!=='death'&&n!=='spawn')){ veins+=((sel.dead?0:0.35+0.1*Math.sin(clockT*3))-veins)*Math.min(1,d*4); eyes+=((sel.dead?0:1)-eyes)*Math.min(1,d*4); }
    if(lane&&lane.visible&&n!=='lash'&&n!=='drink') lane.visible=false;
    flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?0.6*eyes:0,fxOn?veins:0,feel?flash:0,0);
    if(edgeT>=0){ edgeT+=d; if(edgeT>1)edgeT=-1; }
    // the whip's streak: from the sac out to where it stops (the hero, or the lane's end), then fading
    if(streakT>=0){ streakT+=d; const hitAt=Math.abs(dummy.position.x)<LANE_W/2+0.2?dummy.position.z:LANE; const sweep=hitAt/SPEED, u=streakT;
      if(u>sweep+0.25||!fxOn){streakT=-1; streak.visible=false;} else { const a=sacPt(), b=lane.localToWorld(new THREE.Vector3(0,0,0)).setY(0.55); const dir=lane.localToWorld(new THREE.Vector3(0,0,1)).sub(lane.localToWorld(new THREE.Vector3())).setY(0).normalize(); const tip=b.clone().addScaledVector(dir,Math.min(1,u/sweep)*hitAt); aim(streak,a,tip); streak.visible=true; streak.material.opacity=0.55*(u<sweep?1:1-(u-sweep)/0.25); } }
    // the tether while latched: a vein from the sac to the hero, wavering; beads run up it on each drink
    tetherA+=((latched&&fxOn?1:0)-tetherA)*Math.min(1,d*10);
    if(tetherA>0.01){ const a=sacPt(), b=heroPt(); aim(tether,a,b); tether.visible=true; tether.material.opacity=0.6*tetherA*(0.85+0.15*Math.sin(clockT*14)); }
    else tether.visible=false;
    beads=beads.filter(u=>u<0.3);
    for(let i=0;i<beads.length;i++){ beads[i]+=d; const u=beads[i]/0.3; if(fxOn){ const p=heroPt().lerp(sacPt(),sm(u)); puff(p,new THREE.Vector3(),{life:0.08,s0:0.14,s1:0.1,a:0.7,col:HVP}); }
      if(beads[i]>=0.3&&fxOn){ const s=sacPt(); puff(s,new THREE.Vector3(),{life:0.18,s0:0.4,s1:0.7,a:0.35,col:HV}); ringAt(s,{r0:0.25,r1:0.6,dur:0.3,a:0.45,col:HV,bill:true}); } }
    if(stainT>=0){ stainT+=d; const k=c01((stainT-0.3)/0.4); stain.visible=fxOn&&k>0; stain.scale.setScalar(Math.max(0.01,0.8*k)); stain.material.opacity=0.4*k; if(!sel.dead&&!(busy&&n==='death')){stainT=-1;stain.visible=false;} }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.6*u.tip;
      if(!busy||(n!=='lash'&&n!=='drink')){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
