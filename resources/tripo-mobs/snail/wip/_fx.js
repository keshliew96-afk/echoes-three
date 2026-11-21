  // ---- effects (stand-ins, dim on purpose, after the game's own: no Ember telegraph, as the mend is not an attack;
  // through the 30-tick swell the lantern's light swells; on the mend an indigo flash at the lantern, an indigo ring
  // sweeping out to the mend's reach 3.2 u with a faint sigil on the floor, and to every foe it mends an indigo streak
  // and motes rising off it; dying, the lantern goes out)
  const FXP=[], RINGS=[]; let dotTex=null, sigil=null, kin=[], streaks=[];
  let lamp=0.35, eyeG=0.5, sigT=-1;
  const IND=0x4f6de2, INDG=0x1d46ed, INK=0x2a2a34;
  const TEL=30/60, ONE=TEL+3/30+3/30+9/30+0.4, COIL=TEL-2.5/30, REACH=3.2;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  // the lantern through one mend: swelling through the coil, flaring on the cast, dying back over the settle
  const lampAt=(k)=>k<COIL?0.35+0.45*sm(k/COIL):k<TEL+6/30?1.0:Math.max(0.35,1.0-1.6*(k-TEL-6/30));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.95,1,96),new THREE.MeshBasicMaterial({color:IND,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const lm=(o,col)=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    sigil=new THREE.Group(); fxG.add(sigil); sigil.visible=false;
    sigil.add(new THREE.Mesh(new THREE.RingGeometry(REACH*0.86,REACH*0.9,96).rotateX(-Math.PI/2),lm(0.5,IND)));
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const l=new THREE.Mesh(new THREE.PlaneGeometry(0.04,REACH*0.5).rotateX(-Math.PI/2).translate(0,0,REACH*0.55),lm(0.5,IND)); l.rotation.y=a; sigil.add(l); }
    // two of its kin (stand-ins) inside the mend's reach, worn down so the mend shows on them
    for(const [x,z] of [[-1.6,0.6],[1.3,-1.4]]){ const km=new THREE.MeshStandardMaterial({color:0x4a4644,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const k=new THREE.Group(); const b=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,0.6,12),km); b.position.y=0.3; const h=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),km); h.position.y=0.75; k.add(b,h); k.position.set(x,0,z); k.visible=false; scene.add(k); kin.push({k,km}); }
    for(let i=0;i<2;i++){ const m=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1,6,1,true).translate(0,0.5,0).rotateX(Math.PI/2),lm(0,IND)); m.visible=false; scene.add(m); streaks.push({m,t:-1}); }
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.24,a:0.18,drag:2.6,floor:true,col:col||DUST});} }
  function motes(pos,n){ for(let i=0;i<n;i++) puff(pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.4,Math.random()*0.3,(Math.random()-0.5)*0.4)),new THREE.Vector3((Math.random()-0.5)*0.2,0.8+Math.random()*0.6,(Math.random()-0.5)*0.2),{life:0.6+Math.random()*0.3,s0:0.08,s1:0.04,a:0.7,col:IND,g:0.3,drag:1.6}); }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||IND);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(o.y??0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(sigil)sigil.visible=false; sigT=-1; kin.forEach(o=>o.k.visible=false); streaks.forEach(s=>{s.t=-1;s.m.visible=false;}); }
  const lampPt=()=>pt(bones.lantern,[0,0.15,0]);
  function aim(m,a,b){ const d=b.clone().sub(a); m.position.copy(a); m.scale.set(1,1,Math.max(0.01,d.length())); m.lookAt(b); }
  function fxStart(name){
    HOME=FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    kin.forEach(o=>o.k.visible=name==='mend'&&showTarget);
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='mend'){ // the mend: 12 to every other foe within 3.2 u
      hitFeel(0.12,0.02,0.2);
      if(fxOn){ const L=lampPt(); puff(L,new THREE.Vector3(),{life:0.35,s0:0.5,s1:0.9,a:0.45,col:INDG}); puff(L,new THREE.Vector3(),{life:0.14,s0:0.25,s1:0.45,a:0.5,col:IND});
        ringAt(new THREE.Vector3(0,0,0),{r0:0.3,r1:REACH,dur:0.7,a:0.5,col:IND});
        sigil.position.copy(toFloor(new THREE.Vector3(0,0.008,0))); sigil.position.y=0.008; sigT=0;
        kin.forEach((o,j)=>{ if(!o.k.visible)return; const s=streaks[j]; s.t=0; o.km.emissiveIntensity=feel?0.35:0; motes(o.k.position.clone().setY(0.3),4); }); } }
    if(name==='spawn'){ if(fxOn){ const L=lampPt(); puff(L,new THREE.Vector3(),{life:0.3,s0:0.3,s1:0.5,a:0.3,col:0xffe08a}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.15,0.02,0.2); }
      else { hitFeel(0.25,0.03,0.2); if(fxOn){ const L=lampPt(); dust(L.clone().setY(0.05),5,0.6,0.25); puff(L,new THREE.Vector3(0,0.3,0),{life:0.6,s0:0.15,s1:0.4,a:0.2,col:0x9a948a,drag:1.5}); } } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time; prevT=t;
    if(n==='mend'){ const k=t-Math.min(2,Math.floor(t/ONE))*ONE; lamp=lampAt(k); eyeG=0.5+0.3*(lamp-0.35); }
    if(n==='death'){ lamp=t<1.2?0.35*(1-0.3*c01(t/1.2)):Math.max(-0.5,0.25-2.5*(t-1.2)); eyeG=Math.max(0,0.5-t*3); if(t>1.6)cv.style.filter='saturate(0.55)'; }
    if(n==='spawn'){ lamp=t<0.85?-0.5+0.3*c01(t/0.8):0.35+0.4*Math.max(0,1-(t-0.85)/0.3); eyeG=c01((t-0.5)/0.4)*0.5; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done, n=busy?shot.name:'';
    if(!busy||(n!=='mend'&&n!=='death'&&n!=='spawn')){ lamp+=((sel.dead?-0.5:0.35+0.04*Math.sin(clockT*5.3)+0.03*Math.sin(clockT*8.1))-lamp)*Math.min(1,d*4); eyeG+=((sel.dead?0:0.5)-eyeG)*Math.min(1,d*4); }
    flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?lamp:0,fxOn?eyeG:0,feel?flash:0,0);
    if(sigT>=0){ sigT+=d; const k=sigT/1.5; if(k>=1||!fxOn){sigT=-1;sigil.visible=false;} else { sigil.visible=true; const a=0.1*(k<0.1?k*10:1-sm((k-0.3)/0.7)); sigil.children.forEach(m=>m.material.opacity=a*2); } }
    streaks.forEach((s,j)=>{ if(s.t<0)return; s.t+=d; const u=s.t/0.4; if(u>=1||!fxOn){s.t=-1;s.m.visible=false;return;} const a=lampPt(), b=kin[j].k.position.clone().setY(0.5); aim(s.m,a,a.clone().lerp(b,Math.min(1,u*3))); s.m.visible=true; s.m.material.opacity=0.7*(1-u); });
    kin.forEach(o=>{ o.km.emissiveIntensity=Math.max(0,o.km.emissiveIntensity-d*1.5); if(o.k.visible)o.km.emissive.setHex(IND); });
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.z+=(HOME-u.z)*Math.min(1,d*2); dummy.position.z=u.z; dummy.position.x=0; }
  }
