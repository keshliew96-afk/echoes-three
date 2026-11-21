  // ---- effects (stand-ins, dim on purpose: the Ember cone of the caw filling over its 45 ticks, the indigo glint in
  // its eyes (the game's tell), the fan of three violet feather-shots, dust under the feet)
  const FXP=[], RINGS=[], SHOTS=[]; let dotTex=null, cone=null;
  let eyes=1, eyesTo=1, tell=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning: the game's Ember cone r 5.0, half-angle 22 deg, locked on the hero, filling out over its 45 ticks
    const H=CONE_HALF, a0=-Math.PI/2-H;
    cone=new THREE.Group(); const cf=new THREE.Mesh(new THREE.CircleGeometry(1,48,a0,2*H),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.1,depthWrite:false,side:THREE.DoubleSide})); cf.rotation.x=-Math.PI/2;
    const ce=new THREE.Mesh(new THREE.RingGeometry(CONE_R-0.05,CONE_R,48,1,a0,2*H),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.5,depthWrite:false,side:THREE.DoubleSide})); ce.rotation.x=-Math.PI/2;
    const sides=new THREE.Group(); for(const sg of [-1,1]){ const e=new THREE.Mesh(new THREE.PlaneGeometry(CONE_R,0.04),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.5,depthWrite:false,side:THREE.DoubleSide})); e.geometry.translate(CONE_R/2,0,0); e.rotation.set(-Math.PI/2,0,0); const p=new THREE.Group(); p.rotation.y=-(Math.PI/2)+sg*H; p.add(e); sides.add(p); }
    cone.add(cf,ce,sides); cone.userData={cf,ce,sides}; cone.position.y=0.012; cone.visible=false; scene.add(cone);
    // the feather-shots: a dark violet dart with a short trail
    for(let i=0;i<3;i++){ const g=new THREE.Group(); const dart=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.26,5),new THREE.MeshBasicMaterial({color:SHOT,transparent:true,opacity:0.9})); dart.rotation.x=Math.PI/2; const tr=new THREE.Mesh(new THREE.PlaneGeometry(0.05,0.5),new THREE.MeshBasicMaterial({color:SHOT,transparent:true,opacity:0.25,depthWrite:false,side:THREE.DoubleSide})); tr.rotation.x=-Math.PI/2; tr.position.z=-0.35; g.add(dart,tr); g.visible=false; scene.add(g); SHOTS.push({g,t:-1,dir:new THREE.Vector3(),p0:new THREE.Vector3(),hit:false}); }
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.07,s1:0.26,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.06,s1:0.012,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); SHOTS.forEach(S=>{S.t=-1;S.g.visible=false;}); if(cone)cone.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0;
  // the beak's tip, in the head bone's frame
  const beakTip=()=>pt(bones.head,[0,-0.01,0.19]);
  const SNAPS=['caw1','caw2','caw3'];
  function fxStart(name){
    HOME=NEAR; if(cone)cone.visible=false;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)ringAt(new THREE.Vector3(0,0,0),{r0:0.2,r1:1.0,dur:0.4,a:0.3}); dust(new THREE.Vector3(0,0,0),6,0.9,0.4); }
    if(SNAPS.includes(name)&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,NEAR); }
  }
  // the fan: three shots at -15, 0, +15 deg from the beak, 5 u/s out to 7.5 u; the one that reaches the hero hits
  function loose(){ const p=beakTip(); [-1,0,1].forEach((k,i)=>{ const S=SHOTS[i]; const a=k*SPREAD; S.dir.set(Math.sin(a),0,Math.cos(a)); S.p0.copy(p); S.t=0; S.hit=false; S.g.visible=fxOn; S.g.position.copy(p); S.g.lookAt(p.clone().add(S.dir)); }); }
  function fxContact(name,i){
    if(SNAPS.includes(name)){ const k=SNAPS.indexOf(name); if(cone)cone.visible=false; hitFeel(k===2?0.4:0.28,0.05,k===2?0.6:0.45);
      loose(); if(fxOn){ sparks(beakTip(),4,SHOT,0.8,0.2); if(k===2)dust(new THREE.Vector3(0,0,0.05),4,0.5,0.2); } }
    if(name==='death'){ hitFeel(0.2,0,0.2); if(fxOn)dust(pt(bones.hips,[0,0,0]).setY(0),6,0.6,0.25); }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.5); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(SNAPS.includes(n)){ if(t<TEL){ const kk=t/TEL; cone.visible=fxOn; cone.userData.cf.scale.setScalar(Math.max(0.01,CONE_R*kk)); cone.userData.cf.material.opacity=0.04+0.08*kk; cone.userData.ce.material.opacity=0.25+0.3*kk; } else cone.visible=false; }
    if(n==='death'){ eyesTo=Math.max(0,1-t/1.2); if(t>1.4)cv.style.filter='saturate(0.5)'; }
    if(n==='spawn'){ eyesTo=t>0.4?1:0; }
  }
  // the eyes' indigo glint, the game's tell: brighter as the wings fan and the beak opens (it reads the pose's wing lift)
  function tellNow(){ if(!shot||shot.done||!SNAPS.includes(shot.name))return 0; const t=shot.action.time; return t<TEL+0.2?Math.min(1,t/TEL):Math.max(0,1-(t-TEL-0.2)/0.3); }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; if(cone)cone.visible=false; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    tell+=(tellNow()-tell)*Math.min(1,d*12); glowU.value.set((fxOn?1:0)*eyes*(0.25+0.45*tell),0,feel?flash:0,0);
    SHOTS.forEach(S=>{ if(S.t<0)return; S.t+=d; const dist=SHOT_V*S.t; if(dist>SHOT_R){S.t=-1;S.g.visible=false;return;} S.g.position.copy(S.p0).addScaledVector(S.dir,dist); S.g.visible=fxOn;
      if(!S.hit&&dummy&&showTarget){ const q=S.g.position; if(Math.hypot(q.x-dummy.position.x,q.z-dummy.position.z)<0.32){ S.hit=true; S.t=-1; S.g.visible=false; hitDummy(0.06); if(fxOn)sparks(q.clone().setY(0.55),5,SPARK,1.4,0.22); } } });
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      u.x+=u.sx*d*0.25; u.sx=Math.max(-3,Math.min(3,u.sx-u.sx*d*8)); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
