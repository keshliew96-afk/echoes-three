(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.6;
  const VIOLET=0x8F63EE, PEAK=0xE6DDF8, EMBER=0xFF5A36, DUST=0x8a8580, SLATE=0x4a5260, GLASS=0xc9b8f4;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',fissure:'Fissure',rain:'Geode Rain',burst:'Geode Burst',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['fissure','rain','burst','enrage','heavyHit'];
  const NEAR=4.5, LANE_AT=6.0, CLOSE=2.0; let HOME=NEAR; // where the hero stands, in u, in front of it
  const WALK=1.15, TURN=70*Math.PI/180, LANE_T=54/60, RAIN_T=66/60, BURST_T=60/60, LANE_LEN=9.0, LANE_W=1.0, RING_R=1.1, RAIN_SIDE=2.3, BURST_R=2.6, PATCH_R=0.75;
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.9));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.16,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(1.2,0.85,1); blob.position.set(0,0.004,0.1); scene.add(blob);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.5; orbit.maxDistance=34;
  const VIEWS={Close:{p:[5.6,3.0,7.6],t:[0,1.15,0.9]},'Game zoom':{p:[0,12.5,11.2],t:[0,0.6,2.4]},Side:{p:[12,2.0,1.4],t:[0,1.1,1.2]},Front:{p:[0.8,2.0,12],t:[0,1.1,0]},Back:{p:[-3.8,3.2,-8.6],t:[0,1.1,0.6]},Top:{p:[0,17,0.4],t:[0,0.4,2.0]}};
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
  const gA={value:new THREE.Vector4(0.3,0.3,0.12,0)}, gB={value:new THREE.Vector4(0.1,0.1,0,0)};
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // glow masks: x the eyes; y the heart; z the spires (1), the cracks (0.75) and the geode's lining (0.5)
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uA:gA,uB:gB});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uA;\nuniform vec4 uB;')
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'float ez=vMask.z;',
          'float spireM=step(0.95,ez), crackM=step(0.7,ez)*(1.0-step(0.8,ez)), liningM=step(0.45,ez)*(1.0-step(0.55,ez));',
          'totalEmissiveRadiance+=vec3(0.75,0.4,1.0)*uA.x*vMask.x+vec3(0.85,0.4,1.0)*uA.y*vMask.y+vec3(0.6,0.35,1.0)*uA.z*liningM+vec3(0.55)*uA.w;',
          'totalEmissiveRadiance+=vec3(0.8,0.35,1.0)*uB.x*crackM+vec3(0.6,0.4,1.0)*uB.y*spireM;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(chest|neck|head)\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[laneG.visible,RAIN.filter(r=>r.g.visible).length,burstG.visible],geodes:RAIN.filter(r=>r.rock.visible).length,shards:SHARDS.filter(s=>s.on).length,patches:PATCHES.filter(p=>p.t>=0).length,crack:+crackT.toFixed(2),pillar:PILLARS.filter(p=>p.t>=0).length,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glowA:gA.value.toArray().map(v=>+v.toFixed(2)),glowB:gB.value.toArray().map(v=>+v.toFixed(2)),fistL:+bones.knuckL.getWorldPosition(new THREE.Vector3()).y.toFixed(2),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
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
    else if(k==='hurt'){ if(sel.dead)return; hurtAct.reset(); hurtAct.setEffectiveWeight(1); hurtAct.play(); hitFeel(0.3,0.04,0.5); flash=0.35; if(fxOn)sparks(chestPt(),6,PEAK,1.6,0.25); }
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

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is its power)
  const FXP=[], RINGS=[], SHARDS=[], PILLARS=[], MARKS=[], PATCHES=[], RAIN=[]; let dotTex=null, laneG=null, burstG=null, crackLine=null;
  let eyes=1, eyesTo=1, heartG=0.4, heartTo=0.4, lining=0.3, liningTo=0.3, cracks=0.1, laneT=-1, burstT=-1, crackT=-1, beatPh=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<200;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,72),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,72),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f}; g.visible=false; fxG.add(g); return g;};
    // Geode Burst: an Ember ring of radius 2.6 u round itself
    burstG=flatRing(BURST_R);
    // Fissure: an Ember lane 1.0 u wide and up to 9 u long from its middle, with a fill that runs down it
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),eMat(op)); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    laneG=new THREE.Group(); const L=LANE_LEN, hw=LANE_W/2, lf=flat(LANE_W,L,0,L/2,0.14), le=[flat(0.035,L,-hw,L/2,0.6),flat(0.035,L,hw,L/2,0.6),flat(LANE_W,0.035,0,L,0.6),flat(LANE_W,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // the crack itself: a dark jagged line that runs down the lane, lit violet inside
    const pts=[]; for(let i=0;i<=36;i++){ const z=L*i/36; pts.push(new THREE.Vector3((i%2?1:-1)*0.07*Math.sin(i*1.7)+0.04*Math.sin(i*0.6),0.015,z)); }
    const cg=new THREE.BufferGeometry().setFromPoints(pts); crackLine=new THREE.Group();
    const dark=new THREE.Line(cg,new THREE.LineBasicMaterial({color:0x1c1622,transparent:true,opacity:0})); const lit=new THREE.Line(cg.clone(),new THREE.LineBasicMaterial({color:VIOLET,transparent:true,opacity:0})); lit.position.y=0.004;
    crackLine.add(dark,lit); crackLine.userData={dark,lit,n:pts.length}; crackLine.visible=false; fxG.add(crackLine);
    // crystal patches left on the floor: a pale violet disc with a few small crystals standing in it
    const cm=new THREE.MeshStandardMaterial({color:GLASS,emissive:VIOLET,emissiveIntensity:0.3,roughness:0.35,flatShading:true,transparent:true,opacity:1});
    for(let i=0;i<10;i++){ const g=new THREE.Group(); const disc=new THREE.Mesh(new THREE.CircleGeometry(PATCH_R,32),new THREE.MeshBasicMaterial({color:GLASS,transparent:true,opacity:0,depthWrite:false})); disc.rotation.x=-Math.PI/2; disc.position.y=0.008; g.add(disc);
      const xs=[]; for(let k=0;k<6;k++){ const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.09,0),cm.clone()); const a=k/6*Math.PI*2+i; const r=0.18+0.32*((k*37+i*11)%10)/10; m.position.set(Math.cos(a)*r,0.06,Math.sin(a)*r); m.scale.set(0.7,1.6+((k+i)%3)*0.5,0.7); m.rotation.set(0.3*Math.sin(k+i),a,0.3*Math.cos(k)); g.add(m); xs.push(m); }
      g.visible=false; fxG.add(g); PATCHES.push({g,disc,xs,t:-1,life:4}); }
    // Geode Rain: the warning ring, and the geode that comes down into it (a dark rock with crystals through it)
    const rockM=new THREE.MeshStandardMaterial({color:SLATE,roughness:0.9,flatShading:true}), xtalM=new THREE.MeshStandardMaterial({color:GLASS,emissive:VIOLET,emissiveIntensity:0.4,roughness:0.3,flatShading:true});
    for(let i=0;i<4;i++){ const g=flatRing(RING_R); const rock=new THREE.Group(); const body=new THREE.Mesh(new THREE.DodecahedronGeometry(0.34,0),rockM); rock.add(body);
      for(let k=0;k<4;k++){ const x=new THREE.Mesh(new THREE.OctahedronGeometry(0.1,0),xtalM); const a=k*1.7; x.position.set(Math.cos(a)*0.26,0.12*Math.sin(k*2.1),Math.sin(a)*0.26); x.scale.set(0.7,1.8,0.7); x.lookAt(0,0,0); rock.add(x); }
      rock.visible=false; fxG.add(rock); RAIN.push({g,rock,t:-1,at:new THREE.Vector3(),hit:false}); }
    // crystal shards from the enraged burst
    const sm=new THREE.MeshStandardMaterial({color:GLASS,emissive:VIOLET,emissiveIntensity:0.35,roughness:0.4,flatShading:true});
    for(let i=0;i<8;i++){ const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.1,0),sm); m.scale.set(0.6,0.6,1.9); m.visible=false; fxG.add(m); SHARDS.push({m,on:false,p:new THREE.Vector3(),v:new THREE.Vector3(),d:0}); }
    for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,32,1,true),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; fxG.add(m); PILLARS.push({m,t:-1,dur:1,r:1,h:4,a:0.3}); }
    for(let i=0;i<14;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x2a2630,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); MARKS.push({m,t:-1,life:2.6,a:0.3}); }
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,hold:0,kx:0,kz:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col,big){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.6+Math.random()*0.35,s0:0.18*(big||1),s1:0.55*(big||1),a:0.2,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  function chips(pos,n,spd){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2; puff(pos,new THREE.Vector3(Math.cos(a)*spd*(0.3+Math.random()),1.5+Math.random()*1.5,Math.sin(a)*spd*(0.3+Math.random())),{life:0.6,s0:0.07,s1:0.05,a:0.6,col:0x3c4250,g:-9,drag:0.5}); } }
  function rise(pos,n,spread,up,col,life){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.3,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.4,up*(0.5+Math.random()),(Math.random()-0.5)*0.4),{life:(life||1.3)*(0.7+Math.random()*0.6),s0:0.08,s1:0.03,a:0.4,col:col||VIOLET,drag:1.3}); } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(o.local?pos:toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function pillarAt(pos,o){ if(!fxOn)return; const p=PILLARS.find(p=>p.t<0)||PILLARS[0]; p.t=0; p.dur=o.dur||1; p.r=o.r||0.8; p.h=o.h||4; p.a=o.a||0.3; p.delay=o.delay||0; p.m.position.copy(toFloor(pos)).setY(p.h/2); p.m.scale.set(p.r,p.h,p.r); p.m.visible=false; }
  function markAt(pos,o){ if(!fxOn)return; const m=MARKS.find(m=>m.t<0)||MARKS[0]; m.t=0; m.life=o.life||2.6; m.a=o.a||0.3; m.delay=o.delay||0; m.m.position.copy(o.local?pos:toFloor(pos)).setY(0.009); m.m.scale.set(o.sx||o.r||1,o.sz||o.r||1,1); m.m.rotation.set(-Math.PI/2,0,o.rot||0); m.m.material.color.setHex(o.col||0x2a2630); m.m.visible=false; }
  function patchAt(local,delay){ if(!fxOn)return; const p=PATCHES.find(p=>p.t<0)||PATCHES[0]; p.t=-(delay||0)-1e-6; p.pending=true; p.g.position.copy(local).setY(0); p.g.visible=false; p.t=0; p.delay=delay||0; }
  function hideTele(){ if(laneG){laneG.visible=false;burstG.visible=false;} laneT=-1; burstT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); SHARDS.forEach(s=>{s.on=false;s.m.visible=false;}); PILLARS.forEach(p=>{p.t=-1;p.m.visible=false;}); MARKS.forEach(m=>{m.t=-1;m.m.visible=false;}); PATCHES.forEach(p=>{p.t=-1;p.g.visible=false;}); RAIN.forEach(r=>{r.t=-1;r.g.visible=false;r.rock.visible=false;}); crackT=-1; if(crackLine)crackLine.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const chestPt=()=>pt(bones.heart,[0,0,0.03]);
  const fistPt=(s)=>pt(bones['knuck'+s],[0,0,0.04]).setY(0.02);
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.hold=0; dummy.position.set(0,0,z); } }
  function hitDummy(push){ if(!dummy||!showTarget)return; const u=dummy.userData; u.hold=Math.max(u.hold,0.6); u.mat.emissiveIntensity=feel?0.45:0; if(push){u.z+=push;} if(fxOn)sparks(targetW().setY(0.5),10,PEAK,2.2,0.3); }
  function fxStart(name){
    hideTele(); HOME=NEAR;
    if(name==='fissure'){ setHero(LANE_AT); if(dummy)dummy.userData.hold=2.4; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw; crackLine.position.set(p.x,0,p.z); crackLine.rotation.y=-floorYaw; } }
    if(name==='rain'){ setHero(NEAR); if(dummy)dummy.userData.hold=3; }
    if(name==='burst'){ setHero(CLOSE); if(dummy)dummy.userData.hold=3.2; if(fxOn){ burstT=0; burstG.position.copy(toFloor(new THREE.Vector3(0,0,0.1))).setY(0.012); burstG.visible=true; } }
    if(name==='spawn'){ eyes=0; heartG=0; lining=0; cv.style.filter=''; if(fxOn){ const o=new THREE.Vector3(0,0,0.1); ringAt(o,{r0:0.4,r1:2.2,dur:0.6,a:0.35}); dust(o,14,1.4,0.6); chips(o.clone().setY(0.2),10,1.2); markAt(o,{r:1.6,life:1.8,a:0.12,col:0x3a3346}); } }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn){ sparks(chestPt(),12,PEAK,2.4,0.3); chips(chestPt(),6,1.2); } }
  }
  function slamDust(c,big){ ringAt(c,{r0:0.2,r1:1.4*big,dur:0.35,a:0.35,col:0x8d8478}); dust(c,10,1.6*big,0.5,DUST,big); chips(c.clone().setY(0.15),8,1.4*big); markAt(c,{r:0.6*big,life:2.4,a:0.22}); }
  function fxContact(name,i){
    if(name==='fissure'){ hitFeel(0.75,0.07,0.7); laneT=Math.max(laneT,LANE_T); const fp=fistPt('R');
      if(fxOn){ slamDust(fp,1); crackT=0; crackLine.visible=true; sparks(fp.clone().setY(0.3),10,VIOLET,2.0,0.4);
        const dir=new THREE.Vector3(0,0,1).applyAxisAngle(Y,-floorYaw); for(let k=1;k<=3;k++){ const s=LANE_LEN*k/3.5; patchAt(laneG.position.clone().addScaledVector(dir,s),(s/LANE_LEN)*0.35); } }
      if(dummy&&showTarget){ const d=dummy.userData; if(Math.abs(d.x)<LANE_W/2+0.3&&d.z>-0.3&&d.z<LANE_LEN+0.3)setTimeout(()=>hitDummy(),0); } }
    if(name==='rain'){ hitFeel(0.3,0.03,0.3); if(fxOn){ ringAt(chestPt(),{r0:0.1,r1:0.9,dur:0.3,a:0.35,bill:true}); sparks(fistPt('L').setY(2.4),8,VIOLET,2,0.4); sparks(fistPt('R').setY(2.4),8,VIOLET,2,0.4);
        // one on the hero, one either side and one behind, 2.3 u out, along the line from it to the hero
        const h=toFloor(targetW()), o=toFloor(new THREE.Vector3(0,0,0)); const dir=h.clone().sub(o).setY(0).normalize(), side=new THREE.Vector3(-dir.z,0,dir.x);
        const spots=[h.clone(),h.clone().addScaledVector(side,RAIN_SIDE),h.clone().addScaledVector(side,-RAIN_SIDE),h.clone().addScaledVector(dir,RAIN_SIDE)];
        RAIN.forEach((r,k)=>{ r.t=0; r.hit=false; r.at.copy(spots[k]).setY(0); r.g.position.copy(r.at).setY(0.012); r.g.visible=true; r.rock.visible=false; }); } }
    if(name==='burst'){ hitFeel(0.85,0.07,0.8); burstG.visible=false; burstT=-1; const c=new THREE.Vector3(0,0,0.1);
      if(fxOn){ ringAt(c,{r0:0.4,r1:BURST_R,dur:0.3,a:0.5,col:EMBER}); ringAt(c,{r0:0.4,r1:3.3,dur:0.55,a:0.4,delay:0.03}); ringAt(c,{r0:0.4,r1:4.2,dur:0.75,a:0.22,delay:0.08,col:PEAK}); ringAt(chestPt(),{r0:0.1,r1:1.3,dur:0.3,a:0.45,bill:true});
        slamDust(fistPt('L'),1.1); slamDust(fistPt('R'),1.1); sparks(chestPt(),18,VIOLET,2.8,0.6);
        for(let k=0;k<7;k++){ const a=k/7*Math.PI*2+Math.random()*0.4; markAt(new THREE.Vector3(Math.sin(a)*1.5,0,0.1+Math.cos(a)*1.5),{sx:0.12,sz:1.3,rot:-a,life:2.2,a:0.35}); }
        if(rage){ const cl=toFloor(c); for(let k=0;k<6;k++){ const s=SHARDS.find(s=>!s.on); if(!s)break; const a=k/6*Math.PI*2+Math.PI/6; s.on=true; s.d=0; s.p.set(cl.x,0.5,cl.z); s.v.set(Math.cos(a),0,Math.sin(a)).multiplyScalar(4.5); s.m.position.copy(s.p); s.m.lookAt(s.p.x+s.v.x,0.5,s.p.z+s.v.z); s.m.visible=true; } } }
      if(dummy&&showTarget&&targetW().distanceTo(c.setY(0))<BURST_R+0.3)hitDummy(0.6); }
    if(name==='enrage'){ hitFeel(0.7,0.06,0.7); setRage(true); if(fxOn){ slamDust(fistPt('L'),1); slamDust(fistPt('R'),1); ringAt(new THREE.Vector3(0,0,0.2),{r0:0.4,r1:2.6,dur:0.5,a:0.35}); } }
    if(name==='spawn'){ hitFeel(0.5,0.04,0.5); if(fxOn){ slamDust(fistPt('L'),1); slamDust(fistPt('R'),1); ringAt(chestPt(),{r0:0.1,r1:1.0,dur:0.3,a:0.35,bill:true}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.45,0.03,0.4); if(fxOn){ dust(new THREE.Vector3(0.4,0,-0.2),8,1.2,0.4); dust(new THREE.Vector3(-0.4,0,-0.2),8,1.2,0.4); } }
      else { hitFeel(0.7,0.05,0.5); if(fxOn){ const c=new THREE.Vector3(0,0,0.6); dust(c,20,2.0,0.5,DUST,1.3); chips(c.clone().setY(0.3),12,1.6); ringAt(c,{r0:0.5,r1:2.4,dur:0.6,a:0.3,col:0x8d8478}); pillarAt(new THREE.Vector3(0,0,0.3),{r:1.2,h:5.0,dur:1.8,a:0.26,delay:0.3}); rise(c,18,1.4,1.3,VIOLET,1.8); } } }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, p0=shot.prev, cross=(c)=>p0<c&&t>=c, m=META[n];
    const hit=m.contact[0]||0;
    if(n==='fissure'){ heartTo=t<hit?0.4+0.4*t/hit:0.5; liningTo=t<hit?0.3+0.4*t/hit:(t<hit+0.25?0.9:0.35); eyesTo=t<hit+0.25?1.6:1; }
    if(n==='rain'){ heartTo=t<hit?0.5+0.7*t/hit:(t<hit+0.3?1.2:0.45); liningTo=t<hit?0.3+0.8*t/hit:(t<hit+0.3?1.2:0.35); eyesTo=1.5; if(t<hit&&Math.random()<d*20)rise(chestPt(),1,0.3,0.6,VIOLET,0.6); }
    if(n==='burst'){ const sp=m.cues.spent; heartTo=t<hit?0.5+1.0*t/hit:(t<sp[0]+0.1?1.4:(t<sp[1]?0.1:0.45)); liningTo=t<hit?0.3+1.1*t/hit:(t<sp[0]+0.1?1.3:(t<sp[1]?0.05:0.35)); eyesTo=t<sp[0]?1.6:(t<sp[1]?0.35:1);
      if(t<hit&&Math.random()<d*30)rise(chestPt(),1,0.4,0.8,VIOLET,0.6); }
    if(n==='enrage'){ eyesTo=1.8; heartTo=1.0; liningTo=0.8; for(const c of m.cues.beats) if(cross(c+0.02)){ hitFeel(0.25,0.02,0.25); if(fxOn){ ringAt(chestPt(),{r0:0.1,r1:0.9,dur:0.25,a:0.4,bill:true}); sparks(chestPt(),6,VIOLET,1.6,0.3); } } if(t<0.4&&fxOn&&Math.random()<d*30)rise(new THREE.Vector3((Math.random()-0.5)*0.8,1.4,-0.4),1,0.4,0.6,VIOLET,0.7); }
    if(n==='spawn'){ eyesTo=t>0.5?1:0; heartTo=t>0.4?0.4:0.05; liningTo=t>0.4?0.3:0.05; if(t>0.05&&t<0.7&&Math.random()<d*20)puff(new THREE.Vector3((Math.random()-0.5)*1.8,0.1,(Math.random()-0.5)*1.8),new THREE.Vector3(0,0.6+Math.random(),0),{life:1.0,s0:0.14,s1:0.32,a:0.2,col:DUST}); }
    if(n==='death'){ const dk=m.cues.dark; eyesTo=t<dk[0]?2.0:Math.max(0,1-(t-dk[0])/1.6); heartTo=t<dk[0]?1.4:Math.max(0,0.8-(t-dk[0])*0.6); liningTo=heartTo; if(t>2.0)cv.style.filter='saturate(0.45)'; }
    // walking: a little dust where each fist lands
    if(n==='walk'){}
  }
  // the heart's beat: faster when enraged
  function heartBeat(d){ beatPh+=d*(rage?2.6:1.6)*Math.PI; return Math.pow(Math.max(0,Math.sin(beatPh)),6); }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=NEAR; eyesTo=sel.dead?0:1; heartTo=sel.dead?0:0.4; liningTo=sel.dead?0:0.3; if(burstT>=0)hideTele(); }
    const beat=sel.dead?0:heartBeat(d);
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); heartG+=(heartTo-heartG)*Math.min(1,d*6); lining+=(liningTo-lining)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    cracks+=(((sel.dead&&!busy)?0:rage?0.55+0.25*beat:0.1)-cracks)*Math.min(1,d*4);
    const on=fxOn?1:0; gA.value.set(on*0.3*Math.min(2.2,eyes),on*Math.min(1.4,heartG*(0.55+0.6*beat)),on*0.3*lining*(0.8+0.3*beat),feel?flash:0);
    gB.value.set(on*cracks,on*0.08,0,0);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03){p.s.position.y=0.03; if(p.g<0){p.v.set(0,0,0);}} const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    PILLARS.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=(p.t-p.delay)/p.dur; if(u<0){p.m.visible=false;return;} if(u>=1){p.t=-1;p.m.visible=false;return;} p.m.visible=true; p.m.material.opacity=p.a*(u<0.15?u/0.15:1-(u-0.15)/0.85); p.m.scale.x=p.m.scale.z=p.r*(0.7+0.3*Math.min(1,u*4)); });
    MARKS.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=(m.t-m.delay)/m.life; if(u<0){m.m.visible=false;return;} if(u>=1){m.t=-1;m.m.visible=false;return;} m.m.visible=true; m.m.material.opacity=m.a*(u<0.05?u/0.05:1-Math.max(0,(u-0.6)/0.4)); });
    // crystal patches: grow in, stand 4 s (the game's 240 ticks), fade
    PATCHES.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t-p.delay; if(u<0){p.g.visible=false;return;} if(u>p.life+0.5||!fxOn){p.t=-1;p.g.visible=false;return;} p.g.visible=true; const gr=Math.min(1,u/0.18), fade=u>p.life?1-(u-p.life)/0.5:1;
      p.disc.material.opacity=0.22*fade*gr; p.xs.forEach((x,k)=>{ x.scale.y=(1.6+((k)%3)*0.5)*Math.max(0.01,gr)*Math.max(0.01,fade); x.material.opacity=fade; }); });
    // the crack runs down the lane in 0.35 s and stays a moment
    if(crackT>=0){ crackT+=d; const u=crackT; const cl=crackLine.userData; const n=Math.max(2,Math.floor(cl.n*Math.min(1,u/0.35))); cl.dark.geometry.setDrawRange(0,n); cl.lit.geometry.setDrawRange(0,n); const a=u<1.8?1:Math.max(0,1-(u-1.8)/0.8); cl.dark.material.opacity=0.6*a; cl.lit.material.opacity=0.55*a*(u<0.6?1:0.5); if(u<0.35&&fxOn){ const z=LANE_LEN*u/0.35; const w=toWorld(laneG.position.clone().add(new THREE.Vector3(0,0,z).applyAxisAngle(Y,-floorYaw))); if(Math.random()<0.7){ dust(w,1,0.8,0.5); sparks(w.setY(0.15),1,VIOLET,1.2,0.3);} } if(a<=0||!fxOn){crackT=-1;crackLine.visible=false;} }
    SHARDS.forEach(s=>{ if(!s.on)return; const st=s.v.length()*d; s.d+=st; s.p.addScaledVector(s.v,d); s.m.position.copy(s.p); s.m.rotateZ(d*9); if(Math.random()<d*25)puff(toWorld(s.p),new THREE.Vector3(0,0.2,0),{life:0.3,s0:0.08,s1:0.02,a:0.35,col:VIOLET});
      if(s.d>0.8&&dummy&&showTarget&&toWorld(s.p).distanceTo(targetW().setY(0.5))<0.45){ hitDummy(); s.d=99; }
      if(s.d>4.5||!fxOn){ s.on=false; s.m.visible=false; if(fxOn)sparks(toWorld(s.p),4,VIOLET,1.2,0.25); } });
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    if(burstT>=0){ burstT+=d; fill(burstG,burstT,BURST_T); if(!fxOn)hideTele(); }
    // the geodes: each ring fills for 66 ticks; the geode falls into it over the last half second, bursts and leaves crystal
    RAIN.forEach((r,k)=>{ if(r.t<0)return; r.t+=d; const t=r.t; if(!fxOn){ r.t=-1; r.g.visible=false; r.rock.visible=false; return; }
      if(t<RAIN_T){ fill(r.g,t,RAIN_T); const f=(t-(RAIN_T-0.5))/0.5; if(f>0){ r.rock.visible=true; r.rock.position.copy(r.at).setY(0.35+9*(1-f)*(1-f)); r.rock.rotation.set(t*3+k,t*2,0); if(Math.random()<d*30)puff(toWorld(r.rock.position),new THREE.Vector3(0,0.6,0),{life:0.4,s0:0.12,s1:0.05,a:0.3,col:VIOLET}); } }
      else if(!r.hit){ r.hit=true; r.g.visible=false; r.rock.visible=false; const w=toWorld(r.at); hitFeel(0.35,0.02,0); ringAt(w,{r0:0.2,r1:RING_R+0.4,dur:0.35,a:0.45}); ringAt(w,{r0:RING_R,r1:RING_R+0.2,dur:0.22,a:0.45,col:EMBER}); dust(w,10,1.4,0.6); chips(w.clone().setY(0.25),10,1.6); sparks(w.clone().setY(0.3),8,VIOLET,2.0,0.4); patchAt(r.at,0); if(dummy&&showTarget&&targetW().distanceTo(w.setY(0))<RING_R+0.3)hitDummy(); }
      else if(t>RAIN_T+0.2){ r.t=-1; } });
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/LANE_T), out=Math.max(0,(laneT-LANE_T)/0.26); if(out>=1||!fxOn){ laneG.visible=false; laneT=-1; } else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=LANE_LEN/2*k; u.lf.material.opacity=(laneT>LANE_T?0.4:(0.08+0.1*k+0.02*Math.sin(laneT*24)*k))*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  // after the clips: the heart beats (the game's beat; faster when enraged). The page undoes it before the clips write.
  let heartS=new THREE.Vector3(1,1,1);
  function overlay(){ heartS.copy(bones.heart.scale); const beat=sel.dead?0:Math.pow(Math.max(0,Math.sin(beatPh)),6); bones.heart.scale.multiplyScalar(1+0.18*beat); }
  function unOverlay(){ bones.heart.scale.copy(heartS); }

  // ---- the loop
  let last=performance.now(); const LAND={walk:[[0,'L'],[0.325,'R']],turnL:[[0,'L'],[0.25,'R']],turnR:[[0,'L'],[0.25,'R']]}; let baseT={};
  function travelAt(name,t){ const tr=META[name].travel; if(!tr)return 0; const f=Math.min(tr.length-1,Math.max(0,t*60)); const i=Math.floor(f), j=Math.min(tr.length-1,i+1); return tr[i]+(tr[j]-tr[i])*(f-i); }
  function tick(d){
    if(!mixer)return;
    const stopped=hitstop>0; if(stopped){hitstop-=d;} const md=stopped?0:d;
    const bn=baseName();
    if(shot&&!shot.done){ const a=shot.action, m=META[shot.name]; if(a.time>=Math.min(m.dur,a.getClip().duration)-1e-3){ shot.done=true; if(shot.name==='spawn')refresh(); } }
    if(shot&&shot.done&&!shot.hold&&sel.action&&!sel.dead){ shot.gap+=md; if(shot.gap>0.8)startShot(sel.action); }
    Object.entries(A).forEach(([k,a])=>{ let to=0; if(shot&&shot.action===a)to=(shot.done&&!shot.hold)?0:1; else if(k===bn)to=(shot&&(!shot.done||shot.hold))?0:1;
      const tau=(shot&&shot.action===a)?0.15:(to>a.__w?0.18:0.12); a.__w+=(to-a.__w)*Math.min(1,md/tau); if(Math.abs(to-a.__w)<0.002)a.__w=to; a.setEffectiveWeight(a.__w); });
    unOverlay(); mixer.update(md); overlay();
    // a little dust where each fist comes down in the walk and the turns
    for(const [k,ls] of Object.entries(LAND)){ const a=A[k]; if(!a||a.__w<0.5)continue; const T=META[k].dur, t=a.time%T, p=baseT[k]??t; for(const [c,s] of ls){ if((p<c&&t>=c)||(p>t&&(c>=p||c<=t))){ if(fxOn)dust(fistPt(s),4,0.7,0.25,DUST,0.8); } } baseT[k]=t; }
    let dz=0, dyaw=0; dz+=A.walk.__w*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;
    if(shot&&!shot.done){ const tz=travelAt(shot.name,shot.action.time); const dd=tz-shot.tz; shot.tz=tz; dz+=dd; if(dummy&&dd)dummy.userData.z-=dd; }
    if(dz||dyaw)moveFloor(dz,dyaw);
    if(shot){ const m=META[shot.name], t=shot.action.time; m.contact.forEach((c,i)=>{ if(c>0&&shot.prev<c&&t>=c)fxContact(shot.name,i); }); if(shot.name==='heavyHit'&&shot.prev===0&&t>0){} fxOngoing(md); shot.prev=t; }
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
