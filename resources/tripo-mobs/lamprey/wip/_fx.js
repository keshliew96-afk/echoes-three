  // ---- effects (stand-ins, dim on purpose, after the game's own: the floor hides it while it lurks and only the ripple
  // shows (rings at 1.6 a second); the Ember lane 0.9 wide and 5.0 long filling over the 48-tick rise; the breach splash;
  // spray off the lunge; the bite on the hero; the beaching splat, a wet patch and drops flicked off as it thrashes; the
  // splash as it slides back under; the indigo gill pores, its tell, brighter on the rise)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null, laneEdges=[], ripple=null, wet=null, occ=null;
  let gills=0.35, eyes=1, eyesTo=1, wetT=-1;
  const WATER=0xA9B8B0, MUD=0x5a5040, SPARK=0xe9dcc0, WETC=0x2c2a22;
  const LURK0=0.6, TEL=48/60, LUNGE=0.5, LANE=5.0, LANE_W=0.9, HERO_AT=3.0, BEACH=110/60, BITE=LURK0+TEL+LUNGE*HERO_AT/LANE, BEACH_AT=LURK0+TEL+LUNGE, UNDER=BEACH_AT+BEACH, BACK=UNDER+1.1;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<140;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:WATER,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the floor itself: invisible, but it hides whatever is under it, so the lurking eel is gone but for its ripple
    occ=new THREE.Mesh(new THREE.PlaneGeometry(60,60).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({colorWrite:false})); occ.renderOrder=-1; scene.add(occ);
    // the lurk's ripple: the game's floor ring, growing 0.7 to 1.3 and fading, 1.6 a second
    ripple=new THREE.Mesh(new THREE.RingGeometry(0.42,0.5,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:WATER,transparent:true,opacity:0,depthWrite:false})); ripple.position.y=0.01; scene.add(ripple);
    // the lane, on the floor: the game's 0.9 u by 5.0 u, filling toward the far end over the rise, brighter edges
    lane=new THREE.Group(); fxG.add(lane); lane.visible=false;
    const lm=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    const hw=LANE_W/2, bed=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,LANE).rotateX(-Math.PI/2).translate(0,0,LANE/2),lm(0.08)); lane.add(bed); lane.userData.bed=bed;
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).rotateX(-Math.PI/2).translate(0,0.002,0.5),lm(0.16)); lane.add(laneFill);
    for(const x of [-hw,hw]){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.05,LANE).rotateX(-Math.PI/2).translate(x,0.003,LANE/2),lm(0.45)); lane.add(e); laneEdges.push(e);}
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.05).rotateX(-Math.PI/2).translate(0,0.003,LANE),lm(0.45)); lane.add(cap); laneEdges.push(cap);
    // the wet patch it leaves where it beached
    wet=new THREE.Mesh(new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:WETC,transparent:true,opacity:0,depthWrite:false})); wet.scale.set(0.5,1,0.9); wet.position.y=0.006; wet.visible=false; fxG.add(wet);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function drops(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(pos,new THREE.Vector3(Math.cos(a)*spd*(0.3+Math.random()),up*(0.6+Math.random()*0.6),Math.sin(a)*spd*(0.3+Math.random())),{life:0.5+Math.random()*0.3,s0:0.05,s1:0.025,a:0.6,col:WATER,g:-6,drag:0.6,floor:true});} }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.28,a:0.2,drag:2.6,floor:true,col:col||MUD});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||WATER);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane)lane.visible=false; wetT=-1; if(wet)wet.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  function laneAt(){ const o=toFloor(new THREE.Vector3(0,0.012,0)); lane.position.copy(o); lane.rotation.set(0,-floorYaw,0); lane.visible=fxOn; }
  const discPt=()=>pt(bones.disc,[0,0,0.03]);
  function sinkAt(t){ if(t<LURK0)return 1; if(t<UNDER){ const k=c01((t-LURK0)/(8/30)); return (1-k)*(1-k); } if(t<BACK)return 1-Math.exp(-9*(t-UNDER)); return Math.pow(1-c01((t-BACK)/0.5),2); }
  function fxStart(name){
    HOME=NEAR;
    if(name==='lunge'&&dummy){ const u=dummy.userData; u.z=HERO_AT; u.x=0; u.tip=0; dummy.position.set(0,0,HERO_AT); }
    if(name==='spawn'){ eyes=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='lunge'&&i===0){ hitFeel(0.3,0.05,0.45); // the bite: 12
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.3; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),7,SPARK,1.6,0.25); } }
    if(name==='lunge'&&i===1){ hitFeel(0.15,0,0.25); if(fxOn){ const b=pt(bones.hips,[0,0,0]).setY(0); ringAt(b,{r0:0.3,r1:1.1,dur:0.4,a:0.35}); drops(pt(bones.body,[0,0.1,0]),10,1.4,2.2); dust(b,4,0.8,0.2); wet.position.copy(toFloor(b)).setY(0.006); wet.rotation.y=-floorYaw; wetT=0; } }
    if(name==='death'&&i===1){ hitFeel(0.12,0,0.15); if(fxOn){ const b=pt(bones.hips,[0,0,0]).setY(0); dust(b,5,0.7,0.2); drops(pt(bones.neck2,[0,0,0]),5,1,1.5); } }
  }
  let prevT=0, dropAcc=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    const cross=(c)=>pv<c&&t>=c;
    if(n==='lunge'){
      gills=t>=LURK0&&t<LURK0+TEL?0.35+0.55*c01((t-LURK0)/0.3):0.35;
      if(cross(LURK0)){ laneAt(); if(fxOn){ const h=pt(bones.hips,[0,0,0]).setY(0); ringAt(h,{r0:0.3,r1:1.0,dur:0.4,a:0.4}); drops(pt(bones.neck1,[0,0,0]).setY(0.05),12,1.2,2.6); } }
      if(lane&&lane.visible){ const a=t-LURK0, f=c01(a/TEL), go=a>=TEL, fade=go?1-c01((t-BEACH_AT)/0.3):1; laneFill.scale.z=Math.max(0.001,LANE*f);
        lane.userData.bed.material.opacity=0.08*fade*(go?1.5:1); laneFill.material.opacity=(go?0.2:0.16)*fade; laneEdges.forEach(e=>e.material.opacity=(go?0.6:0.45)*fade); if(fade<=0)lane.visible=false; }
      // the lunge throws spray off both sides of the head
      if(t>=LURK0+TEL&&t<BEACH_AT&&fxOn){ const h=discPt(); for(const sx of [-1,1])puff(h.clone().setY(0.08),new THREE.Vector3(sx*(0.8+Math.random()*0.6),1.2+Math.random(),-0.5),{life:0.45,s0:0.05,s1:0.02,a:0.5,col:WATER,g:-6,floor:true}); }
      // beached: drops flicked off as it thrashes
      if(t>BEACH_AT+0.2&&t<UNDER&&fxOn){ dropAcc+=d*5; while(dropAcc>1){ dropAcc-=1; const b=['tail3','neck2','body'][Math.floor(Math.random()*3)]; drops(pt(bones[b],[0,0.05,0]),2,1.0,1.6); } }
      if(cross(UNDER+0.05)&&fxOn){ const h=pt(bones.hips,[0,0,0]).setY(0); ringAt(h,{r0:0.4,r1:1.2,dur:0.5,a:0.35}); drops(pt(bones.body,[0,0.05,0]),8,1,1.8); }
      if(cross(BACK)&&fxOn){ ringAt(pt(bones.hips,[0,0,0]).setY(0),{r0:0.3,r1:0.9,dur:0.4,a:0.3}); drops(pt(bones.neck1,[0,0,0]).setY(0.05),6,1,2); }
    }
    if(n==='death'){ eyesTo=Math.max(0,1-t/0.7); gills=0.35*Math.max(0,1-t/0.7); if(t>1.3)cv.style.filter='saturate(0.5)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){eyesTo=sel.dead?0:1; gills+=((sel.dead?0:0.35)-gills)*Math.min(1,d*4);}
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?gills:0,0,feel?flash:0,0.3*eyes);
    // the lurk: the shadow goes, the ripple shows (the game's ring and fade)
    const sink=busy&&shot.name==='lunge'?sinkAt(shot.action.time):0;
    const ph=(clockT*1.6)%1; ripple.scale.setScalar(0.7+0.6*ph); ripple.material.opacity=fxOn?sink*0.45*(1-ph):0; ripple.visible=sink>0.01;
    blob.visible=sink<0.5;
    if(wetT>=0){ wetT+=d; const u=wetT/4; if(u>=1||!fxOn){wetT=-1;wet.visible=false;} else { wet.visible=true; wet.material.opacity=0.22*(u<0.05?u/0.05:1-u); } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip;
      if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
