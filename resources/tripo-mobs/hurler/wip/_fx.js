  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember ring on the hero over the 66-tick
  // telegraph; the coal leaving the sack mouth on a high arc, a Kiln Gold coal with a smoke trail; the landing's
  // Ember shock, the Kiln Heat flash, Kiln Gold sparks, coal chunks, brick smoke, a scorch and the cinder bed; the
  // coals' glow; the fumble's sack smoke and spilled coals; on death the sack splits and the coals spill)
  const FXP=[], RINGS=[]; let dotTex=null, ringT=null, ringFill=null, coal=null, coalGlow=null, flashS=null, scorch=null, bed=null, bedFlecks=[];
  let heat=0.35, coalT=-1, coalA=null, coalB=null, bedT=-1, deadSpill=false;
  const EMBER=0xFF5A36, KGOLD=0xFFC24A, KHEAT=0xFFE6A8, KSPARK=0xFFD27A, KCOAL=0x7A1E2A, KBRICK=0x584640, SACKC=0x4A3E34;
  const TEL=66/60, FLIGHT=0.42, REL=TEL-FLIGHT, HERO_AT=4.4, RING_R=1.3, BED_R=1.0, BED_LIFE=150/60, HURL_Y=1.5, FUMBLE_AT=0.4;
  const MOUTH=[-0.014,0.2,-0.2]; // the sack mouth, where the coals show, on the sack bone
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const fm=(col,o)=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    // the telegraph: an Ember ring r 1.3 on the hero, its fill growing over the 66 ticks
    ringT=new THREE.Mesh(new THREE.RingGeometry(RING_R-0.05,RING_R,64).rotateX(-Math.PI/2),fm(EMBER,0.5)); ringT.visible=false; fxG.add(ringT);
    ringFill=new THREE.Mesh(new THREE.CircleGeometry(1,48).rotateX(-Math.PI/2),fm(EMBER,0.12)); ringFill.visible=false; fxG.add(ringFill);
    // the coal in flight: a dark chunk, hot at the core, and its Kiln Gold glow
    coal=new THREE.Mesh(new THREE.DodecahedronGeometry(0.075,0),new THREE.MeshStandardMaterial({color:KCOAL,roughness:0.9,emissive:KGOLD,emissiveIntensity:0.55})); coal.visible=false; scene.add(coal);
    coalGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:KGOLD,transparent:true,depthWrite:false,opacity:0.35,blending:THREE.AdditiveBlending})); coalGlow.visible=false; scene.add(coalGlow);
    flashS=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:KHEAT,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); flashS.visible=false; scene.add(flashS); flashS.userData.t=-1;
    // what it leaves: a scorch, and the cinder bed r 1.0 that slows (150 ticks), coal-dark with Kiln Gold flecks
    scorch=new THREE.Mesh(new THREE.CircleGeometry(0.75,40).rotateX(-Math.PI/2),fm(0x231a17,0)); scorch.visible=false; fxG.add(scorch);
    bed=new THREE.Mesh(new THREE.CircleGeometry(BED_R,48).rotateX(-Math.PI/2),fm(KCOAL,0)); bed.visible=false; fxG.add(bed);
    for(let i=0;i<10;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:KGOLD,transparent:true,depthWrite:false,opacity:0})); const a=i*2.4, r=0.2+0.7*((i*0.37)%1); s.userData={x:Math.cos(a)*r,z:Math.sin(a)*r,ph:i*1.7}; s.visible=false; fxG.add(s); bedFlecks.push(s);}
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=o.add?THREE.AdditiveBlending:THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.06),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.6+Math.random()*0.3,s0:0.12,s1:0.36,a:0.22,drag:2.4,floor:true,col:col||KBRICK});} }
  function sparks(pos,n,col,spd,life,gv){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()*0.8,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.045,s1:0.012,a:0.6,col,g:gv===undefined?-3:gv,drag:1.2,floor:true,add:true});} }
  function chunks(pos,n,spd){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(pos,new THREE.Vector3(Math.cos(a)*spd*(0.4+Math.random()),1.2+Math.random()*1.2,Math.sin(a)*spd*(0.4+Math.random())),{life:0.55+Math.random()*0.2,s0:0.06,s1:0.05,a:0.9,col:KCOAL,g:-7,floor:true});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(ringT){ringT.visible=ringFill.visible=false;} coalT=-1; if(coal){coal.visible=coalGlow.visible=false;} bedT=-1; if(bed){bed.visible=scorch.visible=false; bedFlecks.forEach(s=>s.visible=false);} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  function fxStart(name){
    HOME=NEAR;
    if(name==='throw'){ if(dummy){ const u=dummy.userData; u.z=HERO_AT; u.x=0; dummy.position.set(0,0,HERO_AT); }
      const o=toFloor(targetW().setY(0.014)); ringT.position.copy(o); ringFill.position.copy(o).setY(0.012); ringT.visible=ringFill.visible=fxOn; ringFill.scale.setScalar(0.001); }
    if(name==='spawn'){ heat=0; deadSpill=false; cv.style.filter=''; dust(new THREE.Vector3(0,0,0),5,0.6,0.3); }
    if(name==='death'){ deadSpill=false; }
  }
  function fxContact(name,i){
    if(name==='throw'&&i===0){ // the hurl: the coal leaves the sack mouth
      hitFeel(0.1,0,0); coalT=0; coalA=pt(bones.sack,MOUTH); coalB=targetW().setY(0.08);
      if(fxOn){ sparks(coalA,5,KSPARK,1.2,0.3); puff(coalA,new THREE.Vector3(0,0.3,0.4),{life:0.6,s0:0.12,s1:0.3,a:0.25,col:SACKC}); } }
    if(name==='throw'&&i===1){ // the landing on the ring: 9 to the hero, and the cinder bed
      hitFeel(0.3,0.04,0); coalT=-1; coal.visible=coalGlow.visible=false; ringT.visible=ringFill.visible=false;
      const b=coalB.clone().setY(0);
      if(dummy&&showTarget&&feel)dummy.userData.mat.emissiveIntensity=0.45;
      if(fxOn){ ringAt(b,{r0:0.2,r1:RING_R,dur:0.3,a:0.5,col:EMBER}); flashS.position.copy(b).setY(0.35); flashS.userData.t=0; flashS.visible=true;
        sparks(b.clone().setY(0.15),12,KGOLD,2.4,0.4); chunks(b.clone().setY(0.12),7,1.6); dust(b,5,0.9,0.4,KBRICK);
        const o=toFloor(b.clone().setY(0.006)); scorch.position.copy(o); bed.position.copy(o).setY(0.009); bedFlecks.forEach(s=>s.position.set(o.x+s.userData.x,0.03,o.z+s.userData.z)); bedT=0; } }
    if(name==='fumble'){ hitFeel(0.15,0,0.2);
      if(fxOn){ const m=pt(bones.sack,MOUTH); for(let k=0;k<5;k++)puff(m,new THREE.Vector3((Math.random()-0.5)*0.6,0.2+Math.random()*0.3,(Math.random()-0.5)*0.6),{life:0.9,s0:0.12,s1:0.36,a:0.28,col:SACKC,drag:1.5});
        chunks(m,4,0.5); sparks(m,5,KSPARK,1.0,0.35); } }
    if(name==='death'&&i===0){ hitFeel(0.2,0,0.25); }
    if(name==='death'&&i===1){ hitFeel(0.15,0,0); if(fxOn){ const b=pt(bones.sack,MOUTH).setY(0.1); dust(b,6,0.9,0.35); chunks(b,8,1.2); sparks(b,8,KGOLD,1.4,0.5); deadSpill=true; } }
  }
  let prevT=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    if(n==='throw'){
      if(ringT.visible){ const k=c01(t/TEL); ringFill.scale.setScalar(Math.max(0.001,RING_R*k)); ringT.material.opacity=0.35+0.2*k; ringFill.material.opacity=0.08+0.08*k; }
      // the heave: the coals brighten as the sack comes back
      if(t<REL)heat=Math.max(heat,0.35+0.4*c01(t/REL));
    }
  }
  function updateFx(d){
    const busy=shot&&!shot.done;
    // the coal on its arc: from the sack mouth to the ring, peaking at 1.5 u, in the game's 0.42 s
    if(coalT>=0){ coalT+=d; const u=c01(coalT/FLIGHT); const p=coalA.clone().lerp(coalB,u); const mid=(coalA.y+coalB.y)/2; p.y+=4*Math.max(0.2,HURL_Y-mid)*u*(1-u);
      coal.position.copy(p); coal.rotation.set(coalT*9,coalT*6,0); coal.visible=fxOn; coalGlow.position.copy(p); coalGlow.scale.setScalar(0.32); coalGlow.visible=fxOn;
      if(fxOn&&Math.random()<0.7)puff(p,new THREE.Vector3(0,0.25,0),{life:0.5,s0:0.07,s1:0.22,a:0.22,col:KBRICK,drag:1});
      if(fxOn&&Math.random()<0.35)puff(p,new THREE.Vector3((Math.random()-0.5)*0.5,0,(Math.random()-0.5)*0.5),{life:0.3,s0:0.035,s1:0.01,a:0.6,col:KSPARK,g:-2,add:true});
      if(u>=1){ coalT=-1; coal.visible=coalGlow.visible=false; } }
    if(flashS.userData.t>=0){ flashS.userData.t+=d; const u=flashS.userData.t/0.22; if(u>=1){flashS.userData.t=-1;flashS.visible=false;} else {flashS.scale.setScalar(0.5+0.9*u); flashS.material.opacity=0.5*(1-u);} }
    if(bedT>=0){ bedT+=d; const u=bedT/BED_LIFE, f=u<0.06?u/0.06:1-sm((u-0.75)/0.25); if(u>=1||!fxOn){bedT=-1; bed.visible=scorch.visible=false; bedFlecks.forEach(s=>s.visible=false);}
      else { bed.visible=scorch.visible=true; bed.material.opacity=0.28*f; scorch.material.opacity=0.45*f; bedFlecks.forEach(s=>{s.visible=true; s.scale.setScalar(0.07); s.material.opacity=f*(0.35+0.3*Math.sin(clockT*5+s.userData.ph));}); } }
    // the coals' glow, Kiln Gold: a slow breath, up on the heave, dimmer once the sack is emptied, out on death
    const dead=sel.dead||(busy&&shot.name==='death');
    let base=0.35+0.08*Math.sin(clockT*2.2);
    if(busy&&shot.name==='throw'&&shot.action.time>REL)base=0.18+0.17*c01((shot.action.time-REL-0.4)/1.0);
    if(dead)base=busy?0.35*(1-c01(shot.action.time/1.6)):0;
    if(busy&&shot.name==='spawn')base=0.35*c01(shot.action.time/0.6);
    heat+=(base-heat)*Math.min(1,d*5); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(fxOn?heat:0,0,feel?flash:0,0);
    if(deadSpill&&!busy&&fxOn&&Math.random()<0.08){ const b=pt(bones.sack,MOUTH).setY(0.08); puff(b.add(new THREE.Vector3((Math.random()-0.5)*0.4,0,(Math.random()-0.5)*0.4)),new THREE.Vector3(0,0.25,0),{life:0.9,s0:0.04,s1:0.015,a:0.5,col:KGOLD,add:true,floor:true}); }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02){p.s.position.y=0.02; p.v.y=0; p.v.x*=0.8; p.v.z*=0.8;} const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); }
      dummy.position.z=u.z; dummy.position.x=u.x; }
  }
