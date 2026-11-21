# Builds the Gale Herald's review page from the Thornmother's page (the bench, the controls and the play loop are
# shared; the words, the numbers and the effects are its own). usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB> <audit json> <under-floor sentence> <views WxH>
import sys, json
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Gale Herald Review</title>\n' + ln(2, 59)
BODY = r"""
<div class="wrap">
  <div>
    <h1>Gale Herald from Tripo, rigged</h1>
    <p class="lede">Your export of the Still Spire champion, with a two-legged skeleton, working wings and 11 moves added by hand. Its timings are the game's. Pick a move, drag to turn it, and judge the weight, the flight and the hit. Nothing in the game has changed.</p>
  </div>

  <div class="bench">
    <section class="pane">
      <header><h2>Tripo model</h2><span class="tag" id="clipname">idle</span></header>
      <div class="stage"><canvas id="cv"></canvas><div class="load" id="load">Loading the model…</div><div class="hint">Drag to turn · scroll to zoom · one floor square is 1 u</div></div>
      <div class="controls">
        <div class="row" id="moves"><span class="lab">Move</span></div>
        <div class="row" id="dirs"><span class="lab">Going</span></div>
        <div class="row" id="acts"><span class="lab">Action</span></div>
        <p class="layers" id="layers" aria-live="polite"></p>
        <div class="phases" id="phases" hidden></div>
        <p class="rule">Idle or Walk sets what it does between attacks, and Going turns it on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves it lying where it fell: press it again and it spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is its state under half health: it stays on over every move until you switch it off, and it walks faster. In the Stoop the floor moves under it, so it stays in the middle of the stage while it flies 4.5 u.</p>
        <div class="row" id="speeds"><span class="lab">Speed</span></div>
        <div class="row" id="views"><span class="lab">View</span></div>
        <div class="row"><span class="lab">Show</span>
          <button id="rage" aria-pressed="false">Enraged</button>
          <button id="feel" aria-pressed="true">Hit feel</button>
          <button id="fx" aria-pressed="true">Effects</button>
          <button id="target" aria-pressed="true">Hero for scale</button>
          <button id="bones" aria-pressed="false">Bones</button>
          <button id="pause" aria-pressed="false">Pause</button>
        </div>
      </div>
    </section>

    <section class="pane sent">
      <header><h2>Model as you sent it</h2><span class="tag">four views</span></header>
      <img src="galeherald-views.png" alt="The Tripo Gale Herald from the front, its left, the back and its right" width="__VW__" height="__VH__">
      <p class="note" style="padding-top:12px">It came through whole and nothing was removed. I checked for a doubled horn: there is one. The whole statue came as a single welded piece, so the wings were stuck to the back, the horn to the shoulder and to the top of the right wing, and the weathervane to the helmet. I cut those four free so they can move. Both upper arms are carved against the body and stay there.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · 11,874 as sent, 84 added to close the cuts</small></dd></div>
    <div><dt>Bones</dt><dd>20 <small>hips, spine, chest, head, the vane, 2 in the left arm, the right arm, the horn, 2 in each wing, 3 in each leg under the robe</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, as sent</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.7 u tall <small>to the tip of the vane, 2.45 u to the helmet. My guess from the game's body radius of 0.66 u, beside a 1 u hero. Say if it should be bigger.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A statue that watches. It stands dead still, then the head snaps to one side and holds, snaps to the other and holds. The weathervane on its helmet swings with a wind nobody else feels, and once a loop the wings shrug and settle.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>Heavy stone steps. The whole body rocks onto each foot as it lands, the robe swings with the legs and the wings sway a little behind. The sandals point straight ahead and tread close to one line (no 外八).</td><td>Game: 1.15 u/s. 1.0 s for two steps. Enraged: 1.32 u/s, the same steps played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, head leading.</td><td>106° a second (my number: the game turns it instantly)</td></tr>
      <tr><td>Gale Call</td><td>The horn swings up off the shoulder and levels at the hero, the wings spread wide behind it and the vane starts to spin. On the blast it leans into the horn and both wings beat forward once, driving the wind down the cone. The hero is thrown back.</td><td>Game: wind-up for the 1.0 s cone warning (r 5.2 u, 34° each side), blast 2.5 frames landing on the warning's end, held 3 frames, recoil 0.2 s, settle 0.65 s. 12 damage and a 2.4 u throw. The hero stands 3.2 u off.</td></tr>
      <tr><td>Stoop</td><td>It crouches, the wings go up and it leaps. One hard wing beat, then it glides to the mark with the body laid forward and the legs trailing. Over the mark it rears upright with the wings raised in a V, hangs, and drops onto both feet with the wings slammed down.</td><td>Game: 1.2 s ring warning (r 2.1 u under a hero 1.6 to 7.5 u away). It reaches the mark at 80 percent of the warning, as the game glides it, lands in 2.5 frames on the warning's end, held 3 frames, rises 0.35 s, settles 0.5 s. 17 damage. The hero stands 4.5 u off and backs up 1 u, still inside the ring.</td></tr>
      <tr><td>Rage</td><td>It hunches and the wings close forward round it. Then it throws itself upright, the wings burst open, the horn is thrust at the sky and the vane spins four times. The Enraged state stays on after it: wings held half open and trembling, head low, eyes burning.</td><td>Mine: 1.6 s. The game does not stop it: below half health it walks 15 percent faster and its moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The head and chest flinch away, the wings jolt open and the vane is knocked round. Plays on top of any move, so planted feet stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Thrown back two heavy steps with the wings flung open for balance and the horn jolted off the shoulder. It catches itself, shakes its head once, folds the wings and squares up.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor as it was carved: a statue with its head bowed. Then the head comes up, the wings lift and snap open once, the vane spins and the wings fold.</td><td>Game: grow in 7 frames, then a 1.6 s entrance. The waking is mine.</td></tr>
      <tr><td>Death</td><td>It turns back to stone and falls like one. A jolt, the horn slides off the shoulder and hangs, the head sinks, the gold and bronze go grey and the vane runs down. Then it tips forward, stiff, and comes down flat on its face with the wings splayed on its back. The eyes go out.</td><td>2.6 s, then it stays down</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>__REACH__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>__UNDER__</td></tr>
      <tr><td>The wings</td><td>Each wing is one stiff piece cut free at its root and closed on both sides, on two joints: it opens from the shoulder and curls at the middle. Folded, they sit exactly where Tripo put them.</td></tr>
      <tr><td>The horn</td><td>One stiff piece that turns about the middle of the right fist. The fist, the arm and the hooked tail of the horn stay where they were carved.</td></tr>
      <tr><td>The feet</td><td>Tripo set the sandals about 8° toes-out. Every move turns them straight.</td></tr>
      <tr><td>The robe</td><td>Skinned to the hidden legs, so it steps and trails with them. It is stone, so it has no cloth swing.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Death.</strong> It topples forward like a statue pushed over and lies face down. The other way to play "back to stone" is that it freezes into its carved pose, goes grey and stays standing. Say which you prefer.</li>
        <li><strong>Walk.</strong> Heavy stone steps on the floor. It has wings, so it could instead move in a low glide with the wings half open and the feet just off the floor. Say if you want that tried.</li>
        <li><strong>The horn.</strong> It never goes to a mouth: the mask has none and the arm is stone. It is levelled at the hero like a cannon beside the head. Say if it should be played another way.</li>
        <li><strong>The weathervane.</strong> It spins on its rod in the Gale Call, the rage and the spawn, and swings in the idle. Say if it should stay fixed.</li>
        <li><strong>Rage.</strong> A new 1.6 s call at the sky. The game has no pause at half health. The Enraged button shows the state without the call.</li>
        <li><strong>Size.</strong> Drawn 2.7 u tall to the vane.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The right arm cannot lift. The horn turns in the fist, so in the Gale Call the fist stays at the shoulder while the horn swings round it.</li>
        <li>The left arm moves only from the elbow, and the open hand is one piece.</li>
        <li>The wings are stiff boards with one bend. Spread wide they show the plain back face of the feathers, and where a wing leaves the back there is a flat closed cut.</li>
        <li>The robe is one skin over the legs. In the glide and the long step it stretches, and the folds of the stone lean with it.</li>
        <li>In the Stoop the hero stand-in backs up so the Herald does not land inside it. In the game the hero would have to run.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a foot can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for its power, a pale grey for the wind. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
"""
JS_TOP = ln(160, 162) + '\n<script src="galeherald-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.7;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, WIND=0xc3ccd6;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',galeCall:'Gale Call',stoop:'Stoop',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['galeCall','stoop','rage','heavyHit'];
  const HOME=3.5, HOME_OF={galeCall:3.2,stoop:4.5}; // where the hero stands, in u, in front of it (it keeps 2.4 to 4.6 u off)
  const WALK=1.15, RAGEWALK=1.15*1.15, TURN=2*Math.PI/3.4, GCT=1.0, CONE_R=5.2, CONE_A=34*Math.PI/180, THROW=2.4, STT=1.2, RING_R=2.1, BACK=1.0;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.62,0.62,1)') + r'''
  const VIEWS={Close:{p:[5.8,3.2,7.4],t:[0,1.35,0.9]},'Game zoom':{p:[0,12.4,11.2],t:[0,0.5,2.2]},Side:{p:[11.4,1.9,1.2],t:[0,1.45,1.2]},Front:{p:[0.8,2.2,11.6],t:[0,1.45,0]},Back:{p:[-3.6,3.4,-8.4],t:[0,1.4,0.6]},Top:{p:[0,19,0.4],t:[0,0.4,2.4]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, drainU={value:0}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // the mask marks the face (x), the horn (y) and the wings (z). The eyes are drawn in the texture, so only the face's cyan texels
    // flare (and go out when it dies); the horn and the wings take a faint Violet charge; in death the colour drains from all of it
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU; sh.uniforms.uDrain=drainU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;\nuniform float uDrain;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat cy=smoothstep(0.1,0.35,diffuseColor.b-diffuseColor.r)*vMask.x;\ntotalEmissiveRadiance+=vec3(0.1,0.75,1.0)*uGlow.x*cy+vec3(0.42,0.26,1.0)*(uGlow.y*vMask.y+uGlow.w*vMask.z)+vec3(0.55)*uGlow.z;\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(0.3,0.5,0.2)))*0.86,uDrain);');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|head|vane|upperarmL|forearmL|upperarmR|horn|wingL|wingL2|wingR|wingR2)\./; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),gusts:GUSTS.filter(c=>c.userData.t>=0).length,cone:cone.visible,warn:warn.visible,drain:+drain.toFixed(2),dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,EYES),6,0xfff4e0,1.6,0.25)").replace('spawn her back in', 'spawn it back in').replace('PIV=new THREE.Vector3(0,0,-0.06*U)', 'PIV=new THREE.Vector3(0,0,0)') + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is its power, a pale grey the wind)
  const FXP=[], RINGS=[], GUSTS=[]; let dotTex=null, cone=null, coneRim=null, rune=null, warn=null, warnFill=null, markF=null;
  let eyes=1, eyesTo=1, horn=0, hornTo=0, wing=0, wingTo=0, drain=0, drainTo=0;
  const BELL=[-0.074,0.085,-0.126], EYES=[0,0.025,0.045], CHEST_FRONT=[0,0.05,0.09], SOLE=[0,-0.05,0.05];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<140;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the Gale Call's warning: an Ember cone in front of it that fills; then three gusts run out across it
    const T0=1.5*Math.PI-CONE_A, TL=2*CONE_A;
    cone=new THREE.Mesh(new THREE.CircleGeometry(1,40,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    coneRim=new THREE.Mesh(new THREE.RingGeometry(0.988,1,40,1,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false}));
    [cone,coneRim].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);}); coneRim.scale.setScalar(CONE_R);
    for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,40,1,T0,TL),new THREE.MeshBasicMaterial({color:WIND,transparent:true,opacity:0,depthWrite:false})); m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; m.userData={t:-1,d:i*0.06}; fxG.add(m); GUSTS.push(m); }
    // the Stoop's warning: an Ember ring under the hero that fills while it flies over
    warn=new THREE.Mesh(new THREE.RingGeometry(0.97,1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); warnFill=new THREE.Mesh(new THREE.CircleGeometry(1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    warn.rotation.x=warnFill.rotation.x=-Math.PI/2; warn.scale.setScalar(RING_R); warn.visible=warnFill.visible=false; fxG.add(warn,warnFill);
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.2); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296) + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(cone){cone.visible=coneRim.visible=false;rune.visible=false;warn.visible=warnFill.visible=false;} GUSTS.forEach(c=>{c.userData.t=-1;c.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const bellW=()=>pt(bones.horn,BELL);
  const feetW=()=>pt(bones.footL,SOLE).add(pt(bones.footR,SOLE)).multiplyScalar(0.5).setY(0.02);
  const gale=(pos,vel,o)=>puff(pos,vel,Object.assign({life:0.4,s0:0.1,s1:0.34,a:0.22,col:WIND,drag:1.4},o||{}));
  let runeT=-1, coneT=-1, warnT=-1;
  function fxStart(name){
    hornTo=0; wingTo=0; if(cone){cone.visible=coneRim.visible=false;warn.visible=warnFill.visible=false;} coneT=-1; warnT=-1;
    if(name==='galeCall'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.galeCall)>0.3){ dummy.userData.z=HOME_OF.galeCall; dummy.userData.x=0; } cone.userData.o=toFloor(new THREE.Vector3(0,0,0)); cone.userData.yaw=-floorYaw; if(fxOn)coneT=0; }
    if(name==='stoop'){ if(dummy&&showTarget){ if(Math.abs(dummy.userData.z-HOME_OF.stoop)>0.3){ dummy.userData.z=HOME_OF.stoop; dummy.userData.x=0; } dummy.userData.hold=1.7; dummy.userData.kick=0; }
      markF=toFloor(new THREE.Vector3(0,0,HOME_OF.stoop)); if(fxOn){ warnT=0; warn.position.copy(markF).setY(0.012); warnFill.position.copy(markF).setY(0.011); warnFill.scale.setScalar(0.001); } }
    if(name==='spawn'){ eyes=0; eyesTo=1; drain=0; drainTo=0; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,CHEST_FRONT),12,0xfff4e0,2.4,0.3); }
  }
  // the blast: three gusts run out across the cone and the air streams out of the horn's bell
  function blast(){ if(!fxOn)return; const u=cone.userData; GUSTS.forEach(m=>{ m.userData.t=0; m.rotation.y=u.yaw; m.position.copy(u.o).setY(0.014); m.scale.setScalar(0.3); m.visible=false; });
    const b=bellW(); for(let i=0;i<30;i++){ const a=(Math.random()*2-1)*CONE_A*0.85, sp=7+8*Math.random(); gale(b.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,0.1)),new THREE.Vector3(Math.sin(a)*sp,-0.9-1.2*Math.random(),Math.cos(a)*sp),{life:0.3+0.25*Math.random()}); } }
  function fxContact(name,i){
    if(name==='galeCall'){ hitFeel(0.8,0.07,0.9); eyes=2.2; horn=1.6; blast(); if(fxOn){ const b=bellW(); [0,0.07].forEach(dl=>ringAt(b,{r0:0.15,r1:1.1,dur:0.3,a:0.4,bill:true,delay:dl,col:WIND})); dust(feetW(),6,1.6,0.5); }
      if(dummy&&showTarget){ const p=targetW(); if(p.length()<CONE_R+0.2&&Math.abs(Math.atan2(p.x,p.z))<CONE_A+0.1)hitDummy(THROW); } }
    if(name==='stoop'){ hitFeel(0.95,0.08,1); eyes=2.0; wing=1.5; const w=feetW(); if(fxOn){ ringAt(w,{r0:0.4,r1:RING_R,dur:0.28,a:0.5}); ringAt(w,{r0:0.3,r1:RING_R*0.7,dur:0.36,a:0.3,delay:0.05,col:WIND}); dust(w,16,2.8,0.7); }
      if(dummy&&showTarget&&targetW().distanceTo(w.clone().setY(0))<RING_R+0.2)hitDummy(0.55); }
    if(name==='rage'){ hitFeel(0.5,0.06,0.5); rage=true; $('rage').setAttribute('aria-pressed','true'); eyes=2.6; horn=1.4; if(fxOn){ const b=bellW(); [0,0.14,0.28].forEach(dl=>ringAt(b,{r0:0.15,r1:1.6,dur:0.6,a:0.3,bill:true,delay:dl})); dust(feetW(),8,1.8,0.6); } }
    if(name==='spawn'){ hitFeel(0.3,0.04,0.3); wing=1.0; if(fxOn){ const w=feetW(); dust(w,10,2.2,0.5); ringAt(w,{r0:0.3,r1:1.9,dur:0.32,a:0.3,col:WIND}); } }
    if(name==='heavyHit'&&i===1){ hitFeel(0.2,0,0.2); if(fxOn)dust(feetW(),4,0.9,0.4); }
    if(name==='death'){ if(i===0){ hitFeel(0.85,0.06,0.5); if(fxOn){ [bones.head,bones.chest,bones.hips].forEach(b=>dust(pt(b,[0,0,0.05]).setY(0.02),7,2.0,0.7)); ringAt(pt(bones.chest,[0,0,0.05]).setY(0.02),{r0:0.3,r1:1.9,dur:0.32,a:0.35,col:DUST}); } } else { hitFeel(0.2,0,0.15); if(fxOn)dust(pt(bones.wingL2,[0.012,-0.2,0]).setY(0.02),3,0.8,0.3); } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(Math.min(dummy.userData.hold,0.6),0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='galeCall'){ const k=Math.min(1,t/GCT), on=t<GCT; eyesTo=on?1+1.2*k:1; hornTo=t<GCT+0.25?k:0; wingTo=on?0.6*k:0;
      if(coneT>=0&&fxOn){ const u=cone.userData; cone.visible=coneRim.visible=on; cone.rotation.y=coneRim.rotation.y=u.yaw; cone.position.copy(u.o).setY(0.011); coneRim.position.copy(u.o).setY(0.012); cone.scale.setScalar(Math.max(0.001,k*CONE_R)); coneRim.material.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(on&&t>0.4&&Math.random()<d*16)motes(bellW(),1,0.3,0.3); }
    if(n==='stoop'){ const k=Math.min(1,t/STT), on=t<STT; eyesTo=on?1+1.0*k:1; wingTo=t<STT+0.2?0.5+0.5*k:0;
      if(warnT>=0&&fxOn){ warn.visible=warnFill.visible=on; warnFill.scale.setScalar(Math.max(0.001,k*RING_R)); warn.material.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(shot.prev<0.16&&t>=0.16&&fxOn){ const w=new THREE.Vector3(0,0.02,0); dust(w,10,2.2,0.4); ringAt(w,{r0:0.3,r1:1.6,dur:0.3,a:0.25,col:WIND}); }
      if(dummy&&showTarget&&t>0.25&&t<1.0)dummy.userData.z+=BACK/0.75*d;                                  // the hero backs up, still inside the ring
      if(t>0.2&&t<1.0&&Math.random()<d*22){ const s=Math.random()<0.5?bones.wingL2:bones.wingR2; gale(pt(s,[0,-0.22,0]),new THREE.Vector3(0,-0.2,-2.5),{life:0.35,s0:0.07,s1:0.22,a:0.16}); } }
    if(n==='rage'){ const on=t>0.34&&t<1.25; eyesTo=on?2.4:1+2*Math.min(0.34,t); hornTo=on?1:0; wingTo=on?0.8:0; if(on&&Math.random()<d*18)motes(bellW(),1,0.4,0.9); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.8,1.4); }
    if(n==='death'){ eyesTo=t>0.1?Math.max(0,1-(t-0.1)/0.7):1; drainTo=t>0.1?1:0; }
  }
  function updateFx(d){
    eyes+=(eyesTo-eyes)*Math.min(1,d*(eyes>eyesTo?5:12)); horn+=(hornTo-horn)*Math.min(1,d*(horn>hornTo?4:10)); wing+=(wingTo-wing)*Math.min(1,d*(wing>wingTo?4:10)); drain+=(drainTo-drain)*Math.min(1,d*2.6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; const burn=rageW*(0.9+0.35*Math.sin(clockT*19)*Math.sin(clockT*7.3));
    const ex=eyes>=1?0.35*(eyes-1):-0.85*(1-eyes)*(1-drain);
    glowU.value.set(on*(ex+(sel.dead?0:0.55*burn)),on*horn*0.09,feel?flash:0,on*wing*0.05); drainU.value=drain;
    // its shadow follows it over the floor, shrinks as it flies and lengthens as it falls
    if(bones.hips){ const h=pt(bones.hips,[0,0,0]); const up=Math.max(0,Math.min(0.4,h.y/U-0.5)), dn=Math.max(0,Math.min(0.4,0.5-h.y/U)); blob.position.set(h.x,0.004,h.z); blob.scale.set(0.62-0.6*up,0.62-0.6*up+2.0*dn,1); blob.material.opacity=0.2-0.28*up; }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(cone&&!(shot&&!shot.done&&shot.name==='galeCall')){ cone.visible=coneRim.visible=false; coneT=-1; }
    if(warn&&!(shot&&!shot.done&&shot.name==='stoop')){ warn.visible=warnFill.visible=false; warnT=-1; }
    // the gusts: three arcs run out across the cone, one behind the other, and thin as they go
    GUSTS.forEach(m=>{ const u=m.userData; if(u.t<0)return; u.t+=d; const k=(u.t-u.d)/0.32; if(k>=1){u.t=-1;m.visible=false;return;} if(k<0){m.visible=false;return;} const e=1-(1-k)*(1-k); m.scale.setScalar(CONE_R*(0.16+0.84*e)); m.material.opacity=0.3*(1-k); m.visible=fxOn; });
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  // stone feet: a little dust at each step in the walk and the turns
  const STEP={L:[0,'footL'],R:[0.5,'footR']}; const stepPrev={};
  function footfalls(){ ['walk','turnL','turnR'].forEach(n=>{ const a=A[n]; if(!a||a.__w<0.6)return; const T=META[n].dur; for(const k in STEP){ const u=((a.time/T-STEP[k][0])%1+1)%1; const key=n+k; if(stepPrev[key]!==undefined&&u<stepPrev[key]&&fxOn)dust(pt(bones[STEP[k][1]],SOLE),3,0.6,0.3); stepPrev[key]=u; } }); }

''' + ln(355, 384).replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
aud = json.load(open(sys.argv[5]))
rk, rv = max(((k, v['reach_mm']) for k, v in aud.items()), key=lambda x: x[1])
VW, VH = sys.argv[7].split('x')
page = page.replace('__VW__', VW).replace('__VH__', VH).replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__UNDER__', sys.argv[6]).replace('__REACH__', '0 mm in every move' if rv < 0.5 else '%.0f mm at worst, in the %s; 0 in the others' % (rv, rk))
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.62,0.62,1)" in page and 'spawn it back in' in page and 'bones.head,EYES),6' in page and 'sword' not in page and 'THORNS' not in page and 'thicket' not in page and ' her ' not in page and ' his ' not in page, [k for k in ('sword', 'THORNS', 'thicket', ' her ', ' his ') if k in page]
open(out, 'w').write(page); print('wrote', out, len(page))
