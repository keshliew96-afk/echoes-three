  // ---- effects (stand-ins, dim on purpose: the veins' violet glow on the room's heartbeat, read from the texture's own
  // vein colour; a dim violet pulse from the heart on the surge; pale sparks at the teeth on each bite; dust under the paws)
  const FXP=[], RINGS=[]; let dotTex=null, heartS=null;
  let eyes=1, eyesTo=1, veins=0.25, beatOff=0;
  const HVIOLET=0x8F63EE, SWELL=30/60, SURGE=42/60, BEAT=3.0;
  const smt=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  // the veins over one beat (bt from the swell's start): they brighten over the swell with two throbs, flare as the surge goes, and fade back
  function veinAt(bt){ const sw=smt(bt/SWELL)*(bt<SWELL?1:0), th=Math.max(0,Math.cos((bt-0.12)/0.07*Math.PI/2))*(Math.abs(bt-0.12)<0.07?1:0)+Math.max(0,Math.cos((bt-0.38)/0.07*Math.PI/2))*(Math.abs(bt-0.38)<0.07?1:0);
    const su=bt>=SWELL&&bt<SWELL+SURGE?1-smt((bt-SWELL)/SURGE):0; return 0.22+0.55*sw+0.15*th+0.6*su; }
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    heartS=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:HVIOLET,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending})); heartS.visible=false; scene.add(heartS);
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.09,s1:0.32,a:0.2,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.06,s1:0.012,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0;
  // the front teeth, on the jaw bone; the heart, in the chest
  const teeth=()=>pt(bones.jaw,[0,0.0,0.09]);
  const heart=()=>pt(bones.chest,[0,-0.05,0.13]);
  function fxStart(name){
    HOME=NEAR;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)ringAt(new THREE.Vector3(0,0,0),{r0:0.15,r1:0.8,dur:0.4,a:0.3}); dust(new THREE.Vector3(0,0,0),6,0.9,0.4); }
    if(name==='bite'&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,NEAR); }
    if(name==='beat'){ beatOff=clockT; if(dummy){ const u=dummy.userData; u.z=4.0; u.x=1.4; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(1.4,0,4.0); } }
  }
  function fxContact(name,i){
    if(name==='bite'){ hitFeel(i===2?0.4:0.25,0.05,i===2?0.7:0.45);
      // hit 1 snaps across to its left, hit 2 back to its right, hit 3 the lunge
      const p=teeth(); if(fxOn){ sparks(p,i===2?8:5,SPARK,i===2?1.9:1.4,0.22); ['fHoofL','fHoofR'].forEach(b=>dust(pt(bones[b],[0,-0.03,0.03]),2,0.45,0.2)); }
      if(dummy&&showTarget){ hitDummy(i===2?0.15:0.08); dummy.userData.sx=i===0?1.2:i===1?-1.2:0; if(fxOn)sparks(targetW().setY(0.5),4,SPARK,1.6,0.22); } }
    if(name==='beat'&&fxOn){ ringAt(heart(),{r0:0.1,r1:0.7,dur:0.35,a:0.3,col:HVIOLET,bill:true}); ['hHoofL','hHoofR'].forEach(b=>dust(pt(bones[b],[0,-0.03,-0.03]),3,0.6,0.25)); }
    if(name==='death'&&i===0){ hitFeel(0.3,0,0.3); }
    if(name==='death'&&i===1){ hitFeel(0.15,0,0); if(fxOn)dust(pt(bones.chest,[-0.1,-0.1,0]).setY(0),8,0.9,0.35); }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.5); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='death'){ eyesTo=t>1.6?0:1-0.6*t/1.6; if(t>1.6)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy)eyesTo=sel.dead?0:1;
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    // the veins: the room's heartbeat (the Heartbeat move's own clock while it plays); dark when it dies
    const bt=busy&&shot.name==='beat'?shot.action.time:((clockT-beatOff)%BEAT+BEAT)%BEAT;
    let vt=veinAt(bt); if(sel.dead||(busy&&shot.name==='death'))vt=busy?0.22*(1-Math.min(1,shot.action.time/1.4)):0; if(busy&&shot.name==='spawn')vt*=Math.min(1,shot.action.time/0.5);
    veins+=(vt-veins)*Math.min(1,d*12);
    glowU.value.set((fxOn?1:0)*veins*0.55,0,feel?flash:0,(fxOn?1:0)*0.2*eyes);
    if(heartS){ heartS.visible=fxOn&&veins>0.3; if(heartS.visible){ heartS.position.copy(heart()); heartS.scale.setScalar(0.18+0.12*veins); heartS.material.opacity=0.12*veins; } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      u.x+=u.sx*d*0.25; u.sx=Math.max(-3,Math.min(3,u.sx-u.sx*d*8)); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else if(!(busy&&shot.name==='beat')){ u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }

  }
