(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.5;
  const VIOLET=0x8F63EE, PEAK=0xE6DDF8, EMBER=0xFF5A36, DUST=0x8a8580, STONE=0x8d867c, WALLC=0x77736c;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',rush:'Horn Rush',toll:'Bell Toll',leap:'Sky Leap',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['rush','toll','leap','enrage','heavyHit'];
  const NEAR=3.4, RUSH_AT=5.0, TOLL_AT=2.2, LEAP_AT=6.0; let HOME=NEAR; // where the hero stands, in u, in front of it
  const WALK=1.6, TURN=90*Math.PI/180, LANE_W=1.3, WALL_Z=9.05, LANE_LEN=WALL_Z-0.3, THROW=2.2, TOLL_R=2.9, LEAP_R=2.0, SHARD_V=4.5, SHARD_RANGE=4.2, HIP0=0.44*U;
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.9));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.16,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(0.7,1.2,1); blob.position.set(0,0.004,0.0); scene.add(blob);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.5; orbit.maxDistance=34;
  const VIEWS={Close:{p:[5.4,2.6,6.6],t:[0,1.1,0.4]},'Game zoom':{p:[0,12.5,11.2],t:[0,0.4,2.4]},Side:{p:[10.5,1.8,0.6],t:[0,1.1,0.4]},Front:{p:[0.6,1.8,9.5],t:[0,1.1,0]},Back:{p:[-3.4,3.0,-7.6],t:[0,1.1,0.4]},Top:{p:[0,15,0.4],t:[0,0.3,1.6]}};
  function setView(n){const v=VIEWS[n];cam.position.set(...v.p);orbit.target.set(...v.t);orbit.update();}
  function size(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  new ResizeObserver(size).observe(stage); size(); setView('Close');

  // ---- controls
  function group(id,names,onPick,active){const row=$(id);const btns={};names.forEach(n=>{const b=document.createElement('button');b.textContent=LABEL[n]||n;b.dataset.k=n;b.setAttribute('aria-pressed',String(n===active));b.onclick=()=>onPick(n,b);row.appendChild(b);btns[n]=b;});return btns;}
  const sel={base:'idle',going:'Forward',action:null,dead:false};
  let speed=1, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, feel=true, fxOn=true, showTarget=true, helper=null, rage=false;
  const B={};
  B.moves=group('moves',['idle','walk','spawn','death'],k=>pick(k),'idle');
  B.dirs=group('dirs',['Forward','Turn left','Turn right'],k=>{sel.going=k;if(sel.base!=='walk'&&!sel.dead)sel.base='walk';refresh();},'Forward');
  B.acts=group('acts',[...ACTIONS,'hurt'],k=>pick(k),null);
  B.speeds=group('speeds',['0.1×','0.25×','0.5×','1×'],(k)=>{speed=parseFloat(k);Object.values(B.speeds).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'1×');
  B.views=group('views',Object.keys(VIEWS),k=>{setView(k);Object.values(B.views).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'Close');
  const toggle=(id,get,set)=>{const b=$(id);b.onclick=()=>{set(!get());b.setAttribute('aria-pressed',String(get()));};b.setAttribute('aria-pressed',String(get()));};
  toggle('rage',()=>rage,v=>rage=v); toggle('feel',()=>feel,v=>feel=v); toggle('fx',()=>fxOn,v=>{fxOn=v;if(!v)clearFx();}); toggle('target',()=>showTarget,v=>{showTarget=v;if(dummy)dummy.visible=v;});
  toggle('bones',()=>!!(helper&&helper.visible),v=>{if(helper)helper.visible=v;}); toggle('pause',()=>paused,v=>paused=v);
  function setRage(v){ rage=v; $('rage').setAttribute('aria-pressed',String(v)); }

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, hurtAct=null, shot=null, dummy=null;
  const gA={value:new THREE.Vector4(0,0,0.25,0)};
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // glow masks: x the horns (a violet sheen when it tolls and when enraged), y the bell (a pale glint when it rings), z the eyes
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uA:gA});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uA;')
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'totalEmissiveRadiance+=vec3(0.56,0.39,0.93)*0.45*uA.x*vMask.x+vec3(0.9,0.86,0.97)*uA.y*vMask.y+vec3(0.7,0.45,1.0)*uA.z*vMask.z+vec3(0.55)*uA.w;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|neck1|neck2|head|earL|earR|beard|bell|tail1|tail2)\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[laneG.visible,ringG.visible,leapG.visible],wall:wall.visible,dazed:dazeK>0.05,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,shards:SHARDS.filter(s=>s.t>=0).length,glow:gA.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

  // ---- what plays
  function baseName(){return sel.dead?null:sel.base==='walk'?({'Forward':'walk','Turn left':'turnL','Turn right':'turnR'})[sel.going]:'idle';}
  function startShot(name,hold){ if(!A[name])return; if(shot){shot.action.__w=0;shot.action.setEffectiveWeight(0);}
    const a=A[name]; a.reset(); a.paused=false; a.__w=1; a.setEffectiveWeight(1); Object.entries(A).forEach(([k,x])=>{if(x!==a){x.__w=0;x.setEffectiveWeight(0);}});
    shot={name,action:a,prev:0,hold:!!hold,done:false,gap:0,tz:0}; fxStart(name); }
  function pick(k){
    if(!mixer)return;
    if(k==='idle'||k==='walk'){ if(sel.dead)return; sel.base=k; }
    else if(k==='spawn'){ sel.dead=false; sel.action=null; cv.style.filter=''; startShot('spawn'); }
    else if(k==='death'){ if(sel.dead){ sel.dead=false; cv.style.filter=''; startShot('spawn'); } else { sel.dead=true; sel.action=null; startShot('death',true); } }
    else if(k==='hurt'){ if(sel.dead)return; hurtAct.reset(); hurtAct.setEffectiveWeight(1); hurtAct.play(); hitFeel(0.3,0.04,0.5); flash=0.35; bellK=Math.max(bellK,0.5); if(fxOn)sparks(headPt(),6,PEAK,1.6,0.25); }
    else { if(sel.dead)return; sel.action=sel.action===k?null:k; if(sel.action&&(!shot||shot.done||shot.name!==k))startShot(k); }
    refresh();
  }
  function refresh(){
    Object.values(B.moves).forEach(b=>{const k=b.dataset.k; b.setAttribute('aria-pressed',String(k==='death'?sel.dead:k==='spawn'?!!(shot&&shot.name==='spawn'&&!shot.done):!sel.dead&&sel.base===k)); b.disabled=sel.dead&&(k==='idle'||k==='walk'); b.textContent=k==='death'&&sel.dead?'Death (press to spawn)':LABEL[k];});
    Object.values(B.dirs).forEach(b=>{b.setAttribute('aria-pressed',String(sel.base==='walk'&&!sel.dead&&b.dataset.k===sel.going)); b.disabled=sel.dead;});
    Object.values(B.acts).forEach(b=>{b.setAttribute('aria-pressed',String(sel.action===b.dataset.k)); b.disabled=sel.dead;});
  }
  function showPhase(){
    const el=$('layers'), ph=$('phases'), tag=$('clipname'); const bn=baseName(); const rg=rage?' · enraged':'';
    if(shot&&!shot.done){ const m=META[shot.name], t=shot.action.time; let cur=''; m.phases.forEach(p=>{if(t>=p[1])cur=p[0];});
      el.textContent=LABEL[shot.name]+(cur?' · '+cur:'')+' · '+t.toFixed(2)+' s'+rg; tag.textContent=LABEL[shot.name];
      if(ph.dataset.name!==shot.name){ph.dataset.name=shot.name; ph.innerHTML=m.phases.map((p,i)=>{const e=i+1<m.phases.length?m.phases[i+1][1]:m.dur;return '<span style="--w:'+Math.max(0.04,(e-p[1])).toFixed(3)+'">'+p[0]+'</span>';}).join('')+'<i></i>'; ph.hidden=!m.phases.length;}
      const spans=ph.querySelectorAll('span'); m.phases.forEach((p,i)=>spans[i]&&spans[i].classList.toggle('on',p[0]===cur)); const mk=ph.querySelector('i'); if(mk)mk.style.left=(100*Math.min(1,t/m.dur)).toFixed(1)+'%';
    } else { el.textContent=sel.dead?'Down. Press Death again to spawn it back in.':(LABEL[bn]||'')+(sel.action?' · '+LABEL[sel.action]+' repeats':'')+rg; tag.textContent=sel.dead?'Death':LABEL[bn]||''; ph.hidden=true; ph.dataset.name=''; }
  }

  // ---- floor motion: the floor moves under it, it stays in the middle of the stage
  const floorPos=new THREE.Vector3(); let floorYaw=0;
  const Y=new THREE.Vector3(0,1,0), tmp=new THREE.Vector3(), tmp2=new THREE.Vector3();
  function moveFloor(dz,dyaw){
    floorPos.z-=dz; if(dyaw){ floorPos.applyAxisAngle(Y,-dyaw); floorYaw-=dyaw; }
    fxG.matrix.makeRotationY(floorYaw).setPosition(floorPos);
    const l=floorPos.clone().applyAxisAngle(Y,-floorYaw); l.x-=Math.round(l.x); l.z-=Math.round(l.z); l.applyAxisAngle(Y,floorYaw); gridG.matrix.makeRotationY(floorYaw).setPosition(l);
  }
  const pt=(bone,v)=>tmp.set(v[0],v[1],v[2]).applyMatrix4(bone.matrixWorld).clone();
  const toFloor=(w)=>w.clone().applyMatrix4(fxG.matrix.clone().invert());
  const toWorld=(p)=>p.clone().applyMatrix4(fxG.matrix);

  // ---- hit feel: freeze, squash (the game's boss contact squash: 11% wider, 5% shorter), shake, flash
  let hitstop=0, squash=0, shake=0, flash=0; const shakeV=new THREE.Vector3();
  function hitFeel(sh,stop,sq){ if(!feel)return; hitstop=Math.max(hitstop,stop); squash=Math.max(squash,sq); shake=Math.max(shake,sh); }
  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is its power, stone grey for the shards and the wall)
  const FXP=[], RINGS=[], MARKS=[], SHARDS=[], STARS=[]; let dotTex=null, laneG=null, ringG=null, leapG=null, wall=null;
  let eyes=0.25, eyesTo=0.25, horn=0, hornTo=0, bellK=0, laneT=-1, ringT=-1, leapT=-1, dazeK=0, dazeTo=0, wallT=-1, thrown=false;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<220;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,72),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,72),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f}; g.visible=false; fxG.add(g); return g;};
    // Bell Toll: an Ember ring of radius 2.9 u round itself. Sky Leap: an Ember ring of radius 2.0 u on the farthest hero
    ringG=flatRing(TOLL_R); leapG=flatRing(LEAP_R);
    // Horn Rush: an Ember lane 1.3 u wide from its horns to the wall, with a fill that runs down it
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),eMat(op)); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    laneG=new THREE.Group(); const L=LANE_LEN, hw=LANE_W/2, lf=flat(LANE_W,L,0,L/2,0.14), le=[flat(0.035,L,-hw,L/2,0.6),flat(0.035,L,hw,L/2,0.6),flat(LANE_W,0.035,0,L,0.6),flat(LANE_W,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // a stand-in wall at the end of the lane (the game's rush ends dazed against a wall or a barricade)
    wall=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.7,0.5),new THREE.MeshStandardMaterial({color:WALLC,roughness:1,emissive:0xffffff,emissiveIntensity:0,transparent:true,opacity:0.55,depthWrite:false})); wall.visible=false; fxG.add(wall);
    // dazed: three pale motes that circle over its head
    for(let i=0;i<3;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:PEAK,transparent:true,depthWrite:false,opacity:0})); s.scale.setScalar(0.22); s.visible=false; scene.add(s); STARS.push(s); }
    // the six stone shards the landing throws out
    const shM=new THREE.MeshStandardMaterial({color:STONE,roughness:1,flatShading:true,transparent:true,opacity:1});
    for(let i=0;i<6;i++){ const m=new THREE.Mesh(new THREE.IcosahedronGeometry(0.13,0),shM.clone()); m.scale.set(1,0.8,1.3); m.visible=false; fxG.add(m); SHARDS.push({m,t:-1,o:new THREE.Vector3(),dir:new THREE.Vector3()}); }
    for(let i=0;i<14;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x2a2630,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); MARKS.push({m,t:-1,life:2.6,a:0.3}); }
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,xT:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col,big){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.6+Math.random()*0.35,s0:0.18*(big||1),s1:0.55*(big||1),a:0.2,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(o.local?pos:toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function markAt(pos,o){ if(!fxOn)return; const m=MARKS.find(m=>m.t<0)||MARKS[0]; m.t=0; m.life=o.life||2.6; m.a=o.a||0.3; m.delay=o.delay||0; m.m.position.copy(o.local?pos:toFloor(pos)).setY(0.009); m.m.scale.set(o.sx||o.r||1,o.sz||o.r||1,1); m.m.rotation.set(-Math.PI/2,0,o.rot||0); m.m.material.color.setHex(o.col||0x2a2630); m.m.visible=false; }
  function hideTele(){ if(laneG){laneG.visible=false;ringG.visible=false;leapG.visible=false;} laneT=-1; ringT=-1; leapT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); MARKS.forEach(m=>{m.t=-1;m.m.visible=false;}); SHARDS.forEach(s=>{s.t=-1;s.m.visible=false;}); if(wall){wall.visible=false;wallT=-1;} dazeK=0; dazeTo=0; STARS.forEach(s=>s.visible=false); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const headPt=()=>pt(bones.head,[0,0,0.05]);
  const hornPt=()=>pt(bones.head,[0,0.06,0.1]);
  const bellPt=()=>pt(bones.bell,[0,-0.06,0]);
  const footPt=(k)=>{ const b=bones[(k[0]==='F'?'fHoof':'hHoof')+(k[1])]; return b?pt(b,[0,0,0]).setY(0.02):new THREE.Vector3(); };
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.xT=0; u.hold=0; dummy.position.set(0,0,z); } }
  function hitDummy(push,side){ if(!dummy||!showTarget)return; const u=dummy.userData; u.hold=Math.max(u.hold,0.7); u.mat.emissiveIntensity=feel?0.45:0; if(push){u.z+=push;} if(side){u.xT=side;} if(fxOn)sparks(targetW().setY(0.5),10,PEAK,2.2,0.3); }
  function fxStart(name){
    hideTele(); HOME=NEAR; thrown=false; if(name!=='rush'){ if(wall)wall.visible=false; wallT=-1; dazeTo=0; }
    if(name==='rush'){ setHero(RUSH_AT); if(dummy)dummy.userData.hold=3.0; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0.3)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw;
        const w=toFloor(new THREE.Vector3(0,0,WALL_Z+0.25)); wall.position.set(w.x,0.35,w.z); wall.rotation.y=-floorYaw; wall.visible=true; wallT=-1; } }
    if(name==='toll'){ setHero(TOLL_AT); if(dummy)dummy.userData.hold=1.6; if(fxOn){ ringT=0; ringG.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.012); ringG.visible=true; } }
    if(name==='leap'){ setHero(LEAP_AT); if(dummy)dummy.userData.hold=2.4; if(fxOn){ leapT=0; leapG.position.copy(toFloor(new THREE.Vector3(0,0,LEAP_AT))).setY(0.012); leapG.visible=true; } }
    if(name==='spawn'){ eyes=0; horn=0; cv.style.filter=''; if(fxOn){ const o=new THREE.Vector3(0,0,0); ringAt(o,{r0:0.4,r1:2.0,dur:0.6,a:0.35}); dust(o,14,1.4,0.6); markAt(o,{r:1.5,life:1.8,a:0.12,col:0x3a3346}); } }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; bellK=1; if(fxOn){ sparks(headPt(),12,PEAK,2.4,0.3); } }
  }
  function legsDust(ks,big){ ks.forEach(k=>{ const p=footPt(k); dust(p,3,0.9*big,0.35,DUST,0.8*big); }); }
  function fxContact(name,i){
    if(name==='rush'){
      if(i===0){ hitFeel(0.35,0.03,0.3); laneT=Math.max(laneT,META.rush.cues.lane[1]); if(fxOn){ legsDust(['HL','HR'],1.2); dust(new THREE.Vector3(0,0,-0.6),8,1.4,0.4,DUST,1.1); } }
      else { hitFeel(1.0,0.1,0.9); flash=0.4; bellK=1; laneG.visible=false; laneT=-1; dazeTo=1; wallT=0;
        if(fxOn){ const h=hornPt(); sparks(h,14,PEAK,2.6,0.35); for(let k=0;k<10;k++)puff(h.clone().add(new THREE.Vector3((Math.random()-0.5)*1.2,(Math.random()-0.3)*0.8,0.2)),new THREE.Vector3((Math.random()-0.5)*1.6,Math.random()*1.4,-0.6-Math.random()),{life:0.8,s0:0.07,s1:0.05,a:0.7,col:STONE,g:-6,drag:0.6}); dust(h.clone().setY(0),12,1.6,0.6,DUST,1.2); ringAt(h,{r0:0.1,r1:1.1,dur:0.3,a:0.35,bill:true,col:PEAK}); } } }
    if(name==='toll'){ hitFeel(0.8,0.07,0.8); bellK=1; ringG.visible=false; ringT=-1; const c=new THREE.Vector3(0,0,0);
      if(fxOn){ ringAt(c,{r0:0.4,r1:TOLL_R,dur:0.3,a:0.5,col:EMBER}); ringAt(c,{r0:0.6,r1:3.5,dur:0.55,a:0.4,delay:0.03}); ringAt(c,{r0:0.6,r1:3.0,dur:0.7,a:0.25,delay:0.12}); ringAt(bellPt(),{r0:0.05,r1:0.6,dur:0.3,a:0.45,bill:true,col:PEAK}); legsDust(['FL','FR'],1.2); dust(hornPt().setY(0),10,1.6,0.5,DUST,1.1); }
      if(dummy&&showTarget&&targetW().distanceTo(c)<TOLL_R+0.24)hitDummy(0.4); }
    if(name==='leap'){
      if(i===0){ hitFeel(0.3,0.02,0.2); if(fxOn){ legsDust(['HL','HR','FL','FR'],1.1); markAt(new THREE.Vector3(0,0,-0.2),{r:1.0,life:1.4,a:0.14}); } }
      else { hitFeel(1.0,0.09,0.9); bellK=1; leapG.visible=false; leapT=-1; const c=new THREE.Vector3(0,0,0);
        if(fxOn){ ringAt(c,{r0:0.3,r1:LEAP_R,dur:0.3,a:0.5,col:EMBER}); ringAt(c,{r0:0.4,r1:2.8,dur:0.55,a:0.35,delay:0.03}); dust(c,22,2.2,0.6,DUST,1.3); markAt(c,{r:1.4,life:2.4,a:0.2});
          const o=toFloor(c); SHARDS.forEach((s,k)=>{ const a=k/6*Math.PI*2+Math.PI/6-floorYaw; s.t=0; s.o.copy(o).setY(0.25); s.dir.set(Math.sin(a),0,Math.cos(a)); s.m.position.copy(s.o); s.m.visible=true; s.m.material.opacity=1; }); }
        if(dummy&&showTarget&&targetW().distanceTo(c)<LEAP_R+0.24)hitDummy(1.2); } }
    if(name==='enrage'){ hitFeel(0.75,0.06,0.7); setRage(true); bellK=1; if(fxOn){ legsDust(['FL','FR'],1.3); ringAt(new THREE.Vector3(0,0,0.4),{r0:0.4,r1:2.4,dur:0.5,a:0.35}); dust(new THREE.Vector3(0,0,0.5),10,1.5,0.5,DUST,1.1); } }
    if(name==='spawn'){ hitFeel(0.45,0.04,0.45); bellK=0.8; if(fxOn){ legsDust(['FL'],1); ringAt(headPt(),{r0:0.1,r1:0.9,dur:0.3,a:0.35,bill:true}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.6,0.05,0.5); bellK=0.7; if(fxOn){ const c=new THREE.Vector3(0.3,0,0); dust(c,18,1.8,0.5,DUST,1.3); ringAt(c,{r0:0.5,r1:2.0,dur:0.6,a:0.3,col:0x8d8478}); } } else { hitFeel(0.25,0.02,0.2); if(fxOn)dust(headPt().setY(0),8,1.0,0.3,DUST,1); } }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, p0=shot.prev, m=META[n];
    if(n==='rush'){ const c=m.cues; eyesTo=t<c.wall[0]?1.4:0.4; hornTo=t<c.run[0]?0.25*Math.min(1,t/c.lane[1]):0.1;
      if(t>c.run[0]&&t<c.run[1]&&fxOn&&Math.random()<d*26)dust(footPt(['FL','FR','HL','HR'][Math.floor(Math.random()*4)]),1,1.0,0.4,DUST,0.9);
      // the hero in the lane is thrown 2.2 u aside as it goes past
      if(dummy&&showTarget&&!thrown&&t>c.run[0]&&t<c.run[1]&&dummy.userData.z<1.1&&Math.abs(dummy.userData.x)<LANE_W/2+0.3){ thrown=true; hitDummy(0,THROW); hitFeel(0.3,0.03,0.2); }
      dazeTo=t>=c.dazed[0]&&t<c.dazed[1]?1:0; }
    if(n==='toll'){ const hit=m.contact[0]; eyesTo=1.4; hornTo=t<hit?0.45*t/hit:(t<hit+0.3?0.7:0.15); }
    if(n==='leap'){ eyesTo=1.4; hornTo=0.15; }
    if(n==='enrage'){ eyesTo=1.8; hornTo=t<m.contact[0]?0.3:0.45; }
    if(n==='spawn'){ eyesTo=t>0.5?0.25:0; if(t>0.05&&t<0.7&&Math.random()<d*20)puff(new THREE.Vector3((Math.random()-0.5)*1.8,0.1,(Math.random()-0.5)*1.8),new THREE.Vector3(0,0.6+Math.random(),0),{life:1.0,s0:0.14,s1:0.32,a:0.2,col:DUST}); }
    if(n==='death'){ const o=m.cues.out; eyesTo=t<o[0]?1.2:Math.max(0,1-(t-o[0])/1.4); hornTo=0; if(t>2.2)cv.style.filter='saturate(0.45)'; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=NEAR; eyesTo=sel.dead?0:(rage?0.8:0.25); hornTo=sel.dead?0:(rage?0.14:0); dazeTo=0; if(ringT>=0||leapT>=0)hideTele(); }
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); horn+=(hornTo-horn)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2); bellK=Math.max(0,bellK-d*2.2);
    const on=fxOn?1:0; gA.value.set(on*horn*0.5,on*bellK*0.35,on*0.5*Math.min(2.2,eyes+(rage&&!sel.dead?0.4:0)),feel?flash:0);
    // the shadow shrinks as it leaps
    const hy=bones.hips?bones.hips.getWorldPosition(tmp2).y-HIP0:0; const sk=1-0.55*Math.min(1,Math.max(0,hy)/1.9); blob.scale.set(0.7*sk,1.2*sk,1); blob.material.opacity=0.16*sk;
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03){p.s.position.y=0.03; if(p.g<0){p.v.set(0,0,0);}} const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    MARKS.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=(m.t-m.delay)/m.life; if(u<0){m.m.visible=false;return;} if(u>=1){m.t=-1;m.m.visible=false;return;} m.m.visible=true; m.m.material.opacity=m.a*(u<0.05?u/0.05:1-Math.max(0,(u-0.6)/0.4)); });
    // the shards: out at 4.5 u/s along the floor for 4.2 u, a low hop, tumbling, then they crumble
    SHARDS.forEach((s,k)=>{ if(s.t<0)return; s.t+=d; if(!fxOn){s.t=-1;s.m.visible=false;return;} const T=SHARD_RANGE/SHARD_V, u=s.t/T; if(u>=1.15){s.t=-1;s.m.visible=false;return;}
      const r=SHARD_V*Math.min(s.t,T); s.m.position.copy(s.o).addScaledVector(s.dir,r); s.m.position.y=0.2+0.45*Math.sin(Math.PI*Math.min(1,u)); s.m.rotation.set(s.t*7+k,s.t*5,0); s.m.material.opacity=u<1?1:Math.max(0,1-(u-1)/0.15);
      if(Math.random()<d*10)puff(toWorld(s.m.position),new THREE.Vector3(0,0.2,0),{life:0.35,s0:0.08,s1:0.03,a:0.25,col:DUST}); if(u>=1&&!s.done){ s.done=true; dust(toWorld(s.m.position),3,0.6,0.3,DUST,0.6); } if(u<1)s.done=false;
      if(dummy&&showTarget&&!s.hit&&toWorld(s.m.position).setY(0).distanceTo(targetW())<0.35){ s.hit=true; hitDummy(); } if(s.t<0.02)s.hit=false; });
    // dazed: the motes circle the head
    dazeK+=(dazeTo-dazeK)*Math.min(1,d*5); const hp=bones.head?headPt():null; STARS.forEach((s,k)=>{ s.visible=fxOn&&dazeK>0.03&&!!hp; if(!s.visible)return; const a=performance.now()/1000*3.2+k*2.094; s.position.set(hp.x+Math.cos(a)*0.45,hp.y+0.75+0.06*Math.sin(a*2),hp.z+Math.sin(a)*0.45); s.material.opacity=0.75*dazeK; });
    // the wall flashes and shudders where the horns meet it, then stays until the next move
    if(wallT>=0&&wall){ wallT+=d; wall.material.emissiveIntensity=feel?Math.max(0,0.35-wallT*1.2):0; }
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    if(ringT>=0){ ringT+=d; fill(ringG,ringT,META.toll.contact[0]); if(!fxOn)hideTele(); }
    if(leapT>=0){ leapT+=d; fill(leapG,leapT,META.leap.contact[1]); if(!fxOn)hideTele(); }
    if(laneT>=0){ laneT+=d; const T=META.rush.cues.lane[1], k=Math.min(1,laneT/T), out=Math.max(0,(laneT-META.rush.cues.run[1])/0.26); if(out>=1||!fxOn){ laneG.visible=false; laneT=-1; } else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=LANE_LEN/2*k; u.lf.material.opacity=(laneT>T?0.3:(0.08+0.1*k+0.02*Math.sin(laneT*24)*k))*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(u.hold>0){ u.hold-=d; u.x+=(u.xT-u.x)*Math.min(1,d*16); } else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.xT=0; u.x+=(0-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }

  // ---- the loop
  let last=performance.now(); const LAND={walk:[[0,'A'],[0.3,'B']],turnL:[[0,'A'],[0.3,'B']],turnR:[[0,'A'],[0.3,'B']]}; const SETS={A:['FL','HR'],B:['FR','HL']}; let baseT={};
  function travelAt(name,t){ const tr=META[name].travel; if(!tr)return 0; const f=Math.min(tr.length-1,Math.max(0,t*60)); const i=Math.floor(f), j=Math.min(tr.length-1,i+1); return tr[i]+(tr[j]-tr[i])*(f-i); }
  function tick(d){
    if(!mixer)return;
    const stopped=hitstop>0; if(stopped){hitstop-=d;} const md=stopped?0:d;
    const bn=baseName();
    if(shot&&!shot.done){ const a=shot.action, m=META[shot.name]; if(a.time>=Math.min(m.dur,a.getClip().duration)-1e-3){ shot.done=true; if(shot.name==='spawn')refresh(); } }
    if(shot&&shot.done&&!shot.hold&&sel.action&&!sel.dead){ shot.gap+=md; if(shot.gap>0.8)startShot(sel.action); }
    Object.entries(A).forEach(([k,a])=>{ let to=0; if(shot&&shot.action===a)to=(shot.done&&!shot.hold)?0:1; else if(k===bn)to=(shot&&(!shot.done||shot.hold))?0:1;
      const tau=(shot&&shot.action===a)?0.15:(to>a.__w?0.18:0.12); a.__w+=(to-a.__w)*Math.min(1,md/tau); if(Math.abs(to-a.__w)<0.002)a.__w=to; a.setEffectiveWeight(a.__w); });
    mixer.update(md);
    // a puff of dust as each diagonal pair comes down in the walk and the turns
    for(const [k,ls] of Object.entries(LAND)){ const a=A[k]; if(!a||a.__w<0.5)continue; const T=META[k].dur, t=a.time%T, p=baseT[k]??t; for(const [c,s] of ls){ if((p<c&&t>=c)||(p>t&&(c>=p||c<=t))){ if(fxOn)SETS[s].forEach(f=>dust(footPt(f),1,0.4,0.2,DUST,0.6)); } } baseT[k]=t; }
    let dz=0, dyaw=0; dz+=A.walk.__w*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;
    if(shot&&!shot.done){ const tz=travelAt(shot.name,shot.action.time); const dd=tz-shot.tz; shot.tz=tz; dz+=dd; if(dummy&&dd)dummy.userData.z-=dd; }
    if(dz||dyaw)moveFloor(dz,dyaw);
    if(shot){ const m=META[shot.name], t=shot.action.time; m.contact.forEach((c,i)=>{ if(c>0&&shot.prev<c&&t>=c)fxContact(shot.name,i); }); fxOngoing(md); shot.prev=t; }
    squash=Math.max(0,squash-d*7); const sq=feel?squash:0; model.scale.set(U*(1+0.11*sq),U*(1-0.05*sq),U*(1+0.11*sq));
    model.updateMatrixWorld(true); updateFx(stopped?d*0.25:d); showPhase();
  }
  function frame(now){
    requestAnimationFrame(frame); const raw=Math.min(0.05,(now-last)/1000); last=now;
    if(!paused)tick(raw*speed);
    orbit.update(); shake=Math.max(0,shake-raw*3.2); const sk=feel?shake*shake*0.09:0; shakeV.set((Math.random()-0.5)*sk,(Math.random()-0.5)*sk,(Math.random()-0.5)*sk); cam.position.add(shakeV);
    renderer.render(scene,cam); cam.position.sub(shakeV);
  }
  moveFloor(0,0); requestAnimationFrame(frame);
})();
