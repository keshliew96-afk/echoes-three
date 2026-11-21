  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember lane 0.8 u by 5.5 u through the hero,
  // filling over the 45-tick telegraph; the indigo eyespots on its wings, its tell, brightening through it; the dive's
  // gust raising dust off the floor under it and pale scales shed off the wings; the hit on the hero as it crosses (9);
  // the eyes a dim warm glow)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null, laneEdges=[];
  let tell=0.3, eyes=1, eyesTo=1, laneT=-1;
  const SCALE=0xb9a9b8, DUSTC=0x8d8478, SPARK=0xe9dcc0;
  const TEL=45/60, DIVE=5.5/8, LANE=5.5, LANE_W=0.8, CYC=TEL+DIVE+4/30+9/30+1.1, DIRS=[1,-1,1];
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<180;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUSTC,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the lane, on the floor: the game's 0.8 u by 5.5 u from under it through the hero, filling over the telegraph
    lane=new THREE.Group(); fxG.add(lane); lane.visible=false;
    const lm=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    const hw=LANE_W/2, bed=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,LANE).rotateX(-Math.PI/2).translate(0,0,LANE/2),lm(0.08)); lane.add(bed); lane.userData.bed=bed;
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).rotateX(-Math.PI/2).translate(0,0.002,0.5),lm(0.16)); lane.add(laneFill);
    for(const x of [-hw,hw]){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.05,LANE).rotateX(-Math.PI/2).translate(x,0.003,LANE/2),lm(0.45)); lane.add(e); laneEdges.push(e);}
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.05).rotateX(-Math.PI/2).translate(0,0.003,LANE),lm(0.45)); lane.add(cap); laneEdges.push(cap);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.3,a:0.18,drag:2.6,floor:true,col:col||DUSTC});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUSTC);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); laneT=-1; if(lane)lane.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  function laneAt(dir){ const o=toFloor(new THREE.Vector3(0,0.012,0)); lane.position.copy(o); lane.rotation.set(0,-floorYaw+(dir<0?Math.PI:0),0); lane.visible=fxOn; laneT=0; }
  function fxStart(name){
    HOME=name==='swoops'?NEAR:FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='swoops')laneAt(1);
    if(name==='spawn'){ eyes=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='swoops'){ hitFeel(i===2?0.5:0.35,0.04,i===2?0.5:0.4); // crossing the hero: 9
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.3; u.z+=0.12*DIRS[i]; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn){ sparks(targetW().setY(0.55),7,SPARK,1.6,0.25); for(let j=0;j<6;j++)puff(targetW().setY(0.5),new THREE.Vector3((Math.random()-0.5)*1.2,Math.random()*0.8,DIRS[i]*(1+Math.random())),{life:0.6,s0:0.04,s1:0.02,a:0.5,col:SCALE,g:-1,drag:1.2}); } } }
    if(name==='death'&&i===0){ hitFeel(0.12,0,0.15); if(fxOn){ const b=pt(bones.sq,[0,0,0]).setY(0); dust(b,7,0.8,0.25); ringAt(b,{r0:0.2,r1:0.8,dur:0.4,a:0.3}); } }
  }
  let prevT=0, acc=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    const cross=(c)=>pv<c&&t>=c;
    if(n==='swoops'){
      const k=Math.min(2,Math.floor(t/CYC)), tt=t-k*CYC;
      if(k>0&&cross(k*CYC))laneAt(DIRS[k]);
      // the tell: the eyespots brighten through the telegraph and hold through the dive
      tell=0.3+0.6*(tt<TEL?sm(tt/0.4):1-sm((tt-TEL-DIVE)/0.3));
      // the dive: the gust raises dust off the floor under it, and pale scales shed off the wings
      if(fxOn&&tt>=TEL&&tt<TEL+DIVE){ acc+=d*40; while(acc>1){ acc-=1; const b=pt(bones.sq,[0,0,0]);
        puff(b.clone().setY(0.05),new THREE.Vector3((Math.random()-0.5)*1.6,0.3+Math.random()*0.4,(Math.random()-0.5)*0.6),{life:0.7,s0:0.1,s1:0.35,a:0.14,drag:2.2,floor:true,col:DUSTC});
        if(Math.random()<0.4)puff(pt(bones[Math.random()<0.5?'wL':'wR'],[(Math.random()-0.5)*0.4,0,-0.1]),new THREE.Vector3((Math.random()-0.5)*0.4,-0.2,0),{life:0.8,s0:0.035,s1:0.02,a:0.45,col:SCALE,g:-0.6,drag:1.5}); } }
    }
    if(n==='death'){ eyesTo=Math.max(0,1-t/0.6); tell=0.3*Math.max(0,1-t/0.6); if(t>1.2)cv.style.filter='saturate(0.5)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; tell+=((sel.dead?0:0.3)-tell)*Math.min(1,d*4); HOME=FAR; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?tell:0,0.35*eyes,feel?flash:0,0);
    if(laneT>=0){ laneT+=d; const f=c01(laneT/TEL), go=laneT>=TEL, fade=go?1-c01((laneT-TEL-DIVE)/0.3):1; laneFill.scale.z=Math.max(0.001,LANE*f);
      lane.userData.bed.material.opacity=0.08*fade*(go?1.5:1); laneFill.material.opacity=(go?0.2:0.16)*fade; laneEdges.forEach(e=>e.material.opacity=(go?0.6:0.45)*fade);
      if(fade<=0||!fxOn||(busy&&shot.name!=='swoops')){laneT=-1;lane.visible=false;} }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip;
      if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*1.5); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
