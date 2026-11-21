  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember lane 0.9 u wide from it through the hero,
  // filling along its length over the 48-tick aim and gone on the release; each dart a pale gust flash at the beak, the
  // dart itself (a pale streak with two thin wind streaks beside it) down the locked line at 6.2 u/s out to 8.5 u, and a
  // puff of gust; the hero hit as each dart passes; the eyes swelling through the aim and the volley)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null; const DARTS=[];
  let eyeG=0.3, laneT=-1;
  const GUST=0xDCE6EE, PARCH=0xe8e2d4, BRASS=0xb08a3e, SPARK=0xe9dcc0;
  const TEL=48/60, EVERY=9/60, DART_V=6.2, RANGE=8.5, LANE_W=0.9, HERO_D=5.5, LANE_L=Math.min(8,Math.max(HERO_D+1.5,4)), BEAK=0.45;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48),new THREE.MeshBasicMaterial({color:GUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const em=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the lane: its outline (two long edges and the far end) and a fill growing out along it
    lane=new THREE.Group(); const w=LANE_W/2, e=0.03;
    for(const sx of [-1,1]){ const m=new THREE.Mesh(new THREE.PlaneGeometry(e,LANE_L).rotateX(-Math.PI/2).translate(sx*(w-e/2),0,LANE_L/2),em(0.5)); lane.add(m); }
    const endM=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,e).rotateX(-Math.PI/2).translate(0,0,LANE_L-e/2),em(0.5)); lane.add(endM);
    lane.position.y=0.012; lane.visible=false; fxG.add(lane);
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).rotateX(-Math.PI/2).translate(0,0,0.5),em(0.12)); laneFill.position.y=0.011; laneFill.visible=false; fxG.add(laneFill);
    // the darts: a pale core streak with a soft glow, and two thin wind streaks beside it
    for(let i=0;i<3;i++){ const d=new THREE.Group();
      const core=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.006,0.5,6).rotateX(Math.PI/2).translate(0,0,-0.15),new THREE.MeshBasicMaterial({color:PARCH,transparent:true,opacity:0.85,depthWrite:false}));
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:GUST,transparent:true,opacity:0.5,depthWrite:false})); glow.scale.set(0.3,0.3,1);
      d.add(core,glow);
      for(const sx of [-1,1]){ const m=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.002,0.45,4).rotateX(Math.PI/2).translate(sx*0.18,-0.05,-0.35),new THREE.MeshBasicMaterial({color:GUST,transparent:true,opacity:0.5,depthWrite:false})); d.add(m); }
      d.visible=false; scene.add(d); DARTS.push({d,t:-1,from:null,hit:false}); }
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.06,s1:0.2,a:0.18,drag:2.6,floor:true,col:col||DUST});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||GUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); DARTS.forEach(o=>{o.t=-1;o.d.visible=false;}); laneT=-1; if(lane){lane.visible=laneFill.visible=false;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const beakPt=()=>pt(bones.head,[0,0.02,0.16]);
  // the lane runs from the bird's spot along its facing (the page's +z, toward the hero), in the floor's frame
  function laneStart(){ const o=toFloor(new THREE.Vector3(0,0,0)), f=toFloor(new THREE.Vector3(0,0,1)); const yaw=Math.atan2(f.x-o.x,f.z-o.z);
    lane.position.set(o.x,0.012,o.z); lane.rotation.y=yaw; laneFill.position.set(o.x,0.011,o.z); laneFill.rotation.y=yaw; laneT=0; lane.visible=laneFill.visible=fxOn; }
  function fxStart(name){
    HOME=FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='volley')laneStart();
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function hitHero(n){ if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.2; u.mat.emissiveIntensity=feel?0.4:0; if(fxOn)sparks(targetW().setY(0.55),n,SPARK,1.3,0.22); } }
  function fireDart(){
    const o=DARTS.find(o=>o.t<0); if(!o)return; o.t=0; o.hit=false;
    const b=beakPt(); const f=toFloor(new THREE.Vector3(0,0,1)).sub(toFloor(new THREE.Vector3(0,0,0))).setY(0).normalize();
    o.from=b.clone(); o.dir=f; o.d.position.copy(b); o.d.lookAt(b.clone().add(f)); o.d.visible=fxOn;
    if(fxOn){ puff(b,new THREE.Vector3(),{life:0.12,s0:0.3,s1:0.5,a:0.45,col:GUST}); puff(b,f.clone().multiplyScalar(0.7),{life:0.45,s0:0.18,s1:0.35,a:0.2,col:GUST,drag:2.4}); sparks(b,3,BRASS,0.8,0.15); }
  }
  function fxContact(name,i){
    if(name==='volley'){ hitFeel(0.1,0.02,0.15); fireDart(); }
    if(name==='spawn'){ if(fxOn)sparks(pt(bones.chest,[0,0,0]),5,BRASS,0.8,0.25); }
    if(name==='death'&&i===0){ hitFeel(0.15,0.02,0.2); if(fxOn)sparks(pt(bones.chest,[0,0.05,0]),6,BRASS,1.2,0.25); }
    if(name==='death'&&i===1){ hitFeel(0.25,0.03,0.3); if(fxOn){ dust(pt(bones.chest,[0,0,0]).setY(0),10,1.1,0.35); sparks(pt(bones.chest,[0,0,0]).setY(0.1),6,BRASS,1.0,0.25); ringAt(pt(bones.chest,[0,0,0]),{r0:0.2,r1:0.8,dur:0.35,a:0.25,col:DUST}); } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time; prevT=t;
    if(n==='volley'){ const a=c01(t/0.12)*(1-sm((t-TEL-2*EVERY-0.15)/0.45)); eyeG=0.3+0.5*a+0.3*(t>TEL&&t<TEL+3*EVERY+0.3?1:0); }
    if(n==='death'){ eyeG=Math.max(0,0.3-t*0.4); if(t>1.3)cv.style.filter='saturate(0.55)'; }
    if(n==='spawn'){ eyeG=0.3*c01((t-0.3)/0.4); }
  }
  function updateFx(d){
    const busy=shot&&!shot.done, n=busy?shot.name:'';
    if(!busy||(n!=='volley'&&n!=='death'&&n!=='spawn')) eyeG+=((sel.dead?0:0.3)-eyeG)*Math.min(1,d*4);
    flash=Math.max(0,flash-d*3.2); glowU.value.set(fxOn?eyeG:0,0,feel?flash:0,0);
    if(laneT>=0){ laneT+=d; const f=c01(laneT/TEL); laneFill.scale.set(1,1,Math.max(0.001,LANE_L*f)); lane.children.forEach(m=>m.material.opacity=0.5); laneFill.material.opacity=0.12;
      if(laneT>=TEL||!fxOn||(busy&&n!=='volley')){ laneT=-1; lane.visible=laneFill.visible=false; } }
    DARTS.forEach(o=>{ if(o.t<0)return; o.t+=d; const s=DART_V*o.t; if(s>RANGE||!fxOn){o.t=-1;o.d.visible=false;return;}
      const p=o.from.clone().addScaledVector(o.dir,s); p.y=o.from.y+(0.6-o.from.y)*c01(s/0.6); o.d.position.copy(p); o.d.visible=true;
      const fade=s>RANGE-1?(RANGE-s):1; o.d.children.forEach(m=>{ if(m.material)m.material.opacity=(m.isSprite?0.5:0.8)*fade; });
      if(!o.hit&&s>=HERO_D-BEAK){ o.hit=true; hitHero(4); hitFeel(0.12,0.02,0.15); } });
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip; u.z+=(HOME-u.z)*Math.min(1,d*2); dummy.position.z=u.z; dummy.position.x=0; }
  }
