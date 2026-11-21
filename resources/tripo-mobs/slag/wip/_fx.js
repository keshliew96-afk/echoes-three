  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember ring r 1.4 centred 1 u in front, filling
  // over its 56 ticks; the slam: two gold streaks as the fists come down, an Ember flare and shock at the ring's edge, a
  // gold splash of molten slag raining back, dark slag chunks and smoke, a crater, and the slag pool r 1.3 glowing gold
  // and cooling dark over its 4 s; the crust cracked: the core's light bursting out of the chest, gold sparks, its
  // seams white-gold for 2 s; the knit: a ring of heat drawn in, pale steam, the last sparks falling dark; heavy dust at
  // each step; dying, the seams flare and go dark, and dust and chunks where it lands)
  const FXP=[], RINGS=[]; let dotTex=null, tele=null, teleFill=null, teleEdge=null, pool=null, crater=null, slowR=null;
  let heat=0.12, core=0, teleT=-1, poolT=-1, slowT=-1;
  const GOLD=0xffc24a, HEAT=0xffe6a8, COAL=0x7a1e2a, SLAGC=0x3a3532, SPARK=0xffd27a, STEAM=0xd8d2c4;
  const TEL=56/60, OPEN=2.0, KNIT=0.5, REACH=1.0, R=1.4, POOL_R=1.3, POOL_T=4.0, SLOW_T=1.2;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  const coreAt=(t)=>{ const sa=t-TEL; if(sa<0)return 0; const left=OPEN-sa; return left<=0?0:Math.min(1,sa/0.08,left/KNIT); };
  const raiseAt=(t)=>t<TEL?sm(t/(TEL*0.8)):0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<200;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const lm=(o,col)=>new THREE.MeshBasicMaterial({color:col||EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the Ember ring: r 1.4, 1 u in front, a disc filling outward over the 56 ticks under a bright edge
    tele=new THREE.Group(); fxG.add(tele); tele.visible=false;
    const bed=new THREE.Mesh(new THREE.CircleGeometry(R,56).rotateX(-Math.PI/2),lm(0.07)); tele.add(bed); tele.userData.bed=bed;
    teleFill=new THREE.Mesh(new THREE.CircleGeometry(1,56).rotateX(-Math.PI/2).translate(0,0.002,0),lm(0.14)); tele.add(teleFill);
    teleEdge=new THREE.Mesh(new THREE.RingGeometry(R-0.05,R,64).rotateX(-Math.PI/2).translate(0,0.003,0),lm(0.5)); tele.add(teleEdge);
    // the slag pool and the crater under it
    pool=new THREE.Mesh(new THREE.CircleGeometry(POOL_R,48).rotateX(-Math.PI/2),lm(0,GOLD)); pool.visible=false; fxG.add(pool);
    crater=new THREE.Mesh(new THREE.CircleGeometry(1,40).rotateX(-Math.PI/2),lm(0,SLAGC)); crater.visible=false; fxG.add(crater);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
    slowR=new THREE.Mesh(new THREE.RingGeometry(0.3,0.34,40).rotateX(-Math.PI/2),lm(0,0x9fb3c8)); slowR.position.y=0.02; dummy.add(slowR);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.08,s1:0.26,a:0.18,drag:2.6,floor:true,col:col||DUST});} }
  function sparks(pos,n,col,spd,life,g,up){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()*(up||0.6)-0.1,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:g??-2.5,drag:1.2});} }
  function chunks(pos,n,spd){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(pos,new THREE.Vector3(Math.cos(a)*spd*(0.4+Math.random()*0.6),1.4+Math.random()*1.4,Math.sin(a)*spd*(0.4+Math.random()*0.6)),{life:0.5+Math.random()*0.35,s0:0.09,s1:0.07,a:0.85,col:SLAGC,g:-8,drag:0.3});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||GOLD);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(o.y??0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(tele){tele.visible=false;pool.visible=crater.visible=false;slowR.material.opacity=0;} teleT=poolT=slowT=-1; }
  const chestPt=()=>pt(bones.chest,[0,0.06,0.2]);
  const hitW=()=>tele.localToWorld(new THREE.Vector3(0,0,0));
  function teleAt(){ tele.position.copy(toFloor(new THREE.Vector3(0,0.012,0))); tele.rotation.set(0,-floorYaw,0); tele.position.add(new THREE.Vector3(0,0,REACH).applyAxisAngle(new THREE.Vector3(0,1,0),-floorYaw)); tele.visible=fxOn; teleT=0; }
  function fxStart(name){
    HOME=(name==='slam')?NEAR:FAR; prevT=0;
    if(dummy){ const u=dummy.userData; u.z=HOME; u.x=0; u.tip=0; dummy.position.set(0,0,HOME); }
    if(name==='slam'){ teleAt(); poolT=-1; pool.visible=crater.visible=false; }
    if(name==='spawn'){ cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='slam'&&i===0){ // the slam: 14 to everyone in the ring, a slag pool where it struck, the crust cracked
      hitFeel(0.6,0.07,0.5); teleT=-1; tele.visible=false;
      const h=hitW();
      if(fxOn){ const p=h.clone().setY(0.25);
        for(const b of [bones.handL,bones.handR]){ const a=pt(b,[0,-0.1,0]); for(let k=0;k<6;k++) puff(a.clone().lerp(p,k/5),new THREE.Vector3(),{life:0.14+k*0.01,s0:0.18,s1:0.1,a:0.55,col:k<3?HEAT:GOLD}); }
        puff(p,new THREE.Vector3(),{life:0.2,s0:0.6,s1:1.1,a:0.45,col:EMBER}); puff(p.clone().setY(0.4),new THREE.Vector3(),{life:0.14,s0:0.4,s1:0.7,a:0.5,col:HEAT});
        ringAt(h,{r0:R*0.5,r1:R*1.02,dur:0.3,a:0.5,col:EMBER}); ringAt(h,{r0:R*0.6,r1:R*1.35,dur:0.45,a:0.35,col:GOLD,delay:0.03});
        sparks(p,14,GOLD,2.2,0.8,-7.5,1.6); sparks(p,6,HEAT,2.6,0.45,-6,1.2); chunks(p,8,1.8); dust(h,5,0.9,0.3,SLAGC); }
      crater.position.copy(tele.position).setY(0.004); crater.visible=fxOn; crater.scale.setScalar(R*0.75); crater.material.opacity=0.2;
      pool.position.copy(tele.position).setY(0.006); poolT=0;
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.5; u.mat.emissiveIntensity=feel?0.5:0; slowT=0; }
      setTimeout(()=>{ if(!fxOn)return; const c=chestPt(); puff(c,new THREE.Vector3(),{life:0.3,s0:0.5,s1:0.9,a:0.5,col:GOLD}); puff(c,new THREE.Vector3(),{life:0.12,s0:0.3,s1:0.5,a:0.55,col:HEAT}); sparks(c,10,SPARK,1.2,0.7,-1.2,1.4); chunks(c,5,0.9); },50); }
    if(name==='slam'&&i===1){ // the crust knits: heat drawn in, steam, the last sparks falling dark
      if(fxOn){ const c=chestPt(); ringAt(c,{r0:0.95,r1:0.15,dur:0.32,a:0.5,col:GOLD,bill:true}); puff(c,new THREE.Vector3(),{life:0.3,s0:0.5,s1:0.25,a:0.4,col:COAL});
        for(let k=0;k<4;k++) puff(c.clone().add(new THREE.Vector3((Math.random()-0.5)*0.3,0.1,(Math.random()-0.5)*0.3)),new THREE.Vector3(0,0.6+Math.random()*0.4,0),{life:0.9,s0:0.2,s1:0.5,a:0.18,col:STEAM,drag:1.5});
        sparks(c,6,COAL,0.5,0.6,-3,0.5); } }
    if(name==='spawn'){ hitFeel(0.25,0.03,0.2); if(fxOn){ dust(pt(bones.handL,[0,-0.1,0]),3,0.6,0.25); dust(pt(bones.handR,[0,-0.1,0]),3,0.6,0.25); } }
    if(name==='death'){ if(i===0){ hitFeel(0.25,0.04,0.25); if(fxOn) sparks(chestPt(),8,SPARK,1.0,0.5,-2,1.2); }
      else { hitFeel(0.5,0.06,0.35); if(fxOn){ const p=pt(bones.chest,[0,0,0.1]).setY(0.1); dust(p,10,1.4,0.4,SLAGC); dust(p,6,1.0,0.3); chunks(p.setY(0.2),7,1.2); ringAt(p,{r0:0.4,r1:1.6,dur:0.5,a:0.3,col:SLAGC}); } } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time; prevT=t;
    if(n==='slam'){ const r=raiseAt(t); core=coreAt(t); heat=0.12+0.35*r*c01(t/TEL)+0.25*core;
      if(teleT>=0&&tele.visible){ const f=c01(t/TEL); teleFill.scale.setScalar(Math.max(0.001,R*f)); teleEdge.material.opacity=0.5+0.25*f; } }
    if(n==='death'){ const k=Math.max(0,1-Math.abs(t-0.15)/0.2); heat=t<0.35?0.12+0.5*k:Math.max(-0.75,0.12-1.6*(t-0.35)); core=0; if(t>1.6)cv.style.filter='saturate(0.55)'; }
    if(n==='spawn'){ heat=-0.6+0.72*c01((t-0.2)/0.6)+0.25*Math.max(0,1-Math.abs(t-0.75)/0.15); }
  }
  function updateFx(d){
    const busy=shot&&!shot.done, n=busy?shot.name:'';
    if(!busy||(n!=='slam'&&n!=='death'&&n!=='spawn')){ heat+=((sel.dead?-0.75:0.12+0.04*Math.sin(clockT*1.1))-heat)*Math.min(1,d*3); core+=(0-core)*Math.min(1,d*4); }
    if(tele&&tele.visible&&n!=='slam') tele.visible=false;
    flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?core:0,fxOn?heat:0,feel?flash:0,0);
    if(poolT>=0){ poolT+=d; const k=poolT/POOL_T; if(k>=1||!fxOn){poolT=-1;pool.visible=crater.visible=false;} else { const grow=c01(poolT/0.25); pool.visible=true; pool.scale.setScalar(Math.max(0.01,grow)); const hot=1-sm(k/0.8); pool.material.color.setHex(GOLD).lerp(new THREE.Color(SLAGC),1-hot); pool.material.opacity=(0.14+0.18*hot)*(1-sm((k-0.85)/0.15)); crater.material.opacity=0.2*(1-sm((k-0.7)/0.3)); } }
    if(slowT>=0){ slowT+=d; const k=slowT/SLOW_T; slowR.material.opacity=fxOn&&k<1?0.45*(1-k):0; if(k>=1)slowT=-1; }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.6*u.tip;
      u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); dummy.position.z=u.z; dummy.position.x=u.x; }
  }
