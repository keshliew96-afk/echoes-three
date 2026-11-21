(function(){
  const $=id=>document.getElementById(id);
  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.4;
  const VIOLET=0x8F63EE, PEAK=0xE6DDF8, EMBER=0xFF5A36, DUST=0x8a8580, SILK=0xd8d2e4, VEIN=0x5b2a66;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',bind:'Bind',slam:'Heartbeat Slam',brood:'Brood Sacs',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['bind','slam','brood','enrage','heavyHit'];
  const NEAR=3.6, BIND_AT=6.0, SLAM_AT=2.2, BROOD_AT=4.5; let HOME=NEAR; // where the hero stands, in u, in front of it
  const WALK=1.25, TURN=90*Math.PI/180, LANE_T=44/60, LANE_LEN=8.0, LANE_W=0.9, LEASH=3.6, BOUND=2.5, RING_R=2.8, VEIN_RING=2.1, VEIN_R=0.7, SAC_R=1.1, SAC_SIDE=2.2, SAC_T=64/60, WEB_R=1.1;
  let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){$('load').textContent='This browser could not start 3D. Try another browser.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8f96,0.9));
  const sun=new THREE.DirectionalLight(0xffffff,0.75); sun.position.set(2.5,6,4.5); scene.add(sun);
  const gridG=new THREE.Group(), fxG=new THREE.Group(); gridG.matrixAutoUpdate=false; fxG.matrixAutoUpdate=false; scene.add(gridG,fxG);
  const grid=new THREE.GridHelper(48,48,0x4a4f48,0x4a4f48); grid.material.transparent=true; grid.material.opacity=0.85; grid.position.y=0.002; gridG.add(grid);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.16,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.scale.set(1.25,1.0,1); blob.position.set(0,0.004,0.0); scene.add(blob);
  const cam=new THREE.PerspectiveCamera(32,4/3,0.05,120);
  const orbit=new THREE.OrbitControls(cam,cv); orbit.enablePan=false; orbit.enableDamping=true; orbit.minDistance=2.5; orbit.maxDistance=34;
  const VIEWS={Close:{p:[4.6,2.4,6.2],t:[0,0.7,0.6]},'Game zoom':{p:[0,12.5,11.2],t:[0,0.4,2.4]},Side:{p:[10,1.6,0.8],t:[0,0.7,0.6]},Front:{p:[0.6,1.6,9.5],t:[0,0.7,0]},Back:{p:[-3.4,2.8,-7.6],t:[0,0.7,0.4]},Top:{p:[0,15,0.4],t:[0,0.3,1.6]}};
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
    // glow masks: x the eyes; y the veins over the abdomen; z the crystal spires (1), the crystals on the legs (0.75) and the spinnerets (0.5)
    mesh.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uA:gA,uB:gB});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uA;\nuniform vec4 uB;')
        .replace('#include <emissivemap_fragment>',['#include <emissivemap_fragment>',
          'float ez=vMask.z;',
          'float spireM=step(0.95,ez), xtalM=step(0.7,ez)*(1.0-step(0.8,ez)), spinM=step(0.45,ez)*(1.0-step(0.55,ez));',
          'totalEmissiveRadiance+=vec3(0.75,0.4,1.0)*uA.x*vMask.x+vec3(0.85,0.35,1.0)*uA.y*vMask.y+vec3(0.7,0.45,1.0)*uA.z*spinM+vec3(0.55)*uA.w;',
          'totalEmissiveRadiance+=vec3(0.65,0.4,1.0)*uB.x*xtalM+vec3(0.6,0.4,1.0)*uB.y*spireM;'].join('\n'));};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(hips|head|abdomen|spinner|fangL|fangR)\./;
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[laneG.visible,ringG.visible,SACS.filter(s=>s.g.visible).length],thread:[thread.visible,+threadK.toFixed(2),bound],sacs:SACS.filter(s=>s.sac.visible).length,patches:PATCHES.filter(p=>p.t>=0).length,webs:WEBS.filter(p=>p.t>=0).length,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glowA:gA.value.toArray().map(v=>+v.toFixed(2)),glowB:gB.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
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
    else if(k==='hurt'){ if(sel.dead)return; hurtAct.reset(); hurtAct.setEffectiveWeight(1); hurtAct.play(); hitFeel(0.3,0.04,0.5); flash=0.35; if(fxOn)sparks(headPt(),6,PEAK,1.6,0.25); }
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
  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is its power, pale silk for the webs)
  const FXP=[], RINGS=[], MARKS=[], PATCHES=[], WEBS=[], SACS=[]; let dotTex=null, laneG=null, ringG=null, thread=null, boundRing=null;
  let eyes=1, eyesTo=1, veins=0.35, veinsTo=0.35, spin=0.2, spinTo=0.2, xtal=0.15, laneT=-1, ringT=-1, beatPh=0, threadK=0, bound=0, boundT=-1;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<200;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    const eMat=(op)=>new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide});
    const flatRing=(r)=>{const g=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(r-0.04,r,72),eMat(0.6)); const f=new THREE.Mesh(new THREE.CircleGeometry(r,72),eMat(0.12)); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; g.add(e,f); g.userData={e,f}; g.visible=false; fxG.add(g); return g;};
    // Heartbeat Slam: an Ember ring of radius 2.8 u round herself
    ringG=flatRing(RING_R);
    // Bind: an Ember lane 0.9 u wide and up to 8 u long from her front, with a fill that runs down it
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),eMat(op)); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    laneG=new THREE.Group(); const L=LANE_LEN, hw=LANE_W/2, lf=flat(LANE_W,L,0,L/2,0.14), le=[flat(0.035,L,-hw,L/2,0.6),flat(0.035,L,hw,L/2,0.6),flat(LANE_W,0.035,0,L,0.6),flat(LANE_W,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // the thread: from her spinnerets, over her back and head, out to where it struck
    const tg=new THREE.BufferGeometry().setFromPoints(Array.from({length:33},()=>new THREE.Vector3())); thread=new THREE.Line(tg,new THREE.LineBasicMaterial({color:SILK,transparent:true,opacity:0})); thread.frustumCulled=false; thread.visible=false; scene.add(thread);
    const tg2=tg.clone(); const glowT=new THREE.Line(tg2,new THREE.LineBasicMaterial({color:VIOLET,transparent:true,opacity:0})); glowT.frustumCulled=false; thread.userData.glow=glowT; glowT.visible=false; scene.add(glowT);
    // the bound hero: a violet ring of thread round them
    boundRing=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.018,6,40),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); boundRing.rotation.x=-Math.PI/2; boundRing.visible=false; scene.add(boundRing);
    // vein patches the slam leaves: a dark violet stain with veins running out of it (4 s, 40 percent slow)
    for(let i=0;i<8;i++){ const g=new THREE.Group(); const disc=new THREE.Mesh(new THREE.CircleGeometry(VEIN_R,32),new THREE.MeshBasicMaterial({color:VEIN,transparent:true,opacity:0,depthWrite:false})); disc.rotation.x=-Math.PI/2; disc.position.y=0.008; g.add(disc);
      const vs=[]; for(let k=0;k<6;k++){ const a=k/6*Math.PI*2+i*0.7, pts=[]; let x=0, z=0; for(let j=0;j<5;j++){ x+=Math.cos(a+0.5*Math.sin(j*2.1+k))*VEIN_R/5; z+=Math.sin(a+0.5*Math.sin(j*2.1+k))*VEIN_R/5; pts.push(new THREE.Vector3(x,0.012,z)); } pts.unshift(new THREE.Vector3(0,0.012,0)); const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:VIOLET,transparent:true,opacity:0})); g.add(l); vs.push(l); }
      g.visible=false; fxG.add(g); PATCHES.push({g,disc,vs,t:-1,life:4,delay:0}); }
    // the webs a sac leaves: pale silk, radial threads and two rings (4 s, 50 percent slow)
    for(let i=0;i<6;i++){ const g=new THREE.Group(); const disc=new THREE.Mesh(new THREE.CircleGeometry(WEB_R,32),new THREE.MeshBasicMaterial({color:SILK,transparent:true,opacity:0,depthWrite:false})); disc.rotation.x=-Math.PI/2; disc.position.y=0.007; g.add(disc);
      const pts=[]; for(let k=0;k<10;k++){ const a=k/10*Math.PI*2+i; pts.push(new THREE.Vector3(0,0.011,0),new THREE.Vector3(Math.cos(a)*WEB_R,0.011,Math.sin(a)*WEB_R)); } [0.45,0.8].forEach(r=>{ for(let k=0;k<10;k++){ const a=k/10*Math.PI*2+i, b=(k+1)/10*Math.PI*2+i; pts.push(new THREE.Vector3(Math.cos(a)*r*WEB_R,0.011,Math.sin(a)*r*WEB_R),new THREE.Vector3(Math.cos(b)*r*WEB_R,0.011,Math.sin(b)*r*WEB_R)); } });
      const lines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:SILK,transparent:true,opacity:0})); g.add(lines); g.visible=false; fxG.add(g); WEBS.push({g,disc,lines,t:-1,life:4}); }
    // Brood Sacs: three Ember rings and the sacs that fall into them (a pale egg sac veined violet)
    const sacM=new THREE.MeshStandardMaterial({color:0xcfc6d8,roughness:0.7,emissive:VIOLET,emissiveIntensity:0.15});
    for(let i=0;i<3;i++){ const g=flatRing(SAC_R); const sac=new THREE.Mesh(new THREE.SphereGeometry(0.22,16,12),sacM); sac.scale.set(1,1.25,1); sac.visible=false; fxG.add(sac); SACS.push({g,sac,t:-1,at:new THREE.Vector3(),from:new THREE.Vector3(),hit:false}); }
    for(let i=0;i<14;i++){ const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x2a2630,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m); MARKS.push({m,t:-1,life:2.6,a:0.3}); }
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col,big){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.6+Math.random()*0.35,s0:0.18*(big||1),s1:0.55*(big||1),a:0.2,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  function rise(pos,n,spread,up,col,life){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.3,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.4,up*(0.5+Math.random()),(Math.random()-0.5)*0.4),{life:(life||1.3)*(0.7+Math.random()*0.6),s0:0.08,s1:0.03,a:0.4,col:col||VIOLET,drag:1.3}); } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(o.local?pos:toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function markAt(pos,o){ if(!fxOn)return; const m=MARKS.find(m=>m.t<0)||MARKS[0]; m.t=0; m.life=o.life||2.6; m.a=o.a||0.3; m.delay=o.delay||0; m.m.position.copy(o.local?pos:toFloor(pos)).setY(0.009); m.m.scale.set(o.sx||o.r||1,o.sz||o.r||1,1); m.m.rotation.set(-Math.PI/2,0,o.rot||0); m.m.material.color.setHex(o.col||0x2a2630); m.m.visible=false; }
  function patchAt(local,delay){ if(!fxOn)return; const p=PATCHES.find(p=>p.t<0)||PATCHES[0]; p.g.position.copy(local).setY(0); p.g.visible=false; p.t=0; p.delay=delay||0; }
  function webAt(local){ if(!fxOn)return; const p=WEBS.find(p=>p.t<0)||WEBS[0]; p.g.position.copy(local).setY(0); p.g.rotation.y=Math.random()*6; p.g.visible=false; p.t=0; }
  function hideTele(){ if(laneG){laneG.visible=false;ringG.visible=false;} laneT=-1; ringT=-1; }
  function dropThread(){ threadK=0; bound=0; boundT=-1; if(thread){ thread.visible=false; thread.userData.glow.visible=false; boundRing.visible=false; } }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); dropThread(); MARKS.forEach(m=>{m.t=-1;m.m.visible=false;}); PATCHES.forEach(p=>{p.t=-1;p.g.visible=false;}); WEBS.forEach(p=>{p.t=-1;p.g.visible=false;}); SACS.forEach(s=>{s.t=-1;s.g.visible=false;s.sac.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const headPt=()=>pt(bones.head,[0,0,0.05]);
  const spinPt=()=>pt(bones.spinner,[0,0,0]);
  const footPt=(k)=>{ const b=bones['tip'+k[1]+k[0]]; return b?pt(b,[0,0,0]).setY(0.02):new THREE.Vector3(); };
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.hold=0; dummy.position.set(0,0,z); } }
  function hitDummy(push){ if(!dummy||!showTarget)return; const u=dummy.userData; u.hold=Math.max(u.hold,0.6); u.mat.emissiveIntensity=feel?0.45:0; if(push){u.z+=push;} if(fxOn)sparks(targetW().setY(0.5),10,PEAK,2.2,0.3); }
  const inLane=()=>dummy&&showTarget&&Math.abs(dummy.userData.x)<LANE_W/2+0.24&&dummy.userData.z>0&&dummy.userData.z<LANE_LEN+0.3;
  function fxStart(name){
    hideTele(); HOME=NEAR; if(name!=='bind'&&boundT<0)dropThread();
    if(name==='bind'){ dropThread(); setHero(BIND_AT); if(dummy)dummy.userData.hold=2.6; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0.3)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw; } }
    if(name==='slam'){ setHero(SLAM_AT); if(dummy)dummy.userData.hold=2.0; if(fxOn){ ringT=0; ringG.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.012); ringG.visible=true; } }
    if(name==='brood'){ setHero(BROOD_AT); if(dummy)dummy.userData.hold=2.6; }
    if(name==='spawn'){ eyes=0; veins=0; spin=0; cv.style.filter=''; if(fxOn){ const o=new THREE.Vector3(0,0,0); ringAt(o,{r0:0.4,r1:2.0,dur:0.6,a:0.35}); dust(o,14,1.4,0.6); markAt(o,{r:1.5,life:1.8,a:0.12,col:0x3a3346}); } }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn){ sparks(headPt(),12,PEAK,2.4,0.3); } }
  }
  function legsDust(ks,big){ ks.forEach(k=>{ const p=footPt(k); dust(p,3,0.9*big,0.35,DUST,0.8*big); }); }
  function fxContact(name,i){
    if(name==='bind'){ hitFeel(0.45,0.04,0.35); laneT=Math.max(laneT,LANE_T); threadK=0.001; bound=inLane()?1:0; if(fxOn){ legsDust(['L1','R1'],1); sparks(spinPt(),8,VIOLET,1.8,0.35); } }
    if(name==='slam'){ hitFeel(0.85,0.07,0.8); ringG.visible=false; ringT=-1; const c=new THREE.Vector3(0,0,0);
      if(fxOn){ ringAt(c,{r0:0.4,r1:RING_R,dur:0.3,a:0.5,col:EMBER}); ringAt(c,{r0:0.4,r1:3.4,dur:0.55,a:0.4,delay:0.03}); ringAt(spinPt(),{r0:0.1,r1:1.2,dur:0.3,a:0.45,bill:true}); legsDust(['L1','R1','L2','R2'],1.2); dust(c,16,2.0,0.5,DUST,1.2);
        const o=toFloor(c); for(let k=0;k<4;k++){ const a=k/4*Math.PI*2+Math.PI/4-floorYaw; patchAt(new THREE.Vector3(o.x+Math.sin(a)*VEIN_RING,0,o.z+Math.cos(a)*VEIN_RING),0.05*k); } }
      if(dummy&&showTarget&&targetW().distanceTo(c)<RING_R+0.24)hitDummy(0.5); }
    if(name==='brood'){ hitFeel(0.3,0.03,0.3); if(fxOn){ ringAt(spinPt(),{r0:0.1,r1:0.8,dur:0.3,a:0.35,bill:true}); sparks(spinPt(),8,VIOLET,1.8,0.4);
        // three sacs: on the hero and 2.2 u to either side, across the line from her to the hero
        const h=toFloor(targetW()), o=toFloor(new THREE.Vector3(0,0,0)); const dir=h.clone().sub(o).setY(0).normalize(), side=new THREE.Vector3(-dir.z,0,dir.x); const from=toFloor(spinPt());
        const spots=[h.clone(),h.clone().addScaledVector(side,SAC_SIDE),h.clone().addScaledVector(side,-SAC_SIDE)];
        SACS.forEach((s,k)=>{ s.t=0; s.hit=false; s.at.copy(spots[k]).setY(0); s.from.copy(from); s.g.position.copy(s.at).setY(0.012); s.g.visible=true; s.sac.visible=true; s.sac.position.copy(from); }); } }
    if(name==='enrage'){ hitFeel(0.7,0.06,0.7); setRage(true); if(fxOn){ legsDust(['L1','R1','L2','R2'],1); ringAt(new THREE.Vector3(0,0,0.2),{r0:0.4,r1:2.4,dur:0.5,a:0.35}); } }
    if(name==='spawn'){ hitFeel(0.45,0.04,0.45); if(fxOn){ legsDust(['L1','R1'],1); ringAt(headPt(),{r0:0.1,r1:0.9,dur:0.3,a:0.35,bill:true}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.3,0.02,0.3); if(fxOn)legsDust(['L1','R1','L2','R2','L3','R3','L4','R4'],0.8); } else { hitFeel(0.6,0.05,0.5); if(fxOn){ const c=new THREE.Vector3(0,0,-0.1); dust(c,18,1.8,0.5,DUST,1.2); ringAt(c,{r0:0.5,r1:2.0,dur:0.6,a:0.3,col:0x8d8478}); rise(c,14,1.2,1.1,VIOLET,1.6); } } }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, p0=shot.prev, cross=(c)=>p0<c&&t>=c, m=META[n];
    const hit=m.contact[0]||0;
    if(n==='bind'){ spinTo=t<hit?0.3+1.0*t/hit:(t<m.cues.draw[1]?1.0:0.3); eyesTo=t<hit+0.3?1.6:1; veinsTo=0.5;
      if(t<hit&&fxOn&&Math.random()<d*14)rise(spinPt(),1,0.1,0.4,VIOLET,0.5);
      const [d0,d1]=m.cues.draw; if(bound&&dummy&&t>d0&&t<d1){ const u=dummy.userData; u.hold=Math.max(u.hold,0.5); const k=(t-d0)/(d1-d0); u.z+=(LEASH-u.z)*Math.min(1,d*6*(0.4+k)); if(fxOn&&Math.random()<d*12)dust(targetW(),1,0.6,0.2); } }
    if(n==='slam'){ veinsTo=t<hit?0.4+1.0*t/hit:(t<hit+0.3?1.5:0.45); eyesTo=1.5; }
    if(n==='brood'){ veinsTo=t<hit?0.5+0.6*t/hit:0.45; spinTo=t<hit?0.3+1.1*t/hit:(t<hit+0.25?1.4:0.3); eyesTo=1.4; }
    if(n==='enrage'){ eyesTo=1.8; veinsTo=t>m.cues.burn[0]?1.4:0.5+2*t; for(const c of m.cues.beats) if(cross(c)){ hitFeel(0.2,0.02,0.2); if(fxOn){ legsDust([[ 'L1','R1'][m.cues.beats.indexOf(c)%2]],0.8); } } }
    if(n==='spawn'){ eyesTo=t>0.5?1:0; veinsTo=t>0.4?0.35:0.05; spinTo=t>0.4?0.2:0; if(t>0.05&&t<0.7&&Math.random()<d*20)puff(new THREE.Vector3((Math.random()-0.5)*1.8,0.1,(Math.random()-0.5)*1.8),new THREE.Vector3(0,0.6+Math.random(),0),{life:1.0,s0:0.14,s1:0.32,a:0.2,col:DUST}); }
    if(n==='death'){ const dk=m.cues.dark; eyesTo=t<dk[0]?2.0:Math.max(0,1-(t-dk[0])/1.6); veinsTo=t<dk[0]?1.4:Math.max(0,0.8-(t-dk[0])*0.6); spinTo=0; if(t>2.0)cv.style.filter='saturate(0.45)'; }
  }
  // the heart's beat through the veins: faster when enraged
  function heartBeat(d){ beatPh+=d*(rage?2.6:1.6)*Math.PI; return Math.pow(Math.max(0,Math.sin(beatPh)),6); }
  const _a=new THREE.Vector3(), _b=new THREE.Vector3(), _c=new THREE.Vector3();
  function drawThread(d){ // the thread shoots out over 0.1 s, holds the bound hero, and slackens away when it lets go
    if(threadK<=0||!fxOn){ thread.visible=false; thread.userData.glow.visible=false; boundRing.visible=false; return; }
    threadK=Math.min(1,threadK+d/0.1); if(bound&&boundT<0)boundT=0; if(boundT>=0)boundT+=d;
    const life=bound?BOUND:0.5, age=boundT>=0?boundT:(shot&&shot.name==='bind'?shot.action.time-META.bind.contact[0]:9); const fade=age>life?Math.max(0,1-(age-life)/0.3):1; if(fade<=0){ dropThread(); return; }
    const a=spinPt(), end=bound&&dummy?targetW().setY(0.45):toWorld(laneG.position.clone().add(new THREE.Vector3(0,0,LANE_LEN).applyAxisAngle(Y,-floorYaw))).setY(0.05);
    const top=headPt().setY(headPt().y+0.9), P=thread.geometry.attributes.position, Q=thread.userData.glow.geometry.attributes.position, n=P.count;
    for(let i=0;i<n;i++){ const s=(i/(n-1))*threadK; const u=s<0.35?s/0.35:1, w=s<0.35?0:(s-0.35)/0.65; // up over her back to above her head, then out and down to the end
      if(s<0.35){ _a.copy(a).lerp(top,u); _a.y+=0.25*Math.sin(Math.PI*u); } else { _a.copy(top).lerp(end,w); _a.y+=0.5*Math.sin(Math.PI*w)*(bound?0.4:1)-0.12*fade*(1-fade); }
      P.setXYZ(i,_a.x,_a.y,_a.z); Q.setXYZ(i,_a.x,_a.y+0.004,_a.z); }
    P.needsUpdate=true; Q.needsUpdate=true; thread.visible=true; thread.userData.glow.visible=true; thread.material.opacity=0.85*fade; thread.userData.glow.material.opacity=0.35*fade;
    boundRing.visible=!!bound&&!!dummy&&showTarget; if(boundRing.visible){ boundRing.position.copy(targetW()).setY(0.45); boundRing.material.opacity=0.6*fade; boundRing.rotation.z+=d*3; } }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ HOME=NEAR; eyesTo=sel.dead?0:1; veinsTo=sel.dead?0:0.35; spinTo=sel.dead?0:0.2; if(ringT>=0)hideTele(); }
    const beat=sel.dead?0:heartBeat(d);
    eyes+=(eyesTo-eyes)*Math.min(1,d*6); veins+=(veinsTo-veins)*Math.min(1,d*6); spin+=(spinTo-spin)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    xtal+=((sel.dead?0:rage?0.5+0.25*beat:0.15)-xtal)*Math.min(1,d*4);
    const on=fxOn?1:0, vb=rage?1.6:1; gA.value.set(on*0.3*Math.min(2.2,eyes),on*Math.min(1.6,veins*vb*(0.45+0.7*beat))*0.6,on*0.4*spin,feel?flash:0);
    gB.value.set(on*xtal,on*(0.06+0.06*beat*vb),0,0);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03){p.s.position.y=0.03; if(p.g<0){p.v.set(0,0,0);}} const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    MARKS.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=(m.t-m.delay)/m.life; if(u<0){m.m.visible=false;return;} if(u>=1){m.t=-1;m.m.visible=false;return;} m.m.visible=true; m.m.material.opacity=m.a*(u<0.05?u/0.05:1-Math.max(0,(u-0.6)/0.4)); });
    // vein patches: spread out, stand 4 s, fade
    PATCHES.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t-p.delay; if(u<0){p.g.visible=false;return;} if(u>p.life+0.5||!fxOn){p.t=-1;p.g.visible=false;return;} p.g.visible=true; const gr=Math.min(1,u/0.25), fade=u>p.life?1-(u-p.life)/0.5:1;
      p.disc.material.opacity=0.32*fade*gr; p.g.scale.setScalar(Math.max(0.01,gr)); p.vs.forEach((l,k)=>{ l.material.opacity=fade*(0.35+0.3*beat); }); });
    WEBS.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t; if(u>p.life+0.5||!fxOn){p.t=-1;p.g.visible=false;return;} p.g.visible=true; const gr=Math.min(1,u/0.15), fade=u>p.life?1-(u-p.life)/0.5:1; p.g.scale.setScalar(Math.max(0.01,gr)); p.disc.material.opacity=0.16*fade; p.lines.material.opacity=0.55*fade; });
    drawThread(d);
    // the Ember warnings fill over the game's ticks
    const fill=(g,t,T)=>{ const k=Math.min(1,t/T), u=g.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.07+0.08*k+0.02*Math.sin(t*24)*k; u.e.material.opacity=0.45+0.25*k; };
    if(ringT>=0){ ringT+=d; fill(ringG,ringT,META.slam.contact[0]); if(!fxOn)hideTele(); }
    // the sacs: thrown up out of her spinnerets, each falls into its ring as the ring fills (64 ticks), bursts and leaves a web
    SACS.forEach((s,k)=>{ if(s.t<0)return; s.t+=d; const t=s.t; if(!fxOn){ s.t=-1; s.g.visible=false; s.sac.visible=false; return; }
      if(t<SAC_T){ fill(s.g,t,SAC_T); const u=t/SAC_T; s.sac.position.lerpVectors(s.from,s.at,u); s.sac.position.y=s.from.y*(1-u)+0.22*u+3.2*4*u*(1-u); s.sac.rotation.set(t*2+k,t*1.5,0); if(Math.random()<d*12)puff(toWorld(s.sac.position),new THREE.Vector3(0,0.2,0),{life:0.4,s0:0.1,s1:0.04,a:0.25,col:VIOLET}); }
      else if(!s.hit){ s.hit=true; s.g.visible=false; s.sac.visible=false; const w=toWorld(s.at); hitFeel(0.3,0.02,0); ringAt(w,{r0:0.2,r1:SAC_R+0.3,dur:0.35,a:0.45}); ringAt(w,{r0:SAC_R,r1:SAC_R+0.15,dur:0.22,a:0.45,col:EMBER}); dust(w,8,1.2,0.5); sparks(w.clone().setY(0.3),10,SILK,2.0,0.4); webAt(s.at); if(dummy&&showTarget&&targetW().distanceTo(w.setY(0))<SAC_R+0.24)hitDummy(); }
      else if(t>SAC_T+0.2){ s.t=-1; } });
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/LANE_T), out=Math.max(0,(laneT-LANE_T)/0.26); if(out>=1||!fxOn){ laneG.visible=false; laneT=-1; } else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=LANE_LEN/2*k; u.lf.material.opacity=(laneT>LANE_T?0.4:(0.08+0.1*k+0.02*Math.sin(laneT*24)*k))*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  // after the clips: the abdomen swells a little with each beat of the heart. The page undoes it before the clips write.
  let abdS=new THREE.Vector3(1,1,1);
  function overlay(){ abdS.copy(bones.abdomen.scale); const beat=sel.dead?0:Math.pow(Math.max(0,Math.sin(beatPh)),6); bones.abdomen.scale.multiplyScalar(1+0.035*beat); }
  function unOverlay(){ bones.abdomen.scale.copy(abdS); }

  // ---- the loop
  let last=performance.now(); const LAND={walk:[[0,'A'],[0.2,'B']],turnL:[[0,'A'],[0.15,'B']],turnR:[[0,'A'],[0.15,'B']]}; const SETS={A:['L1','R2','L3','R4'],B:['R1','L2','R3','L4']}; let baseT={};
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
    // a puff of dust as each set of four feet comes down in the walk and the turns
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
