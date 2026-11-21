  // ---- effects (stand-ins, dim on purpose, after the game's own: the belfry rope up out of frame, slack while it
  // creeps and taut on the grip; the swing's Ember lane filling over the 66-tick telegraph and its Ember edge as it
  // swings; the hemp arc laid behind the body, the push-off dust, fibres shaken out of the rope, the landing puff; the
  // indigo eyes (the tell); on death the rope lets go and falls in a heap)
  const FXP=[], RINGS=[]; let dotTex=null, rope=null, ropeSegs=[], lane=null, laneFill=null, laneEdges=[], eyeS=[], eyeGlow=null, headGlow=null;
  let eyes=1, eyesTo=1, ropeDrop=-1, laneT=-1;
  const EMBER=0xFF5A36, HEMP=0x8C7A58, ROPEC=0x8a7c63, SSTONE=0xA7A39A, BONEC=0xC9C2B3, PARCH=0xF4EFE6;
  const TELL=new THREE.Color().setHSL(228/360,0.72,0.6), TELLG=new THREE.Color().setHSL(228/360,0.85,0.52);
  const TEL=66/60, LANE=8.5, SWING=LANE/10, DANGLE=45/60, LETGO=0.45, HERO_AT=4.0, THROW=2.0;
  const ROPE_N=12, ROPE_SEG=0.5, ROPE_AT=[-0.062,0.205,0.015]; // the rope leaves the knot on its right shoulder (on the chest bone)
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<140;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the belfry rope: twelve half-unit joints, 6 u up out of frame, the game's rope colour
    rope=new THREE.Group(); const rm=new THREE.MeshStandardMaterial({color:ROPEC,roughness:1,transparent:true,opacity:1}); const rg=new THREE.CylinderGeometry(0.022,0.022,1,5);
    for(let i=0;i<ROPE_N;i++){const m=new THREE.Mesh(rg,rm); rope.add(m); ropeSegs.push(m);} rope.userData.mat=rm; scene.add(rope);
    // the swing lane, on the floor: a dim Ember bed 1.1 u wide that fills toward the far end over the telegraph, with
    // brighter edges; it is laid where the swing starts and stays there as it travels
    lane=new THREE.Group(); lane.matrixAutoUpdate=true; fxG.add(lane); lane.visible=false;
    const lm=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    const bed=new THREE.Mesh(new THREE.PlaneGeometry(1.1,LANE).rotateX(-Math.PI/2).translate(0,0,LANE/2),lm(0.08)); lane.add(bed); lane.userData.bed=bed;
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1).rotateX(-Math.PI/2).translate(0,0.002,0.5),lm(0.16)); lane.add(laneFill);
    for(const x of [-0.55,0.55]){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.05,LANE).rotateX(-Math.PI/2).translate(x,0.003,LANE/2),lm(0.45)); lane.add(e); laneEdges.push(e);}
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.05).rotateX(-Math.PI/2).translate(0,0.003,LANE),lm(0.45)); lane.add(cap); laneEdges.push(cap);
    // the indigo eyes, the tell, and their soft glow
    for(const x of [0.02,-0.02]){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:TELL,transparent:true,depthWrite:false,opacity:0.8})); s.userData.x=x; scene.add(s); eyeS.push(s);}
    eyeGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:TELLG,transparent:true,depthWrite:false,opacity:0.2,blending:THREE.AdditiveBlending})); scene.add(eyeGlow);
    // the head riding the swing: a small white-hot point with an Ember glow, as the game draws it
    headGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:EMBER,transparent:true,depthWrite:false,opacity:0})); headGlow.visible=false; scene.add(headGlow);
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,thr:-1,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.06),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.6+Math.random()*0.3,s0:0.14,s1:0.42,a:0.22,drag:2.4,floor:true,col:col||SSTONE});} }
  function sparks(pos,n,col,spd,life,gv){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.6,col,g:gv===undefined?-2.5:gv,drag:1.4,floor:true});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane)lane.visible=false; laneT=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  // the swing's beats on the clip's clock (the game's numbers)
  const gripK=(t)=>sm(t/0.25)*(1-sm((t-TEL)/0.06));
  const swingP=(t)=>c01((t-TEL)/SWING);
  const dangleK=(t)=>sm((t-TEL-SWING)/0.12)*(1-sm((t-TEL-SWING-DANGLE)/LETGO));
  function laneAt(){ // lay the lane on the floor where it stands, pointing where it faces
    const o=toFloor(new THREE.Vector3(0,0.012,0)); lane.position.copy(o); lane.rotation.set(0,-floorYaw,0); lane.visible=fxOn; laneT=0; }
  function fxStart(name){
    HOME=NEAR;
    if(name==='swing'){ laneAt(); if(dummy){ const u=dummy.userData; u.z=HERO_AT; u.x=0; u.thr=-1; u.hold=0; dummy.position.set(0,0,HERO_AT); } }
    if(name==='spawn'){ eyes=0; ropeDrop=-1; cv.style.filter=''; dust(new THREE.Vector3(0,0,0),5,0.7,0.3); }
    if(name==='death'){ ropeDrop=0; }
  }
  function fxContact(name,i){
    if(name==='swing'){ hitFeel(0.3,0.05,0.4);
      if(dummy&&showTarget){ const u=dummy.userData; u.thr=0; u.hold=1.0; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.55),6,BONEC,1.6,0.25); } }
    if(name==='death'){ hitFeel(0.2,0,0.25); if(fxOn)dust(pt(bones.chest,[0,0,0]).setY(0),7,0.9,0.35); }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    const cross=(c)=>pv<c&&t>=c;
    if(n==='swing'){
      // the lane: it fills over the telegraph, flares as the swing goes and fades behind it (the game's streak, 0.12 s past the sweep)
      if(lane&&lane.visible){ const k=c01(t/TEL); laneFill.scale.z=Math.max(0.001,LANE*k); const go=t>=TEL, f=go?1-c01((t-TEL-SWING)/0.35):1;
        lane.userData.bed.material.opacity=0.08*f*(go?1.6:1); laneFill.material.opacity=(go?0.2:0.16)*f; laneEdges.forEach(e=>e.material.opacity=(go?0.6:0.45)*f); if(f<=0)lane.visible=false; }
      if(cross(TEL)&&fxOn){ // the push-off: dust behind the feet; the rope creaks
        dust(new THREE.Vector3(0,0,-0.25),3,0.7,0.25);
        const top=ropeTop(); for(let i=0;i<8;i++)puff(top.clone().lerp(ropeBase(),0.45).add(new THREE.Vector3((Math.random()-0.5)*0.6,0,(Math.random()-0.5)*0.6)),new THREE.Vector3(0,-0.3-Math.random()*0.3,0),{life:1.2,s0:0.05,s1:0.03,a:0.8,col:HEMP,g:-0.5,floor:true}); }
      // the hemp arc laid behind the body as it passes, a pale core at the end
      if(t>=TEL&&t<TEL+SWING&&fxOn){ const h=pt(bones.hips,[0,0.05,0]); puff(h,new THREE.Vector3(0,-0.05,0),{life:0.42,s0:0.2,s1:0.07,a:0.55,col:t>TEL+SWING-0.08?PARCH:HEMP,floor:true}); }
      if(cross(TEL+SWING+DANGLE+LETGO*0.6)&&fxOn){ // the landing: a stone ring, a puff, fibres drifting down
        ringAt(new THREE.Vector3(0,0,0),{r0:0.2,r1:0.8,dur:0.32,a:0.35,col:SSTONE}); dust(new THREE.Vector3(0,0,0),4,0.8,0.3);
        for(let i=0;i<4;i++)puff(new THREE.Vector3((Math.random()-0.5)*0.4,1.6*U/2,(Math.random()-0.5)*0.4),new THREE.Vector3(0,-0.2,0),{life:1.0,s0:0.05,s1:0.03,a:0.7,col:HEMP,g:-0.4,floor:true}); }
    }
    if(n==='death'){ eyesTo=t>0.5?0:1-t/0.5; if(t>1.6)cv.style.filter='saturate(0.5)';
      if(cross(0.35)&&fxOn){ const b=pt(bones.chest,[0,0,0]).setY(0); ringAt(b,{r0:0.2,r1:0.9,dur:0.35,a:0.35,col:HEMP}); dust(b,3,0.7,0.3); }
      if(cross(0.02)&&fxOn){ for(let i=0;i<6;i++)puff(pt(bones.chest,[0,0,0]).setY(1.5*U/2).add(new THREE.Vector3((Math.random()-0.5)*0.5,0,(Math.random()-0.5)*0.5)),new THREE.Vector3(0,0.1,0),{life:1.1,s0:0.05,s1:0.03,a:0.7,col:HEMP,g:-0.4,floor:true}); } }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  // the rope's lean in the world (the game's formula: forward on the grip, sweeping over the top on the swing, plumb
  // when it dangles) and its slack wave while it creeps
  function ropeState(){
    const busy=shot&&!shot.done;
    if(busy&&shot.name==='swing'){ const t=shot.action.time, gk=gripK(t), p=swingP(t), sw=t>=TEL&&t<TEL+SWING, dk=dangleK(t), creep=(1-gk)*(1-dk)*(sw?0:1);
      return {lean:0.32*gk+(sw?0.9-1.25*sm(p):0)+0.04*Math.sin(clockT*0.7)*creep, slack:creep*(1-dk)}; }
    return {lean:0.04*Math.sin(clockT*0.7), slack:1};
  }
  const ropeBase=()=>pt(bones.chest,ROPE_AT);
  const ropeTop=()=>ropeBase().add(new THREE.Vector3(0,ROPE_N*ROPE_SEG,0));
  function updateRope(){
    const st=ropeState(); let p=ropeBase(); const drop=ropeDrop<0?0:Math.min(1,ropeDrop/0.45);
    rope.visible=showTarget||true; rope.userData.mat.opacity=1;
    let a=st.lean, b=0;
    for(let i=0;i<ROPE_N;i++){ const m=ropeSegs[i];
      if(i>0){ a+=st.slack*(0.14*Math.sin(clockT*1.3-i*0.55)+(i<4?0.1:-0.03))*0.35; b=st.slack*0.08*Math.sin(clockT*1.1-i*0.7)*0.5; }
      const dir=new THREE.Vector3(Math.sin(b),Math.cos(a)*Math.cos(b),Math.sin(a)).normalize();
      // on death the rope lets go: it falls out of the dark onto the body and lies in a heap (hidden as it lands)
      const q=p.clone().addScaledVector(dir,ROPE_SEG); const mid=p.clone().lerp(q,0.5); mid.y-=drop*ROPE_N*ROPE_SEG*0.9;
      m.position.copy(mid); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir); m.scale.set(1,ROPE_SEG+0.01,1); m.visible=mid.y>0.05&&drop<1; p=q; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){eyesTo=sel.dead?0:1; if(!sel.dead)ropeDrop=-1;}
    if(ropeDrop>=0)ropeDrop+=d;
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(0,0,feel?flash:0,0);
    eyeS.forEach(s=>{ s.position.copy(pt(bones.head,[s.userData.x,0.065,0.052])); s.scale.setScalar(0.035); s.material.opacity=0.85*eyes; s.visible=fxOn&&eyes>0.02; });
    eyeGlow.position.copy(pt(bones.head,[0,0.065,0.075])); eyeGlow.scale.setScalar(0.3); eyeGlow.material.opacity=0.2*eyes; eyeGlow.visible=fxOn&&eyes>0.02;
    const sw=busy&&shot.name==='swing'&&shot.action.time>=TEL&&shot.action.time<TEL+SWING;
    headGlow.visible=fxOn&&sw; if(sw){ headGlow.position.copy(pt(bones.head,[0,0.06,0.03])); headGlow.scale.setScalar(0.22); headGlow.material.opacity=0.35; }
    if(rope)updateRope();
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      // struck once and thrown 2 u to the side, out of the lane, over 10 ticks (the game's throw)
      if(u.thr>=0){ u.thr+=d; const k=c01(u.thr/(10/60)); u.x=-THROW*(1-(1-k)*(1-k)); if(k>=1){ u.hold-=d; if(u.hold<=0&&!busy)u.thr=-1; } }
      else if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); }
      dummy.position.z=u.z; dummy.position.x=u.x; }
    // its shadow shrinks while it rides the rope
    const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-0.6)/0.8)); blob.scale.set(0.34*(1-0.25*k),0.3*(1-0.25*k),1); blob.material.opacity=0.17*(1-0.3*k);
  }
