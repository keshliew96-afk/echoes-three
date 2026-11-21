  // ---- effects (stand-ins, dim on purpose, none of it Ember since nothing here hurts the party: the coal and heart
  // glow, the rose halo round the pot, the gather's closing ring and motes, the mend's pulse and streaks to its kin,
  // crystal bits on the spill, dust)
  const FXP=[], RINGS=[]; let dotTex=null, halo=null, closeR=null, kin=[], spinA=0, spinR=0.5, coal=0, coalTo=0, haloF=1, haloA=0.6, live=1, liveTo=1, moteT=0;
  // the game's gather and spill poses (render/enemies/facet/censer.js), for the glow, the halo and the spin
  const REST={coal:0,halo:1,haloA:0.6,spin:0.5}, COIL={coal:1,halo:1.45,haloA:0.92,spin:3.0}, STRK={coal:1,halo:1.85,haloA:1,spin:4.0}, OVER={coal:0.55,halo:1.25,haloA:0.15,spin:2.0}, SPILLED={coal:-0.6,halo:0.7,haloA:0.2,spin:0.2};
  const FR=1/30, TEL=48/60, T_STRIKE=TEL-2.5*FR, T_SNAP=TEL+3*FR, T_SETTLE=T_SNAP+3/30, T_REST=T_SETTLE+10/30;
  const c01=k=>k<0?0:k>1?1:k, eOut=k=>1-(1-c01(k))**2, kickE=k=>1-(1-c01(k))**3, coilC=k=>{const c=c01(k);return 0.85*eOut(Math.min(1,c/0.4))+0.15*c;}, setK=k=>{if(k<=0)return 1;if(k>=1)return 0;const a=1-k;return a*a*(1-2.6*k);}, smo=k=>{k=c01(k);return k*k*(3-2*k);};
  const lf=(a,b,k)=>{const o={};for(const f in REST)o[f]=a[f]+(b[f]-a[f])*k;return o;};
  function gatherPose(t){ if(t<T_STRIKE)return lf(REST,COIL,coilC(t/T_STRIKE)); if(t<TEL)return lf(COIL,STRK,kickE((t-T_STRIKE)/(2.5*FR))); if(t<T_SNAP)return {...STRK}; if(t<T_SETTLE)return lf(STRK,OVER,eOut((t-T_SNAP)/(3/30))); if(t<T_REST)return lf(OVER,REST,1-setK((t-T_SETTLE)/(10/30))); return {...REST}; }
  function spillPose(t){ if(t<0.4)return gatherPose(t); const from=gatherPose(0.4); if(t<0.4+4/30)return lf(from,SPILLED,eOut((t-0.4)/(4/30))); if(t<0.4+4/30+0.45)return lf(SPILLED,REST,smo((t-0.4-4/30)/0.45)); return {...REST}; }
  function nowPose(){ if(shot&&!shot.done){ if(shot.name==='gather')return gatherPose(shot.action.time); if(shot.name==='spill')return spillPose(shot.action.time); } return REST; }
  // the pot's spin, as the game adds it live: the rate of the moment, integrated, laid on the pot after the moves
  const qSpin=new THREE.Quaternion(), yAx=new THREE.Vector3(0,1,0);
  function spinPot(md){ const dead=sel.dead||(shot&&shot.name==='death'); const to=dead?0:nowPose().spin; spinR+=(to-spinR)*Math.min(1,md*(dead?3:20)); spinA+=spinR*md; if(bones.pot){ qSpin.setFromAxisAngle(yAx,spinA); bones.pot.quaternion.multiply(qSpin); } }
  const potPt=(o)=>pt(bones.sq,o);
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<120;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,72),new THREE.MeshBasicMaterial({color:ROSE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the halo: the game's rose torus round the pot, tilted 0.5 rad off level, riding the pot (so it spins with it)
    halo=new THREE.Mesh(new THREE.TorusGeometry(0.38/U,0.014/U,4,48),new THREE.MeshBasicMaterial({color:ROSE,transparent:true,opacity:0.3,depthWrite:false}));
    const tilt=new THREE.Group(); tilt.rotation.x=Math.PI/2-0.5; tilt.position.set(0,-0.2,0); tilt.add(halo); bones.pot.add(tilt);
    // the gather's ring, closing from the mend's reach onto the censer
    closeR=new THREE.Mesh(new THREE.RingGeometry(0.97,1,96),new THREE.MeshBasicMaterial({color:ROSE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); closeR.rotation.x=-Math.PI/2; closeR.position.y=0.014; closeR.visible=false; scene.add(closeR);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
    // two grey stand-ins for its kin, inside the mend's reach between it and the hero
    [[-1.7,0.9],[1.8,0.4]].forEach(([x,z])=>{ const km=new THREE.MeshStandardMaterial({color:0x4a4550,roughness:1,emissive:ROSE,emissiveIntensity:0}); const k=new THREE.Group(); const b=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.22,0.5,12),km); b.position.y=0.25; const h=new THREE.Mesh(new THREE.SphereGeometry(0.16,12,10),km); h.position.y=0.62; k.add(b,h); k.position.set(x,0,z); k.userData={mat:km}; scene.add(k); kin.push(k); });
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||ROSE); scene.add(r.m); r.m.position.copy(pos); r.m.rotation.set(o.flat?-Math.PI/2:0,0,0); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(closeR)closeR.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  function fxStart(name){
    HOME=NEAR; if(closeR)closeR.visible=false;
    if(name==='spawn'){ cv.style.filter=''; live=0; liveTo=1; }
    if(name==='death'){ liveTo=0; }
  }
  function fxContact(name,i){
    if(name==='gather'){ closeR.visible=false; hitFeel(0.15,0.03,0.4); flash=0.15;
      if(fxOn){ const c=potPt([0,0,0]); ringAt(new THREE.Vector3(0,0.03,0),{r0:0.3,r1:RAD,dur:0.6,a:0.4,flat:true}); ringAt(new THREE.Vector3(0,0.05,0),{r0:0.2,r1:RAD*0.75,dur:0.7,a:0.15,flat:true,col:HV,delay:0.05}); sparks(c,8,ROSE,1.4,0.3);
        if(showTarget)kin.forEach((k,j)=>{ const to=new THREE.Vector3(k.position.x,0.55,k.position.z), d=to.clone().sub(c); for(let s=0;s<5;s++)puff(c.clone().addScaledVector(d,s*0.04),d.clone().multiplyScalar(1/0.42),{life:0.42,s0:0.07,s1:0.03,a:0.45,col:ROSE}); setTimeout(()=>{ k.userData.mat.emissiveIntensity=0.35; for(let s=0;s<3;s++)puff(to.clone().setY(0.35),new THREE.Vector3((Math.random()-0.5)*0.3,0.7+Math.random()*0.5,(Math.random()-0.5)*0.3),{life:0.8,s0:0.06,s1:0.03,a:0.5,col:ROSE,g:0.3,drag:1.6}); },380); }); } }
    if(name==='spill'){ closeR.visible=false; hitFeel(0.2,0.04,0.4); flash=0.2;
      if(fxOn){ const c=potPt([0,-0.05,0]); for(let s=0;s<6;s++)puff(c,new THREE.Vector3((Math.random()-0.5)*1.2,0.2+Math.random()*0.6,(Math.random()-0.5)*1.2),{life:0.7,s0:0.08,s1:0.06,a:0.6,col:CRYSTAL,g:-6,drag:0.4}); for(let s=0;s<2;s++)puff(c,new THREE.Vector3((Math.random()-0.5)*0.4,0,(Math.random()-0.5)*0.4),{life:0.8,s0:0.25,s1:0.45,a:0.18,col:0xc8b89a,drag:2.2}); setTimeout(()=>dust(new THREE.Vector3(0,0,0),5,0.6,0.3),320); } }
    if(name==='death'){ if(i===0){ hitFeel(0.25,0.03,0.4); if(fxOn)dust(potPt([0,-0.2,0]).setY(0),6,0.8,0.3); } else { hitFeel(0.15,0,0.2); if(fxOn)dust(potPt([0,0,0]).setY(0),8,0.7,0.3); cv.style.filter='saturate(0.45)'; } }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='gather'||(n==='spill'&&t<0.4)){ if(t<TEL&&fxOn){ const k=t/TEL; closeR.visible=true; closeR.scale.setScalar(RAD+(0.35-RAD)*k); closeR.material.opacity=0.35*Math.min(1,t/0.15);
        moteT-=d; if(moteT<=0){ moteT=0.07; const a=Math.random()*Math.PI*2, rr=RAD*(0.55+0.4*Math.random()), p=new THREE.Vector3(Math.cos(a)*rr,0.35,Math.sin(a)*rr), c=potPt([0,0,0]), life=0.5; puff(p,c.clone().sub(p).multiplyScalar(1/life),{life,s0:0.06,s1:0.03,a:0.45,col:HV}); } }
      else closeR.visible=false; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy&&closeR)closeR.visible=false;
    if(!busy)liveTo=sel.dead?0:1; live+=(liveTo-live)*Math.min(1,d*(liveTo<live?2.5:6));
    const P=nowPose(); coal+=(P.coal-coal)*Math.min(1,d*20); haloF=P.halo; haloA=P.haloA;
    const tt=clockT, heat=Math.max(0,Math.min(1,0.5+0.1*Math.sin(tt*2.5)+0.5*coal*(0.8+0.2*Math.sin(tt*16))))*live;
    flash=Math.max(0,flash-d*3.2);
    glowU.value.set((fxOn?1:0)*0.8*heat,(fxOn?1:0)*(0.15+0.35*Math.max(0,coal))*live,feel?flash:0,0);
    if(halo){ halo.visible=fxOn&&live>0.05; halo.scale.setScalar(haloF); halo.rotation.z+=d*(0.6+3.0*Math.max(0,coal)); halo.material.opacity=0.5*live*Math.max(0,Math.min(1,haloA+0.15*Math.sin(tt*3)*(1-Math.max(0,coal)))); }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    kin.forEach(k=>{ k.visible=showTarget; k.userData.mat.emissiveIntensity=Math.max(0,k.userData.mat.emissiveIntensity-d*1.5); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); dummy.position.z=u.z; dummy.position.x=u.x; }
    // the shadow sits under the pot, fainter the higher it hangs
    if(bones.sq){ const p=bones.sq.getWorldPosition(tmp); blob.position.x=p.x; blob.position.z=p.z; const k=Math.max(0,Math.min(1,(p.y-0.2)/1.2)); blob.scale.set(0.3*(1+0.15*k),0.3*(1+0.15*k),1); blob.material.opacity=0.17*(1-0.35*k); }
  }
