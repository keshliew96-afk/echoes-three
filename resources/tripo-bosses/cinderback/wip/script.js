(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.4;
  const VIOLET=0x8F63EE, GOLD=0xFFC24A, HEAT=0xFFE6A8, EMBER=0xFF5A36, ASH=0x8a8478, SLAG=0x3A3532, SOOT=0x2a2622;
  const LABEL={idle:'Idle',walk:'Prowl',turnL:'Turn left',turnR:'Turn right',dive:'Magma Dive',lash:'Tail Lash',spit:'Ember Spit',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['dive','lash','spit','enrage','heavyHit'];
  const NEAR=4.0, LASH_AT=2.2, SPIT_AT=5.0; let HOME=NEAR, HOMEX=0; // where the hero stands, in u, in front of it
  const WALK=1.5, TURN=90*Math.PI/180, DIVE_R=2.0, POOL_R=1.4, LASH_R=3.2, LASH_HALF=65*Math.PI/180, LASH_T=48/60, THROW=1.8, SPIT_R=1.1, SPIT_POOL=0.9, SPIT_SPREAD=2.2;
  const MOUTH=[0,0.005,0.115]; // from the head joint, in model units: the tip of the snout
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.localClippingEnabled=true;
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.95));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.16,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(0.42,1.25,1); blob.position.set(0,0.004,0.1); scene.add(blob);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.0; orbit.maxDistance=34;
  const VIEWS={Close:{p:[3.6,2.0,4.6],t:[0,0.25,0.3]},'Game zoom':{p:[0,12.5,11.2],t:[0,0.4,2.4]},Side:{p:[7.5,1.0,0.6],t:[0,0.3,0.6]},Front:{p:[0.6,1.2,6.5],t:[0,0.3,0]},Back:{p:[-2.6,2.0,-5.6],t:[0,0.3,0]},Top:{p:[0,12,0.4],t:[0,0.2,1.6]}};
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
  // masks: x the coals on its back (0.6 the eyes), y the throat (1 the inside of the mouth, 0.5 the pale chin), z kinds (1 the violet brow scale, 0.5 the gold gill tips)
  const gH={value:new THREE.Vector4(0.4,0.1,0.4,0.4)}, gQ={value:new THREE.Vector4(0,0,0,0)};
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    mesh.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),0)]; // what is under the floor is not drawn (the dive, the spawn)
    // uH: x coals, y throat heat, z gill tips, w brow; uQ: x dull (spent or dead), y flash
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uH:gH,uQ:gQ});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uH;\nuniform vec4 uQ;\nfloat isK(float z,float k){return 1.0-step(0.12,abs(z-k));}')
        .replace('#include <map_fragment>',['#include <map_fragment>',
          'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(0.3)))*0.75,uQ.x*vMask.x);'].join('\n'))
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'totalEmissiveRadiance+=vec3(1.0,0.5,0.16)*uH.x*vMask.x+vec3(1.0,0.78,0.45)*uH.y*vMask.y+vec3(1.0,0.76,0.29)*uH.z*isK(vMask.z,0.5)+vec3(0.56,0.39,0.93)*uH.w*isK(vMask.z,1.0)+vec3(0.55)*uQ.y;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(chest|neck|head|jaw|gill[LR])\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringG.visible,coneG.visible,SRINGS.filter(r=>r.g.visible).length],dull:+gQ.value.x.toFixed(2),glow:gH.value.toArray().map(v=>+v.toFixed(2)),pools:POOLS.filter(p=>p.t>=0).length,gobs:GOBS.filter(g=>g.t>=0).length,trail:trail.visible,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
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
  const Y=new THREE.Vector3(0,1,0), tmp=new THREE.Vector3(), tmp2=new THREE.Vector3();
  const pt=(bone,v)=>tmp.set(v[0],v[1],v[2]).applyMatrix4(bone.matrixWorld).clone();
  const toFloor=(w)=>w.clone().applyMatrix4(fxG.matrix.clone().invert());
  const toWorld=(p)=>p.clone().applyMatrix4(fxG.matrix);

  // ---- hit feel: freeze, squash (the game's boss contact squash: 11% wider, 5% shorter), shake, flash
  let hitstop=0, squash=0, shake=0, flash=0; const shakeV=new THREE.Vector3();
  function hitFeel(sh,stop,sq){ if(!feel)return; hitstop=Math.max(hitstop,stop); squash=Math.max(squash,sq); shake=Math.max(shake,sh); }

  // ---- effects (dim on purpose; Ember marks the floor warnings, its heat is Kiln Gold, Violet its brow)
  const FXP=[], RINGS=[], MARKS=[], POOLS=[], SRINGS=[], GOBS=[]; let dotTex=null, ringG=null, coneG=null, trail=null, crack=null;
  let coalK=0.4, throatK=0.1, gillK=0.4, browK=0.4, dullK=0, ringT=-1, coneT=-1, idleT=0, flare=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<220;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,96),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,96),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f,r}; g.visible=false; fxG.add(g); return g;};
    // Magma Dive: an Ember ring of radius 2 u under the hero; Ember Spit: three rings of 1.1 u
    ringG=flatRing(DIVE_R); for(let i=0;i<3;i++)SRINGS.push({g:flatRing(SPIT_R),t:-1,T:1});
    // Tail Lash: an Ember cone of radius 3.2 u and half-angle 65 degrees toward the hero, filling outward
    coneG=new THREE.Group(); const cf=new THREE.Mesh(new THREE.CircleGeometry(1,64,Math.PI/2-LASH_HALF,2*LASH_HALF),eMat(0.12)); const ce=new THREE.Mesh(new THREE.RingGeometry(LASH_R-0.04,LASH_R,64,1,Math.PI/2-LASH_HALF,2*LASH_HALF),eMat(0.6));
    const side=(a)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.035,LASH_R).translate(0,LASH_R/2,0),eMat(0.6)); m.rotation.z=a; return m;}; const sides=new THREE.Group(); sides.add(side(LASH_HALF),side(-LASH_HALF));
    [cf,ce,sides].forEach(m=>{m.rotation.x=Math.PI/2;}); ce.position.y=0.002; sides.position.y=0.002; coneG.add(cf,ce,sides); coneG.userData={f:cf,e:ce,s:sides}; coneG.visible=false; fxG.add(coneG);
    // the dive's track under the floor: a dim glow that runs from where it went in to the ring, and a crack where it comes up
    trail=new THREE.Mesh(new THREE.CircleGeometry(0.55,32),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false})); trail.rotation.x=-Math.PI/2; trail.visible=false; scene.add(trail);
    crack=new THREE.Mesh(new THREE.RingGeometry(0.15,0.55,24),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false})); crack.rotation.x=-Math.PI/2; crack.visible=false; fxG.add(crack);
    // pools of slag: a dark disc with a dying gold rim
    for(let i=0;i<6;i++){ const gq=new THREE.Group(); const d=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:SLAG,transparent:true,opacity:0,depthWrite:false})); const r=new THREE.Mesh(new THREE.RingGeometry(0.86,1,48),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false})); d.rotation.x=r.rotation.x=-Math.PI/2; r.position.y=0.002; gq.add(d,r); gq.visible=false; fxG.add(gq); POOLS.push({g:gq,d,r,t:-1,life:3}); }
    // gobbets of fire for the spit
    for(let i=0;i<3;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:GOLD,transparent:true,depthWrite:false,opacity:0.9})); s.scale.setScalar(0.32); s.visible=false; fxG.add(s); GOBS.push({s,t:-1,T:1,from:new THREE.Vector3(),to:new THREE.Vector3(),k:i}); }
    for(let i=0;i<8;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:SOOT,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); MARKS.push({m,t:-1,life:2.6,a:0.3}); }
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,hold:0,vx:0,vz:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.s.material.color.setHex(o.col||ASH); p.s.position.copy(pos); scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.5,a:0.18,drag:3,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()*0.8,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.08,s1:0.02,a:0.55,col,g:-4,drag:1.5});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||GOLD);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function markAt(pos,o){ if(!fxOn)return; const m=MARKS.find(m=>m.t<0)||MARKS[0]; m.t=0; m.life=o.life||2.6; m.a=o.a||0.3; m.delay=o.delay||0; m.m.position.copy(toFloor(pos)).setY(0.009); m.m.scale.set(o.r||1,o.r||1,1); m.m.visible=false; }
  function poolAt(posW,r,life){ if(!fxOn)return; const p=POOLS.find(p=>p.t<0)||POOLS[0]; p.t=0; p.life=life; p.g.position.copy(toFloor(posW)).setY(0.007); p.g.scale.setScalar(r); p.g.visible=true; }
  function hideTele(){ if(ringG){ringG.visible=false;coneG.visible=false;SRINGS.forEach(r=>{r.g.visible=false;r.t=-1;});} ringT=-1; coneT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); MARKS.forEach(m=>{m.t=-1;m.m.visible=false;}); POOLS.forEach(p=>{p.t=-1;p.g.visible=false;}); GOBS.forEach(g=>{g.t=-1;g.s.visible=false;}); if(trail){trail.visible=false;crack.visible=false;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const headPt=()=>pt(bones.head,[0,0.03,0.05]);
  const mouthPt=()=>pt(bones.head,MOUTH);
  function setHero(z,x){ x=x||0; HOME=z; HOMEX=x; if(dummy){ const u=dummy.userData; u.z=z; u.x=x; u.hold=0; u.vx=0; u.vz=0; dummy.position.set(x,0,z); } }
  function hitDummy(push){ if(!dummy||!showTarget)return; const u=dummy.userData; u.hold=Math.max(u.hold,0.8); u.mat.emissiveIntensity=feel?0.45:0; if(push){u.vx=push.x;u.vz=push.z;} if(fxOn)sparks(targetW().setY(0.5),10,HEAT,2.0,0.3); }
  function fxStart(name){
    hideTele(); HOME=NEAR; HOMEX=0;
    if(name==='dive'){ setHero(NEAR); if(dummy)dummy.userData.hold=3.2; if(fxOn){ ringT=0; ringG.position.copy(toFloor(targetW())).setY(0.012); ringG.visible=true; } }
    if(name==='lash'){ setHero(0,LASH_AT); if(dummy)dummy.userData.hold=1.6; if(fxOn){ coneT=0; coneG.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.012); coneG.rotation.y=-floorYaw+Math.PI/2; coneG.visible=true; } }
    if(name==='spit'){ setHero(SPIT_AT); if(dummy)dummy.userData.hold=2.0; if(fxOn){ const c=targetW(); const spots=[c.clone(),c.clone().add(new THREE.Vector3(SPIT_SPREAD,0,-0.6)),c.clone().add(new THREE.Vector3(-SPIT_SPREAD,0,0.4))];
        SRINGS.forEach((r,i)=>{ r.t=0; r.T=META.spit.cues.fly[0]+(60+12*i)/60; r.g.position.copy(toFloor(spots[i])).setY(0.012+0.001*i); r.g.visible=true; }); } }
    if(name==='spawn'){ dullK=1; if(fxOn){ const o=new THREE.Vector3(0,0,0.2); ringAt(o,{r0:0.3,r1:1.6,dur:0.6,a:0.35}); dust(o,14,1.2,0.4,ASH); poolAt(o,1.0,1.8); } }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(headPt(),12,GOLD,2.0,0.35); }
    if(name==='enrage'){ }
  }
  function fxContact(name,i){
    if(name==='dive'){
      if(i===0){ hitFeel(0.9,0.08,0.7); const c=ringG.getWorldPosition(new THREE.Vector3()).setY(0); ringG.visible=false; ringT=-1;
        if(fxOn){ ringAt(c,{r0:0.3,r1:DIVE_R+0.15,dur:0.32,a:0.5,col:EMBER}); ringAt(c,{r0:0.2,r1:DIVE_R+0.7,dur:0.6,a:0.3,delay:0.05}); sparks(c.clone().setY(0.25),30,GOLD,3.2,0.6); dust(c,16,1.8,0.6,SOOT); poolAt(c,POOL_R,3); crack.visible=false; }
        if(dummy&&showTarget&&targetW().distanceTo(c)<DIVE_R+0.3){ hitDummy(new THREE.Vector3(0,0,13)); } }
      else { hitFeel(0.5,0.04,0.4); if(fxOn){ const c=pt(bones.spine,[0,0,0]).setY(0); dust(c,14,1.4,0.4,SOOT); } } }
    if(name==='lash'){ hitFeel(0.7,0.06,0.5); coneG.visible=false; coneT=-1;
      if(fxOn){ const t5=pt(bones.t5,[0,0,-0.05]); sparks(t5,12,GOLD,2.2,0.35); const c=new THREE.Vector3(0,0,0); ringAt(c,{r0:0.6,r1:LASH_R,dur:0.3,a:0.3,col:EMBER}); }
      if(dummy&&showTarget){ const d=targetW(); const ang=Math.abs(Math.atan2(d.z,d.x)); if(d.length()<LASH_R+0.3&&ang<LASH_HALF+0.1){ const dir=d.clone().normalize(); hitDummy(dir.multiplyScalar(THROW/(8/60))); dummy.userData.throwLeft=8/60; } } }
    if(name==='spit'){
      if(i===0){ hitFeel(0.45,0.03,0.4); if(fxOn){ const m=mouthPt(); sparks(m,14,GOLD,1.6,0.35); GOBS.forEach((g,k)=>{ g.t=0; g.T=(60+12*k)/60; g.from.copy(toFloor(m)); g.to.copy(SRINGS[k].g.position).setY(0); g.s.visible=true; }); } }
      else { hitFeel(0.35,0.02,0.3); if(fxOn){ const c=pt(bones.chest,[0,0,0]).setY(0); dust(c,10,1.2,0.3,SOOT); } } }
    if(name==='enrage'){ if(i===0){ hitFeel(0.5,0.04,0.4); flare=1; if(fxOn){ sparks(pt(bones.spine,[0,0.08,0]),30,GOLD,2.4,0.7); ringAt(headPt(),{r0:0.2,r1:1.4,dur:0.5,a:0.3,bill:true,col:GOLD}); } }
      else { hitFeel(0.45,0.03,0.4); if(fxOn){ dust(pt(bones.fFingL,[0,0,0]),8,1.2,0.3,SOOT); dust(pt(bones.fFingR,[0,0,0]),8,1.2,0.3,SOOT); } } }
    if(name==='heavyHit'){}
    if(name==='spawn'){ hitFeel(0.35,0.03,0.3); if(fxOn){ const c=new THREE.Vector3(0,0,0.3); dust(c,12,1.3,0.4,SOOT); ringAt(c,{r0:0.2,r1:1.3,dur:0.45,a:0.25,col:ASH}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.5,0.05,0.4); flash=0.4; if(fxOn)sparks(headPt(),12,GOLD,2.0,0.35); }
      else { hitFeel(0.5,0,0.3); if(fxOn){ const c=pt(bones.spine,[0,0,0]).setY(0); dust(c,18,1.6,0.5,SOOT); ringAt(c,{r0:0.4,r1:1.8,dur:0.5,a:0.3,col:ASH}); } } }
  }
  function cue(m,k){ return m.cues&&m.cues[k]; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, m=META[n];
    if(n==='dive'){ const dg=cue(m,'dig')[0], un=cue(m,'under'), sp=cue(m,'spent');
      if(t>=dg&&t<un[0]+0.1&&fxOn&&Math.random()<d*40){ const s=mouthPt().setY(0.03); puff(s,new THREE.Vector3((Math.random()-0.5)*1.2,0.6+Math.random()*0.8,(Math.random()-0.5)*1.2+0.4),{life:0.6,s0:0.1,s1:0.25,a:0.3,col:SOOT,g:-3}); if(Math.random()<0.4)puff(s,new THREE.Vector3((Math.random()-0.5),0.8,(Math.random()-0.5)),{life:0.5,s0:0.06,s1:0.02,a:0.6,col:GOLD,g:-3}); }
      // under: a dim glow on the floor over it, and the floor cracking gold ahead of the burst
      const under=t>=un[0]-0.1&&t<un[1]; trail.visible=under&&fxOn; if(trail.visible){ const h=pt(bones.chest,[0,0,0]); trail.position.set(h.x,0.008,h.z); trail.material.opacity=0.12+0.06*Math.sin(t*30); if(Math.random()<d*12)puff(h.clone().setY(0.03),new THREE.Vector3((Math.random()-0.5)*0.4,0.4,(Math.random()-0.5)*0.4),{life:0.6,s0:0.12,s1:0.3,a:0.2,col:SOOT}); }
      if(t>=un[1]-0.35&&t<un[1]&&fxOn){ crack.visible=true; crack.position.copy(ringG.position).setY(0.014); const k=(t-un[1]+0.35)/0.35; crack.scale.setScalar(0.5+1.5*k); crack.material.opacity=0.25+0.3*k; if(Math.random()<d*20)puff(toWorld(ringG.position).setY(0.05),new THREE.Vector3((Math.random()-0.5)*0.8,1.2,(Math.random()-0.5)*0.8),{life:0.4,s0:0.06,s1:0.02,a:0.6,col:GOLD,g:-4}); }
      dullK=t>=sp[0]&&t<sp[1]?Math.min(1,(t-sp[0])/0.2)*0.8:(t>=sp[1]?Math.max(0,0.8-(t-sp[1])/0.3):0); }
    if(n==='spit'){ const th=cue(m,'throat'); throatK=t<th[1]?Math.min(1,t/th[1])*1.2:Math.max(0.1,1.2-(t-th[1])*3); }
    if(n==='death'){ const o=cue(m,'out'); dullK=t<o[0]?0:Math.min(1,(t-o[0])/(o[1]-o[0])); }
    if(n==='spawn'){ dullK=Math.max(0,1-t/0.9); }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=NEAR; HOMEX=0; if(ringT>=0||coneT>=0)hideTele(); throatK+=(0.1-throatK)*Math.min(1,d*4); if(trail)trail.visible=false; if(!sel.dead)dullK=Math.max(0,dullK-d*2); }
    // the coals breathe on a slow beat; the throat heats for the spit; spent and dead go dull
    idleT+=d; const beat=0.5+0.5*Math.sin(idleT*Math.PI*2/2.0); flare=Math.max(0,flare-d*0.8);
    const live=1-dullK;
    coalK+=((0.35+0.12*beat+0.5*flare)*live-coalK)*Math.min(1,d*6);
    gillK+=((0.35+0.1*beat+0.6*flare)*live-gillK)*Math.min(1,d*6);
    browK+=((0.4+0.3*flare)*live-browK)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; gH.value.set(on*coalK,on*throatK*live,on*gillK,on*browK); gQ.value.set(dullK*0.9,feel?flash:0,0,0);
    if(flare>0.2&&fxOn&&Math.random()<d*30*flare)puff(pt(bones.spine,[(Math.random()-0.5)*0.1,0.09,(Math.random()-0.5)*0.3]),new THREE.Vector3((Math.random()-0.5)*0.4,0.8+Math.random()*0.6,(Math.random()-0.5)*0.4),{life:0.8,s0:0.06,s1:0.02,a:0.5,col:GOLD,drag:0.6});
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    MARKS.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=(m.t-m.delay)/m.life; if(u<0){m.m.visible=false;return;} if(u>=1){m.t=-1;m.m.visible=false;return;} m.m.visible=true; m.m.material.opacity=m.a*(u<0.05?u/0.05:1-Math.max(0,(u-0.6)/0.4)); });
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    if(ringT>=0){ ringT+=d; fill(ringG,ringT,76/60); if(!fxOn)hideTele(); }
    SRINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; fill(r.g,r.t,r.T); if(r.t>=r.T+0.02||!fxOn){ r.t=-1; r.g.visible=false; } });
    if(coneT>=0){ coneT+=d; const k=Math.min(1,coneT/LASH_T), u=coneG.userData; u.f.scale.setScalar(Math.max(0.001,LASH_R*k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(coneT*24)*k; u.e.material.opacity=0.45+0.25*k; u.s.children.forEach(m=>m.material.opacity=0.45+0.25*k); if(!fxOn)hideTele(); }
    // the gobbets fly on high arcs and land on their rings, each leaving a small pool of slag
    GOBS.forEach(g=>{ if(g.t<0)return; g.t+=d; const u=Math.min(1,g.t/g.T); const p=g.from.clone().lerp(g.to,u); p.y=g.from.y*(1-u)+3.2*Math.sin(Math.PI*u); g.s.position.copy(p); g.s.material.opacity=0.85; g.s.scale.setScalar(0.28+0.06*Math.sin(g.t*30));
      if(fxOn&&Math.random()<d*30){ puff(toWorld(p),new THREE.Vector3((Math.random()-0.5)*0.3,0.2,(Math.random()-0.5)*0.3),{life:0.35,s0:0.1,s1:0.03,a:0.4,col:GOLD}); }
      if(u>=1){ g.t=-1; g.s.visible=false; const w=toWorld(g.to); hitFeel(0.25,0,0); if(fxOn){ sparks(w.clone().setY(0.15),12,GOLD,1.8,0.35); ringAt(w,{r0:0.2,r1:SPIT_R+0.1,dur:0.3,a:0.45,col:EMBER}); poolAt(w,SPIT_POOL,2); }
        if(dummy&&showTarget&&targetW().distanceTo(w)<SPIT_R+0.3)hitDummy(); } });
    POOLS.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t/p.life; if(u>=1||!fxOn){p.t=-1;p.g.visible=false;return;} const a=u<0.06?u/0.06:1-Math.max(0,(u-0.75)/0.25); p.d.material.opacity=0.55*a; p.r.material.opacity=0.5*a*(1-0.7*u); });
    if(crack&&crack.visible&&!(shot&&shot.name==='dive'&&!shot.done))crack.visible=false;
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.vx||u.vz){ const k=Math.min(1,d*6); u.x+=u.vx*d; u.z+=u.vz*d; if(u.throwLeft!==undefined){ u.throwLeft-=d; if(u.throwLeft<=0){u.vx=0;u.vz=0;u.throwLeft=undefined;} } else { u.vx*=1-k; u.vz*=1-k; if(Math.hypot(u.vx,u.vz)<0.05){u.vx=0;u.vz=0;} } }
      if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(HOMEX-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
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
    let dz=0, dyaw=0; dz+=A.walk.__w*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;
    if(shot&&!shot.done){ const tz=travelAt(shot.name,shot.action.time); const dd=tz-shot.tz; shot.tz=tz; dz+=dd; if(dummy&&dd)dummy.userData.z-=dd; }
    if(dz||dyaw)moveFloor(dz,dyaw);
    if(shot){ const m=META[shot.name], t=shot.action.time; m.contact.forEach((c,i)=>{ if(c>=0&&shot.prev<c&&t>=c)fxContact(shot.name,i); }); fxOngoing(md); shot.prev=t; }
    squash=Math.max(0,squash-d*7); const sq=feel?squash:0; model.scale.set(U*(1+0.11*sq),U*(1-0.05*sq),U*(1+0.11*sq));
    model.updateMatrixWorld(true); blob.visible=!(trail&&trail.visible); updateFx(stopped?d*0.25:d); showPhase();
  }
  function frame(now){
    requestAnimationFrame(frame); const raw=Math.min(0.05,(now-last)/1000); last=now;
    if(!paused)tick(raw*speed);
    orbit.update(); shake=Math.max(0,shake-raw*3.2); const sk=feel?shake*shake*0.09:0; shakeV.set((Math.random()-0.5)*sk,(Math.random()-0.5)*sk,(Math.random()-0.5)*sk); cam.position.add(shakeV);
    renderer.render(scene,cam); cam.position.sub(shakeV);
  }
  moveFloor(0,0); requestAnimationFrame(frame);
})();
