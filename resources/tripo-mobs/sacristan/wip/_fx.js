  // ---- effects (stand-ins, dim on purpose, after the game's own: the Vesper Hush's pale ring r 3.6 filling over its 54
  // ticks, the bell's pale shimmer as it rings, the note falling pale as rings in the air and on the floor, a thread to
  // each foe it hushes and the soft pale veil they wear for 5 s; the rap's Ember cone r 1.6 at 60° over 36 ticks, the
  // bronze burst and stone chips on the hero (7); its crumbling death with the bell's last ring)
  const FXP=[], RINGS=[]; let dotTex=null, ring=null, ringFill=null, ringEdge=null, cone=null, coneFill=null, coneEdge=null, kin=[];
  let shimmer=0, ringT=-1, coneT=-1, veilT=-1;
  const PALE=0xc3cbe0, BRONZE=0xb08a4a, STONE=0x9a958c, DUSTC=0x6e625a;
  const HT=54/60, HR=3.6, RT=36/60, CR=1.6, HALF=60*Math.PI/180, VEIL=5;
  const c01=(x)=>Math.max(0,Math.min(1,x)), easeOut=(k)=>1-(1-k)*(1-k);
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<180;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.95,1,72),new THREE.MeshBasicMaterial({color:DUSTC,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false,y:0.016}); scene.add(m);}
    const mm=(col,o)=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the hush's ring round itself: pale (it is not an attack on the party), its edge drawn at once, its fill reaching out
    ring=new THREE.Group(); fxG.add(ring); ring.visible=false;
    const rb=new THREE.Mesh(new THREE.CircleGeometry(HR,72).rotateX(-Math.PI/2),mm(PALE,0.05)); ring.add(rb); ring.userData.bed=rb;
    ringFill=new THREE.Mesh(new THREE.CircleGeometry(1,72).rotateX(-Math.PI/2).translate(0,0.002,0),mm(PALE,0.1)); ring.add(ringFill);
    ringEdge=new THREE.Mesh(new THREE.RingGeometry(HR-0.05,HR,96).rotateX(-Math.PI/2).translate(0,0.003,0),mm(PALE,0.45)); ring.add(ringEdge);
    // the rap's cone ahead of it: Ember, r 1.6 at a half-angle of 60°
    const A0=1.5*Math.PI-HALF, AL=2*HALF; cone=new THREE.Group(); fxG.add(cone); cone.visible=false;
    const cb=new THREE.Mesh(new THREE.CircleGeometry(CR,48,A0,AL).rotateX(-Math.PI/2),mm(EMBER,0.07)); cone.add(cb); cone.userData.bed=cb;
    coneFill=new THREE.Mesh(new THREE.CircleGeometry(1,48,A0,AL).rotateX(-Math.PI/2).translate(0,0.002,0),mm(EMBER,0.14)); cone.add(coneFill);
    coneEdge=[new THREE.Mesh(new THREE.RingGeometry(CR-0.05,CR,48,1,A0,AL).rotateX(-Math.PI/2).translate(0,0.003,0),mm(EMBER,0.5))];
    for(const s of [-1,1]){ const L=new THREE.Mesh(new THREE.PlaneGeometry(0.05,CR).rotateX(-Math.PI/2).translate(0,0.003,CR/2),mm(EMBER,0.5)); L.rotation.y=s*HALF; coneEdge.push(L); }
    coneEdge.forEach(e=>cone.add(e));
    // two of its kin (stand-ins) inside the ring for the hush: dark grey foes; the veil they wear once hushed
    for(const [x,z] of [[-1.7,0.5],[-0.5,-1.9]]){ const km=new THREE.MeshStandardMaterial({color:0x4a4644,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const k=new THREE.Group(); const b=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,0.6,12),km); b.position.y=0.3; const h=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),km); h.position.y=0.75; k.add(b,h); k.position.set(x,0,z); k.visible=false; scene.add(k);
      const motes=[0,1,2].map(()=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:PALE,transparent:true,depthWrite:false,opacity:0})); s.scale.setScalar(0.12); scene.add(s); return s;});
      const fr=new THREE.Mesh(new THREE.RingGeometry(0.46,0.5,48).rotateX(-Math.PI/2),mm(PALE,0)); fr.position.set(x,0.014,z); scene.add(fr);
      kin.push({k,km,motes,fr}); }
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.26,a:0.2,drag:2.6,floor:true,col:col||DUSTC});} }
  function sparks(pos,n,col,spd,life,g){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.1,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.045,s1:0.015,a:0.55,col,g:g??-3,drag:1.4});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUSTC);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(o.y??0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); ringT=coneT=-1; if(ring){ring.visible=cone.visible=false;} veilT=-1; kin.forEach(o=>{o.k.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const bellPt=()=>pt(bones.handR,[0,-0.1,0.0]);
  function floorMark(g){ g.position.copy(toFloor(new THREE.Vector3(0,0.012,0))); g.rotation.set(0,-floorYaw,0); g.visible=fxOn; }
  function fxStart(name){
    HOME=name==='rap'?NEAR:FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='hush'){ floorMark(ring); ringT=0; kin.forEach(o=>{o.k.visible=showTarget;}); }
    if(name==='rap'){ floorMark(cone); coneT=0; }
    if(name!=='hush'&&veilT>=0){ veilT=5; }
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='hush'){ shimmer=1; veilT=0; hitFeel(0.1,0,0.1); // it rings: the hush falls on its kin
      if(fxOn){ const b=bellPt(); sparks(b,8,PALE,0.5,1.0,0.3); for(let j=0;j<2;j++) ringAt(b,{r0:0.2,r1:HR*(0.7+0.25*j),dur:0.9,a:0.4-0.1*j,col:PALE,delay:j*0.14,y:b.y-0.3-0.4*j});
        for(let j=0;j<3;j++) ringAt(new THREE.Vector3(0,0,0),{r0:0.3,r1:HR*(0.6+0.2*j),dur:0.9+0.15*j,a:0.35-0.08*j,col:PALE,delay:0.1+0.14*j});
        for(let j=0;j<14;j++) puff(new THREE.Vector3((Math.random()-0.5)*HR*1.2,1.8+Math.random()*0.4,(Math.random()-0.5)*HR*1.2),new THREE.Vector3(0,-0.35,0),{life:1.4,s0:0.06,s1:0.03,a:0.5,col:PALE,drag:1.0});
        kin.forEach((o,j)=>{ if(!o.k.visible)return; o.km.emissiveIntensity=0.25; const a=bellPt(), bb=o.k.position.clone().setY(1.0); for(let s=0;s<10;s++) puff(a.clone().lerp(bb,s/9),new THREE.Vector3(0,0,0),{life:0.45+0.03*s,s0:0.07,s1:0.03,a:0.5,col:PALE}); }); } }
    if(name==='rap'){ hitFeel(0.3,0.04,0.35); flash=0.25; // the rap: 7
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.3; u.z+=0.12; u.mat.emissiveIntensity=feel?0.4:0; }
      if(fxOn){ const b=bellPt(); sparks(b,8,BRONZE,1.6,0.25); sparks(b.clone().setY(0.2),4,STONE,1.0,0.45,-4); ringAt(b,{r0:0.15,r1:0.9,dur:0.35,a:0.35,col:BRONZE,bill:true}); dust(b.clone().setY(0),4,0.6,0.25); } }
    if(name==='spawn'){ shimmer=0.5; if(fxOn) ringAt(bellPt().setY(0),{r0:0.2,r1:1.0,dur:0.6,a:0.3,col:PALE}); }
    if(name==='death'){ hitFeel(0.2,0.03,0.2); if(fxOn){ const p=pt(bones.chest,[0,0,0]).setY(0); dust(p,10,1.0,0.3,STONE); sparks(pt(bones.chest,[0,0,0]),8,STONE,1.4,0.5,-4); ringAt(p,{r0:0.2,r1:1.6,dur:0.6,a:0.35,col:BRONZE}); ringAt(p,{r0:0.4,r1:2.6,dur:0.9,a:0.25,col:PALE,delay:0.1}); } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time; prevT=t;
    if(n==='hush'&&t<HT){ shimmer=Math.max(shimmer,0.35*c01(t/HT)); if(fxOn&&Math.random()<d*6) puff(bellPt(),new THREE.Vector3((Math.random()-0.5)*0.2,0.4,(Math.random()-0.5)*0.2),{life:0.9,s0:0.05,s1:0.02,a:0.5,col:PALE,drag:1.2}); }
    if(n==='death'){ if(t>1.2)cv.style.filter='saturate(0.5)'; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=FAR; }
    shimmer=Math.max(0,shimmer-d*1.2); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?0.5*shimmer:0,0,feel?flash:0,0);
    if(ringT>=0){ ringT+=d; const f=c01(ringT/HT), go=ringT>=HT, fade=go?1-c01((ringT-HT)/0.3):1; ringFill.scale.setScalar(Math.max(0.001,HR*easeOut(f)));
      ring.userData.bed.material.opacity=0.05*fade; ringFill.material.opacity=(go?0.14:0.1)*fade; ringEdge.material.opacity=(go?0.55:0.45)*fade;
      if(fade<=0||!fxOn||!busy||shot.name!=='hush'){ringT=-1;ring.visible=false;} }
    if(coneT>=0){ coneT+=d; const f=c01(coneT/RT), go=coneT>=RT, fade=go?1-c01((coneT-RT-0.08)/0.15):1; coneFill.scale.setScalar(Math.max(0.001,CR*easeOut(f)));
      cone.userData.bed.material.opacity=0.07*fade; coneFill.material.opacity=(go?0.22:0.14)*fade; coneEdge.forEach(e=>e.material.opacity=(go?0.6:0.5)*fade);
      if(fade<=0||!fxOn||!busy||shot.name!=='rap'){coneT=-1;cone.visible=false;} }
    // the veil on the hushed: three pale motes hanging round each, a thin ring at its feet, for 5 s
    if(veilT>=0){ veilT+=d; const a=c01(veilT/0.3)*(1-c01((veilT-VEIL+0.5)/0.5));
      kin.forEach((o,j)=>{ o.km.emissiveIntensity=Math.max(0,o.km.emissiveIntensity-d*0.6); o.motes.forEach((m,i)=>{ const ang=clockT*0.8+i*2.09+j; m.position.set(o.k.position.x+0.4*Math.cos(ang),0.7+0.25*Math.sin(clockT*1.3+i),o.k.position.z+0.4*Math.sin(ang)); m.material.opacity=fxOn&&o.k.visible?0.55*a:0; }); o.fr.material.opacity=fxOn&&o.k.visible?0.35*a:0; });
      if(veilT>VEIL){ veilT=-1; kin.forEach(o=>{o.k.visible=false; o.motes.forEach(m=>m.material.opacity=0); o.fr.material.opacity=0;}); } }
    else if(!(busy&&shot.name==='hush')) kin.forEach(o=>{o.k.visible=false;});
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.6*u.tip;
      if(!busy||shot.name!=='rap'||coneT>=0&&coneT<RT){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
