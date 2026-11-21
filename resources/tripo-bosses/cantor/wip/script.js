(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.4;
  const VIOLET=0x8F63EE, PEAK=0xE6DDF8, EMBER=0xFF5A36, DUST=0x8d8478, INK=0x1c1a21, ASH=0x6b6570;
  const LAND=[null,0x8aa35a,0x6f98c4,0x8d8478]; // the verse's land in the motes: moss green, millrace blue, ash
  const LABEL={idle:'Idle',walk:'Glide',back:'Back away',turnL:'Turn left',turnR:'Turn right',note:'Hollow Note',lance:'Sung Lance',pulse:'Heart Pulse',step:'Echo Step',fade:'Echo Step',rise:'Echo Step',verse:'Verse',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['note','lance','pulse','step','verse','heavyHit'];
  const NEAR=4.2, CLOSE=2.4, CROWD=1.6, LANCE_AT=6.0; let HOME=NEAR; // where the hero stands, in u, in front of it: inside the 3 to 5.5 u it keeps, closer for the Heart Pulse and the Echo Step
  const WALK=1.35, BACK=0.7*1.35, TURN=120*Math.PI/180, RING_T=48/60, LANE_T=54/60, PULSE_T=60/60, LANE_LEN=9.0, STEP_BACK=4.5;
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.9));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.14,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(0.5,0.5,1); blob.position.set(0,0.004,0.05); scene.add(blob);
  // the classic's violet pool under it, beating with the heart
  const pool=new THREE.Mesh(new THREE.CircleGeometry(0.85,40),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.1,depthWrite:false}));
  pool.rotation.x=-Math.PI/2; pool.position.set(0,0.006,0.05); scene.add(pool);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.5; orbit.maxDistance=32;
  const VIEWS={Close:{p:[5.4,3.0,7.4],t:[0,1.45,1.0]},'Game zoom':{p:[0,12.5,11.2],t:[0,0.6,2.4]},Side:{p:[12,2.0,1.6],t:[0,1.4,1.4]},Front:{p:[0.8,2.2,12],t:[0,1.4,0]},Back:{p:[-3.8,3.2,-8.6],t:[0,1.3,0.6]},Top:{p:[0,17,0.4],t:[0,0.4,2.0]}};
  function setView(n){const v=VIEWS[n];cam.position.set(...v.p);orbit.target.set(...v.t);orbit.update();}
  function size(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  new ResizeObserver(size).observe(stage); size(); setView('Close');

  // ---- controls
  function group(id,names,onPick,active){const row=$(id);const btns={};names.forEach(n=>{const b=document.createElement('button');b.textContent=LABEL[n]||n;b.dataset.k=n;b.setAttribute('aria-pressed',String(n===active));b.onclick=()=>onPick(n,b);row.appendChild(b);btns[n]=b;});return btns;}
  const sel={base:'idle',going:'Forward',action:null,dead:false};
  let verse=0;
  let speed=1, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, feel=true, fxOn=true, showTarget=true, helper=null;
  const B={};
  B.moves=group('moves',['idle','walk','spawn','death'],k=>pick(k),'idle');
  B.dirs=group('dirs',['Forward','Back away','Turn left','Turn right'],k=>{sel.going=k;if(sel.base!=='walk'&&!sel.dead)sel.base='walk';refresh();},'Forward');
  B.acts=group('acts',[...ACTIONS,'hurt'],k=>pick(k),null);
  B.verses=group('verses',['None','I','II','III'],k=>{setVerse(['None','I','II','III'].indexOf(k));},'None');
  B.speeds=group('speeds',['0.1×','0.25×','0.5×','1×'],(k)=>{speed=parseFloat(k);Object.values(B.speeds).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'1×');
  B.views=group('views',Object.keys(VIEWS),k=>{setView(k);Object.values(B.views).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'Close');
  const toggle=(id,get,set)=>{const b=$(id);b.onclick=()=>{set(!get());b.setAttribute('aria-pressed',String(get()));};b.setAttribute('aria-pressed',String(get()));};
  toggle('feel',()=>feel,v=>feel=v); toggle('fx',()=>fxOn,v=>{fxOn=v;if(!v)clearFx();}); toggle('target',()=>showTarget,v=>{showTarget=v;if(dummy)dummy.visible=v;});
  toggle('bones',()=>!!(helper&&helper.visible),v=>{if(helper)helper.visible=v;}); toggle('pause',()=>paused,v=>paused=v);
  function setVerse(v){ verse=v; Object.values(B.verses).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===v))); }

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, hurtAct=null, shot=null, dummy=null;
  const gA={value:new THREE.Vector4(0.3,0,0.3,0)}, gB={value:new THREE.Vector4(0.2,0.15,0.3,0.12)}, gN={value:new THREE.Vector4(0,0,0,0)}, gN2={value:new THREE.Vector3(0,0,0)};
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // glow masks: x the eyes (1) and the mouth (0.5); y the heart; z the halo (1), the runes (0.5), the motes (0.75) and each note (0.01 a note)
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uA:gA,uB:gB,uN:gN,uN2:gN2});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uA;\nuniform vec4 uB;\nuniform vec4 uN;\nuniform vec3 uN2;\nfloat isN(float z,float k){return 1.0-step(0.004,abs(z-0.01*(k+1.0)));}')
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'float ex=vMask.x, ez=vMask.z;',
          'float eyeM=step(0.75,ex), mouthM=step(0.25,ex)*(1.0-step(0.75,ex));',
          'float haloM=step(0.95,ez), runeM=step(0.45,ez)*(1.0-step(0.55,ez)), moteM=step(0.7,ez)*(1.0-step(0.8,ez)), noteM=step(0.005,ez)*(1.0-step(0.075,ez));',
          'float lit=uN.x*isN(ez,0.0)+uN.y*isN(ez,1.0)+uN.z*isN(ez,2.0)+uN.w*isN(ez,3.0)+uN2.x*isN(ez,4.0)+uN2.y*isN(ez,5.0)+uN2.z*isN(ez,6.0);',
          'totalEmissiveRadiance+=vec3(0.75,0.35,1.0)*uA.x*eyeM+vec3(0.6,0.3,1.0)*uA.y*mouthM+vec3(0.7,0.3,1.0)*uA.z*vMask.y+vec3(0.55)*uA.w;',
          'totalEmissiveRadiance+=vec3(0.7,0.42,1.0)*uB.x*haloM+vec3(0.85,0.8,1.0)*uB.y*runeM+vec3(0.7,0.45,1.0)*uB.z*moteM+vec3(0.72,0.5,1.0)*(uB.w+0.75*lit)*noteM;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(chest|neck|head|jaw)\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&!['spawn','fade','rise'].includes(c.name)));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    // the halo turns on its own axis (the ring leans back at the top)
    haloAx.set(0,Math.sin(0.2094),Math.cos(0.2094));
    for(let k=0;k<6;k++){ const b=bones['mote'+k]; MOTE.push({b,home:b.position.clone(),a:Math.atan2(b.position.x,b.position.z-0.03),r:Math.hypot(b.position.x,b.position.z-0.03),y:b.position.y,ph:k*1.3}); }
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,verse,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringG.visible,laneG.visible,pulseG.visible],shards:SHARDS.filter(s=>s.on).length,beam:+beam.material.opacity.toFixed(2),pillar:PILLARS.filter(p=>p.t>=0).length,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glowA:gA.value.toArray().map(v=>+v.toFixed(2)),glowB:gB.value.toArray().map(v=>+v.toFixed(2)),lit:[...gN.value.toArray(),...gN2.value.toArray()].map(v=>+v.toFixed(1)),mote0:bones.mote0.position.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

  // ---- what plays
  function baseName(){return sel.dead?null:sel.base==='walk'?({'Forward':'walk','Back away':'back','Turn left':'turnL','Turn right':'turnR'})[sel.going]:'idle';}
  function startShot(name,hold,next){ if(!A[name])return; if(shot){shot.action.__w=0;shot.action.setEffectiveWeight(0);}
    const a=A[name]; a.reset(); a.paused=false; a.__w=1; a.setEffectiveWeight(1); Object.entries(A).forEach(([k,x])=>{if(x!==a){x.__w=Math.min(x.__w,0.0);x.setEffectiveWeight(x.__w);}});
    shot={name,action:a,prev:0,hold:!!hold,done:false,gap:0,tz:0,next:next||null}; fxStart(name); }
  const playAction=(k)=>k==='step'?startShot('fade',false,'rise'):startShot(k);
  const actionOf=(n)=>(n==='fade'||n==='rise')?'step':n;
  function pick(k){
    if(!mixer)return;
    if(k==='idle'||k==='walk'){ if(sel.dead)return; sel.base=k; }
    else if(k==='spawn'){ sel.dead=false; sel.action=null; cv.style.filter=''; startShot('spawn'); }
    else if(k==='death'){ if(sel.dead){ sel.dead=false; cv.style.filter=''; startShot('spawn'); } else { sel.dead=true; sel.action=null; startShot('death',true); } }
    else if(k==='hurt'){ if(sel.dead)return; hurtAct.reset(); hurtAct.setEffectiveWeight(1); hurtAct.play(); hitFeel(0.3,0.04,0.5); flash=0.35; if(fxOn)sparks(chestPt(),6,PEAK,1.6,0.25); }
    else { if(sel.dead)return; sel.action=sel.action===k?null:k; if(sel.action&&(!shot||shot.done||actionOf(shot.name)!==k))playAction(k); }
    refresh();
  }
  function refresh(){
    Object.values(B.moves).forEach(b=>{const k=b.dataset.k; b.setAttribute('aria-pressed',String(k==='death'?sel.dead:k==='spawn'?!!(shot&&shot.name==='spawn'&&!shot.done):!sel.dead&&sel.base===k)); b.disabled=sel.dead&&(k==='idle'||k==='walk'); b.textContent=k==='death'&&sel.dead?'Death (press to spawn)':LABEL[k];});
    Object.values(B.dirs).forEach(b=>{b.setAttribute('aria-pressed',String(sel.base==='walk'&&!sel.dead&&b.dataset.k===sel.going)); b.disabled=sel.dead;});
    Object.values(B.acts).forEach(b=>{b.setAttribute('aria-pressed',String(sel.action===b.dataset.k)); b.disabled=sel.dead;});
  }
  function showPhase(){
    const el=$('layers'), ph=$('phases'), tag=$('clipname'); const bn=baseName(); const vs=verse?' · verse '+['','I','II','III'][verse]:'';
    if(shot&&!shot.done){ const m=META[shot.name], t=shot.action.time; let cur=''; m.phases.forEach(p=>{if(t>=p[1])cur=p[0];});
      el.textContent=LABEL[shot.name]+(cur?' · '+cur:'')+' · '+t.toFixed(2)+' s'+vs; tag.textContent=LABEL[shot.name];
      if(ph.dataset.name!==shot.name){ph.dataset.name=shot.name; ph.innerHTML=m.phases.map((p,i)=>{const e=i+1<m.phases.length?m.phases[i+1][1]:m.dur;return '<span style="--w:'+Math.max(0.04,(e-p[1])).toFixed(3)+'">'+p[0]+'</span>';}).join('')+'<i></i>'; ph.hidden=!m.phases.length;}
      const spans=ph.querySelectorAll('span'); m.phases.forEach((p,i)=>spans[i]&&spans[i].classList.toggle('on',p[0]===cur)); const mk=ph.querySelector('i'); if(mk)mk.style.left=(100*Math.min(1,t/m.dur)).toFixed(1)+'%';
    } else { el.textContent=sel.dead?'Down. Press Death again to spawn it back in.':(LABEL[bn]||'')+(sel.action?' · '+LABEL[sel.action]+' repeats':'')+vs; tag.textContent=sel.dead?'Death':LABEL[bn]||''; ph.hidden=true; ph.dataset.name=''; }
  }

  // ---- floor motion: the floor moves under it, it stays in the middle of the stage
  const floorPos=new THREE.Vector3(); let floorYaw=0;
  function moveFloor(dz,dyaw){
    floorPos.z-=dz; if(dyaw){ floorPos.applyAxisAngle(Y,-dyaw); floorYaw-=dyaw; }
    fxG.matrix.makeRotationY(floorYaw).setPosition(floorPos);
    const l=floorPos.clone().applyAxisAngle(Y,-floorYaw); l.x-=Math.round(l.x); l.z-=Math.round(l.z); l.applyAxisAngle(Y,floorYaw); gridG.matrix.makeRotationY(floorYaw).setPosition(l);
  }
  const Y=new THREE.Vector3(0,1,0), tmp=new THREE.Vector3(), tmp2=new THREE.Vector3(), haloAx=new THREE.Vector3(0,0,1), qTmp=new THREE.Quaternion();
  const pt=(bone,v)=>tmp.set(v[0],v[1],v[2]).applyMatrix4(bone.matrixWorld).clone();
  const toFloor=(w)=>w.clone().applyMatrix4(fxG.matrix.clone().invert());

  // ---- hit feel: freeze, squash (the game's boss contact squash: 11% wider, 5% shorter), shake, flash
  let hitstop=0, squash=0, shake=0, flash=0; const shakeV=new THREE.Vector3();
  function hitFeel(sh,stop,sq){ if(!feel)return; hitstop=Math.max(hitstop,stop); squash=Math.max(squash,sq); shake=Math.max(shake,sh); }

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is its power)
  const FXP=[], RINGS=[], SHARDS=[], PILLARS=[], MARKS=[], MOTE=[]; let dotTex=null, ringG=null, laneG=null, pulseG=null, beam=null;
  let eyes=1, eyesTo=1, mouth=0, heartG=0.35, heartTo=0.35, haloG=0.2, haloTo=0.2, ringT=-1, laneT=-1, pulseT=-1, beamT=-1, notesOff=0, motesFly=0, motesDown=0, notesTurn=0, beatPh=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<160;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r,op)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,72),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,72),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f}; g.visible=false; fxG.add(g); return g;};
    // Hollow Note: an Ember ring of radius 1.7 u on the hero; Heart Pulse: one of 3.2 u round itself
    ringG=flatRing(1.7); pulseG=flatRing(3.2);
    // Sung Lance: an Ember lane 1.2 u wide and up to 9 u long from its chest, with a fill that runs down it
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),eMat(op)); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    laneG=new THREE.Group(); const L=LANE_LEN, lf=flat(1.2,L,0,L/2,0.14), le=[flat(0.035,L,-0.6,L/2,0.6),flat(0.035,L,0.6,L/2,0.6),flat(1.2,0.035,0,L,0.6),flat(1.2,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // the sung lance itself: a violet beam from its chest down the lane, with a pale core
    beam=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.1,1),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); const core=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.04,1),new THREE.MeshBasicMaterial({color:PEAK,transparent:true,opacity:0,depthWrite:false})); beam.add(core); beam.userData.core=core; beam.visible=false; fxG.add(beam);
    // echo shards: crystal darts that fly out of the note's burst along the floor
    const sm=new THREE.MeshStandardMaterial({color:0xb79cf0,emissive:VIOLET,emissiveIntensity:0.35,roughness:0.4,flatShading:true});
    for(let i=0;i<10;i++){ const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.1,0),sm); m.scale.set(0.6,0.6,1.9); m.visible=false; fxG.add(m); SHARDS.push({m,on:false,p:new THREE.Vector3(),v:new THREE.Vector3(),d:0}); }
    // columns of violet light (the verse, the echo step, the death)
    for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,32,1,true),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; fxG.add(m); PILLARS.push({m,t:-1,dur:1,r:1,h:4,a:0.3}); }
    // marks left on the floor: gouges down the lane, cracks round the pulse, a sigil where it lands
    for(let i=0;i<10;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x2a2233,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); MARKS.push({m,t:-1,life:2.6,a:0.3}); }
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.5,a:0.2,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  function rise(pos,n,spread,up,col,life){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.3,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.4,up*(0.5+Math.random()),(Math.random()-0.5)*0.4),{life:(life||1.3)*(0.7+Math.random()*0.6),s0:0.08,s1:0.03,a:0.4,col:col||VIOLET,drag:1.3}); } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(o.local?pos:toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function pillarAt(pos,o){ if(!fxOn)return; const p=PILLARS.find(p=>p.t<0)||PILLARS[0]; p.t=0; p.dur=o.dur||1; p.r=o.r||0.8; p.h=o.h||4; p.a=o.a||0.3; p.delay=o.delay||0; p.m.position.copy(toFloor(pos)).setY(p.h/2); p.m.scale.set(p.r,p.h,p.r); p.m.visible=false; }
  function markAt(pos,o){ if(!fxOn)return; const m=MARKS.find(m=>m.t<0)||MARKS[0]; m.t=0; m.life=o.life||2.6; m.a=o.a||0.3; m.delay=o.delay||0; m.m.position.copy(o.local?pos:toFloor(pos)).setY(0.009); m.m.scale.set(o.sx||o.r||1,o.sz||o.r||1,1); m.m.rotation.set(-Math.PI/2,0,o.rot||0); m.m.material.color.setHex(o.col||0x2a2233); m.m.visible=false; }
  function hideTele(){ if(ringG){ringG.visible=false;laneG.visible=false;pulseG.visible=false;} ringT=-1; laneT=-1; pulseT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); SHARDS.forEach(s=>{s.on=false;s.m.visible=false;}); PILLARS.forEach(p=>{p.t=-1;p.m.visible=false;}); MARKS.forEach(m=>{m.t=-1;m.m.visible=false;}); beamT=-1; if(beam)beam.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const mouthPt=()=>pt(bones.jaw,[0,0.004,0.03]);
  const chestPt=()=>pt(bones.heart,[0,0,0.02]);
  const haloPt=()=>bones.halo.getWorldPosition(new THREE.Vector3());
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.hold=0; dummy.position.set(0,0,z); } }
  function hitDummy(){ if(!dummy||!showTarget)return; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),10,PEAK,2.2,0.3); }
  function fxStart(name){
    hideTele(); HOME=NEAR;
    if(name==='note'){ setHero(NEAR); if(fxOn){ ringT=0; ringG.position.copy(toFloor(targetW())).setY(0.012); ringG.visible=true; } }
    if(name==='lance'){ setHero(LANCE_AT); if(dummy)dummy.userData.hold=2; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0.2)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw; } }
    if(name==='pulse'){ setHero(CLOSE); if(fxOn){ pulseT=0; pulseG.position.copy(toFloor(new THREE.Vector3(0,0,0.05))).setY(0.012); pulseG.visible=true; } }
    if(name==='fade'){ setHero(CROWD); if(dummy)dummy.userData.hold=2; if(fxOn){ pillarAt(new THREE.Vector3(0,0,0.05),{r:0.5,h:3.4,dur:0.45,a:0.35}); ringAt(new THREE.Vector3(0,1.6,0.1),{r0:0.2,r1:1.0,dur:0.25,a:0.4,bill:true,col:PEAK}); rise(new THREE.Vector3(0,1.0,0.05),14,0.6,1.0); } }
    if(name==='verse'){ setHero(NEAR); }
    if(name==='spawn'){ eyes=0; heartG=0; haloG=0; notesOff=0; motesDown=0; cv.style.filter=''; if(fxOn){ const o=new THREE.Vector3(0,0,0.05); ringAt(o,{r0:0.3,r1:1.8,dur:0.6,a:0.35}); rise(o,16,1.2,1.4); markAt(o,{r:1.4,life:1.8,a:0.1,col:0x3a2f48}); } }
    if(name==='death'){ setVerse(verse); }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn){ sparks(chestPt(),12,PEAK,2.4,0.3); } }
  }
  function noteBurst(c){ // the burst at the note: three rings, the flash and the motes the game draws
    ringAt(c,{r0:0.3,r1:1.9,dur:0.32,a:0.5}); ringAt(c,{r0:0.2,r1:1.5,dur:0.4,a:0.3,delay:0.06,col:PEAK}); ringAt(c,{r0:1.7,r1:1.9,dur:0.22,a:0.45,col:EMBER}); rise(c,14,1.2,1.2); dust(c,8,1.6,0.6,ASH); }
  function fxContact(name,i){
    if(name==='note'){ hitFeel(0.5,0.05,0.5); const c=ringG.getWorldPosition(new THREE.Vector3()); ringG.visible=false; ringT=-1;
      if(fxOn){ ringAt(mouthPt(),{r0:0.05,r1:0.6,dur:0.3,a:0.4,bill:true}); noteBurst(c);
        if(verse>=2){ notesTurn=(notesTurn+1)%2; const cl=toFloor(c); for(let k=0;k<5;k++){ const s=SHARDS.find(s=>!s.on); if(!s)break; const a=notesTurn*Math.PI/5+k/5*Math.PI*2; s.on=true; s.d=0; s.p.set(cl.x,0.25,cl.z); s.v.set(Math.cos(a),0,Math.sin(a)).multiplyScalar(5.0); s.m.position.copy(s.p); s.m.lookAt(s.p.x+s.v.x,0.25,s.p.z+s.v.z); s.m.visible=true; } } }
      if(dummy&&showTarget&&targetW().distanceTo(c.setY(0))<1.7+0.3)hitDummy(); }
    if(name==='lance'){ hitFeel(0.7,0.06,0.6); const u=laneG.userData; laneT=Math.max(laneT,LANE_T);
      if(fxOn){ beamT=0; beam.visible=true; const p=toFloor(new THREE.Vector3(0,0,0)); beam.position.set(p.x,0.9,p.z); beam.rotation.set(0,-floorYaw,0); ringAt(mouthPt(),{r0:0.05,r1:0.7,dur:0.3,a:0.4,bill:true});
        for(let k=1;k<=5;k++){ const z=LANE_LEN*(k-0.5)/5; markAt(new THREE.Vector3(0,0,z).applyAxisAngle(Y,-floorYaw).add(laneG.position),{sx:0.35,sz:1.1,rot:-floorYaw,life:2.6,a:0.38,local:true,delay:0.06*k}); }
        sparks(new THREE.Vector3(0,0.5,LANE_LEN*0.3),6,EMBER,1.8,0.4); sparks(new THREE.Vector3(0,0.5,LANE_LEN*0.6),6,VIOLET,1.8,0.4); }
      if(dummy&&showTarget){ const d=dummy.userData; if(Math.abs(d.x)<0.6+0.3&&d.z>-0.3&&d.z<LANE_LEN+0.3)hitDummy(); } }
    if(name==='pulse'){ hitFeel(0.8,0.07,0.8); pulseG.visible=false; pulseT=-1; motesFly=1; const c=new THREE.Vector3(0,0,0.05);
      if(fxOn){ ringAt(c,{r0:0.4,r1:3.2,dur:0.3,a:0.5,col:EMBER}); ringAt(c,{r0:0.4,r1:4.0,dur:0.55,a:0.4,delay:0.03}); ringAt(c,{r0:0.4,r1:5.1,dur:0.75,a:0.22,delay:0.08,col:PEAK}); ringAt(chestPt(),{r0:0.1,r1:1.2,dur:0.3,a:0.4,bill:true});
        for(let k=0;k<7;k++){ const a=k/7*Math.PI*2+Math.random()*0.4; markAt(new THREE.Vector3(Math.sin(a)*1.4,0,0.05+Math.cos(a)*1.4),{sx:0.12,sz:1.2,rot:-a,life:2.2,a:0.4}); }
        markAt(c,{r:3.3,life:4,a:0.09,col:0x3a2f48}); sparks(chestPt(),14,VIOLET,2.6,0.6); dust(c,10,2.0,0.3,ASH); }
      if(dummy&&showTarget&&targetW().length()<3.2+0.3)hitDummy(); }
    if(name==='rise'){ hitFeel(0.3,0.02,0.3); if(fxOn){ const c=new THREE.Vector3(0,0,0.05); ringAt(c,{r0:0.3,r1:2.0,dur:0.4,a:0.4}); ringAt(mouthPt(),{r0:0.05,r1:0.6,dur:0.3,a:0.35,bill:true}); rise(c,14,0.8,1.3); } }
    if(name==='verse'){ hitFeel(0.45,0.04,0.4); setVerse(verse>=3?1:verse+1); if(fxOn){ const c=new THREE.Vector3(0,0,0.05); pillarAt(c,{r:0.8,h:4.2,dur:1.1,a:0.32}); ringAt(c,{r0:0.4,r1:4.2,dur:0.9,a:0.35}); markAt(c,{r:2.2,life:3.4,a:0.08,col:0x3a2f48}); rise(c,20,1.4,1.6,VIOLET,1.6); rise(c,14,1.8,1.4,LAND[verse],1.4); ringAt(haloPt(),{r0:0.3,r1:1.2,dur:0.4,a:0.4,bill:true,col:PEAK}); } }
    if(name==='spawn'){ hitFeel(0.25,0.02,0.2); if(fxOn){ ringAt(mouthPt(),{r0:0.05,r1:0.6,dur:0.3,a:0.35,bill:true}); ringAt(haloPt(),{r0:0.3,r1:1.1,dur:0.4,a:0.35,bill:true,col:PEAK}); } }
    if(name==='death'){ hitFeel(0.4,0,0.3); if(fxOn){ const c=new THREE.Vector3(0,0,0.05); dust(c,14,1.6,0.5,ASH); ringAt(c,{r0:0.4,r1:1.8,dur:0.5,a:0.3,col:ASH}); pillarAt(c,{r:1.0,h:5.0,dur:1.8,a:0.28,delay:0.25}); rise(c,18,1.2,1.4,VIOLET,1.8); } motesDown=1; }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, p0=shot.prev, cross=(c)=>p0<c&&t>=c;
    const hit=META[n].contact[0]||0;
    if(n==='note'){ heartTo=t<hit?0.35+0.6*Math.min(1,t/hit):(t<hit+0.25?1.1:0.4); haloTo=t<hit?0.25+0.4*Math.min(1,t/hit):(t<hit+0.3?0.9:0.25); eyesTo=t<hit+0.25?1.6:1; }
    if(n==='lance'){ heartTo=t<hit?0.35+0.7*Math.min(1,t/hit):(t<hit+0.25?1.0:0.4); haloTo=t<hit+0.3?0.45:0.25; eyesTo=t<hit+0.25?1.8:1; }
    if(n==='pulse'){ heartTo=t<hit?0.5+0.8*Math.min(1,t/hit):(t<hit+0.3?1.4:0.45); haloTo=t<hit?0.3+0.4*Math.min(1,t/hit):(t<hit+0.3?0.9:0.25); eyesTo=1.4; }
    if(n==='verse'){ heartTo=t>hit-0.1&&t<1.2?1.2:0.5; haloTo=t>hit-0.1&&t<1.2?1.0:0.35; eyesTo=t>hit-0.1&&t<1.2?2.0:1.2; }
    if(n==='fade'){ eyesTo=0.3; haloTo=0.6; if(cross(META.fade.cues.gone[0])&&fxOn){ ringAt(new THREE.Vector3(0,0,0.05),{r0:0.6,r1:0.1,dur:0.2,a:0.4}); } }
    if(n==='rise'){ eyesTo=t>0.2?1.2:0.4; haloTo=t>0.25&&t<0.6?0.8:0.25; }
    if(n==='spawn'){ eyesTo=t>0.5?1:0; heartTo=t>0.4?0.4:0.1; haloTo=t>hit-0.1&&t<hit+0.35?0.9:(t>0.4?0.25:0.05); if(t>0.05&&t<0.8&&Math.random()<d*20)puff(new THREE.Vector3((Math.random()-0.5)*1.4,0.1,(Math.random()-0.5)*1.4),new THREE.Vector3(0,0.8+Math.random(),0),{life:1.0,s0:0.12,s1:0.3,a:0.2,col:VIOLET}); }
    if(n==='death'){ const sil=META.death.cues.silent[0]; eyesTo=t<sil?2.0:Math.max(0,1-(t-sil)/1.2); heartTo=t<sil?1.2:Math.max(0,0.4-(t-sil)*0.5); haloTo=t<sil?1.0:Math.max(0,0.3-(t-sil)*0.3); notesOff=Math.min(1,Math.max(0,(t-sil-0.4)/1.2)); if(t>1.9)cv.style.filter='saturate(0.45)'; }
  }
  // the game's chest beat: faster with each verse
  function heartBeat(d){ beatPh+=d*(2.2+verse*0.5)*Math.PI; return Math.pow(Math.max(0,Math.sin(beatPh)),6); }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=NEAR; eyesTo=sel.dead?0:1; heartTo=sel.dead?0:0.35; haloTo=sel.dead?0:0.2+0.06*verse; if(ringT>=0||pulseT>=0)hideTele(); }
    const beat=sel.dead?0:heartBeat(d);
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); heartG+=(heartTo-heartG)*Math.min(1,d*6); haloG+=(haloTo-haloG)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    // the mouth glows as it opens (the chin's own turn)
    const ja=bones.jaw?2*Math.acos(Math.min(1,Math.abs(bones.jaw.quaternion.w))):0; mouth=Math.min(1,ja/0.42);
    const on=fxOn?1:0; gA.value.set(on*0.32*Math.min(2.4,eyes),on*0.7*mouth,on*Math.min(1.2,heartG*(0.6+0.6*beat)),feel?flash:0);
    gB.value.set(on*0.28*haloG,on*0.16*haloG,on*(0.12+0.15*haloG),on*(0.1+0.12*haloG));
    const L=[0,0,0,0,0,0,0]; if(verse>=1)L[1]=1; if(verse>=2)L[0]=1; if(verse>=3)L[6]=1; // a note lights for each verse: the three at the top
    gN.value.set(L[0],L[1],L[2],L[3]); gN2.value.set(L[4],L[5],L[6]);
    pool.material.opacity=sel.dead?Math.max(0,pool.material.opacity-d*0.2):(0.08+0.06*beat+0.08*heartG)*on;
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    PILLARS.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=(p.t-p.delay)/p.dur; if(u<0){p.m.visible=false;return;} if(u>=1){p.t=-1;p.m.visible=false;return;} p.m.visible=true; p.m.material.opacity=p.a*(u<0.15?u/0.15:1-(u-0.15)/0.85); p.m.scale.x=p.m.scale.z=p.r*(0.7+0.3*Math.min(1,u*4)); });
    MARKS.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=(m.t-m.delay)/m.life; if(u<0){m.m.visible=false;return;} if(u>=1){m.t=-1;m.m.visible=false;return;} m.m.visible=true; m.m.material.opacity=m.a*(u<0.05?u/0.05:1-Math.max(0,(u-0.6)/0.4)); });
    SHARDS.forEach(s=>{ if(!s.on)return; const st=s.v.length()*d; s.d+=st; s.p.addScaledVector(s.v,d); s.m.position.copy(s.p); s.m.rotateZ(d*9); if(Math.random()<d*25)puff(toFloorInv(s.p),new THREE.Vector3(0,0.2,0),{life:0.3,s0:0.08,s1:0.02,a:0.35,col:VIOLET});
      if(s.d>0.6&&dummy&&showTarget&&toFloorInv(s.p).distanceTo(targetW().setY(0.25))<0.45){ hitDummy(); s.d=99; }
      if(s.d>5.5||!fxOn){ s.on=false; s.m.visible=false; if(fxOn)sparks(toFloorInv(s.p),4,VIOLET,1.2,0.25); } });
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    if(ringT>=0){ ringT+=d; fill(ringG,ringT,RING_T); if(!fxOn)hideTele(); }
    if(pulseT>=0){ pulseT+=d; fill(pulseG,pulseT,PULSE_T); if(!fxOn)hideTele(); }
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/LANE_T), out=Math.max(0,(laneT-LANE_T)/0.26); if(out>=1||!fxOn){ laneG.visible=false; laneT=-1; } else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=LANE_LEN/2*k; u.lf.material.opacity=(laneT>LANE_T?0.4:(0.08+0.1*k+0.02*Math.sin(laneT*24)*k))*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    if(beamT>=0){ beamT+=d; const sweep=LANE_LEN/28, u=beamT/(sweep+0.45); if(u>=1||!fxOn){ beamT=-1; beam.visible=false; } else { const len=LANE_LEN*Math.min(1,beamT/sweep); beam.scale.set(1,1,Math.max(0.01,len)); beam.position.copy(toFloor(new THREE.Vector3(0,0,0))).add(new THREE.Vector3(0,0,len/2).applyAxisAngle(Y,-floorYaw)); beam.position.y=0.9-0.4*Math.min(1,beamT/sweep); const a=u<0.6?1:1-(u-0.6)/0.4; beam.material.opacity=0.42*a; beam.userData.core.material.opacity=0.7*a; } }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  const toFloorInv=(p)=>p.clone().applyMatrix4(fxG.matrix);
  // after the clips: the halo rocks on its own axis with the notes kept upright, the lit notes pulse, the heart beats, the motes orbit
  let idleT=0; const SAVED=[];
  function unOverlay(){ SAVED.forEach(([b,q,s,p])=>{b.quaternion.copy(q);b.scale.copy(s);b.position.copy(p);}); }
  function overlay(d){
    if(!SAVED.length)['halo','heart',...[0,1,2,3,4,5,6].map(k=>'note'+k)].forEach(n=>{const b=bones[n];SAVED.push([b,new THREE.Quaternion(),new THREE.Vector3(),new THREE.Vector3()]);});
    SAVED.forEach(([b,q,s,p])=>{q.copy(b.quaternion);s.copy(b.scale);p.copy(b.position);});
    idleT+=d; const ang=Math.sin(idleT*0.35)*0.15; qTmp.setFromAxisAngle(haloAx,ang); bones.halo.quaternion.multiply(qTmp);
    const lit=[verse>=2,verse>=1,false,false,false,false,verse>=3];
    for(let k=0;k<7;k++){ const b=bones['note'+k]; b.quaternion.premultiply(qTmp.clone().invert()); const s=(lit[k]?1.25+0.15*Math.sin(idleT*4+k):1)*(1-notesOff); b.scale.multiplyScalar(Math.max(0.001,s)); if(notesOff>0)b.position.y-=0.25*notesOff*notesOff; }
    const beat=sel.dead?0:Math.pow(Math.max(0,Math.sin(beatPh)),6); bones.heart.scale.multiplyScalar(1+0.35*beat*(sel.dead?0:1));
    motesFly=Math.max(0,motesFly-d*1.2);
    MOTE.forEach((m,k)=>{ const a=m.a+idleT*0.55, fly=Math.sin(Math.PI*Math.min(1,1-motesFly))*0+motesFly; const r=m.r*(1+1.6*fly*fly)+0.02*Math.sin(idleT*1.7+m.ph); let y=m.y+0.03*Math.sin(idleT*1.3+m.ph);
      if(motesDown>0){ motesDown=Math.min(1,motesDown+d*0.25); y=Math.max(0.01,y-(motesDown-1)*0); }
      m.b.position.set(Math.sin(a)*r,(sel.dead?Math.max(0.01,y*(1-Math.min(1,motesDownT))):y),0.03+Math.cos(a)*r); m.b.scale.setScalar(sel.dead?Math.max(0.001,1-Math.max(0,motesDownT-1)):1); });
  }
  let motesDownT=0;

  // ---- the loop
  let last=performance.now();
  function travelAt(name,t){ const tr=META[name].travel; if(!tr)return 0; const f=Math.min(tr.length-1,Math.max(0,t*60)); const i=Math.floor(f), j=Math.min(tr.length-1,i+1); return tr[i]+(tr[j]-tr[i])*(f-i); }
  function tick(d){
    if(!mixer)return;
    const stopped=hitstop>0; if(stopped){hitstop-=d;} const md=stopped?0:d;
    const bn=baseName();
    if(shot&&!shot.done){ const a=shot.action, m=META[shot.name]; if(a.time>=Math.min(m.dur,a.getClip().duration)-1e-3){ shot.done=true; if(shot.name==='spawn')refresh();
      // the Echo Step: folded away, it lands at the far side and rises there
      if(shot.next){ const nx=shot.next; moveFloor(-STEP_BACK,0); if(dummy){ dummy.userData.z+=STEP_BACK; dummy.position.z=dummy.userData.z; } if(fxOn)markAt(new THREE.Vector3(0,0,0.05),{r:1.6,life:1.6,a:0.25}); startShot(nx); } } }
    if(shot&&shot.done&&!shot.hold&&sel.action&&!sel.dead){ shot.gap+=md; if(shot.gap>0.7)playAction(sel.action); }
    Object.entries(A).forEach(([k,a])=>{ let to=0; if(shot&&shot.action===a)to=(shot.done&&!shot.hold)?0:1; else if(k===bn)to=(shot&&(!shot.done||shot.hold))?0:1;
      const tau=(shot&&shot.action===a)?0.18:(to>a.__w?0.18:0.12); a.__w+=(to-a.__w)*Math.min(1,md/tau); if(Math.abs(to-a.__w)<0.002)a.__w=to; a.setEffectiveWeight(a.__w); });
    unOverlay(); mixer.update(md);
    motesDownT=sel.dead?Math.min(2,motesDownT+md*0.6):0;
    overlay(md);
    let dz=0, dyaw=0; dz+=(A.walk.__w*WALK-A.back.__w*BACK)*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;
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
