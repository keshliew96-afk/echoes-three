(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.6;
  const VIOLET=0x8F63EE, PALE=0xC3CBE0, PEAK=0xF6F7FF, EMBER=0xFF5A36, ASH=0x8a8f9a, DEADB=0x6e665a;
  const LABEL={idle:'Idle',walk:'Drift',turnL:'Turn left',turnR:'Turn right',note:'Still Note',unring:'Unringing',great:'Great Hush',stillness:'Stillness',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['note','unring','great','stillness','heavyHit'];
  const NEAR=4.2, LANE_AT=6.0, GREAT_AT=3.2; let HOME=NEAR; // where the hero stands, in u, in front of it: inside the 3 to 5.5 u it keeps
  const WALK=1.25, TURN=90*Math.PI/180, NOTE_T=50/60, LANE_T=56/60, GREAT_T=96/60, NOTE_R=1.8, NOTE_R3=2.3, GREAT_R=4.6, LANE_W=1.3, LANE_LEN=9.0;
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.9));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.14,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(0.5,0.5,1); blob.position.set(0,0.004,0.0); scene.add(blob);
  // the game's pale pool of silence under it
  const pool=new THREE.Mesh(new THREE.CircleGeometry(1.0,40),new THREE.MeshBasicMaterial({color:PALE,transparent:true,opacity:0.12,depthWrite:false}));
  pool.rotation.x=-Math.PI/2; pool.position.set(0,0.006,0.0); scene.add(pool);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.5; orbit.maxDistance=34;
  const VIEWS={Close:{p:[5.6,3.0,7.6],t:[0,1.45,0.8]},'Game zoom':{p:[0,12.5,11.2],t:[0,0.6,2.4]},Side:{p:[12,2.0,1.6],t:[0,1.4,1.4]},Front:{p:[0.8,2.2,12],t:[0,1.4,0]},Back:{p:[-3.8,3.2,-8.6],t:[0,1.3,0.6]},Top:{p:[0,17,0.4],t:[0,0.4,2.0]}};
  function setView(n){const v=VIEWS[n];cam.position.set(...v.p);orbit.target.set(...v.t);orbit.update();}
  function size(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  new ResizeObserver(size).observe(stage); size(); setView('Close');

  // ---- controls
  function group(id,names,onPick,active){const row=$(id);const btns={};names.forEach(n=>{const b=document.createElement('button');b.textContent=LABEL[n]||n;b.dataset.k=n;b.setAttribute('aria-pressed',String(n===active));b.onclick=()=>onPick(n,b);row.appendChild(b);btns[n]=b;});return btns;}
  const sel={base:'idle',going:'Forward',action:null,dead:false};
  let still=0; // how many of its five bells are stilled (one per Stillness, at 75, 50 and 25 percent)
  let speed=1, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, feel=true, fxOn=true, showTarget=true, helper=null;
  const B={};
  B.moves=group('moves',['idle','walk','spawn','death'],k=>pick(k),'idle');
  B.dirs=group('dirs',['Forward','Turn left','Turn right'],k=>{sel.going=k;if(sel.base!=='walk'&&!sel.dead)sel.base='walk';refresh();},'Forward');
  B.acts=group('acts',[...ACTIONS,'hurt'],k=>pick(k),null);
  B.stills=group('stills',['None','I','II','III'],k=>{setStill(['None','I','II','III'].indexOf(k));},'None');
  B.speeds=group('speeds',['0.1×','0.25×','0.5×','1×'],(k)=>{speed=parseFloat(k);Object.values(B.speeds).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'1×');
  B.views=group('views',Object.keys(VIEWS),k=>{setView(k);Object.values(B.views).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'Close');
  const toggle=(id,get,set)=>{const b=$(id);b.onclick=()=>{set(!get());b.setAttribute('aria-pressed',String(get()));};b.setAttribute('aria-pressed',String(get()));};
  toggle('feel',()=>feel,v=>feel=v); toggle('fx',()=>fxOn,v=>{fxOn=v;if(!v)clearFx();}); toggle('target',()=>showTarget,v=>{showTarget=v;if(dummy)dummy.visible=v;});
  toggle('bones',()=>!!(helper&&helper.visible),v=>{if(helper)helper.visible=v;}); toggle('pause',()=>paused,v=>paused=v);
  function setStill(v){ still=v; Object.values(B.stills).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===v))); }

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, hurtAct=null, shot=null, dummy=null;
  const gA={value:new THREE.Vector4(0.2,0.3,0.2,0)}, gD={value:new THREE.Vector4(0,0,0,0)}, gD5={value:0}, gL={value:new THREE.Vector4(0,0,0,0)}, gL5={value:0};
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // glow masks: x the crack down the bell head (a cold pale light), y the violet face under it, z the five small bells (0.2 a bell)
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uA:gA,uD:gD,uD5:gD5,uL:gL,uL5:gL5});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uA;\nuniform vec4 uD;\nuniform float uD5;\nuniform vec4 uL;\nuniform float uL5;\nfloat isB(float z,float k){return 1.0-step(0.05,abs(z-0.2*(k+1.0)));}')
        .replace('#include <color_fragment>',['#include <color_fragment>',
          'float bz=vMask.z; float dead=uD.x*isB(bz,0.0)+uD.y*isB(bz,1.0)+uD.z*isB(bz,2.0)+uD.w*isB(bz,3.0)+uD5*isB(bz,4.0);',
          'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(0.33)))*0.62,dead);'].join('\n'))
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'float bl=uL.x*isB(bz,0.0)+uL.y*isB(bz,1.0)+uL.z*isB(bz,2.0)+uL.w*isB(bz,3.0)+uL5*isB(bz,4.0);',
          'totalEmissiveRadiance+=vec3(0.76,0.8,0.88)*uA.x*vMask.x+vec3(0.56,0.39,0.93)*uA.y*vMask.y+vec3(0.76,0.8,0.88)*uA.z*bl*step(0.1,bz)+vec3(0.55)*uA.w;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(chest|neck|head)\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn')&&!/^(orbit|bell\d)\./.test(t.name));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    for(let k=0;k<5;k++){ const b=bones['bell'+k]; BELL.push({b,home:b.position.clone(),ph:k/5*Math.PI*2,drop:0,sway:0,y:0}); }
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,still,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[noteG.visible,laneG.visible,greatG.visible],rise:+riseK.toFixed(2),drain:+drainK.toFixed(2),hushed:hushT>0,patches:PATCH.filter(p=>p.t>=0).length,wave:+wave.material.opacity.toFixed(2),dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:gA.value.toArray().map(v=>+v.toFixed(2)),dead:[...gD.value.toArray(),gD5.value].map(v=>+v.toFixed(2)),bell0:bones.bell0.getWorldPosition(new THREE.Vector3()).toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

  // ---- what plays
  function baseName(){return sel.dead?null:sel.base==='walk'?({'Forward':'walk','Turn left':'turnL','Turn right':'turnR'})[sel.going]:'idle';}
  function startShot(name,hold){ if(!A[name])return; if(shot){shot.action.__w=0;shot.action.setEffectiveWeight(0);}
    const a=A[name]; a.reset(); a.paused=false; a.__w=1; a.setEffectiveWeight(1); Object.entries(A).forEach(([k,x])=>{if(x!==a){x.__w=Math.min(x.__w,0.0);x.setEffectiveWeight(x.__w);}});
    shot={name,action:a,prev:0,hold:!!hold,done:false,gap:0,tz:0}; fxStart(name); }
  function pick(k){
    if(!mixer)return;
    if(k==='idle'||k==='walk'){ if(sel.dead)return; sel.base=k; }
    else if(k==='spawn'){ sel.dead=false; sel.action=null; cv.style.filter=''; startShot('spawn'); }
    else if(k==='death'){ if(sel.dead){ sel.dead=false; cv.style.filter=''; startShot('spawn'); } else { sel.dead=true; sel.action=null; startShot('death',true); } }
    else if(k==='hurt'){ if(sel.dead)return; hurtAct.reset(); hurtAct.setEffectiveWeight(1); hurtAct.play(); hitFeel(0.3,0.04,0.5); flash=0.35; if(fxOn)sparks(headPt(),6,PALE,1.6,0.25); }
    else { if(sel.dead)return; sel.action=sel.action===k?null:k; if(sel.action&&(!shot||shot.done||shot.name!==k))startShot(k); }
    refresh();
  }
  function refresh(){
    Object.values(B.moves).forEach(b=>{const k=b.dataset.k; b.setAttribute('aria-pressed',String(k==='death'?sel.dead:k==='spawn'?!!(shot&&shot.name==='spawn'&&!shot.done):!sel.dead&&sel.base===k)); b.disabled=sel.dead&&(k==='idle'||k==='walk'); b.textContent=k==='death'&&sel.dead?'Death (press to spawn)':LABEL[k];});
    Object.values(B.dirs).forEach(b=>{b.setAttribute('aria-pressed',String(sel.base==='walk'&&!sel.dead&&b.dataset.k===sel.going)); b.disabled=sel.dead;});
    Object.values(B.acts).forEach(b=>{b.setAttribute('aria-pressed',String(sel.action===b.dataset.k)); b.disabled=sel.dead;});
  }
  function showPhase(){
    const el=$('layers'), ph=$('phases'), tag=$('clipname'); const bn=baseName(); const st=still?' · '+still+' bell'+(still>1?'s':'')+' stilled':'';
    if(shot&&!shot.done){ const m=META[shot.name], t=shot.action.time; let cur=''; m.phases.forEach(p=>{if(t>=p[1])cur=p[0];});
      el.textContent=LABEL[shot.name]+(cur?' · '+cur:'')+' · '+t.toFixed(2)+' s'+st; tag.textContent=LABEL[shot.name];
      if(ph.dataset.name!==shot.name){ph.dataset.name=shot.name; ph.innerHTML=m.phases.map((p,i)=>{const e=i+1<m.phases.length?m.phases[i+1][1]:m.dur;return '<span style="--w:'+Math.max(0.04,(e-p[1])).toFixed(3)+'">'+p[0]+'</span>';}).join('')+'<i></i>'; ph.hidden=!m.phases.length;}
      const spans=ph.querySelectorAll('span'); m.phases.forEach((p,i)=>spans[i]&&spans[i].classList.toggle('on',p[0]===cur)); const mk=ph.querySelector('i'); if(mk)mk.style.left=(100*Math.min(1,t/m.dur)).toFixed(1)+'%';
    } else { el.textContent=sel.dead?'Down. Press Death again to spawn it back in.':(LABEL[bn]||'')+(sel.action?' · '+LABEL[sel.action]+' repeats':'')+st; tag.textContent=sel.dead?'Death':LABEL[bn]||''; ph.hidden=true; ph.dataset.name=''; }
  }

  // ---- floor motion: the floor moves under it, it stays in the middle of the stage
  const floorPos=new THREE.Vector3(); let floorYaw=0;
  function moveFloor(dz,dyaw){
    floorPos.z-=dz; if(dyaw){ floorPos.applyAxisAngle(Y,-dyaw); floorYaw-=dyaw; }
    fxG.matrix.makeRotationY(floorYaw).setPosition(floorPos);
    const l=floorPos.clone().applyAxisAngle(Y,-floorYaw); l.x-=Math.round(l.x); l.z-=Math.round(l.z); l.applyAxisAngle(Y,floorYaw); gridG.matrix.makeRotationY(floorYaw).setPosition(l);
  }
  const Y=new THREE.Vector3(0,1,0), tmp=new THREE.Vector3(), tmp2=new THREE.Vector3(), qTmp=new THREE.Quaternion(), ZA=new THREE.Vector3(0,0,1);
  const pt=(bone,v)=>tmp.set(v[0],v[1],v[2]).applyMatrix4(bone.matrixWorld).clone();
  const toFloor=(w)=>w.clone().applyMatrix4(fxG.matrix.clone().invert());

  // ---- hit feel: freeze, squash (the game's boss contact squash: 11% wider, 5% shorter), shake, flash
  let hitstop=0, squash=0, shake=0, flash=0; const shakeV=new THREE.Vector3();
  function hitFeel(sh,stop,sq){ if(!feel)return; hitstop=Math.max(hitstop,stop); squash=Math.max(squash,sq); shake=Math.max(shake,sh); }

  // ---- effects (dim on purpose; Ember marks the floor warnings, its silence is the game's cold pale, Violet its power)
  const FXP=[], RINGS=[], MARKS=[], PATCH=[], MIST=[], BELL=[]; let dotTex=null, noteG=null, laneG=null, greatG=null, wave=null, rim=null, hushRing=null;
  let crack=0.35, crackTo=0.35, face=0.3, faceTo=0.3, bellL=0.2, bellTo=0.2, riseK=0, drainK=0, noteK=0, noteT=-1, laneT=-1, greatT=-1, waveT=-1, hushT=0, breathPh=0, bellsDown=0, idleT=0, deadT=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<180;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false,pull:null});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:PALE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,96),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,96),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f,r}; g.visible=false; fxG.add(g); return g;};
    // Still Note: an Ember ring of radius 1.8 u on the hero (2.3 u in the Third Stillness); the Great Hush: one of 4.6 u round itself
    noteG=flatRing(1.0); greatG=flatRing(GREAT_R);
    // Unringing: an Ember lane 1.3 u wide and up to 9 u long from its body, with a fill that runs down it
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),eMat(op)); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    const hw=LANE_W/2, L=LANE_LEN; laneG=new THREE.Group(); const lf=flat(LANE_W,L,0,L/2,0.14), le=[flat(0.035,L,-hw,L/2,0.6),flat(0.035,L,hw,L/2,0.6),flat(LANE_W,0.035,0,L,0.6),flat(LANE_W,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // the unringing itself: a low wave of pale stillness that runs down the lane
    wave=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W*0.9,1),new THREE.MeshBasicMaterial({color:PALE,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); wave.rotation.x=-Math.PI/2; wave.visible=false; fxG.add(wave);
    // patches of silence the note leaves from the Second Stillness on (slick, 3 s)
    for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:PALE,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); PATCH.push({m,t:-1,r:1.8}); }
    // marks on the floor
    for(let i=0;i<8;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x2a2a33,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); MARKS.push({m,t:-1,life:2.6,a:0.3}); }
    // the violet rim behind it (the only god-stuff on its body) and the mist its hem dissolves into (the game's glows)
    rim=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:VIOLET,transparent:true,depthWrite:false,opacity:0.08})); rim.scale.setScalar(3.2); scene.add(rim);
    for(let i=0;i<5;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:PALE,transparent:true,depthWrite:false,opacity:0.1})); s.scale.setScalar(1.1); scene.add(s); MIST.push(s); }
    // a hero's height, for scale and to take the hit; when hushed a pale ring hangs round it (slowed 35% for 1.5 s)
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
    hushRing=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.02,6,40),new THREE.MeshBasicMaterial({color:PALE,transparent:true,opacity:0,depthWrite:false})); hushRing.rotation.x=Math.PI/2; hushRing.position.y=0.55; dummy.add(hushRing);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.pull=o.pull||null; p.s.material.color.setHex(o.col||ASH); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.5,a:0.18,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  function rise(pos,n,spread,up,col,life){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.3,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.4,up*(0.5+Math.random()),(Math.random()-0.5)*0.4),{life:(life||1.3)*(0.7+Math.random()*0.6),s0:0.1,s1:0.04,a:0.35,col:col||PALE,drag:1.3}); } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||PALE);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function markAt(pos,o){ if(!fxOn)return; const m=MARKS.find(m=>m.t<0)||MARKS[0]; m.t=0; m.life=o.life||2.6; m.a=o.a||0.3; m.delay=o.delay||0; m.m.position.copy(o.local?pos:toFloor(pos)).setY(0.009); m.m.scale.set(o.sx||o.r||1,o.sz||o.r||1,1); m.m.rotation.set(-Math.PI/2,0,o.rot||0); m.m.material.color.setHex(o.col||0x2a2a33); m.m.visible=false; }
  function hideTele(){ if(noteG){noteG.visible=false;laneG.visible=false;greatG.visible=false;} noteT=-1; laneT=-1; greatT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); MARKS.forEach(m=>{m.t=-1;m.m.visible=false;}); PATCH.forEach(p=>{p.t=-1;p.m.visible=false;}); waveT=-1; if(wave)wave.visible=false; hushT=0; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const headPt=()=>pt(bones.head,[0,0.03,0.04]);
  const fingerPt=()=>pt(bones.fiL,[0,0.05,0]);
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.hold=0; dummy.position.set(0,0,z); } }
  function hitDummy(hush){ if(!dummy||!showTarget)return; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; if(hush)hushT=1.5; if(fxOn)sparks(targetW().setY(0.5),10,PEAK,2.0,0.3); }
  function fxStart(name){
    hideTele(); HOME=NEAR;
    if(name==='note'){ setHero(NEAR); if(fxOn){ noteT=0; const r=still>=3?NOTE_R3:NOTE_R; noteG.scale.set(r,1,r); noteG.position.copy(toFloor(targetW())).setY(0.012); noteG.visible=true; } }
    if(name==='unring'){ setHero(LANE_AT); if(dummy)dummy.userData.hold=2; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0.3)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw; } }
    if(name==='great'){ setHero(GREAT_AT); if(dummy)dummy.userData.hold=4; if(fxOn){ greatT=0; greatG.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.012); greatG.visible=true; } }
    if(name==='spawn'){ setStill(0); BELL.forEach(b=>b.drop=0); crack=0; face=0; bellL=0; bellsDown=0; deadT=0; cv.style.filter=''; if(fxOn){ const o=new THREE.Vector3(0,0,0); ringAt(o,{r0:0.3,r1:1.8,dur:0.6,a:0.35}); rise(o,18,1.2,1.4); markAt(o,{r:1.4,life:1.8,a:0.12,col:0x3a3a48}); } }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(headPt(),12,PALE,2.4,0.3); }
  }
  function fxContact(name,i){
    if(name==='note'){ hitFeel(0.5,0.05,0.5); const c=noteG.getWorldPosition(new THREE.Vector3()), r=noteG.scale.x; noteG.visible=false; noteT=-1;
      if(fxOn){ ringAt(fingerPt(),{r0:0.05,r1:0.5,dur:0.3,a:0.35,bill:true}); ringAt(c,{r0:0.3,r1:r+0.1,dur:0.32,a:0.5}); ringAt(c,{r0:0.2,r1:r*0.8,dur:0.45,a:0.3,delay:0.06,col:PEAK}); ringAt(c,{r0:r-0.1,r1:r+0.1,dur:0.22,a:0.45,col:EMBER}); rise(c,12,r,0.8);
        // from the Second Stillness on the note leaves a patch of silence (3 s)
        if(still>=2){ const p=PATCH.find(p=>p.t<0)||PATCH[0]; p.t=0; p.r=r; p.m.position.copy(toFloor(c)).setY(0.008); p.m.scale.setScalar(r); p.m.visible=true; } }
      if(dummy&&showTarget&&targetW().distanceTo(c.setY(0))<r+0.3)hitDummy(true); }
    if(name==='unring'){ hitFeel(0.6,0.05,0.55); laneT=Math.max(laneT,LANE_T);
      if(fxOn){ waveT=0; wave.visible=true; ringAt(headPt(),{r0:0.1,r1:0.9,dur:0.35,a:0.35,bill:true});
        for(let k=1;k<=4;k++){ const z=LANE_LEN*(k-0.5)/4; markAt(new THREE.Vector3(0,0,z).applyAxisAngle(Y,-floorYaw).add(laneG.position),{sx:0.5,sz:1.0,rot:-floorYaw,life:2.2,a:0.25,local:true,delay:0.05*k,col:0x3a3a48}); } }
      if(dummy&&showTarget){ const d=dummy.userData; if(Math.abs(d.x)<LANE_W/2+0.3&&d.z>-0.3&&d.z<LANE_LEN+0.3)hitDummy(false); } }
    if(name==='great'){
      if(i===0){ hitFeel(0.9,0.08,0.8); greatG.visible=false; greatT=-1; const c=new THREE.Vector3(0,0,0);
        if(fxOn){ ringAt(c,{r0:0.6,r1:GREAT_R,dur:0.35,a:0.5,col:EMBER}); ringAt(c,{r0:0.6,r1:GREAT_R+0.4,dur:0.6,a:0.4,delay:0.03}); ringAt(c,{r0:0.6,r1:GREAT_R+1.2,dur:0.85,a:0.22,delay:0.08,col:PEAK}); ringAt(headPt(),{r0:0.2,r1:1.6,dur:0.4,a:0.4,bill:true,col:PEAK}); markAt(c,{r:GREAT_R,life:3,a:0.06,col:0x3a3a48}); }
        if(dummy&&showTarget&&targetW().length()<GREAT_R+0.3)hitDummy(false); }
      else { hitFeel(0.35,0,0.3); if(fxOn){ dust(new THREE.Vector3(0,0,0),12,1.4,0.3,ASH); ringAt(new THREE.Vector3(0,0,0),{r0:0.4,r1:1.6,dur:0.5,a:0.25,col:ASH}); } } }
    if(name==='stillness'){ hitFeel(0.45,0.04,0.4); const k=still>=3?0:still; if(still>=3){ setStill(0); BELL.forEach(b=>b.drop=0); } setStill(k+1);
      if(fxOn){ const b=BELL[k].b.getWorldPosition(new THREE.Vector3()); ringAt(b,{r0:0.05,r1:0.6,dur:0.35,a:0.45,bill:true,col:PEAK}); sparks(b,8,PALE,1.2,0.4); ringAt(new THREE.Vector3(0,0,0),{r0:0.4,r1:2.6,dur:0.7,a:0.3}); ringAt(fingerPt(),{r0:0.05,r1:0.4,dur:0.25,a:0.35,bill:true}); } }
    if(name==='spawn'){ hitFeel(0.25,0.02,0.2); if(fxOn){ ringAt(fingerPt(),{r0:0.05,r1:0.5,dur:0.3,a:0.35,bill:true}); ringAt(new THREE.Vector3(0,0,0),{r0:0.3,r1:1.6,dur:0.5,a:0.3}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.5,0.05,0.4); flash=0.4; if(fxOn)sparks(headPt(),12,PALE,2.0,0.35); } else { hitFeel(0.4,0,0.3); if(fxOn){ const c=new THREE.Vector3(0,0,0); dust(c,14,1.6,0.5,ASH); ringAt(c,{r0:0.4,r1:1.8,dur:0.5,a:0.3,col:ASH}); rise(c,18,1.2,1.2,PALE,1.8); } } }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, m=META[n];
    const hit=m.contact[0]||0;
    if(n==='note'){ noteK=t<hit?Math.min(1,t/hit):Math.max(0,1-(t-hit)/0.3); }
    if(n==='unring'){ noteK=t<hit?Math.min(1,t/hit):Math.max(0,1-(t-hit)/0.3); faceTo=t<hit+0.2?0.8:0.3; }
    if(n==='great'){ const dr=m.cues.drained; riseK=t<dr[0]?Math.min(1,t/GREAT_T):Math.max(0,1-(t-dr[0])/0.25); drainK=t>=dr[0]&&t<dr[1]?Math.min(1,(t-dr[0])/0.3):(t>=dr[1]?Math.max(0,1-(t-dr[1])/0.4):0);
      // the sound drawn out of the room: pale motes pulled in from the ring's edge
      if(t<hit&&fxOn&&Math.random()<d*40){ const a=Math.random()*Math.PI*2, r=GREAT_R*(0.8+Math.random()*0.25); const p=new THREE.Vector3(Math.sin(a)*r,0.2+Math.random()*1.2,Math.cos(a)*r); puff(p,p.clone().multiplyScalar(-1.1).setY(0.6),{life:0.9,s0:0.08,s1:0.03,a:0.35,col:PALE,drag:0.3}); } }
    if(n==='stillness'){ faceTo=t>0.4&&t<1.1?0.7:0.3; }
    if(n==='spawn'){ crackTo=t>0.4?0.35:0.05; faceTo=t>0.5?0.3:0; bellTo=t>0.6?0.2:0; bellsDown=Math.max(0,1-t/0.6); if(t>0.05&&t<0.8&&Math.random()<d*20)puff(new THREE.Vector3((Math.random()-0.5)*1.4,0.1,(Math.random()-0.5)*1.4),new THREE.Vector3(0,0.8+Math.random(),0),{life:1.0,s0:0.12,s1:0.3,a:0.18,col:PALE}); }
    if(n==='death'){ const o=m.cues.out; crackTo=t<o[0]?1.2:Math.max(0,1-(t-o[0])/1.2); faceTo=t<o[0]?0.8:Math.max(0,0.3-(t-o[0])*0.4); bellTo=t<o[0]?0.5:0; deadT=Math.max(0,(t-o[0])/1.2); if(t>2.2)cv.style.filter='saturate(0.45)'; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=NEAR; if(noteT>=0||greatT>=0)hideTele(); noteK=Math.max(0,noteK-d*3); riseK=Math.max(0,riseK-d*3); drainK=Math.max(0,drainK-d*3); }
    // the crack breathes a cold light; it blazes for the Great Hush and dies down drained; as it weakens it breathes slower (the game's rule)
    breathPh+=d*(0.8-0.06*still)*Math.PI; const breath=0.5+0.5*Math.sin(breathPh);
    if(!busy||['walk','turnL','turnR','idle','heavyHit','note','unring','great','stillness'].includes(shot.name)){ if(!sel.dead){ crackTo=Math.min(1.2,(0.35+0.25*breath+0.6*noteK+0.8*riseK)*(1-0.75*drainK)); if(!busy){faceTo=0.3; bellTo=0.2+0.3*riseK;} else if(shot.name==='great')bellTo=0.2+0.5*riseK; } else { crackTo=0; faceTo=0; bellTo=0; } }
    crack+=(crackTo-crack)*Math.min(1,d*6); face+=(faceTo-face)*Math.min(1,d*6); bellL+=(bellTo-bellL)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; gA.value.set(on*0.45*crack,on*0.35*face,on*bellL,feel?flash:0);
    const dT=Math.min(1,deadT), dl=[0,1,2,3,4].map(k=>Math.min(1,BELL[k]?BELL[k].drop:0)); gD.value.set(Math.max(dl[0],dT),Math.max(dl[1],dT),Math.max(dl[2],dT),Math.max(dl[3],dT)); gD5.value=Math.max(dl[4],dT);
    const lv=dl.map(x=>1-x); gL.value.set(lv[0],lv[1],lv[2],lv[3]); gL5.value=lv[4];
    pool.material.opacity=sel.dead?Math.max(0,pool.material.opacity-d*0.2):(0.1+0.04*breath+0.2*riseK)*(1-0.6*drainK)*on;
    rim.position.copy(pt(bones.chest,[0,0.02,-0.12])); rim.material.opacity=sel.dead?Math.max(0,rim.material.opacity-d*0.2):(0.06+0.1*riseK+0.03*still)*on;
    idleT+=d; MIST.forEach((s,i)=>{ const a=idleT*0.25+i/5*Math.PI*2, r=0.7+0.3*Math.sin(idleT*0.6+i)+0.8*riseK; s.position.set(Math.cos(a)*r,0.25+0.1*Math.sin(idleT+i),Math.sin(a)*r); s.material.opacity=sel.dead?0:(0.08+0.06*riseK+0.05*drainK)*on; });
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    MARKS.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=(m.t-m.delay)/m.life; if(u<0){m.m.visible=false;return;} if(u>=1){m.t=-1;m.m.visible=false;return;} m.m.visible=true; m.m.material.opacity=m.a*(u<0.05?u/0.05:1-Math.max(0,(u-0.6)/0.4)); });
    PATCH.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t/3; if(u>=1||!fxOn){p.t=-1;p.m.visible=false;return;} p.m.material.opacity=0.16*(u<0.08?u/0.08:1-Math.max(0,(u-0.7)/0.3)); });
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    if(noteT>=0){ noteT+=d; fill(noteG,noteT,NOTE_T); if(!fxOn)hideTele(); }
    if(greatT>=0){ greatT+=d; fill(greatG,greatT,GREAT_T); if(!fxOn)hideTele(); }
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/LANE_T), out=Math.max(0,(laneT-LANE_T)/0.26); if(out>=1||!fxOn){ laneG.visible=false; laneT=-1; } else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=LANE_LEN/2*k; u.lf.material.opacity=(laneT>LANE_T?0.4:(0.08+0.1*k+0.02*Math.sin(laneT*24)*k))*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    if(waveT>=0){ waveT+=d; const sweep=0.4, u=waveT/(sweep+0.35); if(u>=1||!fxOn){ waveT=-1; wave.visible=false; } else { const z=LANE_LEN*Math.min(1,waveT/sweep); wave.scale.set(1,1.4,1); wave.position.copy(laneG.position).add(new THREE.Vector3(0,0.03,0.3+z).applyAxisAngle(Y,-floorYaw)); wave.rotation.set(-Math.PI/2,0,-floorYaw); wave.material.opacity=0.32*(u<0.7?1:1-(u-0.7)/0.3); if(Math.random()<d*40)puff(toFloorInv(wave.position).setY(0.15),new THREE.Vector3((Math.random()-0.5)*0.6,0.5,(Math.random()-0.5)*0.6),{life:0.6,s0:0.1,s1:0.04,a:0.3,col:PALE}); } }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x;
      hushT=Math.max(0,hushT-d); hushRing.material.opacity=(hushT>0?0.55*Math.min(1,hushT/0.3):0)*on; hushRing.rotation.z+=d*0.6; }
  }
  const toFloorInv=(p)=>p.clone().applyMatrix4(fxG.matrix);
  // after the clips: the five small bells circle it and sway, the stilled ones hang dead (the game's code moves them the same way)
  function overlay(d){
    const t=idleT, drain=drainK, rk=riseK;
    bones.orbit.quaternion.setFromAxisAngle(Y,t*0.35*(1-0.8*drain)); bones.orbit.position.y=bones.orbit.userData.y0??(bones.orbit.userData.y0=bones.orbit.position.y);
    bones.orbit.position.y=bones.orbit.userData.y0+0.27*rk/1;
    BELL.forEach((b,k)=>{ const isDead=k<still; b.drop+=((isDead?1:0)-b.drop)*Math.min(1,d*5);
      const r=1+0.48*rk; let y=b.home.y+(1-b.drop)*0.045*Math.sin(t*1.3+b.ph)/1-0.18*b.drop;
      const fl=-bones.orbit.userData.y0+0.03; if(sel.dead||deadT>0){ y=y-(y-fl)*Math.min(1,deadT*1.2); }
      if(bellsDown>0)y=y*(1-bellsDown)+fl*bellsDown;
      b.b.position.set(b.home.x*r,y,b.home.z*r);
      b.sway+=(((isDead||sel.dead)?0:0.35*Math.sin(t*3+b.ph))-b.sway)*Math.min(1,d*8); b.b.quaternion.setFromAxisAngle(ZA,b.sway);
      b.b.scale.setScalar(bellsDown>0.98?0.001:1); });
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
    mixer.update(md);
    if(!sel.dead)deadT=0;
    overlay(md);
    let dz=0, dyaw=0; dz+=A.walk.__w*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;
    if(shot&&!shot.done){ const tz=travelAt(shot.name,shot.action.time); const dd=tz-shot.tz; shot.tz=tz; dz+=dd; if(dummy&&dd)dummy.userData.z-=dd; }
    if(dz||dyaw)moveFloor(dz,dyaw);
    if(shot){ const m=META[shot.name], t=shot.action.time; m.contact.forEach((c,i)=>{ if(c>=0&&shot.prev<c&&t>=c)fxContact(shot.name,i); }); fxOngoing(md); shot.prev=t; }
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
