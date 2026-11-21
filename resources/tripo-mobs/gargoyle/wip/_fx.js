  // ---- effects (dim on purpose; stand-ins: the two Ember rings (the wake's r 1.7 round itself over its 48 ticks, the
  // slam's r 1.3 centred 0.9 u in front over 54), the eyes' indigo glow (the game lights its cracks; your stone has no
  // seams to light, so the eyes carry it), stone chips and dust on the burst and the slam)
  const FXP=[], RINGS=[]; let dotTex=null, warn=null;
  let eyes=0, eyesTo=0, crack=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<110;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning ring: a faint Ember disc filling out to a firm edge
    warn=new THREE.Group(); const fill=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.08,depthWrite:false,side:THREE.DoubleSide})); fill.rotation.x=-Math.PI/2;
    const edge=new THREE.Mesh(new THREE.RingGeometry(0.96,1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.5,depthWrite:false,side:THREE.DoubleSide})); edge.rotation.x=-Math.PI/2;
    warn.add(fill,edge); warn.userData={fill,edge}; warn.position.y=0.012; warn.visible=false; scene.add(warn);
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.07,s1:0.3,a:0.2,drag:3,floor:true});} }
  // stone chips: small pale flecks thrown out and falling
  function chips(pos,n,spd){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,0.4+Math.random()*0.8,Math.random()-0.5).normalize().multiplyScalar(spd*(0.5+Math.random()*0.7)); puff(pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.4,(Math.random()-0.5)*0.4,(Math.random()-0.5)*0.3)),v,{life:0.5+Math.random()*0.3,s0:0.06,s1:0.04,a:0.7,col:CHIP,g:-6,drag:0.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {scene.add(r.m); r.m.position.copy(pos).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(warn)warn.visible=false; }
  const SPARK=0xe9dcc0, CHIP=0xd8d2c6;
  function fxStart(name){
    HOME=NEAR; if(warn)warn.visible=false;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)ringAt(new THREE.Vector3(0,0,0),{r0:0.2,r1:1.0,dur:0.4,a:0.3}); dust(new THREE.Vector3(0,0,0),6,0.9,0.4); }
    if((name==='slam'||name==='wake')&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,NEAR); }
  }
  const inRing=(cz,r)=>dummy&&showTarget&&Math.hypot(dummy.position.x,dummy.position.z-cz)<=r+0.3;
  function fxContact(name,i){
    if(name==='wake'){ if(warn)warn.visible=false; hitFeel(0.32,0.05,0.5); if(fxOn){ chips(pt(bones.chest,[0,0,0]),26,1.6); ringAt(new THREE.Vector3(0,0,0),{r0:0.4,r1:WAKE_R,dur:0.45,a:0.35}); dust(new THREE.Vector3(0,0,0),10,1.2,0.3); } if(inRing(0,WAKE_R))hitDummy(0.12); }
    if(name==='slam'){ if(warn)warn.visible=false; hitFeel(0.45,0.07,0.7); if(fxOn){ const c=new THREE.Vector3(0,0,SLAM_AT); ringAt(c,{r0:0.3,r1:SLAM_R,dur:0.4,a:0.4}); dust(c,12,1.4,0.35); chips(c.clone().setY(0.1),10,1.2); } if(inRing(SLAM_AT,SLAM_R))hitDummy(0.16); }
    if(name==='death'){ hitFeel(0.25,0,0.3); if(fxOn){ dust(pt(bones.chest,[0,0,0]).setY(0),10,0.8,0.25); chips(pt(bones.chest,[0,0,0]),10,0.8); } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.5); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='wake'){ if(t<CRACK){ const k=t/CRACK; warn.visible=fxOn; warn.position.set(0,0.012,0); warn.userData.fill.scale.setScalar(Math.max(0.01,WAKE_R*k)); warn.userData.edge.scale.setScalar(WAKE_R); warn.userData.fill.material.opacity=0.04+0.07*k; warn.userData.edge.material.opacity=0.25+0.3*k;
        if(fxOn&&Math.random()<d*14)chips(pt(bones.chest,[0,0,0]),1,0.5); } else warn.visible=false; }
    if(n==='slam'){ if(t<TEL){ const k=t/TEL; warn.visible=fxOn; warn.position.set(0,0.012,SLAM_AT); warn.userData.fill.scale.setScalar(Math.max(0.01,SLAM_R*k)); warn.userData.edge.scale.setScalar(SLAM_R); warn.userData.fill.material.opacity=0.04+0.07*k; warn.userData.edge.material.opacity=0.25+0.3*k; } else warn.visible=false; }
    if(n==='death'){ if(t>1.4)cv.style.filter='saturate(0.5)'; }
  }
  // the eyes: dark in stone, glowing up through the crack, a steady low glow awake, brighter on the slam's wind-up
  // (the game's crack levels: 0, 0.3 + 0.7 of the crack, 0.45 + 0.4 of the wind-up)
  function crackNow(){
    if(sel.dead)return 0;
    if(shot&&!shot.done){ const n=shot.name, t=shot.action.time;
      if(n==='wake')return t<CRACK?0.3+0.7*t/CRACK:Math.max(0.45,1-(t-CRACK)*1.5);
      if(n==='settle')return 0.45*Math.max(0,1-t/1.1);
      if(n==='slam')return t<TEL?0.45+0.4*t/TEL:0.45;
      if(n==='spawn')return 0;
      if(n==='death')return Math.max(0,0.45*(1-t/1.2)); }
    return sel.base==='stone'?0:0.45;
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy&&warn)warn.visible=false;
    flash=Math.max(0,flash-d*3.2);
    const want=crackNow(); crack+=(want-crack)*Math.min(1,d*(want>crack?10:1.6)); glowU.value.set((fxOn?1:0)*crack*0.9,0,feel?flash:0,0);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02){p.s.position.y=0.02;p.v.y=0;p.v.multiplyScalar(0.5);} const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      u.x+=u.sx*d*0.25; u.sx=Math.max(-3,Math.min(3,u.sx-u.sx*d*8)); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
