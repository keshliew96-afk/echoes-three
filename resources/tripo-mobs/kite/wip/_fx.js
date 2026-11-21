  // ---- effects (stand-ins, dim on purpose, after the game's own: the Ember lane 0.8 wide and 6.2 long filling over the
  // 50-tick hang and lit while it dives; the eyes' indigo glow, brighter on the hang, the dive and the thump; pale wind
  // streaks behind it in the dive; the hit on the hero it crosses; the thump's dust ring; feeble dust while it struggles;
  // a downdraught under each hard beat of the climb; the game's snapped bridle string under its chest; the shadow
  // tighter and darker as it comes down; on death rag scraps drift down)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null, laneEdges=[], eyeS=[], eyeGlow=null, bridle=null;
  let eyes=1, eyesTo=1, glowK=0.18;
  const PARCH=0xF4EFE6, SSTONE=0xA7A39A, CANE=0x8a6a45, RAGC=0xB0503C, WIND=0xDCE3EA, SPARK=0xe9dcc0;
  const TELL=new THREE.Color().setHSL(228/360,0.72,0.6), TELLG=new THREE.Color().setHSL(228/360,0.85,0.52);
  const TEL=50/60, LANE=6.2, DIVE=31/60, LAND=TEL+DIVE, GROUND=80/60, RISE=LAND+GROUND, HERO_AT=3.1, LANE_W=0.8;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<140;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the lane, on the floor: the game's 0.8 u by 6.2 u, a dim Ember bed that fills toward the far end over the hang,
    // with brighter edges; it is laid where the hang starts and stays there as the kite dives down it
    lane=new THREE.Group(); fxG.add(lane); lane.visible=false;
    const lm=(o)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide});
    const hw=LANE_W/2, bed=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,LANE).rotateX(-Math.PI/2).translate(0,0,LANE/2),lm(0.08)); lane.add(bed); lane.userData.bed=bed;
    laneFill=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).rotateX(-Math.PI/2).translate(0,0.002,0.5),lm(0.16)); lane.add(laneFill);
    for(const x of [-hw,hw]){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.05,LANE).rotateX(-Math.PI/2).translate(x,0.003,LANE/2),lm(0.45)); lane.add(e); laneEdges.push(e);}
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.05).rotateX(-Math.PI/2).translate(0,0.003,LANE),lm(0.45)); lane.add(cap); laneEdges.push(cap);
    // the eyes: the game's indigo tell glow (its kite has an eye painted on its back; this one's eyes are on its face, so
    // the glow sits on them)
    for(const x of [0.028,-0.028]){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:TELL,transparent:true,depthWrite:false,opacity:0.8})); s.userData.x=x; scene.add(s); eyeS.push(s);}
    eyeGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:TELLG,transparent:true,depthWrite:false,opacity:0.2,blending:THREE.AdditiveBlending})); scene.add(eyeGlow);
    // the snapped bridle string: 0.7 u of cord hanging from the chest, swinging, hidden once it is grounded
    bridle=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.7,4).translate(0,-0.35,0),new THREE.MeshStandardMaterial({color:CANE,roughness:1})); scene.add(bridle);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.1,s1:0.34,a:0.2,drag:2.6,floor:true,col:col||SSTONE});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||DUST);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane)lane.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  function laneAt(){ const o=toFloor(new THREE.Vector3(0,0.012,0)); lane.position.copy(o); lane.rotation.set(0,-floorYaw,0); lane.visible=fxOn; }
  // the game's kite state on the clip clock, for the glow (0.18, +0.35 on the hang, +0.25 diving, +0.2 on the thump)
  function kiteK(t){ const tk=t<TEL?Math.max(t/TEL,0.8*(1-Math.exp(-8*t))):t<LAND?1:0, dv=t>=TEL&&t<LAND?1:0, la=t-LAND, th=la>=0&&la<0.3?1-la/0.3:0; return {tk:tk*(1-dv),dv,th}; }
  function fxStart(name){
    HOME=NEAR;
    if(name==='dive'){ laneAt(); if(dummy){ const u=dummy.userData; u.z=HERO_AT; u.x=0; u.tip=0; dummy.position.set(0,0,HERO_AT); } }
    if(name==='spawn'){ eyes=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='dive'&&i===0){ hitFeel(0.25,0.05,0.4); // it crosses the hero: 9
      if(dummy&&showTarget){ const u=dummy.userData; u.tip=0.25; u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.7),6,SPARK,1.5,0.25); } }
    if(name==='dive'&&i===1){ hitFeel(0.2,0,0.3); if(fxOn){ const b=pt(bones.hips,[0,0,0]).setY(0); ringAt(b,{r0:0.25,r1:1.0,dur:0.35,a:0.35,col:SSTONE}); dust(b,7,0.9,0.3); } }
    if(name==='death'&&i===1){ hitFeel(0.12,0,0.15); if(fxOn){ const b=pt(bones.hips,[0,0,0]).setY(0); ringAt(b,{r0:0.2,r1:0.8,dur:0.3,a:0.3,col:SSTONE}); dust(b,5,0.7,0.25); } }
  }
  let prevT=0, beatPrev=0;
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, pv=prevT; prevT=t;
    const cross=(c)=>pv<c&&t>=c;
    if(n==='dive'){
      const k=kiteK(t); glowK=0.18+0.35*k.tk+0.25*k.dv+0.2*k.th;
      if(lane&&lane.visible){ const f=c01(t/TEL), go=t>=TEL, fade=go?1-c01((t-LAND)/0.3):1; laneFill.scale.z=Math.max(0.001,LANE*f);
        lane.userData.bed.material.opacity=0.08*fade*(go?1.5:1); laneFill.material.opacity=(go?0.2:0.16)*fade; laneEdges.forEach(e=>e.material.opacity=(go?0.6:0.45)*fade); if(fade<=0)lane.visible=false; }
      // the dive: pale wind streaks peel off the wingtips and trail behind
      if(k.dv&&fxOn){ for(const x of [0.42,-0.42]){ puff(pt(bones[x>0?'wing2L':'wing2R'],[x*0.5,-0.02,-0.12]),new THREE.Vector3(0,0.05,0),{life:0.3,s0:0.07,s1:0.02,a:0.35,col:WIND,floor:true}); } puff(pt(bones.tail2,[0,0,0]),new THREE.Vector3(0,0,0),{life:0.25,s0:0.12,s1:0.05,a:0.18,col:WIND,floor:true}); }
      // grounded: feeble dust where a sail lifts and slaps
      if(t>LAND+0.3&&t<RISE&&fxOn&&Math.random()<d*3){ const s=Math.random()<0.5?'wing2L':'wing2R'; dust(pt(bones[s],[0,0,0]).setY(0),1,0.4,0.15); }
      // the climb: a downdraught under each hard beat
      if(t>RISE&&t<RISE+1.1&&fxOn){ const b=Math.sin(t*11); if(beatPrev>0&&b<=0){ const h=pt(bones.hips,[0,0,0]); dust(h.clone().setY(0),3,0.8,0.1,DUST); ringAt(h.clone().setY(0),{r0:0.3,r1:0.9,dur:0.3,a:0.18*Math.max(0,1-(t-RISE)/1.1)+0.05,col:DUST}); } beatPrev=b; }
    }
    if(n==='death'){ eyesTo=Math.max(0,1-t/0.5); if(t>1.4)cv.style.filter='saturate(0.5)';
      if(cross(0.03)&&fxOn){ for(let i=0;i<6;i++)puff(pt(bones.chest,[(Math.random()-0.5)*0.6,0,(Math.random()-0.5)*0.2]),new THREE.Vector3((Math.random()-0.5)*0.6,0.3,(Math.random()-0.5)*0.6),{life:1.4,s0:0.07,s1:0.05,a:0.7,col:Math.random()<0.5?RAGC:PARCH,g:-0.6,drag:1.2,floor:true}); } }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; if(cross(0.42)&&fxOn){ const h=pt(bones.hips,[0,0,0]); ringAt(h,{r0:0.2,r1:0.9,dur:0.3,a:0.3,bill:true,col:WIND}); } }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){eyesTo=sel.dead?0:1;}
    if(!(busy&&shot.name==='dive'))glowK+=(0.18-glowK)*Math.min(1,d*4);
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(0,0,feel?flash:0,0);
    const go=(0.6+1.2*glowK)*eyes;
    eyeS.forEach(s=>{ s.position.copy(pt(bones.head,[s.userData.x,0.07,0.045])); s.scale.setScalar(0.03+0.03*glowK); s.material.opacity=Math.min(0.9,0.55*go); s.visible=fxOn&&eyes>0.02; });
    eyeGlow.position.copy(pt(bones.head,[0,0.07,0.06])); eyeGlow.scale.setScalar(0.18+0.25*glowK); eyeGlow.material.opacity=Math.min(0.4,0.5*glowK)*eyes; eyeGlow.visible=fxOn&&eyes>0.02;
    // the bridle: hangs from the chest, swinging; trails back in the dive; hidden on the floor
    const hy=bones.hips.getWorldPosition(tmp).y; bridle.position.copy(pt(bones.chest,[0,-0.02,-0.03])); const dv=busy&&shot.name==='dive'?kiteK(shot.action.time).dv:0;
    bridle.rotation.set(0.15*Math.sin(clockT*2.3)-0.6*dv,0,0.08*Math.sin(clockT*1.7)); bridle.rotation.y=0; bridle.visible=hy>0.5&&!sel.dead;
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=-0.6*u.tip;
      if(!busy){ u.z+=(HOME-u.z)*Math.min(1,d*2); u.x+=(0-u.x)*Math.min(1,d*2); } dummy.position.z=u.z; dummy.position.x=u.x; }
    // the game's shadow: tighter and darker as it comes down
    const h=Math.max(0,Math.min(1,hy/(1.8))), sk=1-0.35*h; blob.scale.set(0.55*sk,0.45*sk,1); blob.material.opacity=0.22+0.2*(1-h);
  }
