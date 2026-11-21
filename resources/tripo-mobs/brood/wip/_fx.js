  // ---- effects (stand-ins, dim on purpose: pale sparks at the fangs, dust under the feet, a violet glow on the yellow piece while a bite is wound up)
  const FXP=[], RINGS=[]; let dotTex=null;
  let eyes=1, eyesTo=1, tell=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:DUST,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
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
  // the fang tips (its left, its right) and between them, in the head bone's frame
  const fang=(i)=>pt(bones.head,i===0?[0.07,-0.12,0.22]:i===1?[-0.07,-0.12,0.22]:[0,-0.11,0.23]);
  function fxStart(name){
    HOME=NEAR;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)ringAt(new THREE.Vector3(0,0,0),{r0:0.15,r1:0.8,dur:0.4,a:0.3}); dust(new THREE.Vector3(0,0,0),6,0.9,0.4); }
    if(name==='bites'&&dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,NEAR); }
  }
  function fxContact(name,i){
    if(name==='bites'){ hitFeel(i===2?0.4:0.25,0.05,i===2?0.7:0.45);
      // bite 1 the right fang across to its left, bite 2 the left fang back, bite 3 the pounce with both
      const p=fang(i===0?1:i===1?0:2); if(fxOn){ sparks(p,i===2?8:5,SPARK,i===2?1.8:1.3,0.22); ['c1L','c1R'].forEach(b=>dust(pt(bones[b],[0,0,0]),i===2?3:1,0.4,0.2)); }
      if(dummy&&showTarget){ hitDummy(i===2?0.18:0.1); dummy.userData.sx=i===0?1.4:i===1?-1.4:0; if(fxOn)sparks(targetW().setY(0.5),5,SPARK,1.8,0.25); } }
    if(name==='death'){ hitFeel(0.3,0,0.3); if(fxOn)dust(pt(bones.hips,[0,0,0]).setY(0),8,0.8,0.3); }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.5); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='idle'){}
    if(n==='death'){ eyesTo=t>1.6?0:1-0.6*t/1.6; if(t>1.6)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; [0.76,0.82].forEach((c,k)=>{ if(shot.prev<c&&t>=c&&fxOn)dust(pt(bones[k?'c1R':'c1L'],[0,0,0]),2,0.3,0.15); }); }
  }
  // the held wind-ups of the bite light the yellow piece (the tell): between the first contact and the next bite
  const BW=[[0.4,1.0],[1.4,2.0]];
  function tellNow(){ if(!shot||shot.done||shot.name!=='bites')return 0; const t=shot.action.time; for(const [a,b] of BW){ if(t>=a-0.15&&t<b+0.05)return Math.min(1,(t-a+0.15)/0.3); } return 0; }
  function idleFx(){}
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy)eyesTo=sel.dead?0:1;
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    tell+=(tellNow()-tell)*Math.min(1,d*10); glowU.value.set((fxOn?1:0)*0.7*tell,0,feel?flash:0,0);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      u.x+=u.sx*d*0.25; u.sx=Math.max(-3,Math.min(3,u.sx-u.sx*d*8)); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
    // the shadow shrinks a little while the pounce lifts it
    const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-0.33)/0.1)); blob.scale.set(0.34*(1-0.15*k),0.42*(1-0.15*k),1); blob.material.opacity=0.17*(1-0.2*k);
    idleFx();
  }
