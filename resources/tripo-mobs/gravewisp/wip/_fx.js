  // ---- effects (stand-ins, dim on purpose: the lantern's indigo glow as the game drives its core, its halo and floor
  // light, and the ward as the game's own effects draw it: the take flares at the wisp and runs a streak to the ward, a
  // ward ring closes on the ward's floor, motes run down the thread while it holds and the ward shimmers; the snap
  // flashes and scatters the thread)
  const FXP=[], RINGS=[]; let dotTex=null, halo=null, pool=null, beam=null, shell=null, ward=null;
  let coreK=0, eyes=1, eyesTo=1, mode='drift', held=0, beamK=0, takeT=9, moteT=0;
  const LAMP=[0,-0.17,0], WARDZ=1.6, WARDY=0.55; // the lantern's middle on its bone; the ward stands 1.6 u in front
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,64),new THREE.MeshBasicMaterial({color:INDIGO,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the lantern's light: a soft indigo halo and a pool on the floor under it
    halo=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:GLOW,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); scene.add(halo);
    pool=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({map:dotTex,color:GLOW,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); pool.rotation.x=-Math.PI/2; pool.position.y=0.008; scene.add(pool);
    // the tether: a thin indigo thread from the lantern to the ward
    beam=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,8,1,true),new THREE.MeshBasicMaterial({color:INDIGO,transparent:true,opacity:0,depthWrite:false})); beam.visible=false; scene.add(beam);
    // the ward: a stand-in foe it protects (any foe but a boss, a broodling or another wisp), and its shimmer
    ward=new THREE.Group(); const wm=new THREE.MeshStandardMaterial({color:0x4d4a55,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const wb=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.3,0.7,12),wm); wb.position.y=0.35; const wh=new THREE.Mesh(new THREE.SphereGeometry(0.2,14,10),wm); wh.position.set(0,0.78,0.04); ward.add(wb,wh); ward.userData={mat:wm,kick:0}; ward.position.set(0,0,WARDZ); ward.rotation.y=Math.PI; scene.add(ward);
    shell=new THREE.Mesh(new THREE.SphereGeometry(0.55,24,16),new THREE.MeshBasicMaterial({color:INDIGO,transparent:true,opacity:0,depthWrite:false})); shell.position.set(0,0.48,WARDZ); shell.scale.set(1,1.05,1); shell.visible=false; scene.add(shell);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0,side:0,tip:0,dm}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.05,s1:0.18,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-1.0,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.flat=!!o.flat; r.delay=o.delay||0; r.m.material.color.setHex(o.col||INDIGO); scene.add(r.m); r.m.position.copy(pos); r.m.rotation.set(o.flat?-Math.PI/2:0,0,0); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(beam)beam.visible=false; if(shell)shell.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const lampPt=()=>pt(bones.lamp,LAMP), wardPt=()=>new THREE.Vector3(ward.position.x,WARDY,ward.position.z);
  // the game's core field through the ward (its key poses: gather 0.5, cast 1.3, ward 1.0, snap 0)
  const eo=(k)=>1-(1-k)*(1-k);
  function coreOf(t){ const GA=1/30, CA=2.5/30, HOLD=4, SN=3/30, REC=0.25;
    if(t<GA)return 0.5*(t/GA)*(t/GA); if(t<GA+CA)return 0.5+0.8*eo((t-GA)/CA); if(t<HOLD)return 1.3-0.3*eo(Math.min(1,(t-GA-CA)/0.8*3));
    if(t<HOLD+SN)return 1-eo((t-HOLD)/SN); return 0; }
  function fxStart(name){
    if(name==='ward'){ held=0; beamK=0; }
    if(name==='spawn'){ eyes=0; coreK=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='ward'&&i===0){ held=1; takeT=0; beamK=1; hitFeel(0.08,0,0.15);
      if(fxOn){ const l=lampPt(), w=wardPt(); ringAt(l,{r0:0.05,r1:0.45,dur:0.24,a:0.35,bill:true,col:GLOW}); ringAt(new THREE.Vector3(w.x,0.06,w.z),{r0:1.4,r1:0.5,dur:0.4,a:0.35,flat:true}); sparks(l,5,GLOW,0.7,0.25); } }
    if(name==='ward'&&i===1){ held=0; hitFeel(0.06,0,0.12);
      if(fxOn){ const m=lampPt().lerp(wardPt(),0.5); ringAt(m,{r0:0.05,r1:0.45,dur:0.16,a:0.35,bill:true,col:GLOW}); sparks(m,8,GLOW,1.0,0.45); } }
    if(name==='death'){ hitFeel(0.1,0,0.15); if(fxOn)dust(pt(bones.sq,[0,0,0]).setY(0),6,0.45,0.2); }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='ward'){ mode=t<4?'ward':'drift'; coreK=coreOf(t); }
    if(n==='death'){ mode='dead'; held=0; eyesTo=Math.max(0,1-t/0.6); if(t>1.2)cv.style.filter='saturate(0.6)'; }
    if(n==='spawn'){ mode='drift'; eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done;
    if(!busy||shot.name==='hurt'){ mode=sel.dead?'dead':'drift'; held=0; coreK=0; eyesTo=sel.dead?0:1; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2); takeT+=d;
    const lit=mode==='dead'?0:1, flick=0.1*Math.sin(clockT*5);
    // the game's glow: opacity 0.3 + 0.35 core (more past 1), the core swelling 1 + 0.6 core; here at about half
    const core=Math.max(0,coreK+flick)*lit;
    glowU.value.set((fxOn?1:0)*lit*(0.2+0.3*core),(fxOn?1:0)*0.2*eyes,feel?flash:0,0.3);
    if(halo){ const l=lampPt(); halo.position.copy(l); halo.visible=fxOn&&lit>0; halo.material.opacity=0.5*(0.3+0.35*Math.min(1,core)+0.1*Math.max(0,core-1)); halo.scale.setScalar(0.45*(1+0.4*core));
      pool.position.x=l.x; pool.position.z=l.z; pool.visible=fxOn&&lit>0; pool.material.opacity=0.3*(0.25+0.3*Math.min(1,core)); pool.scale.setScalar(0.5*(1+0.3*core)); }
    // the thread: bright on the take (the game's streak fades over 0.45 s), a steady dim line while it holds
    beamK+=((held?0.35:0)-beamK)*(1-Math.exp(-(held?2.2:14)*d));
    const bk=fxOn&&showTarget?beamK+(takeT<0.45?0.5*(1-takeT/0.45):0)*held:0;
    if(beam){ beam.visible=bk>0.01; if(beam.visible){ const a=lampPt(), b=wardPt(), m=a.clone().lerp(b,0.5), dir=b.clone().sub(a), L=dir.length(); beam.position.copy(m); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()); beam.scale.set(0.012+0.02*Math.min(1,bk),L,0.012+0.02*Math.min(1,bk)); beam.material.opacity=Math.min(0.8,bk);
      // motes run down the thread to the ward while it holds
      moteT+=d; if(held&&moteT>0.18){ moteT=0; const v=dir.clone().multiplyScalar(L/0.5); puff(a,v,{life:0.5,s0:0.05,s1:0.03,a:0.45,col:GLOW,g:0,drag:0}); } } }
    if(shell){ shell.visible=fxOn&&showTarget&&held>0; shell.material.opacity=0.08+0.03*Math.sin(clockT*6); }
    if(ward){ ward.visible=showTarget; }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
