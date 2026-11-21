(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.4;
  const VIOLET=0xB565F5, GOLD=0xFFC24A, EMBER=0xFF5A36, ASH=0x8a8478, BRONZE=0xB07A3E, SOOT=0x3a3632;
  const LABEL={idle:'Idle',walk:'Glide',turnL:'Turn left',turnR:'Turn right',pendulum:'Pendulum',sweep:'Hand Sweep',toll:'Toll of the Hours',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['pendulum','sweep','toll','enrage','heavyHit'];
  const NEAR=4.0, PEND_AT=6.0, SWEEP_AT=2.2, TOLL_AT=4.0; let HOME=NEAR; // where the hero stands, in u, in front of it
  const WALK=1.45, TURN=90*Math.PI/180, LANE_W=1.4, LANE_L=9.5, CONE_R=3.4, CONE_HALF=70*Math.PI/180, THROW=1.8, RING_R=1.3, HOUR=Math.PI/6;
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.localClippingEnabled=true;
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.95));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.18,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(0.62,0.48,1); blob.position.set(0,0.004,0); scene.add(blob);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.0; orbit.maxDistance=34;
  const VIEWS={Close:{p:[3.8,2.6,5.4],t:[0,1.05,0.2]},'Game zoom':{p:[0,13,11.6],t:[0,0.6,2.4]},Side:{p:[8,1.6,0.4],t:[0,1.0,-0.4]},Front:{p:[0.5,1.5,7],t:[0,1.1,0]},Back:{p:[-2.6,2.2,-6.2],t:[0,1.0,0]},Top:{p:[0,13,0.4],t:[0,0.3,1.2]}};
  function setView(n){const v=VIEWS[n];cam.position.set(...v.p);orbit.target.set(...v.t);orbit.update();}
  function size(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  new ResizeObserver(size).observe(stage); size(); setView('Close');

  // ---- controls
  function group(id,names,onPick,active){const row=$(id);const btns={};names.forEach(n=>{const b=document.createElement('button');b.textContent=LABEL[n]||n;b.dataset.k=n;b.setAttribute('aria-pressed',String(n===active));b.onclick=()=>onPick(n,b);row.appendChild(b);btns[n]=b;});return btns;}
  const sel={base:'idle',going:'Forward',action:null,dead:false};
  let speed=1, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, feel=true, fxOn=true, showTarget=true, helper=null;
  const B={};
  B.moves=group('moves',['idle','walk','spawn','death'],k=>pick(k),'idle');
  B.dirs=group('dirs',['Forward','Turn left','Turn right'],k=>{sel.going=k;if(sel.base!=='walk'&&!sel.dead)sel.base='walk';refresh();},'Forward');
  B.acts=group('acts',[...ACTIONS,'hurt'],k=>pick(k),null);
  B.speeds=group('speeds',['0.1×','0.25×','0.5×','1×'],(k)=>{speed=parseFloat(k);Object.values(B.speeds).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'1×');
  B.views=group('views',Object.keys(VIEWS),k=>{setView(k);Object.values(B.views).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'Close');
  const toggle=(id,get,set)=>{const b=$(id);b.onclick=()=>{set(!get());b.setAttribute('aria-pressed',String(get()));};b.setAttribute('aria-pressed',String(get()));};
  toggle('feel',()=>feel,v=>feel=v); toggle('fx',()=>fxOn,v=>{fxOn=v;if(!v)clearFx();}); toggle('target',()=>showTarget,v=>{showTarget=v;if(dummy)dummy.visible=v;});
  toggle('bones',()=>!!(helper&&helper.visible),v=>{if(helper)helper.visible=v;}); toggle('pause',()=>paused,v=>paused=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, hurtAct=null, shot=null, dummy=null;
  // masks: x the eyes; y the dial's pale face; z kinds (1 the pendulum, 0.5 the weights, 0.25 the clock hand)
  const gH={value:new THREE.Vector4(0.5,0.1,0.15,0)}, gQ={value:new THREE.Vector4(0,0,0,0)};
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    mesh.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),0)]; // what is under the floor is not drawn (the spawn)
    // uH: x eyes, y the dial's song, z the pendulum bob; uQ: x darken the dial (run down, dead), y flash
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uH:gH,uQ:gQ});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uH;\nuniform vec4 uQ;\nfloat isK(float z,float k){return 1.0-step(0.12,abs(z-k));}')
        .replace('#include <map_fragment>',['#include <map_fragment>',
          'diffuseColor.rgb*=1.0-0.35*uQ.x*vMask.y;'].join('\n'))
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'totalEmissiveRadiance+=vec3(0.71,0.4,0.96)*(uH.x*vMask.x+uH.y*vMask.y+uH.z*isK(vMask.z,1.0))+vec3(0.55)*uQ.y;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(chest|neck|head)\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn')&&!t.name.startsWith('hand.'));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1); handQ0=bones.hand.quaternion.clone();
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,t:shot&&+shot.action.time.toFixed(3),tele:[laneG.visible,coneG.visible,TRINGS.filter(r=>r.t>=0).length],hand:+(handA*180/Math.PI).toFixed(0),glow:gH.value.toArray().map(v=>+v.toFixed(2)),dim:+gQ.value.x.toFixed(2),ghost:ghost.visible,weights:WGT.filter(w=>w.t>=0).length,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],blend:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

  // ---- what plays
  function baseName(){return sel.dead?null:sel.base==='walk'?({'Forward':'walk','Turn left':'turnL','Turn right':'turnR'})[sel.going]:'idle';}
  function startShot(name,hold){ if(!A[name])return; if(shot){shot.action.__w=0;shot.action.setEffectiveWeight(0);}
    const a=A[name]; a.reset(); a.paused=false; a.__w=1; a.setEffectiveWeight(1); Object.entries(A).forEach(([k,x])=>{if(x!==a){x.__w=0;x.setEffectiveWeight(0);}});
    shot={name,action:a,prev:0,hold:!!hold,done:false,gap:0,tz:0}; fxStart(name); }
  function pick(k){
    if(!mixer)return;
    if(k==='idle'||k==='walk'){ if(sel.dead)return; sel.base=k; }
    else if(k==='spawn'){ sel.dead=false; sel.action=null; startShot('spawn'); }
    else if(k==='death'){ if(sel.dead){ sel.dead=false; startShot('spawn'); } else { sel.dead=true; sel.action=null; startShot('death',true); } }
    else if(k==='hurt'){ if(sel.dead)return; hurtAct.reset(); hurtAct.setEffectiveWeight(1); hurtAct.play(); hitFeel(0.3,0.04,0.5); flash=0.35; if(fxOn)sparks(headPt(),6,GOLD,1.4,0.25); }
    else { if(sel.dead)return; sel.action=sel.action===k?null:k; if(sel.action&&(!shot||shot.done||shot.name!==k))startShot(k); }
    refresh();
  }
  function refresh(){
    Object.values(B.moves).forEach(b=>{const k=b.dataset.k; b.setAttribute('aria-pressed',String(k==='death'?sel.dead:k==='spawn'?!!(shot&&shot.name==='spawn'&&!shot.done):!sel.dead&&sel.base===k)); b.disabled=sel.dead&&(k==='idle'||k==='walk'); b.textContent=k==='death'&&sel.dead?'Death (press to spawn)':LABEL[k];});
    Object.values(B.dirs).forEach(b=>{b.setAttribute('aria-pressed',String(sel.base==='walk'&&!sel.dead&&b.dataset.k===sel.going)); b.disabled=sel.dead;});
    Object.values(B.acts).forEach(b=>{b.setAttribute('aria-pressed',String(sel.action===b.dataset.k)); b.disabled=sel.dead;});
  }
  function showPhase(){
    const el=$('layers'), ph=$('phases'), tag=$('clipname'); const bn=baseName();
    if(shot&&!shot.done){ const m=META[shot.name], t=shot.action.time; let cur=''; m.phases.forEach(p=>{if(t>=p[1])cur=p[0];});
      el.textContent=LABEL[shot.name]+(cur?' · '+cur:'')+' · '+t.toFixed(2)+' s'; tag.textContent=LABEL[shot.name];
      if(ph.dataset.name!==shot.name){ph.dataset.name=shot.name; ph.innerHTML=m.phases.map((p,i)=>{const e=i+1<m.phases.length?m.phases[i+1][1]:m.dur;return '<span style="--w:'+Math.max(0.04,(e-p[1])).toFixed(3)+'">'+p[0]+'</span>';}).join('')+'<i></i>'; ph.hidden=!m.phases.length;}
      const spans=ph.querySelectorAll('span'); m.phases.forEach((p,i)=>spans[i]&&spans[i].classList.toggle('on',p[0]===cur)); const mk=ph.querySelector('i'); if(mk)mk.style.left=(100*Math.min(1,t/m.dur)).toFixed(1)+'%';
    } else { el.textContent=sel.dead?'Down. Press Death again to spawn it back in.':(LABEL[bn]||'')+(sel.action?' · '+LABEL[sel.action]+' repeats':''); tag.textContent=sel.dead?'Death':LABEL[bn]||''; ph.hidden=true; ph.dataset.name=''; }
  }

  // ---- floor motion: the floor moves under it, it stays in the middle of the stage
  const floorPos=new THREE.Vector3(); let floorYaw=0;
  function moveFloor(dz,dyaw){
    floorPos.z-=dz; if(dyaw){ floorPos.applyAxisAngle(Y,-dyaw); floorYaw-=dyaw; }
    fxG.matrix.makeRotationY(floorYaw).setPosition(floorPos);
    const l=floorPos.clone().applyAxisAngle(Y,-floorYaw); l.x-=Math.round(l.x); l.z-=Math.round(l.z); l.applyAxisAngle(Y,floorYaw); gridG.matrix.makeRotationY(floorYaw).setPosition(l);
  }
  const Y=new THREE.Vector3(0,1,0), Z=new THREE.Vector3(0,0,1), tmp=new THREE.Vector3(), tmp2=new THREE.Vector3();
  const pt=(bone,v)=>tmp.set(v[0],v[1],v[2]).applyMatrix4(bone.matrixWorld).clone();
  const toFloor=(w)=>w.clone().applyMatrix4(fxG.matrix.clone().invert());
  const toWorld=(p)=>p.clone().applyMatrix4(fxG.matrix);

  // ---- the clock hand: the page turns it. It ticks once a second; each toll jumps it an hour; it spins when enraged and in the
  // sweep; run down it stops; at death it runs backward and stops for good.
  let handA=0, handQ0=null, tickT=0, handTarget=0, handSpin=0;
  function updateHand(d){
    if(!bones.hand)return; const n=shot&&!shot.done?shot.name:null, t=n?shot.action.time:0, m=n?META[n]:null;
    let stopped=sel.dead; if(n==='toll'&&t>=m.cues.rundown[0]&&t<m.cues.rundown[1])stopped=true; if(n==='death')stopped=t>=1.4;
    if(n==='death'&&t<1.4){ handTarget-=d*Math.PI*3*(1-t/1.4); }
    else if(n==='enrage'&&t>=m.contact[0]-0.2){ handTarget+=d*Math.PI*4; }
    else if(n==='sweep'&&t>=m.contact[0]-0.25&&t<m.contact[0]+0.25){ handTarget+=d*Math.PI*4; }
    else if(n==='spawn'&&t>=0.55&&t<1.1){ handTarget+=d*Math.PI*2; }
    else if(!stopped&&n!=='toll'){ tickT+=d; if(tickT>=1){ tickT-=1; handTarget+=Math.PI/30; } }
    handA+=(handTarget-handA)*Math.min(1,d*30);
    bones.hand.quaternion.copy(handQ0).multiply(new THREE.Quaternion().setFromAxisAngle(Z,-handA));
  }

  // ---- hit feel: freeze, squash (the game's boss contact squash: 11% wider, 5% shorter), shake, flash
  let hitstop=0, squash=0, shake=0, flash=0; const shakeV=new THREE.Vector3();
  function hitFeel(sh,stop,sq){ if(!feel)return; hitstop=Math.max(hitstop,stop); squash=Math.max(squash,sq); shake=Math.max(shake,sh); }

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is the song that drives it, the weights are bronze)
  const FXP=[], RINGS=[], TRINGS=[], WGT=[]; let dotTex=null, laneG=null, coneG=null, ghost=null, arc=null;
  let eyeK=0.5, dialK=0.1, bobK=0.08, dimK=0, laneT=-1, laneTT=0, coneT=-1, ghostT=-1, ghostDir=1, arcT=-1, flare=0, idleT=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<220;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5});}
    for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,96),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,96),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f,r}; g.visible=false; fxG.add(g); return g;};
    // Toll of the Hours: up to six Ember rings of radius 1.3 u, an hour apart round it
    for(let i=0;i<6;i++)TRINGS.push({g:flatRing(RING_R),t:-1,T:1});
    // Pendulum: an Ember lane 1.4 u wide from it through the hero, filling from its end; it stays lit for the back-swing
    laneG=new THREE.Group(); const lf=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,1).translate(0,0.5,0),eMat(0.12)); const le=new THREE.Mesh(new THREE.EdgesGeometry(new THREE.PlaneGeometry(LANE_W,LANE_L).translate(0,LANE_L/2,0)),new THREE.LineBasicMaterial({color:EMBER,transparent:true,opacity:0.6}));
    [lf,le].forEach(m=>{m.rotation.x=Math.PI/2;}); le.position.y=0.003; laneG.add(lf,le); laneG.userData={f:lf,e:le}; laneG.visible=false; fxG.add(laneG);
    // Hand Sweep: an Ember cone of radius 3.4 u and half-angle 70 degrees in front, filling outward
    coneG=new THREE.Group(); const cf=new THREE.Mesh(new THREE.CircleGeometry(1,64,Math.PI/2-CONE_HALF,2*CONE_HALF),eMat(0.12)); const ce=new THREE.Mesh(new THREE.RingGeometry(CONE_R-0.04,CONE_R,64,1,Math.PI/2-CONE_HALF,2*CONE_HALF),eMat(0.6));
    const side=(a)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.035,CONE_R).translate(0,CONE_R/2,0),eMat(0.6)); m.rotation.z=a; return m;}; const sides=new THREE.Group(); sides.add(side(CONE_HALF),side(-CONE_HALF));
    [cf,ce,sides].forEach(m=>{m.rotation.x=Math.PI/2;}); ce.position.y=0.003; sides.position.y=0.003; coneG.add(cf,ce,sides); coneG.userData={f:cf,e:ce,s:sides}; coneG.visible=false; fxG.add(coneG);
    // the swing the Pendulum throws down the lane: a ghost of the bob in the song's violet, on a faint rod
    ghost=new THREE.Group(); const gb=new THREE.Mesh(new THREE.SphereGeometry(0.42,24,16),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.32,depthWrite:false})); gb.position.y=0.55; ghost.add(gb);
    const gs=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:VIOLET,transparent:true,opacity:0.35,depthWrite:false})); gs.scale.setScalar(1.6); gs.position.y=0.55; ghost.add(gs); ghost.visible=false; fxG.add(ghost);
    // the arc the weights cut in the Hand Sweep
    arc=new THREE.Mesh(new THREE.RingGeometry(1.6,2.1,48,1,Math.PI/2-CONE_HALF,2*CONE_HALF),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); arc.rotation.x=Math.PI/2; arc.position.y=1.0; arc.visible=false; scene.add(arc);
    // the falling clock weights: bronze, the shape of the ones it carries
    for(let i=0;i<6;i++){ const w=new THREE.Group(); const bm=new THREE.MeshStandardMaterial({color:BRONZE,roughness:0.6,metalness:0.2,transparent:true,opacity:1});
      const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.42,16),bm); body.position.y=0.21; const cap=new THREE.Mesh(new THREE.TorusGeometry(0.07,0.025,8,16),bm); cap.position.y=0.47; w.add(body,cap); w.visible=false; fxG.add(w); WGT.push({g:w,m:bm,t:-1,land:1,k:i,spot:new THREE.Vector3()}); }
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,hold:0,vx:0,vz:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.s.material.color.setHex(o.col||ASH); p.s.position.copy(pos); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.5,a:0.18,drag:3,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()*0.8,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.08,s1:0.02,a:0.55,col,g:-4,drag:1.5});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||GOLD);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function hideTele(){ if(laneG){laneG.visible=false;coneG.visible=false;TRINGS.forEach(r=>{r.g.visible=false;r.t=-1;});} laneT=-1; coneT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); WGT.forEach(w=>{w.t=-1;w.g.visible=false;}); if(ghost){ghost.visible=false;ghostT=-1;arc.visible=false;arcT=-1;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const headPt=()=>pt(bones.head,[0,0.05,0.05]);
  const dialPt=()=>pt(bones.chest,[-0.1,0.14,0.14]);
  function setHero(z,x){ x=x||0; HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=x; u.hold=0; u.vx=0; u.vz=0; dummy.position.set(x,0,z); } }
  function hitDummy(push,dur){ if(!dummy||!showTarget)return; const u=dummy.userData; u.hold=Math.max(u.hold,0.8); u.mat.emissiveIntensity=feel?0.45:0; if(push){u.vx=push.x;u.vz=push.z; if(dur)u.throwLeft=dur;} if(fxOn)sparks(targetW().setY(0.5),10,GOLD,2.0,0.3); }
  function fxStart(name){
    hideTele(); HOME=NEAR; const m=META[name];
    if(name==='pendulum'){ setHero(PEND_AT); if(dummy)dummy.userData.hold=2.4; if(fxOn){ laneT=0; laneTT=m.contact[0]; laneG.position.copy(toFloor(new THREE.Vector3(0,0,0.5))).setY(0.012); laneG.rotation.y=-floorYaw; laneG.visible=true; } }
    if(name==='sweep'){ setHero(SWEEP_AT); if(dummy)dummy.userData.hold=1.4; if(fxOn){ coneT=0; coneG.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.012); coneG.rotation.y=-floorYaw; coneG.visible=true; } }
    if(name==='toll'){ setHero(TOLL_AT); if(dummy)dummy.userData.hold=3.2; if(fxOn){ const c=m.cues.rings, n=c[3];
        // the first on the hero, each next an hour clockwise round it (seen from above), 14 ticks later
        for(let i=0;i<n;i++){ const r=TRINGS[i], a=-HOUR*i; r.t=0; r.T=c[1]+i*c[2]; const p=new THREE.Vector3(Math.sin(a)*TOLL_AT,0,Math.cos(a)*TOLL_AT); r.g.position.copy(toFloor(p)).setY(0.012+0.001*i); r.g.visible=true;
          const w=WGT[i]; w.t=0; w.land=r.T; w.spot.copy(r.g.position).setY(0); w.g.visible=false; } } }
    if(name==='spawn'){ dimK=1; if(fxOn){ const o=new THREE.Vector3(0,0,0); ringAt(o,{r0:0.3,r1:1.6,dur:0.6,a:0.35,col:ASH}); dust(o,14,1.2,0.4,ASH); } }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(dialPt(),12,GOLD,2.0,0.35); }
  }
  function fxContact(name,i){
    const m=META[name];
    if(name==='pendulum'){ hitFeel(i===0?0.6:0.45,0.05,0.4); if(fxOn){ ghostT=0; ghostDir=i===0?1:-1; ghost.visible=true; sparks(pt(bones.pend,[0,-0.19,0.06]),10,VIOLET,1.4,0.3); }
      if(i===0){ laneT=laneTT=1; } else { laneG.visible=false; laneT=-1; } }
    if(name==='sweep'){ hitFeel(0.7,0.06,0.5); coneG.visible=false; coneT=-1;
      if(fxOn){ arcT=0; arc.visible=true; ['chL','chR'].forEach(b=>sparks(pt(bones[b],[0,-0.2,0]),8,GOLD,1.8,0.3)); ringAt(new THREE.Vector3(0,0,0),{r0:0.6,r1:CONE_R,dur:0.3,a:0.3,col:EMBER}); }
      if(dummy&&showTarget){ const d=targetW(); const ang=Math.abs(Math.atan2(d.x,d.z)); if(d.length()<CONE_R+0.3&&ang<CONE_HALF+0.1){ hitDummy(d.clone().normalize().multiplyScalar(THROW/(8/60)),8/60); } } }
    if(name==='toll'){ if(i<m.cues.rings[3]){ hitFeel(0.3,0.03,0.25); if(fxOn){ const p=dialPt(); sparks(p,8,GOLD,1.4,0.25); ringAt(p,{r0:0.1,r1:0.6,dur:0.3,a:0.35,bill:true,col:GOLD}); } handTarget+=HOUR; }
      else { if(fxOn)sparks(headPt(),10,VIOLET,1.2,0.4); } }
    if(name==='enrage'){ if(i===0){ hitFeel(0.5,0.04,0.4); flare=1; if(fxOn){ sparks(headPt(),24,VIOLET,2.0,0.6); ringAt(dialPt(),{r0:0.2,r1:1.4,dur:0.5,a:0.3,bill:true,col:VIOLET}); } }
      else { hitFeel(0.6,0.05,0.5); if(fxOn){ ['chL','chR'].forEach(b=>{ const p=pt(bones[b],[0,-0.2,0]).setY(0); dust(p,10,1.4,0.4,SOOT); sparks(p.setY(0.2),8,GOLD,1.6,0.3); }); } } }
    if(name==='heavyHit'&&i===1){ if(fxOn)dust(new THREE.Vector3(0,0,0.4),10,1.2,0.3,SOOT); }
    if(name==='spawn'){ hitFeel(0.45,0.03,0.4); if(fxOn){ dust(new THREE.Vector3(0,0,0),16,1.5,0.4,SOOT); ringAt(new THREE.Vector3(0,0,0),{r0:0.4,r1:1.8,dur:0.45,a:0.25,col:ASH}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.5,0.05,0.4); flash=0.4; if(fxOn)sparks(dialPt(),12,GOLD,2.0,0.35); }
      else { hitFeel(0.8,0,0.3); if(fxOn){ const c=pt(bones.chest,[0,0,0]).setY(0); dust(c,24,2.0,0.5,SOOT); ringAt(c,{r0:0.4,r1:2.4,dur:0.55,a:0.3,col:ASH}); } } }
  }
  function updateFx(d){
    const busy=shot&&!shot.done, n=busy?shot.name:null, t=busy?shot.action.time:0, m=n?META[n]:null;
    if(!busy){ HOME=NEAR; if(laneT>=0||coneT>=0)hideTele(); }
    // the eyes and the dial burn on the clock's beat; run down they gutter; dead they go out
    idleT+=d; const beat=Math.pow(Math.max(0,Math.sin(idleT*Math.PI)),4); flare=Math.max(0,flare-d*0.7);
    let dimTo=sel.dead?1:0; if(n==='toll'&&t>=m.cues.rundown[0]-0.1&&t<m.cues.rundown[1])dimTo=0.8; if(n==='death')dimTo=t<m.cues.out[0]?0:Math.min(1,(t-m.cues.out[0])/(m.cues.out[1]-m.cues.out[0]));
    if(n==='spawn')dimTo=t<0.55?1:0;
    dimK+=(dimTo-dimK)*Math.min(1,d*(dimTo>dimK?5:2.5)); const live=1-dimK;
    const hot=(n==='pendulum'&&t<m.contact[1]+0.2)?0.6:(n==='sweep'&&t<m.contact[0]+0.2)?0.5:(n==='toll'&&t<m.cues.rundown[0])?0.5:0;
    eyeK+=((0.45+0.3*Math.max(hot,flare))*live-eyeK)*Math.min(1,d*6);
    dialK+=((0.06+0.08*beat+0.12*Math.max(hot,flare))*live-dialK)*Math.min(1,d*6);
    bobK+=((0.06+0.1*beat+0.2*hot)*live-bobK)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; gH.value.set(on*eyeK,on*dialK,on*bobK,0); gQ.value.set(dimK,feel?flash:0,0,0);
    if(flare>0.3&&fxOn&&Math.random()<d*20*flare)puff(pt(bones.chest,[(Math.random()-0.5)*0.3,0.2,(Math.random()-0.5)*0.2]),new THREE.Vector3((Math.random()-0.5)*0.4,0.8+Math.random()*0.6,(Math.random()-0.5)*0.4),{life:0.8,s0:0.12,s1:0.4,a:0.18,col:0xd8d0c8,drag:0.6});
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    TRINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; fill(r.g,r.t,r.T); if(r.t>=r.T+0.02||!fxOn){ r.t=-1; r.g.visible=false; } });
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/laneTT), u=laneG.userData; u.f.scale.set(1,Math.max(0.001,LANE_L*k),1); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(laneT*24)*k; u.e.material.opacity=0.45+0.25*k; if(!fxOn)hideTele(); }
    if(coneT>=0){ coneT+=d; const k=Math.min(1,coneT/(40/60)), u=coneG.userData; u.f.scale.setScalar(Math.max(0.001,CONE_R*k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(coneT*24)*k; u.e.material.opacity=0.45+0.25*k; u.s.children.forEach(q=>q.material.opacity=0.45+0.25*k); if(!fxOn)hideTele(); }
    // the ghost of the swing runs the lane out and back in a quarter of a second, and hits the hero if it stands in the lane
    if(ghostT>=0){ const g0=ghostT; ghostT+=d; const u=Math.min(1,ghostT/0.28); const s=ghostDir>0?u:1-u; const L=0.5+(LANE_L-0.6)*s;
      ghost.position.copy(laneG.position).add(new THREE.Vector3(0,0,L).applyAxisAngle(Y,laneG.rotation.y)).setY(0); ghost.rotation.y=laneG.rotation.y; ghost.children[0].material.opacity=0.32*(1-0.5*u); ghost.children[1].material.opacity=0.35*(1-0.5*u);
      if(fxOn&&Math.random()<d*60)puff(toWorld(ghost.position).setY(0.55),new THREE.Vector3((Math.random()-0.5)*0.4,0.3,(Math.random()-0.5)*0.4),{life:0.4,s0:0.25,s1:0.05,a:0.25,col:VIOLET});
      const hz=dummy?dummy.position.z:0; const wz=toWorld(ghost.position).z, wz0=toWorld(laneG.position).z+(0.5+(LANE_L-0.6)*(ghostDir>0?Math.min(1,g0/0.28):1-Math.min(1,g0/0.28)));
      if(dummy&&showTarget&&Math.abs(dummy.position.x)<LANE_W/2+0.2&&((wz0-hz)*(wz-hz)<=0))hitDummy();
      if(u>=1){ ghostT=-1; ghost.visible=false; } }
    if(arcT>=0){ arcT+=d; const u=arcT/0.3; if(u>=1){arcT=-1;arc.visible=false;} else { arc.material.opacity=0.35*(1-u); arc.scale.setScalar(0.9+0.3*u); } }
    // the weights fall out of the sky onto their rings, rest a moment and fade
    WGT.forEach(w=>{ if(w.t<0)return; w.t+=d; const fall=0.38, u=(w.t-(w.land-fall))/fall;
      if(u<0){ w.g.visible=false; return; } w.g.visible=fxOn;
      if(u<1){ w.g.position.copy(w.spot).setY(7*(1-u*u)); w.m.opacity=1; }
      else { if(!w.hit){ w.hit=true; const p=toWorld(w.spot); hitFeel(0.4,0.03,0.2); if(fxOn){ dust(p,12,1.4,0.4,SOOT); sparks(p.clone().setY(0.3),10,GOLD,1.8,0.3); ringAt(p,{r0:0.2,r1:RING_R+0.1,dur:0.3,a:0.45,col:EMBER}); } if(dummy&&showTarget&&targetW().distanceTo(p)<RING_R+0.3)hitDummy(); }
        w.g.position.copy(w.spot); const f=(w.t-w.land)/1.2; w.m.opacity=Math.max(0,1-Math.max(0,f-0.5)*2); if(f>=1){ w.t=-1; w.hit=false; w.g.visible=false; } } });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.vx||u.vz){ const k=Math.min(1,d*6); u.x+=u.vx*d; u.z+=u.vz*d; if(u.throwLeft!==undefined){ u.throwLeft-=d; if(u.throwLeft<=0){u.vx=0;u.vz=0;u.throwLeft=undefined;} } else { u.vx*=1-k; u.vz*=1-k; if(Math.hypot(u.vx,u.vz)<0.05){u.vx=0;u.vz=0;} } }
      if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }

  // ---- the loop
  let last=performance.now();
  function travelAt(name,t){ const tr=META[name].travel; if(!tr)return 0; const f=Math.min(tr.length-1,Math.max(0,t*60)); const i=Math.floor(f), j=Math.min(tr.length-1,i+1); return tr[i]+(tr[j]-tr[i])*(f-i); }
  function tick(d){
    if(!mixer)return;
    const stopped=hitstop>0; if(stopped){hitstop-=d;} const md=stopped?0:d;
    const bn=baseName();
    if(shot&&!shot.done){ const a=shot.action, m=META[shot.name]; if(a.time>=Math.min(m.dur,a.getClip().duration)-1e-3){ shot.done=true; if(shot.name==='spawn')refresh(); } }
    if(shot&&shot.done&&!shot.hold&&sel.action&&!sel.dead){ shot.gap+=md; if(shot.gap>0.7)startShot(sel.action); }
    Object.entries(A).forEach(([k,a])=>{ let to=0; if(shot&&shot.action===a)to=(shot.done&&!shot.hold)?0:1; else if(k===bn)to=(shot&&(!shot.done||shot.hold))?0:1;
      const tau=(shot&&shot.action===a)?0.18:(to>a.__w?0.18:0.12); a.__w+=(to-a.__w)*Math.min(1,md/tau); if(Math.abs(to-a.__w)<0.002)a.__w=to; a.setEffectiveWeight(a.__w); });
    mixer.update(md); updateHand(md);
    let dz=0, dyaw=0; dz+=A.walk.__w*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;
    if(shot&&!shot.done){ const tz=travelAt(shot.name,shot.action.time); const dd=tz-shot.tz; shot.tz=tz; dz+=dd; if(dummy&&dd)dummy.userData.z-=dd; }
    if(dz||dyaw)moveFloor(dz,dyaw);
    if(shot){ const m=META[shot.name], t=shot.action.time; m.contact.forEach((c,i)=>{ if(c>=0&&shot.prev<c&&t>=c)fxContact(shot.name,i); }); shot.prev=t; }
    squash=Math.max(0,squash-d*7); const sq=feel?squash:0; model.scale.set(U*(1+0.11*sq),U*(1-0.05*sq),U*(1+0.11*sq));
    model.updateMatrixWorld(true); blob.visible=!(sel.dead||(shot&&shot.name==='death'&&!shot.done&&shot.action.time>1.0)); updateFx(stopped?d*0.25:d); showPhase();
  }
  function frame(now){
    requestAnimationFrame(frame); const raw=Math.min(0.05,(now-last)/1000); last=now;
    if(!paused)tick(raw*speed);
    orbit.update(); shake=Math.max(0,shake-raw*3.2); const sk=feel?shake*shake*0.09:0; shakeV.set((Math.random()-0.5)*sk,(Math.random()-0.5)*sk,(Math.random()-0.5)*sk); cam.position.add(shakeV);
    renderer.render(scene,cam); cam.position.sub(shakeV);
  }
  moveFloor(0,0); requestAnimationFrame(frame);
})();
