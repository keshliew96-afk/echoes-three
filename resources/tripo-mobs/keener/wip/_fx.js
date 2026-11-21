  // ---- effects (stand-ins, dim on purpose, after the game's own keener_wail: the Ember cone filling over its 54 ticks;
  // the indigo swell in the mouth through the coil and its flare on the wail; the cone flashing Ember edge to edge; three
  // pale sound-arcs rolling out down it; grave ash blown along the floor and a stain left; a pale tint on the hero while slowed)
  const FXP=[], RINGS=[], ARCS=[]; let dotTex=null, cone=null, mouthS=null, stain=null, slowT=0, stainT=-1, flashT=-1;
  let mouth=0, eyes=1, eyesTo=1;
  const CONE_R=4.2, CONE_HALF=28*Math.PI/180, TEL=54/60, ONE=TEL+(3+2.5+6)/30+0.15, WAIL_AT=[TEL,ONE+TEL,2*ONE+TEL];
  const SHROUD=0x9AA3B0, KASH=0x5c5753, PARCH=0xF4EFE6, TELLI=new THREE.Color().setHSL(228/360,0.72,0.6);
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<110;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,64),new THREE.MeshBasicMaterial({color:0xe9dcc0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const H=CONE_HALF, a0=-Math.PI/2-H, mat=(col,o)=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the warning: the game's Ember cone r 4.2, half-angle 28 deg, aim locked, filling over its 54 ticks
    cone=new THREE.Group(); const cf=new THREE.Mesh(new THREE.CircleGeometry(1,48,a0,2*H),mat(EMBER,0.1)); cf.rotation.x=-Math.PI/2;
    const ce=new THREE.Mesh(new THREE.RingGeometry(CONE_R-0.05,CONE_R,48,1,a0,2*H),mat(EMBER,0.5)); ce.rotation.x=-Math.PI/2;
    const sides=new THREE.Group(); for(const sg of [-1,1]){ const e=new THREE.Mesh(new THREE.PlaneGeometry(CONE_R,0.04),mat(EMBER,0.5)); e.geometry.translate(CONE_R/2,0,0); e.rotation.set(-Math.PI/2,0,0); const p=new THREE.Group(); p.rotation.y=-(Math.PI/2)+sg*H; p.add(e); sides.add(p); }
    const hot=new THREE.Mesh(new THREE.CircleGeometry(CONE_R,48,a0,2*H),mat(EMBER,0)); hot.rotation.x=-Math.PI/2; hot.position.y=0.004; hot.visible=false;
    const rim=new THREE.Mesh(new THREE.RingGeometry(CONE_R-0.07,CONE_R,48,1,a0,2*H),mat(PARCH,0)); rim.rotation.x=-Math.PI/2; rim.position.y=0.006; rim.visible=false;
    cone.add(cf,ce,sides); cone.userData={cf,ce,sides}; cone.position.y=0.012; cone.visible=false; scene.add(cone);
    const hg=new THREE.Group(); hg.add(hot,rim); hg.position.y=0.012; scene.add(hg); hot.userData.rim=rim; cone.userData.hot=hot;
    // the sound-arcs: pale arcs across the cone, rolling out down it
    for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.RingGeometry(0.97,1,40,1,a0+0.08*H,2*H*(0.85+0.1*i)-0.16*H),mat(SHROUD,0)); m.rotation.x=-Math.PI/2; m.visible=false; scene.add(m); ARCS.push({m,t:-1,i}); }
    // the stain the ash leaves, down the cone
    stain=new THREE.Mesh(new THREE.CircleGeometry(CONE_R*0.75,32,a0+0.15*H,1.7*H),mat(KASH,0)); stain.rotation.x=-Math.PI/2; stain.position.y=0.008; stain.visible=false; scene.add(stain);
    mouthS=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:TELLI,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); mouthS.visible=false; scene.add(mouthS);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0,tip:0,dm}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||0xe9dcc0); r.m.position.copy(pos); r.m.rotation.set(0,0,0); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); ARCS.forEach(a=>{a.t=-1;a.m.visible=false;}); if(cone){cone.visible=false; cone.userData.hot.visible=cone.userData.hot.userData.rim.visible=false;} stainT=-1; if(stain)stain.visible=false; flashT=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0;
  const mouthPt=()=>pt(bones.head,[0,0.068,0.095]);
  const inCone=(p)=>{ const r=Math.hypot(p.x,p.z); return r<=CONE_R+0.25&&Math.abs(Math.atan2(p.x,p.z))<=CONE_HALF+0.05; };
  function fxStart(name){
    HOME=NEAR; cone.visible=false;
    if(name==='wails'&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; dummy.position.set(0,0,NEAR); }
    if(name==='spawn'){ eyes=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='wails'){ cone.visible=false; hitFeel(0.3,0.04,0.45);
      if(dummy&&inCone(dummy.position))hitDummy();
      if(fxOn){ const m=mouthPt(); flashT=0; ringAt(m,{r0:0.06,r1:0.6,dur:0.24,a:0.45,bill:true,col:TELLI.getHex()});
        const hot=cone.userData.hot; hot.visible=hot.userData.rim.visible=true; hot.userData.t=0;
        ARCS.forEach(a=>{a.t=-a.i*0.08;});
        for(let k=0;k<6;k++){ const sp=1.6+Math.random()*1.6, aa=(Math.random()-0.5)*2*CONE_HALF*0.8; puff(new THREE.Vector3(Math.sin(aa)*0.8,0.5,Math.cos(aa)*0.8),new THREE.Vector3(Math.sin(aa)*sp,0.1*Math.random(),Math.cos(aa)*sp),{life:0.6+Math.random()*0.3,s0:0.3,s1:0.6,a:0.3,col:KASH,drag:2.2,g:0.1}); }
        for(let k=0;k<8;k++){ const sp=1.4+Math.random()*1.6, aa=(Math.random()-0.5)*2*CONE_HALF*0.8; puff(new THREE.Vector3(Math.sin(aa)*0.6,0.9,Math.cos(aa)*0.6),new THREE.Vector3(Math.sin(aa)*sp,0.3*Math.random(),Math.cos(aa)*sp),{life:0.4+Math.random()*0.3,s0:0.05,s1:0.02,a:0.5,col:SHROUD,drag:1.2}); }
        stainT=0; if(showTarget&&inCone(dummy.position))sparks(targetW().setY(0.6),4,SPARK,1.2,0.22); } }
    if(name==='death'&&i===1){ hitFeel(0.1,0,0.15); if(fxOn)dust(pt(bones.chest,[0,0,0]).setY(0),7,0.6,0.2); }
  }
  // the wail pushes the hero back a touch and leaves it slowed: a pale tint for the game's 2 s
  function hitDummy(){ if(!dummy||!showTarget)return; const u=dummy.userData; u.kick=0.1; u.tip=0.15; u.mat.emissiveIntensity=feel?0.45:0; slowT=2; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='wails'){ const k=Math.min(2,Math.floor(t/ONE)), tt=t-k*ONE;
      if(tt<TEL){ const kk=tt/TEL; cone.visible=fxOn; cone.userData.cf.scale.setScalar(Math.max(0.01,CONE_R*kk)); cone.userData.cf.material.opacity=0.04+0.08*kk; cone.userData.ce.material.opacity=0.25+0.3*kk; cone.userData.sides.children.forEach(p=>p.children[0].material.opacity=0.25+0.3*kk); mouth=0.7*Math.min(1,kk/0.4); }
      else { cone.visible=false; const a=tt-TEL; mouth=a<0.18?1:Math.max(0,1-(a-0.18)/0.35); } }
    if(n==='death'){ eyesTo=Math.max(0,1-t/0.6); if(t>1.2)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.3?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done;
    if(!busy||shot.name!=='wails'){ mouth=Math.max(0,mouth-d*3); if(cone&&!(busy&&shot.name==='wails'))cone.visible=false; }
    if(!busy){ eyesTo=sel.dead?0:1; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(0,0,feel?flash:0,0);
    mouthS.visible=fxOn&&(mouth>0.02||flashT>=0); if(mouthS.visible){ mouthS.position.copy(mouthPt()); let s=0.1+0.18*mouth, o=0.15+0.35*mouth; if(flashT>=0){ flashT+=d; const u=flashT/0.24; if(u>=1)flashT=-1; else { s+=0.5*(1-u); o=Math.max(o,0.6*(1-u)); } } mouthS.scale.setScalar(s); mouthS.material.opacity=o; }
    const hot=cone&&cone.userData.hot; if(hot&&hot.visible){ hot.userData.t+=d; const u=hot.userData.t/0.3; if(u>=1||!fxOn){hot.visible=hot.userData.rim.visible=false;} else { hot.material.opacity=0.25*(1-u); hot.userData.rim.material.opacity=0.6*(1-u); } }
    ARCS.forEach(a=>{ if(a.t===-1)return; a.t+=d; if(a.t<0){a.m.visible=false;return;} const u=a.t/0.42; if(u>=1||!fxOn){a.t=-1;a.m.visible=false;return;} a.m.visible=true; const r=CONE_R*(0.3+0.28*a.i)*(0.55+0.45*u); a.m.scale.set(r,r,1); a.m.position.y=0.9-0.15*a.i; a.m.material.opacity=0.45*(1-u)*(u<0.15?u/0.15:1); });
    if(stainT>=0){ stainT+=d; const u=stainT/2.4; if(u>=1||!fxOn){stainT=-1;stain.visible=false;} else { stain.visible=true; stain.material.opacity=0.22*(u<0.1?u/0.1:1-(u-0.1)/0.9); } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.kick>0){ u.z+=u.kick*d*6; u.kick=Math.max(0,u.kick-d*1.5); } u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.5*u.tip; slowT=Math.max(0,slowT-d); u.dm.color.setHex(slowT>0&&fxOn?0x8a93a8:0x6b645c);
      if(!busy){ u.hold=0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
