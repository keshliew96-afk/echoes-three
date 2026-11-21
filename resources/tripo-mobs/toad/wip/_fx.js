  // ---- effects (stand-ins, dim on purpose, after the game's own: on each throw a spatter of mire off the mouth and the
  // glob (a murky pale bulb with a sheen) lobbed 60 ticks onto where the hero stood, the Ember ring r 0.9 marking where
  // it lands and filling as it falls; on landing an Ember ring flash, a spray of mire and the slick it leaves, r 0.9 for
  // 180 ticks; the hero hit)
  const FXP=[], RINGS=[]; let dotTex=null, glob=null, landRing=null, landFill=null, slick=null;
  const GL=[]; // the globs in the air: {g, from, to, t, ring, fill}
  const SLK=[]; // the slicks on the floor: {m, t}
  const MIRE=0x5d6b47, GLOBC=0x47524a, SHEEN=0xe8e2d4, SPARK=0xe9dcc0;
  const TEL=30/60+2.5/30, ONE=TEL+3/30+3/30+9/30+0.3, FLIGHT=1.0, R_BLAST=0.9, R_SLICK=0.9, SLICK_T=3.0;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<180;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.88,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const em=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // three globs can be in the air at once in the page's string, each with its own landing ring
    for(let i=0;i<3;i++){
      const gg=new THREE.Group(); const core=new THREE.Mesh(new THREE.IcosahedronGeometry(0.16,1),new THREE.MeshStandardMaterial({color:GLOBC,roughness:0.6})); const sh=new THREE.Mesh(new THREE.IcosahedronGeometry(0.06,0),new THREE.MeshBasicMaterial({color:SHEEN,transparent:true,opacity:0.7})); sh.position.set(-0.05,0.07,0.05); gg.add(core,sh); gg.visible=false; scene.add(gg);
      const ring=new THREE.Mesh(new THREE.RingGeometry(R_BLAST-0.04,R_BLAST,72).rotateX(-Math.PI/2),em(0.5)); ring.position.y=0.012; ring.visible=false; fxG.add(ring);
      const fill=new THREE.Mesh(new THREE.CircleGeometry(1,72).rotateX(-Math.PI/2),em(0.12)); fill.position.y=0.011; fill.visible=false; fxG.add(fill);
      GL.push({g:gg,from:null,to:null,t:-1,ring,fill});
      const m=new THREE.Mesh(new THREE.CircleGeometry(R_SLICK,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:MIRE,transparent:true,opacity:0,depthWrite:false})); m.position.y=0.008+0.001*i; m.visible=false; fxG.add(m); SLK.push({m,t:-1});
    }
    glob=GL[0].g; landRing=GL[0].ring; slick=SLK[0].m;
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.26,a:0.18,drag:2.6,floor:true,col:col||DUST});} }
  function drops(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(pos,new THREE.Vector3(Math.cos(a)*spd*(0.3+Math.random()),up*(0.6+Math.random()*0.6),Math.sin(a)*spd*(0.3+Math.random())),{life:0.5+Math.random()*0.3,s0:0.06,s1:0.03,a:0.6,col:col||MIRE,g:-6,drag:0.5});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); GL.forEach(o=>{o.t=-1;o.g.visible=o.ring.visible=o.fill.visible=false;}); SLK.forEach(o=>{o.t=-1;o.m.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const mouthPt=()=>pt(bones.jaw,[0,0.05,0.34]);
  function fxStart(name){
    HOME=FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function hitHero(n){ if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.25; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),n,SPARK,1.4,0.25); } }
  function throwGlob(){
    const o=GL.find(o=>o.t<0); if(!o)return; o.from=mouthPt(); o.to=targetW().setY(0.12); o.t=0; o.g.visible=fxOn; o.g.position.copy(o.from);
    const f=toFloor(o.to); o.ring.position.set(f.x,0.012,f.z); o.fill.position.set(f.x,0.011,f.z); o.ring.visible=o.fill.visible=fxOn;
    if(fxOn)drops(o.from,3,0.7,1.6);
  }
  function land(o){
    o.g.visible=false; o.ring.visible=o.fill.visible=false; o.t=-1; hitFeel(0.2,0.03,0.25); hitHero(6);
    if(fxOn){ const f=toFloor(o.to); ringAt(o.to,{r0:0.2,r1:R_BLAST*1.1,dur:0.4,a:0.5,col:EMBER}); puff(o.to.clone().setY(0.3),new THREE.Vector3(),{life:0.2,s0:0.3,s1:0.6,a:0.35,col:EMBER});
      drops(o.to.clone().setY(0.25),8,1.6,2.0); dust(o.to,4,0.6,0.3,MIRE);
      const s=SLK.find(s=>s.t<0)||SLK[0]; s.m.position.set(f.x,s.m.position.y,f.z); s.t=0; s.m.visible=true; }
  }
  function fxContact(name,i){
    // the lob's contacts in time order: throw 1, throw 2, land 1, throw 3, land 2, land 3
    if(name==='lob'){ const kind=['t','t','l','t','l','l'][i]; if(kind==='t'){ hitFeel(0.12,0.02,0.15); throwGlob(); } }
    if(name==='spawn'){ if(fxOn)drops(mouthPt(),3,0.5,1.0); }
    if(name==='death'&&i===0){ hitFeel(0.15,0.02,0.2); if(fxOn)drops(mouthPt(),6,1.0,1.5); }
    if(name==='death'&&i===1){ hitFeel(0.25,0.03,0.3); if(fxOn){ dust(pt(bones.chest,[0,0,0]).setY(0),10,1.1,0.35); drops(pt(bones.chest,[0,0.05,0]),6,1.0,1.2); } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time; prevT=t;
    if(n==='death'){ if(t>1.3)cv.style.filter='saturate(0.55)'; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done;
    flash=Math.max(0,flash-d*3.2); glowU.value.set(0,0,feel?flash:0,0);
    GL.forEach(o=>{ if(o.t<0)return; o.t+=d; const u=o.t/FLIGHT;
      if(u>=1){ land(o); return; }
      const p=o.from.clone().lerp(o.to,u); p.y+=Math.sin(Math.PI*u)*1.6; o.g.position.copy(p); o.g.rotation.x+=d*4; o.g.visible=fxOn;
      const sq=1+0.12*Math.sin(o.t*18); o.g.scale.set(sq,1/sq,sq);
      o.fill.scale.setScalar(Math.max(0.001,R_BLAST*u)); o.ring.material.opacity=0.5; o.fill.material.opacity=0.12; o.ring.visible=o.fill.visible=fxOn; });
    SLK.forEach(s=>{ if(s.t<0)return; s.t+=d; const u=s.t/SLICK_T; if(u>=1||!fxOn){s.t=-1;s.m.visible=false;return;} s.m.material.opacity=0.38*(u<0.03?u/0.03:1-u*u*u); });
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip; u.z+=(HOME-u.z)*Math.min(1,d*2); dummy.position.z=u.z; dummy.position.x=0; }
  }
