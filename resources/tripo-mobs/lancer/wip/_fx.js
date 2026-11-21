  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember lane 0.8 wide and 7.0 long filling over the
  // 54-tick aim; at the release a violet flare at the hand, the Ember edge flashing the full lane width (that is what hits),
  // a violet beam with a pale head running down the lane at 34 u/s, a violet burst where it stops, sparks off the edges
  // and a scorched line that cools from Ember to violet; the hero hit for 10; motes running from the veins to the hand
  // as the spear reforms; the veins and the spearhead brighten with the aim, its tell)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null, laneEdges=[], beam=null, head=null, scorch=null;
  let veins=0.25, tipG=0.25, eyes=1, eyesTo=1, beamT=-1, scorchT=-1, edgeT=-1;
  const VIO=0x9a78e8, VIOP=0xd9ccff, SPARK=0xe9dcc0, SCORCH=0x3a2340;
  const ONE=1.75, TEL=54/60, LANE=7.0, LANE_W=0.8, SPEED=34, SWEEP=LANE/SPEED, HAND_Y=0.72;
  const AIMS=[0,0.13,0.25,0.36,0.46,0.55,0.63,0.7,0.76,0.81,0.85,0.88,0.9,0.91,0.91,0.92,0.92,0.93,0.93,0.94,0.94,0.95,0.95,0.96,0.96,0.96,0.97,0.97,0.98,0.98,0.99,0.99,1,0.89,0.69,0.61,0.6,0.6,0.6,0.6,0.6,0.45,0.34,0.27,0.25,0.25,0.24,0.23,0.2,0.17,0.14,0.11,0.07,0.04,0.02,0.01,0];
  const aimAt=(tt)=>{ const f=Math.max(0,tt/0.025), i=Math.floor(f); if(i>=AIMS.length-1)return 0; return AIMS[i]+(AIMS[i+1]-AIMS[i])*(f-i); };
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false,to:null});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIO,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the lane, on the floor: the game's 0.8 u by 7.0 u, filling toward the far end over the aim, brighter edges
    lane=new THREE.Group(); fxG.add(lane); lane.visible=false;
    const lm=(o,col)=>new THREE.MeshBasicMaterial({color:col||EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    const hw=LANE_W/2, bed=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,LANE).rotateX(-Math.PI/2).translate(0,0,LANE/2),lm(0.08)); lane.add(bed); lane.userData.bed=bed;
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).rotateX(-Math.PI/2).translate(0,0.002,0.5),lm(0.16)); lane.add(laneFill);
    for(const x of [-hw,hw]){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.05,LANE).rotateX(-Math.PI/2).translate(x,0.003,LANE/2),lm(0.45)); lane.add(e); laneEdges.push(e);}
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.05).rotateX(-Math.PI/2).translate(0,0.003,LANE),lm(0.45)); lane.add(cap); laneEdges.push(cap);
    // the release: the violet beam from the hand to the lane's end, its pale head, and the scorched line it leaves
    const fx=new THREE.Group(); fxG.add(fx); lane.userData.fx=fx;
    beam=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,1).translate(0,0,0.5),lm(0,VIO)); beam.visible=false; fx.add(beam);
    head=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:VIOP,transparent:true,depthWrite:false,opacity:0})); head.scale.set(0.5,0.5,1); head.visible=false; fx.add(head);
    scorch=new THREE.Mesh(new THREE.PlaneGeometry(0.16,LANE-0.4).rotateX(-Math.PI/2).translate(0,0.004,0.4+(LANE-0.4)/2),lm(0,EMBER)); scorch.visible=false; fx.add(scorch);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.to=o.to||null; p.from=p.to?pos.clone():null; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.24,a:0.18,drag:2.6,floor:true,col:col||DUST});} }
  function sparks(pos,n,col,spd,life,floor){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6,floor});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIO);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(pos).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane)lane.visible=false; beamT=scorchT=edgeT=-1; if(beam){beam.visible=head.visible=scorch.visible=false;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const tipPt=()=>pt(bones.spear,[0,0.56,0]), handPt=()=>pt(bones.handR,[0,-0.02,0.02]);
  const VEIN_B=['foreL','foreR','armL','armR','chest','spine'];
  const veinPt=()=>{ const b=bones[VEIN_B[Math.floor(Math.random()*VEIN_B.length)]]||bones.chest; return pt(b,[(Math.random()-0.5)*0.04,(Math.random()-0.5)*0.06,0.02]); };
  // the lane is laid where it stands, along its facing, when the aim locks (the floor frame, so it stays put as the floor runs)
  function laneAt(){ const o=toFloor(new THREE.Vector3(0,0.012,0)); lane.position.copy(o); lane.rotation.set(0,-floorYaw,0); lane.userData.fx.position.copy(o); lane.userData.fx.rotation.set(0,-floorYaw,0); lane.visible=fxOn; edgeT=-1; }
  function fxStart(name){
    HOME=NEAR; prevT=0;
    if(name==='lances'&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.tip=0; dummy.position.set(0,0,NEAR); laneAt(); }
    if(name==='spawn'){ eyes=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='lances'){ hitFeel(0.25,0.04,0.35);
      edgeT=0; beamT=0; scorchT=0;
      if(fxOn){ const h=handPt(); puff(h,new THREE.Vector3(),{life:0.2,s0:0.25,s1:0.6,a:0.5,col:VIOP}); sparks(h,5,VIO,1.4,0.25); }
      // every hero in the lane takes 10 (the stand-in is on it)
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.28; u.z+=0.15; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),7,SPARK,1.6,0.25); } }
    if(name==='death'&&i===1){ hitFeel(0.12,0,0.15); if(fxOn){ dust(pt(bones.chest,[0,0,0]).setY(0),6,0.8,0.25); } }
  }
  let prevT=0, moteAcc=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    const cross=(c)=>pv<c&&t>=c;
    if(n==='lances'){
      const k=Math.min(2,Math.floor(t/ONE)), tt=t-k*ONE, aim=aimAt(tt);
      veins=0.22+0.43*aim; tipG=tt>=TEL&&tt<TEL+0.12?0:0.25+0.6*aim;
      if(dummy&&tt<TEL){ const u=dummy.userData; u.z+=(NEAR-u.z)*Math.min(1,d*3); }
      if(k>0&&cross(k*ONE))laneAt();
      if(lane&&lane.visible){ const f=c01(tt/TEL), go=tt>=TEL, fade=go?1-c01((tt-TEL-0.24)/0.2):1; laneFill.scale.z=Math.max(0.001,LANE*f);
        const hot=edgeT>=0&&edgeT<0.24?1-edgeT/0.24:0;
        lane.userData.bed.material.opacity=(0.08+0.2*hot)*fade; laneFill.material.opacity=(0.16+0.15*hot)*fade; laneEdges.forEach(e=>e.material.opacity=Math.min(0.8,0.45+0.3*hot)*fade); if(fade<=0)lane.visible=false; }
      // sparks off the lane edges as the head runs, a burst where it stops
      if(beamT>=0&&fxOn){ for(let j=0;j<4;j++){ const kk=(j+0.5)/4, at=SWEEP*kk; if(beamT-d<at&&beamT>=at){ const side=j%2?1:-1; const p=lane.userData.fx.localToWorld(new THREE.Vector3(side*LANE_W/2,0.4,LANE*kk)); sparks(p,2,j%2?EMBER:VIO,1.4,0.3); } }
        if(beamT-d<SWEEP&&beamT>=SWEEP){ const e=lane.userData.fx.localToWorld(new THREE.Vector3(0,0.5,LANE)); puff(e,new THREE.Vector3(),{life:0.22,s0:0.3,s1:0.7,a:0.45,col:VIO}); sparks(e,6,VIOP,1.6,0.4); ringAt(toFloor(e),{r0:0.15,r1:0.7,dur:0.3,a:0.35}); } }
      // the spear reforms in the hand from the veins: motes run down the arm into the grip
      if(tt>TEL+0.12&&tt<TEL+0.62&&fxOn){ moteAcc+=d*30; while(moteAcc>1){ moteAcc-=1; puff(veinPt(),new THREE.Vector3(),{life:0.28,s0:0.05,s1:0.03,a:0.55,col:VIO,to:bones.handR}); } }
    }
    if(n==='death'){ eyesTo=Math.max(0,1-t/0.7); veins=0.25*Math.max(0,1-t/0.6); tipG=veins;
      // the spear crumbles as it falls from the hand
      if(t>0.25&&t<0.65&&fxOn){ moteAcc+=d*24; while(moteAcc>1){ moteAcc-=1; const s=pt(bones.spear,[0,(Math.random()-0.35)*0.6,0]); puff(s,new THREE.Vector3((Math.random()-0.5)*0.3,-0.3,(Math.random()-0.5)*0.3),{life:0.5,s0:0.04,s1:0.02,a:0.45,col:VIO,g:-2}); } }
      if(t>1.3)cv.style.filter='saturate(0.5)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; veins=0.25+0.4*Math.max(0,1-Math.abs(t-0.5)/0.4);
      if(t>0.2&&t<0.65&&fxOn){ moteAcc+=d*24; while(moteAcc>1){ moteAcc-=1; puff(veinPt(),new THREE.Vector3(),{life:0.3,s0:0.05,s1:0.03,a:0.5,col:VIO,to:bones.handR}); } } }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy||(shot.name!=='lances'&&shot.name!=='death'&&shot.name!=='spawn')){eyesTo=sel.dead?0:1; const v0=sel.dead?0:0.25; veins+=(v0-veins)*Math.min(1,d*4); tipG+=(v0-tipG)*Math.min(1,d*4);}
    if(busy&&shot.name!=='lances'&&lane&&lane.visible)lane.visible=false;
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?veins:0,fxOn?tipG:0,feel?flash:0,0.3*eyes);
    if(edgeT>=0){ edgeT+=d; if(edgeT>1)edgeT=-1; }
    // the beam: from the hand out to the lane's end with the head running it, then fading
    if(beamT>=0){ beamT+=d; const u=beamT; if(u>SWEEP+0.4||!fxOn){beamT=-1;beam.visible=head.visible=false;} else {
      const reach=Math.min(1,u/SWEEP)*(LANE-0.35); beam.visible=true; beam.position.set(0,HAND_Y,0.35); beam.scale.set(1,1,Math.max(0.01,reach)); beam.material.opacity=0.55*(u<SWEEP?1:1-(u-SWEEP)/0.4);
      head.visible=u<SWEEP; head.position.set(0,HAND_Y-0.04,0.35+reach); head.material.opacity=0.7; } }
    if(scorchT>=0){ scorchT+=d; const u=scorchT/2.4; if(u>=1||!fxOn){scorchT=-1;scorch.visible=false;} else { scorch.visible=scorchT>SWEEP*0.5; scorch.material.color.setHex(u<0.25?EMBER:SCORCH); scorch.material.opacity=(u<0.25?0.35:0.3)*(1-u); } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;}
      if(p.to){ const e=pt(p.to,[0,-0.02,0.02]); p.s.position.copy(p.from).lerp(e,sm(u)); } else { p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; }
      const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip;
      if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
