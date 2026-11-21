  // ---- effects (stand-ins, dim on purpose, after the game's own: the horn guard's faint indigo glow, flaring on every
  // blocked shot; the Ember cone 1.8 u at a half-angle of 50° filling over each 60-tick coil; the slam on the hero (18)
  // with a scuff of dust and bone chips off the horns; hoof dust on the walk; a stamp's dust ring on the spawn)
  const FXP=[], RINGS=[]; let dotTex=null, cone=null, coneFill=null, coneEdge=null, guardS=null, bolt=null;
  let guard=0, flare=0, coneT=-1, coneI=0, boltT=-1;
  const INDIGO=0x6b5cff, BONE=0xe9dcc0, DUSTC=0x6e625a, SHOT=0xdfe8ff;
  const TEL=1.0, D=TEL+(3+2.5+6)/30+0.25, R=1.8, HALF=50*Math.PI/180;
  const c01=(x)=>Math.max(0,Math.min(1,x)), easeOut=(k)=>1-(1-k)*(1-k);
  const coilCurve=(k)=>{const c=c01(k);return 0.85*easeOut(Math.min(1,c/0.4))+0.15*c;};
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUSTC,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the cone, on the floor: the game's 1.8 u at a half-angle of 50° ahead of it, its edge drawn at once, its fill
    // reaching out over the coil
    const A0=1.5*Math.PI-HALF, AL=2*HALF, cm=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    cone=new THREE.Group(); fxG.add(cone); cone.visible=false;
    const bed=new THREE.Mesh(new THREE.CircleGeometry(R,48,A0,AL).rotateX(-Math.PI/2),cm(0.07)); cone.add(bed); cone.userData.bed=bed;
    coneFill=new THREE.Mesh(new THREE.CircleGeometry(1,48,A0,AL).rotateX(-Math.PI/2).translate(0,0.002,0),cm(0.14)); cone.add(coneFill);
    const eg=new THREE.RingGeometry(R-0.05,R,48,1,A0,AL).rotateX(-Math.PI/2).translate(0,0.003,0); coneEdge=[new THREE.Mesh(eg,cm(0.5))];
    for(const s of [-1,1]){ const a=s*HALF, L=new THREE.Mesh(new THREE.PlaneGeometry(0.05,R).rotateX(-Math.PI/2).translate(0,0.003,R/2),cm(0.5)); L.rotation.y=a; coneEdge.push(L); }
    coneEdge.forEach(e=>cone.add(e));
    // the guard's glow in front of the horns (the game's makeGlowSprite, indigo, 0.18) and the hero's shot it blocks
    guardS=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:INDIGO,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); scene.add(guardS);
    bolt=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:SHOT,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); bolt.visible=false; scene.add(bolt);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.28,a:0.2,drag:2.6,floor:true,col:col||DUSTC});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.1,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.045,s1:0.015,a:0.55,col,g:-3,drag:1.4});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUSTC);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); coneT=-1; if(cone)cone.visible=false; boltT=-1; if(bolt)bolt.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const hornFront=()=>pt(bones.head,[0,-0.06,0.2]);
  function coneAt(){ cone.position.copy(toFloor(new THREE.Vector3(0,0.012,0))); cone.rotation.set(0,-floorYaw,0); cone.visible=fxOn; coneT=0; }
  function fxStart(name){
    HOME=name==='slams'?NEAR:FAR; prevT=0; coneI=-1;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='block'){ boltT=0; bolt.visible=fxOn; }
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='slams'){ const heave=i===2; hitFeel(heave?0.6:0.5,0.08,0.6); flash=0.3; // the slam: 18
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=heave?0.55:0.45; u.z+=0.3; u.x+=heave?0:(i===0?0.18:-0.18); u.mat.emissiveIntensity=feel?0.5:0; }
      if(fxOn){ const h=hornFront(); sparks(h,heave?10:7,BONE,1.8,0.3); dust(h.clone().setY(0),heave?10:6,1.1,0.35); ringAt(h.clone().setY(0),{r0:0.25,r1:heave?1.0:0.75,dur:0.4,a:0.3}); } }
    if(name==='block'){ flare=1; hitFeel(0.12,0.02,0.15); boltT=-1; bolt.visible=false; if(fxOn)sparks(hornFront(),8,INDIGO,1.6,0.28); }
    if(name==='spawn'){ if(fxOn){ const h=pt(bones.fHoofR,[0,0,0]).setY(0); dust(h,6,0.8,0.3); ringAt(h,{r0:0.1,r1:0.5,dur:0.35,a:0.3}); } }
    if(name==='death'){ hitFeel(0.25,0.03,0.2); if(fxOn){ dust(pt(bones.spine,[0,0,0]).setY(0),10,1.0,0.3); ringAt(pt(bones.spine,[0,0,0]).setY(0),{r0:0.3,r1:1.0,dur:0.45,a:0.25}); } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    if(n==='slams'){ const i=Math.min(2,Math.floor(t/D)); if(i!==coneI&&t-i*D<TEL){ coneI=i; coneAt(); coneT=t-i*D; }
      // the front hooves stepping in for each slam scuff the floor
      for(const c of [0,1,2].map(j=>j*D+TEL)) if(pv<c-0.12&&t>=c-0.12&&fxOn){ dust(pt(bones.fHoofL,[0,0,0]).setY(0),2,0.5,0.25); dust(pt(bones.fHoofR,[0,0,0]).setY(0),2,0.5,0.25); } }
    if(n==='block'&&boltT>=0){ boltT=t; const k=c01(t/0.25), a=new THREE.Vector3(dummy.position.x,0.6,dummy.position.z), b=hornFront(); bolt.position.copy(a.lerp(b,k)); bolt.scale.setScalar(0.16); bolt.material.opacity=fxOn?0.7:0; }
    if(n==='death'){ if(t>1.2)cv.style.filter='saturate(0.5)'; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=FAR; }
    flare=Math.max(0,flare-d*3.5); flash=Math.max(0,flash-d*3.2);
    guard=sel.dead||(busy&&shot.name==='death')?Math.max(0,guard-d*2):0.035+0.015*Math.sin(clockT*2);
    glowU.value.set(fxOn?guard+0.3*flare:0,0,feel?flash:0,0);
    guardS.position.copy(hornFront()); guardS.scale.setScalar(0.9*(1+0.5*flare)); guardS.material.opacity=fxOn?1.2*guard+0.3*flare:0;
    if(coneT>=0){ coneT+=d; const f=coilCurve(coneT/TEL), go=coneT>=TEL, fade=go?1-c01((coneT-TEL)/0.15):1; coneFill.scale.setScalar(Math.max(0.001,R*f));
      cone.userData.bed.material.opacity=0.07*fade; coneFill.material.opacity=(go?0.22:0.14)*fade; coneEdge.forEach(e=>e.material.opacity=(go?0.6:0.5)*fade);
      if(fade<=0||!fxOn||(busy&&shot.name!=='slams')||!busy){coneT=-1;cone.visible=false;} }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.6*u.tip;
      if(!busy||shot.name!=='slams'||coneT>=0&&coneT<TEL){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
