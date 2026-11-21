(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.6;
  const VIOLET=0x8F63EE, GOLD=0xFFC24A, HEAT=0xFFE6A8, EMBER=0xFF5A36, ASH=0x8a8478, SLAG=0x3A3532, STEAM=0xd8d4cc, BRONZE=0xB08A4C;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pour:'Molten Pour',bell:'Bell Drop',firing:'The Firing',casting:'Casting',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['pour','bell','firing','casting','heavyHit'];
  const NEAR=4.2, LANE_AT=6.0, FIRE_AT=3.0; let HOME=NEAR; // where the hero stands, in u, in front of it: inside the 3 to 5.5 u it keeps
  const WALK=1.2, TURN=70*Math.PI/180, POUR_T=1.0, BELL_T=64/60, FIRE_T=1.6, LANE_W=1.4, LANE_LEN=9.0, BELL_R=1.9, BELL_R3=2.3, FIRE_R=4.4, POOL_R=0.8;
  const SPOUT=[0,0.198,0.15], MOLT=[0,0.18,0]; // from the crucible's foot, in model units
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.9));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.16,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(0.55,0.5,1); blob.position.set(0,0.004,0.1); scene.add(blob);
  // the warm pool of the kiln's heat on the floor under it (the game's glow)
  const pool=new THREE.Mesh(new THREE.CircleGeometry(1.0,40),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0.08,depthWrite:false}));
  pool.rotation.x=-Math.PI/2; pool.position.set(0,0.006,0.5); scene.add(pool);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.5; orbit.maxDistance=34;
  const VIEWS={Close:{p:[5.2,2.8,7.2],t:[0,1.2,0.8]},'Game zoom':{p:[0,12.5,11.2],t:[0,0.6,2.4]},Side:{p:[11,1.8,1.6],t:[0,1.2,1.4]},Front:{p:[0.8,2.0,11],t:[0,1.2,0]},Back:{p:[-3.8,3.0,-8.4],t:[0,1.2,0.6]},Top:{p:[0,17,0.4],t:[0,0.4,2.0]}};
  function setView(n){const v=VIEWS[n];cam.position.set(...v.p);orbit.target.set(...v.t);orbit.update();}
  function size(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  new ResizeObserver(size).observe(stage); size(); setView('Close');

  // ---- controls
  function group(id,names,onPick,active){const row=$(id);const btns={};names.forEach(n=>{const b=document.createElement('button');b.textContent=LABEL[n]||n;b.dataset.k=n;b.setAttribute('aria-pressed',String(n===active));b.onclick=()=>onPick(n,b);row.appendChild(b);btns[n]=b;});return btns;}
  const sel={base:'idle',going:'Forward',action:null,dead:false};
  let casts=0; // how many Castings it has made (one each at 75, 50 and 25 percent health)
  let speed=1, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, feel=true, fxOn=true, showTarget=true, helper=null;
  const B={};
  B.moves=group('moves',['idle','walk','spawn','death'],k=>pick(k),'idle');
  B.dirs=group('dirs',['Forward','Turn left','Turn right'],k=>{sel.going=k;if(sel.base!=='walk'&&!sel.dead)sel.base='walk';refresh();},'Forward');
  B.acts=group('acts',[...ACTIONS,'hurt'],k=>pick(k),null);
  B.casts=group('casts',['None','I','II','III'],k=>{setCasts(['None','I','II','III'].indexOf(k));},'None');
  B.speeds=group('speeds',['0.1×','0.25×','0.5×','1×'],(k)=>{speed=parseFloat(k);Object.values(B.speeds).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'1×');
  B.views=group('views',Object.keys(VIEWS),k=>{setView(k);Object.values(B.views).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));},'Close');
  const toggle=(id,get,set)=>{const b=$(id);b.onclick=()=>{set(!get());b.setAttribute('aria-pressed',String(get()));};b.setAttribute('aria-pressed',String(get()));};
  toggle('feel',()=>feel,v=>feel=v); toggle('fx',()=>fxOn,v=>{fxOn=v;if(!v)clearFx();}); toggle('target',()=>showTarget,v=>{showTarget=v;if(dummy)dummy.visible=v;});
  toggle('bones',()=>!!(helper&&helper.visible),v=>{if(helper)helper.visible=v;}); toggle('pause',()=>paused,v=>paused=v);
  function setCasts(v){ casts=v; Object.values(B.casts).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===v))); }

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, hurtAct=null, shot=null, dummy=null;
  // glow: x the violet eye slits, y the chest door's face and the hearth behind it, z kinds (molten 1, hearth 0.75)
  const gH={value:new THREE.Vector4(0.5,0.5,0.4,0.3)}, gQ={value:new THREE.Vector4(0,0,0,0)};
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // uH: x seams (the heat in the brick's own bright mortar lines), y the fire (door and hearth), z molten, w eyes; uQ: x grey (quenched or dead), y flash
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uH:gH,uQ:gQ});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uH;\nuniform vec4 uQ;\nfloat isK(float z,float k){return 1.0-step(0.06,abs(z-k));}\nfloat hotT;')
        .replace('#include <map_fragment>',['#include <map_fragment>',
          'hotT=smoothstep(0.42,0.75,diffuseColor.r)*smoothstep(0.12,0.32,diffuseColor.g)*(1.0-smoothstep(0.18,0.36,diffuseColor.b));',
          'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(0.33)))*0.7,uQ.x*(1.0-isK(vMask.z,1.0)));'].join('\n'))
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'float body=1.0-step(0.1,vMask.z);',
          'totalEmissiveRadiance+=vec3(1.0,0.66,0.2)*(uH.x*hotT*body+uH.y*vMask.y*(0.25+hotT))+vec3(1.0,0.75,0.35)*uH.y*0.6*isK(vMask.z,0.75)+vec3(0.5,0.36,0.16)*uH.z*isK(vMask.z,1.0)+vec3(0.56,0.39,0.93)*uH.w*vMask.x+vec3(0.55)*uQ.y;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(chest|neck|head)\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,casts,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[laneG.visible,ringG.visible,fireG.visible],quench:+quenchK.toFixed(2),fire:+fireK.toFixed(2),heat:+gH.value.x.toFixed(2),pools:POOLS.filter(p=>p.t>=0).length,bellFly:flyBell.visible,stream:stream.visible,mould:mould.visible,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:gH.value.toArray().map(v=>+v.toFixed(2)),grey:+gQ.value.x.toFixed(2),cru:cruPt([0,0,0]).toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
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
    else if(k==='hurt'){ if(sel.dead)return; hurtAct.reset(); hurtAct.setEffectiveWeight(1); hurtAct.play(); hitFeel(0.3,0.04,0.5); flash=0.35; if(fxOn)sparks(headPt(),6,GOLD,1.6,0.25); }
    else { if(sel.dead)return; sel.action=sel.action===k?null:k; if(sel.action&&(!shot||shot.done||shot.name!==k))startShot(k); }
    refresh();
  }
  function refresh(){
    Object.values(B.moves).forEach(b=>{const k=b.dataset.k; b.setAttribute('aria-pressed',String(k==='death'?sel.dead:k==='spawn'?!!(shot&&shot.name==='spawn'&&!shot.done):!sel.dead&&sel.base===k)); b.disabled=sel.dead&&(k==='idle'||k==='walk'); b.textContent=k==='death'&&sel.dead?'Death (press to spawn)':LABEL[k];});
    Object.values(B.dirs).forEach(b=>{b.setAttribute('aria-pressed',String(sel.base==='walk'&&!sel.dead&&b.dataset.k===sel.going)); b.disabled=sel.dead;});
    Object.values(B.acts).forEach(b=>{b.setAttribute('aria-pressed',String(sel.action===b.dataset.k)); b.disabled=sel.dead;});
  }
  function showPhase(){
    const el=$('layers'), ph=$('phases'), tag=$('clipname'); const bn=baseName(); const st=casts?' · Casting '+['','I','II','III'][casts]+' made':'';
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
  const Y=new THREE.Vector3(0,1,0), tmp=new THREE.Vector3(), tmp2=new THREE.Vector3();
  const pt=(bone,v)=>tmp.set(v[0],v[1],v[2]).applyMatrix4(bone.matrixWorld).clone();
  const toFloor=(w)=>w.clone().applyMatrix4(fxG.matrix.clone().invert());
  const toWorld=(p)=>p.clone().applyMatrix4(fxG.matrix);

  // ---- hit feel: freeze, squash (the game's boss contact squash: 11% wider, 5% shorter), shake, flash
  let hitstop=0, squash=0, shake=0, flash=0; const shakeV=new THREE.Vector3();
  function hitFeel(sh,stop,sq){ if(!feel)return; hitstop=Math.max(hitstop,stop); squash=Math.max(squash,sq); shake=Math.max(shake,sh); }

  // ---- effects (dim on purpose; Ember marks the floor warnings, the Kiln's heat is Kiln Gold, Violet its eyes)
  const FXP=[], RINGS=[], MARKS=[], POOLS=[]; let dotTex=null, laneG=null, ringG=null, fireG=null, stream=null, run=null, flyBell=null, mould=null, mouldL=null, mouldR=null, doorGlow=null, spill=null;
  let heat=0.5, fireK=0, quenchK=0, moltK=0.8, eyeK=0.4, laneT=-1, ringT=-1, fireT=-1, runT=-1, bellT=-1, bellFrom=null, bellTo=null, bellLand=-1, mouldT=-1, spillT=-1, idleT=0, deadK=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<200;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,96),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,96),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f,r}; g.visible=false; fxG.add(g); return g;};
    // Bell Drop: an Ember ring of radius 1.9 u on the hero (2.3 u from the Third Casting); the Firing: one of 4.4 u round itself
    ringG=flatRing(1.0); fireG=flatRing(FIRE_R);
    // Molten Pour: an Ember lane 1.4 u wide and up to 9 u long from its body, with a fill that runs down it
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),eMat(op)); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    const hw=LANE_W/2, L=LANE_LEN; laneG=new THREE.Group(); const lf=flat(LANE_W,L,0,L/2,0.14), le=[flat(0.035,L,-hw,L/2,0.6),flat(0.035,L,hw,L/2,0.6),flat(LANE_W,0.035,0,L,0.6),flat(LANE_W,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // the pour: a stream of molten bronze from the spout to the floor, then a run of it down the lane, then three pools of slag
    stream=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,1,8,1,true).translate(0,-0.5,0),new THREE.MeshBasicMaterial({color:HEAT,transparent:true,opacity:0,depthWrite:false})); stream.visible=false; scene.add(stream);
    run=new THREE.Mesh(new THREE.PlaneGeometry(LANE_W*0.55,1).translate(0,-0.5,0),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); run.rotation.x=-Math.PI/2; run.visible=false; fxG.add(run);
    for(let i=0;i<6;i++){ const gq=new THREE.Group(); const d=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:SLAG,transparent:true,opacity:0,depthWrite:false})); const r=new THREE.Mesh(new THREE.RingGeometry(0.82,1,40),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false})); d.rotation.x=r.rotation.x=-Math.PI/2; r.position.y=0.002; gq.add(d,r); gq.visible=false; fxG.add(gq); POOLS.push({g:gq,d,r,t:-1}); }
    // the fresh-cast bell that falls on the ring
    const pr=[[0.001,0.62],[0.12,0.6],[0.2,0.5],[0.23,0.3],[0.26,0.1],[0.31,0.02],[0.3,0]].map(p=>new THREE.Vector2(p[0],p[1]));
    flyBell=new THREE.Mesh(new THREE.LatheGeometry(pr,18),new THREE.MeshStandardMaterial({color:BRONZE,roughness:0.5,metalness:0.4,emissive:GOLD,emissiveIntensity:0.25,side:THREE.DoubleSide})); flyBell.visible=false; fxG.add(flyBell);
    // a mould at its right hand that a Casting breaks open (the game's creatures crawl out of it)
    mould=new THREE.Group(); const mm=new THREE.MeshStandardMaterial({color:0x4a3e38,roughness:1}); mouldL=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.45,0.55).translate(0.14,0.225,0),mm); mouldR=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.45,0.55).translate(-0.14,0.225,0),mm);
    const lip=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.4,0.5),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0.5})); lip.position.y=0.22; const gl=new THREE.Group(); const gr2=new THREE.Group(); gl.position.x=-0.28; gr2.position.x=0.28; mouldL.position.x=0; gl.add(mouldL); gr2.add(mouldR); mouldL.position.x=0.0; mould.add(gl,gr2,lip); mould.userData={gl,gr:gr2,lip}; mould.position.set(-1.5,0,1.1); mould.visible=false; fxG.add(mould);
    // the spill when it drops the crucible
    spill=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false})); spill.rotation.x=-Math.PI/2; spill.visible=false; fxG.add(spill);
    // marks on the floor
    for(let i=0;i<8;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x2a2622,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); MARKS.push({m,t:-1,life:2.6,a:0.3}); }
    // the light of the fire through the open door
    doorGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:GOLD,transparent:true,depthWrite:false,opacity:0})); doorGlow.scale.setScalar(1.2); scene.add(doorGlow);
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||ASH); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.5,a:0.18,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()*0.8,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.08,s1:0.02,a:0.55,col,g:-4,drag:1.5});} }
  function steam(pos,n,spread){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.4,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.3,0.6+Math.random()*0.6,(Math.random()-0.5)*0.3),{life:1.4+Math.random()*0.6,s0:0.15,s1:0.55,a:0.16,col:STEAM,drag:0.8}); } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||GOLD);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function markAt(pos,o){ if(!fxOn)return; const m=MARKS.find(m=>m.t<0)||MARKS[0]; m.t=0; m.life=o.life||2.6; m.a=o.a||0.3; m.delay=o.delay||0; m.m.position.copy(o.local?pos:toFloor(pos)).setY(0.009); m.m.scale.set(o.r||1,o.r||1,1); m.m.rotation.set(-Math.PI/2,0,0); m.m.material.color.setHex(o.col||0x2a2622); m.m.visible=false; }
  function hideTele(){ if(laneG){laneG.visible=false;ringG.visible=false;fireG.visible=false;} laneT=-1; ringT=-1; fireT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); MARKS.forEach(m=>{m.t=-1;m.m.visible=false;}); POOLS.forEach(p=>{p.t=-1;p.g.visible=false;}); runT=-1; if(run){run.visible=false;stream.visible=false;flyBell.visible=false;mould.visible=false;spill.visible=false;} bellT=-1; mouldT=-1; spillT=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const headPt=()=>pt(bones.head,[0,0.08,0.05]);
  const cruPt=(v)=>pt(bones.cru,v);
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.hold=0; dummy.position.set(0,0,z); } }
  function hitDummy(){ if(!dummy||!showTarget)return; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),10,HEAT,2.0,0.3); }
  function fxStart(name){
    hideTele(); HOME=NEAR;
    if(name==='pour'){ setHero(LANE_AT); if(dummy)dummy.userData.hold=2.2; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0.3)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw; } }
    if(name==='bell'){ setHero(NEAR); if(fxOn){ ringT=0; const r=casts>=3?BELL_R3:BELL_R; ringG.scale.set(r,1,r); ringG.position.copy(toFloor(targetW())).setY(0.012); ringG.visible=true; } }
    if(name==='firing'){ setHero(FIRE_AT); if(dummy)dummy.userData.hold=4.5; if(fxOn){ fireT=0; fireG.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.012); fireG.visible=true; } }
    if(name==='casting'){ if(fxOn){ mould.position.copy(toFloor(new THREE.Vector3(-1.5,0,1.1))); mould.rotation.y=-floorYaw; mould.userData.gl.rotation.z=0; mould.userData.gr.rotation.z=0; mould.userData.gl.position.x=-0.28; mould.userData.gr.position.x=0.28; mould.userData.lip.visible=true; mould.visible=true; mouldT=-1; } }
    if(name==='spawn'){ deadK=0; cv.style.filter=''; if(fxOn){ const o=new THREE.Vector3(0,0,0); ringAt(o,{r0:0.3,r1:1.8,dur:0.6,a:0.35}); dust(o,14,1.2,0.4,ASH); markAt(o,{r:1.3,life:1.8,a:0.14}); } }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(headPt(),12,GOLD,2.2,0.35); }
  }
  function fxContact(name,i){
    if(name==='pour'){ hitFeel(0.5,0.04,0.45); laneT=Math.max(laneT,POUR_T);
      if(fxOn){ runT=0; run.visible=true; run.position.copy(laneG.position).setY(0.02); run.rotation.set(-Math.PI/2,0,-floorYaw); sparks(cruPt(SPOUT),10,GOLD,1.4,0.35); }
      if(dummy&&showTarget){ const d=dummy.userData; if(Math.abs(d.x)<LANE_W/2+0.3&&d.z>-0.3&&d.z<LANE_LEN+0.3)hitDummy(); } }
    if(name==='bell'){ hitFeel(0.75,0.07,0.6); const c=ringG.getWorldPosition(new THREE.Vector3()), r=ringG.scale.x; ringG.visible=false; ringT=-1;
      if(fxOn){ ringAt(c,{r0:0.3,r1:r+0.15,dur:0.32,a:0.5,col:EMBER}); ringAt(c,{r0:0.2,r1:r+0.6,dur:0.55,a:0.3,delay:0.05}); dust(c,16,1.8,0.5,ASH); sparks(c.clone().setY(0.3),10,GOLD,2.2,0.4); markAt(c,{r:r*0.6,life:2.6,a:0.2}); bellLand=0; }
      if(dummy&&showTarget&&targetW().distanceTo(c.setY(0))<r+0.3)hitDummy(); }
    if(name==='firing'){
      if(i===0){ hitFeel(0.9,0.08,0.8); fireG.visible=false; fireT=-1; const c=new THREE.Vector3(0,0,0); flash=0.3;
        if(fxOn){ ringAt(c,{r0:0.6,r1:FIRE_R,dur:0.35,a:0.5,col:EMBER}); ringAt(c,{r0:0.6,r1:FIRE_R+0.4,dur:0.6,a:0.4,delay:0.03}); ringAt(c,{r0:0.6,r1:FIRE_R+1.2,dur:0.85,a:0.22,delay:0.08,col:HEAT}); sparks(pt(bones.spine,[0,0.05,0.2]),26,GOLD,3.2,0.6); markAt(c,{r:FIRE_R,life:3,a:0.06}); }
        if(dummy&&showTarget&&targetW().length()<FIRE_R+0.3)hitDummy(); }
      else { hitFeel(0.2,0,0.2); } }
    if(name==='casting'){ hitFeel(0.4,0.03,0.35); if(fxOn){ mouldT=0; mould.userData.lip.visible=false; const c=toWorld(mould.position); ringAt(c,{r0:0.2,r1:1.0,dur:0.45,a:0.4}); sparks(c.clone().setY(0.35),14,GOLD,1.8,0.45); dust(c,8,1.0,0.3,ASH); } }
    if(name==='spawn'){ hitFeel(0.35,0.03,0.3); if(fxOn){ const f=pt(bones.footR,[0,0,0]).setY(0); dust(f,10,1.2,0.4,ASH); ringAt(f,{r0:0.2,r1:1.1,dur:0.45,a:0.25,col:ASH}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.5,0.05,0.4); flash=0.4; if(fxOn)sparks(headPt(),12,GOLD,2.0,0.35); }
      else if(i===1){ hitFeel(0.45,0.03,0.2); if(fxOn){ spillT=0; const p=cruPt(MOLT).setY(0); spill.position.copy(toFloor(p.add(new THREE.Vector3(0,0,0.35)))).setY(0.012); spill.visible=true; sparks(cruPt(MOLT),14,GOLD,1.8,0.45); } }
      else { hitFeel(0.5,0,0.3); if(fxOn){ const c=new THREE.Vector3(0,0,0); dust(c,16,1.6,0.5,ASH); ringAt(c,{r0:0.4,r1:1.8,dur:0.5,a:0.3,col:ASH}); } } }
  }
  function cue(m,k){ return m.cues&&m.cues[k]; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, m=META[n];
    if(n==='firing'){ const op=cue(m,'open'), q=cue(m,'quenched'); fireK=t<op[0]?0:t<op[1]?Math.min(1,(t-op[0])/(op[1]-op[0])):Math.max(0,1-(t-op[1])/0.25); quenchK=t>=q[0]&&t<q[1]?Math.min(1,(t-q[0])/0.3):(t>=q[1]?Math.max(0,1-(t-q[1])/0.6):0);
      if(quenchK>0.3&&fxOn&&Math.random()<d*14)steam(pt(bones.chest,[0,0.05,0]),1,0.6);
      if(fireK>0.2&&fxOn&&Math.random()<d*30*fireK)puff(pt(bones.spine,[0,0.05,0.16]),new THREE.Vector3((Math.random()-0.5)*0.6,0.5+Math.random()*0.6,0.4+Math.random()*0.4),{life:0.7,s0:0.06,s1:0.02,a:0.5,col:GOLD,drag:1}); }
    if(n==='pour'){ const s=cue(m,'stream'); const on=t>=s[0]&&t<s[1]; stream.visible=on&&fxOn; if(on&&fxOn){ const a=cruPt(SPOUT); const b=a.clone(); b.y=0; b.z+=0.35; const len=a.distanceTo(b); stream.position.copy(a); stream.scale.set(1,len,1); stream.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),b.clone().sub(a).normalize()); stream.material.opacity=0.7*Math.min(1,(t-s[0])/0.05)*Math.min(1,(s[1]-t)/0.1); if(Math.random()<d*40)puff(b.clone().setY(0.05),new THREE.Vector3((Math.random()-0.5)*1.2,0.6+Math.random()*0.6,(Math.random())*1.0),{life:0.5,s0:0.07,s1:0.02,a:0.55,col:GOLD,g:-4}); } moltK=0.8+0.2*(on?1:0); }
    if(n==='bell'){ const c=cue(m,'cast')[0]; if(t>=c&&bellT<0&&fxOn&&ringG.visible){ bellT=0; bellFrom=toFloor(cruPt(MOLT)); bellTo=ringG.position.clone(); flyBell.visible=true; sparks(cruPt(MOLT),12,GOLD,1.6,0.4); } }
    if(n==='death'){ const o=cue(m,'out'); deadK=t<o[0]?0:Math.min(1,(t-o[0])/(o[1]-o[0])); if(t>2.5)cv.style.filter='saturate(0.55)'; }
    if(n==='spawn'){ deadK=Math.max(0,1-t/0.9); }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy||shot.name!=='firing'){ fireK=Math.max(0,fireK-d*3); quenchK=Math.max(0,quenchK-d*2); }
    if(!busy){ HOME=NEAR; if(ringT>=0||fireT>=0)hideTele(); }
    // the heat breathes on a slow beat and burns hotter with each Casting; it goes white for the Firing and grey quenched
    idleT+=d; const beat=Math.pow(Math.max(0,Math.sin(idleT*1.4*Math.PI)),3);
    const live=sel.dead?Math.max(0,1-deadK):1-deadK;
    heat+=((0.32+0.1*beat+0.06*casts+0.5*fireK)*(1-0.85*quenchK)*live-heat)*Math.min(1,d*6);
    moltK+=((0.75+0.15*beat)*(1-0.7*quenchK)*live-moltK)*Math.min(1,d*4);
    eyeK+=((0.45+0.3*fireK)*(1-0.6*quenchK)*live-eyeK)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; gH.value.set(on*heat,on*(heat*0.8+0.9*fireK),on*moltK,on*eyeK); gQ.value.set(Math.max(quenchK*0.8,deadK*0.85),feel?flash:0,0,0);
    pool.material.opacity=(0.05+0.03*beat+0.12*fireK)*(1-quenchK)*live*on;
    doorGlow.position.copy(pt(bones.spine,[0,0.05,0.2])); doorGlow.material.opacity=(0.22*fireK)*on; doorGlow.scale.setScalar(0.8+0.9*fireK);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    MARKS.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=(m.t-m.delay)/m.life; if(u<0){m.m.visible=false;return;} if(u>=1){m.t=-1;m.m.visible=false;return;} m.m.visible=true; m.m.material.opacity=m.a*(u<0.05?u/0.05:1-Math.max(0,(u-0.6)/0.4)); });
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    if(ringT>=0){ ringT+=d; fill(ringG,ringT,BELL_T); if(!fxOn)hideTele(); }
    if(fireT>=0){ fireT+=d; fill(fireG,fireT,FIRE_T); if(!fxOn)hideTele(); }
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/POUR_T), out=Math.max(0,(laneT-POUR_T)/0.26); if(out>=1||!fxOn){ laneG.visible=false; laneT=-1; } else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=LANE_LEN/2*k; u.lf.material.opacity=(laneT>POUR_T?0.4:(0.08+0.1*k+0.02*Math.sin(laneT*24)*k))*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    // the run of bronze down the lane (0.3 s), then it cools into three pools of slag (3 s)
    if(runT>=0){ runT+=d; const k=Math.min(1,runT/0.3), u=runT/0.9; if(u>=1||!fxOn){ runT=-1; run.visible=false; } else { run.scale.set(1,LANE_LEN*k,1); run.material.opacity=0.45*(u<0.6?1:1-(u-0.6)/0.4); }
      if(runT>=0.3&&runT-d<0.3&&fxOn){ for(let k2=0;k2<3;k2++){ const p=POOLS.find(p=>p.t<0)||POOLS[0]; const z=LANE_LEN*(k2+0.5)/3; p.t=0; p.g.position.copy(laneG.position).add(new THREE.Vector3(0,0.006,z).applyAxisAngle(Y,-floorYaw)); p.g.scale.setScalar(POOL_R); p.g.visible=true; } } }
    POOLS.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t/3; if(u>=1||!fxOn){p.t=-1;p.g.visible=false;return;} const a=u<0.06?u/0.06:1-Math.max(0,(u-0.75)/0.25); p.d.material.opacity=0.55*a; p.r.material.opacity=0.5*a*(1-0.7*u); });
    // the bell's flight from the crucible to the ring, landing on the beat; it sits, then sinks into the floor
    if(bellT>=0&&bellFrom){ bellT+=d; const T=BELL_T-META.bell.cues.cast[0], u=Math.min(1,bellT/T); const p=bellFrom.clone().lerp(bellTo,u); p.y=bellFrom.y*(1-u)+4.2*Math.sin(Math.PI*Math.min(1,u))*(1-0.15*u); flyBell.position.copy(p); flyBell.rotation.set(0.6*Math.sin(u*6),0,0.4*Math.sin(u*5)); flyBell.scale.setScalar(0.6+0.6*u);
      if(u>=1){ flyBell.rotation.set(0,0,0); flyBell.position.y=0; }
      if(bellT>T+1.4){ flyBell.position.y=-(bellT-T-1.4)*0.9; flyBell.material.emissiveIntensity=0.05; }
      if(bellT>T+2.4||!fxOn){ bellT=-1; flyBell.visible=false; flyBell.material.emissiveIntensity=0.25; } else flyBell.material.emissiveIntensity=Math.max(0.05,0.25-0.2*Math.max(0,bellT-T)); }
    if(mouldT>=0){ mouldT+=d; const u=Math.min(1,mouldT/0.35), U2=mould.userData; U2.gl.rotation.z=0.5*u; U2.gr.rotation.z=-0.5*u; U2.gl.position.x=-0.28-0.12*u; U2.gr.position.x=0.28+0.12*u;
      if(mouldT<1.2&&fxOn&&Math.random()<d*10){ const c=toWorld(mould.position); const a=Math.random()*Math.PI*2; puff(c.clone().setY(0.12),new THREE.Vector3(Math.cos(a)*0.6,0.1,Math.sin(a)*0.6),{life:1.0,s0:0.16,s1:0.12,a:0.5,col:0x2e2622,drag:0.5}); }
      if(mouldT>2.2||!fxOn){ mouldT=-1; mould.visible=false; } }
    if(spillT>=0){ spillT+=d; const u=Math.min(1,spillT/0.5); spill.scale.setScalar(0.1+0.6*u); spill.material.opacity=0.55*(spillT<1.2?1:Math.max(0,1-(spillT-1.2)/1.6)); spill.material.color.setHex(spillT<1.0?GOLD:SLAG); if(spillT>1.2&&spillT<2.2&&fxOn&&Math.random()<d*8)steam(toWorld(spill.position),1,0.5); if(spillT>3||!fxOn){ spillT=-1; spill.visible=false; } }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }

  // ---- the loop
  let last=performance.now();
  function travelAt(name,t){ const tr=META[name].travel; if(!tr)return 0; const f=Math.min(tr.length-1,Math.max(0,t*60)); const i=Math.floor(f), j=Math.min(tr.length-1,i+1); return tr[i]+(tr[j]-tr[i])*(f-i); }
  function tick(d){
    if(!mixer)return;
    const stopped=hitstop>0; if(stopped){hitstop-=d;} const md=stopped?0:d;
    const bn=baseName();
    if(shot&&!shot.done){ const a=shot.action, m=META[shot.name]; if(a.time>=Math.min(m.dur,a.getClip().duration)-1e-3){ shot.done=true; if(shot.name==='spawn')refresh(); if(shot.name==='pour')stream.visible=false; } }
    if(shot&&shot.done&&!shot.hold&&sel.action&&!sel.dead){ shot.gap+=md; if(shot.gap>0.7)startShot(sel.action); }
    Object.entries(A).forEach(([k,a])=>{ let to=0; if(shot&&shot.action===a)to=(shot.done&&!shot.hold)?0:1; else if(k===bn)to=(shot&&(!shot.done||shot.hold))?0:1;
      const tau=(shot&&shot.action===a)?0.18:(to>a.__w?0.18:0.12); a.__w+=(to-a.__w)*Math.min(1,md/tau); if(Math.abs(to-a.__w)<0.002)a.__w=to; a.setEffectiveWeight(a.__w); });
    mixer.update(md);
    if(!sel.dead&&!(shot&&shot.name==='spawn'&&!shot.done))deadK=0;
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
