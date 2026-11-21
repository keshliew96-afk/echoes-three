# Builds the Bone Reeve's review page from the Thornmother's page (the bench, the controls and the play loop are
# shared; the words, the numbers and the effects are his). usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB> <audit json> <under-floor sentence> <views WxH> [eye thresholds a,b]
import sys
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Bone Reeve Review</title>\n' + ln(2, 59)
BODY = r"""
<div class="wrap">
  <div>
    <h1>Bone Reeve from Tripo, rigged</h1>
    <p class="lede">Your export of the Ashen Barrow champion, with the extra right hand taken off, a two-legged skeleton and 11 moves added by hand. His timings are the game's. Pick a move, drag to turn him, and judge the weight and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves him kneeling, hanging from his scythe: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under half health: it stays on over every move until you switch it off, and he walks faster.</p>
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
      <img src="bonereeve-views.png" alt="The Tripo Bone Reeve from the front, his left, the back and his right" width="__VW__" height="__VH__">
      <p class="note" style="padding-top:12px">You were right about the extra right hand. Tripo grew a second forearm and hand that hung straight down from the elbow of the scythe arm (you can see it in these views, hanging at his right side under the arm that holds the scythe). I cut it off at the elbow and closed the two small holes it left, so you do not need to generate him again. Everything else came through whole: one scythe, the tall hat, the keys, the pouch and the tally tags.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · 11,530 as sent, 166 removed with the extra arm, 6 added to close the holes</small></dd></div>
    <div><dt>Bones</dt><dd>19 <small>hips, spine, chest, head, 2 in each arm, the right hand with the scythe, 4 in the robe, 3 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, as sent</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.5 u tall <small>to the top of his hat; the scythe reaches 2.8 u. My guess from the game's body radius of 0.6 u, beside a 1 u hero. Say if he should be bigger or smaller.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What he does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A steward of the dead at his post. He stands very straight and barely breathes, the skull turns slowly to one side and the other as if counting, the left hand comes up to his tally tags and falls again, and once a loop he raps the scythe's butt on the floor.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>He stalks: long unhurried steps under the robe, the body upright and almost still, the skull fixed on the hero, the scythe carried upright beside him with its butt just off the floor, the robe trailing. The feet fall close to one line and point straight ahead. Tripo had set his feet about ten degrees toes-out, so every move turns them straight (your no 外八 rule).</td><td>Game: 1.2 u/s. 1.0 s for two steps. Enraged: 1.38 u/s, the same steps played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, skull leading, the scythe held upright.</td><td>112° a second (my number: the game turns him instantly)</td></tr>
      <tr><td>Reaping Sweep</td><td>The right foot goes back, he turns away to his right and lays the scythe level under his arm, the blade low and behind him, and coils. Then the whole body unwinds and the blade comes round across his front from his right to his left, low enough to take a hero at the knees. He stands the scythe up again.</td><td>Game: draws back for the 0.9 s cone warning (r 2.7 u, 75° each side), sweep 2.5 frames landing on the warning's end, held 3 frames, follow-through 0.2 s, settle 0.55 s. The hero stands 2 u off.</td></tr>
      <tr><td>Grave Lance</td><td>He lifts the scythe off the floor and draws himself up, and the left arm comes up and points down the lane at the hero. Then the staff's butt is driven into the floor ahead of him, the pointing hand cuts down, and bone spikes run out along the lane from the butt.</td><td>Game: marks the lane for the 1.1 s warning (8 u long, 1.1 u wide), strike 2.5 frames landing on the warning's end, held 3 frames, recoil 0.2 s, settle 0.55 s. The hero stands 5 u off.</td></tr>
      <tr><td>Rage</td><td>He folds in on himself with the scythe drawn against his chest, then thrusts it up with the skull thrown back and the left arm wide, every bone rattling. The butt comes down with a rap and he squares up. The Enraged state stays on after it: bent forward, the skull low and twitching, the eyes burning.</td><td>Mine: 1.6 s. The game does not stop him: below half health the eyes burn, he walks 15 percent faster and his moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The skull and chest flinch away and the left arm jolts. Plays on top of any move, so planted feet stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Thrown back two steps, the scythe dragged off the floor and the left arm flung up. He catches himself on the staff, the skull lolls and snaps straight, and he squares up.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor folded in a deep bow, unfolds one joint after another, the skull last, stands to his full height and raps the scythe on the floor once: court is in session.</td><td>Game: grow in 7 frames, then a 1.6 s entrance. The bow and the rap are mine.</td></tr>
      <tr><td>Death</td><td>He does not fall. A jolt, he sags on the scythe, both knees give and come down, the body folds forward and the skull drops. He ends on his knees, bowed, hanging by one hand from the scythe that still stands, the robe pooled round him. The eyes go out.</td><td>2.5 s, then he stays kneeling</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>__REACH__</td></tr>
      <tr><td>The scythe hand farther than the arm can reach</td><td>__ARM__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>__UNDER__</td></tr>
      <tr><td>The scythe in his hand</td><td>Hand and scythe are one stiff piece on the forearm, and every move steers the scythe itself: where its butt stands on the floor, or where it is carried, and how it leans. The arm follows it.</td></tr>
      <tr><td>The removed arm</td><td>Cut along the groove where it joined the elbow. Both holes are closed, and the elbow bends without a gap.</td></tr>
      <tr><td>The robe</td><td>Four joints: a strip from the belt and a lower half, front and back, run as springs. They trail the body, swing after it stops, and lay themselves out on the floor in the kneel.</td></tr>
      <tr><td>The feet</td><td>Toes straight ahead in every move, 0.34 u apart in the walk.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>One hand on the scythe.</strong> His right hand is fused to the staff and the left is free, so the sweep is swung with one arm, couched under it like a lance. A two-handed swing would need the left hand to hold the staff too, which the model's fixed grip makes hard. Say if you want me to try.</li>
        <li><strong>Rage.</strong> A new 1.6 s roar. The game has no pause at half health, only the burning eyes. The Enraged button shows the state without the roar.</li>
        <li><strong>Death.</strong> He kneels and hangs from the standing scythe, and does not fall. Say if the scythe should drop, or if he should collapse into a heap of robe.</li>
        <li><strong>Bone spikes.</strong> The Grave Lance's spikes are plain bone-coloured cones made for this page. Say if you want a spike model from Tripo for the game.</li>
        <li><strong>Walk.</strong> A slow stalk with the scythe carried. Say if he should use it as a walking staff, striking the floor each step.</li>
        <li><strong>Size.</strong> Drawn 2.5 u tall to the hat.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The right hand is fused to the staff, so it cannot slide along it. In the kneel his arm reaches up to the same spot on the staff.</li>
        <li>The wide sleeves are one skin with the arms, so they spread like wings when an arm rises and do not hang or swing by themselves.</li>
        <li>The legs are thin bone inside the robe. I saw no knee come through the cloth in the stills, but watch for it in the walk and the kneel.</li>
        <li>The keys, the pouch and the tally tags are fixed to the belt and do not swing.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a foot can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for his power, bone white for the spikes. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
"""
JS_TOP = ln(160, 162) + '\n<script src="bonereeve-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.8;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, BONE=0x6a6253;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',reaping:'Reaping Sweep',lance:'Grave Lance',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['reaping','lance','rage','heavyHit'];
  const HOME=3.0, HOME_OF={reaping:2.0,lance:5.0}; // where the hero stands, in u, in front of him
  const WALK=1.2, RAGEWALK=1.2*1.15, TURN=2*Math.PI/3.2, RST=0.9, CONE_R=2.7, CONE_A=75*Math.PI/180, GLT=1.1, LANE_L=8, LANE_W=1.1, NSPIKE=15;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.8,0.8,1)') + r'''
  const VIEWS={Close:{p:[4.6,3.0,7.4],t:[0,1.3,0.6]},'Game zoom':{p:[0,11.6,10.4],t:[0,0.5,2.0]},Side:{p:[10.4,1.7,1.0],t:[0,1.3,1.0]},Front:{p:[0.8,2.0,10.8],t:[0,1.35,0]},Back:{p:[-3.4,3.2,-7.8],t:[0,1.25,0.6]},Top:{p:[0,15,0.4],t:[0,0.4,1.6]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // the mask marks the face patch (x), the blade (y) and the whole scythe (z). The eye glow is drawn in the texture, so only
    // the violet texels of the face flare (and go dark when he dies); the blade takes a Violet edge, the scythe a faint charge
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat vi=smoothstep(__VI0__,__VI1__,min(diffuseColor.r,diffuseColor.b)-diffuseColor.g)*vMask.x;\ntotalEmissiveRadiance+=vec3(0.6,0.35,1.0)*uGlow.x*vi+vec3(0.42,0.26,1.0)*(uGlow.y*vMask.y+uGlow.w*vMask.z)+vec3(0.55)*uGlow.z;');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|head|upperarmL|forearmL|upperarmR|forearmR|handR)\./; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),slash:slash.userData.t>=0,spikes:SPIKES.filter(s=>s.userData.t>=0).length,cone:cone.visible,lane:lane.visible,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,[0,0.055,0.07]),6,0xfff4e0,1.6,0.25)").replace('spawn her back in', 'spawn him back in').replace('PIV=new THREE.Vector3(0,0,-0.06*U)', 'PIV=new THREE.Vector3(0,0,0)') + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is his power, bone white the spikes)
  const FXP=[], RINGS=[], SPIKES=[]; let dotTex=null, cone=null, coneRim=null, rune=null, lane=null, laneFill=null, slash=null;
  let visor=1, visorTo=1, edge=0, edgeTo=0, wheel=0, wheelTo=0;
  const BUTT=[-0.017,-0.609,0.048], BLADE=[0.2,0.25,-0.12], CHEST_FRONT=[0,0.04,0.07], VISOR=[0,0.055,0.07];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<120;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the Reaping Sweep's warning: an Ember cone in front of him that fills; then the blade's path is drawn across it
    const T0=1.5*Math.PI-CONE_A, TL=2*CONE_A;
    cone=new THREE.Mesh(new THREE.CircleGeometry(1,48,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    coneRim=new THREE.Mesh(new THREE.RingGeometry(0.985,1,48,1,T0,TL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false}));
    [cone,coneRim].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);}); coneRim.scale.setScalar(CONE_R);
    // the sweep itself: a Violet band from 0.45 r to r that opens from his right to his left behind the blade and fades
    slash=new THREE.Mesh(new THREE.RingGeometry(0.45,1,48,1,T0,TL),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); slash.rotation.order='YXZ'; slash.rotation.x=-Math.PI/2; slash.visible=false; slash.userData={t:-1,g:null}; fxG.add(slash);
    // the Grave Lance's warning: an Ember lane in front of him that fills along its length; then bone spikes run out along it
    const lg=new THREE.PlaneGeometry(1,1); lg.translate(0,-0.5,0);
    laneFill=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    lane=new THREE.Group(); const lm=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false});
    [[-LANE_W/2,0.035,LANE_L,-LANE_L/2],[LANE_W/2,0.035,LANE_L,-LANE_L/2],[0,LANE_W,0.035,-LANE_L],[0,LANE_W,0.035,0]].forEach(([x,w,h,y])=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lm); e.position.set(x,y,0); lane.add(e);}); lane.userData.mat=lm;
    [lane,laneFill].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);});
    const sg=new THREE.ConeGeometry(0.15,1,6); sg.translate(0,0.5,0); const sm=new THREE.MeshStandardMaterial({color:BONE,roughness:0.9,flatShading:true});
    for(let i=0;i<NSPIKE;i++){ const m=new THREE.Mesh(sg,sm); m.visible=false; m.userData={t:-1,d:0,h:0.6}; fxG.add(m); SPIKES.push(m); }
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.2); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296) + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(cone){cone.visible=coneRim.visible=false;rune.visible=false;lane.visible=laneFill.visible=false;slash.userData.t=-1;slash.visible=false;} SPIKES.forEach(c=>{c.userData.t=-1;c.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const tipW=()=>pt(bones.handR,BUTT).setY(0.02);
  let runeT=-1, coneT=-1, laneT=-1;
  function setSector(m,len){ if(m.userData.g)m.userData.g.dispose(); m.geometry=m.userData.g=new THREE.RingGeometry(0.45,1,32,1,1.5*Math.PI-CONE_A,Math.max(0.02,len)); }
  function fxStart(name){
    edgeTo=0; wheelTo=0; if(cone){cone.visible=coneRim.visible=false;lane.visible=laneFill.visible=false;} coneT=-1; laneT=-1;
    if(name==='reaping'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.reaping)>0.3){ dummy.userData.z=HOME_OF.reaping; dummy.userData.x=0; } cone.userData.o=toFloor(new THREE.Vector3(0,0,0)); cone.userData.yaw=-floorYaw; if(fxOn)coneT=0; }
    if(name==='lance'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.lance)>0.3){ dummy.userData.z=HOME_OF.lance; dummy.userData.x=0; } lane.userData.o=toFloor(new THREE.Vector3(0,0,0)); lane.userData.yaw=-floorYaw; if(fxOn)laneT=0; }
    if(name==='spawn'){ visor=0; visorTo=1; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,CHEST_FRONT),12,0xfff4e0,2.4,0.3); }
  }
  // the spikes: one after another along the lane from the butt, each a little off the line, the far ones taller
  function spikes(){ if(!fxOn)return; const u=lane.userData; SPIKES.forEach((m,i)=>{ const k=(i+0.6)/NSPIKE, z=0.5+k*(LANE_L-0.7), x=(i%2?1:-1)*(0.1+0.22*Math.random()); const p=new THREE.Vector3(x,0,z).applyAxisAngle(Y,u.yaw).add(u.o); m.position.copy(p); m.rotation.set((Math.random()-0.5)*0.35,Math.random()*6.283,(Math.random()-0.5)*0.35); m.userData.t=0; m.userData.d=k*0.26; m.userData.h=0.55+0.5*Math.random(); m.userData.puff=false; m.visible=false; }); }
  function fxContact(name,i){
    if(name==='reaping'){ hitFeel(0.9,0.08,1); visor=2.2; if(fxOn){ const u=cone.userData; slash.userData.t=0; slash.rotation.y=u.yaw; slash.position.copy(u.o).setY(0.015); slash.scale.setScalar(CONE_R); dust(pt(bones.handR,BLADE),6,1.6,0.6); }
      if(dummy&&showTarget){ const p=targetW(); if(p.length()<CONE_R+0.2&&Math.abs(Math.atan2(p.x,p.z))<CONE_A+0.1){ hitDummy(0.4); dummy.userData.sx=2.2; } } }
    if(name==='lance'){ hitFeel(0.8,0.07,0.9); visor=2.0; wheel=1.6; const tip=tipW(); spikes(); if(fxOn){ ringAt(tip,{r0:0.15,r1:1.0,dur:0.24,a:0.45}); dust(tip,8,1.8,0.7); }
      if(dummy&&showTarget){ const p=targetW(); lane.userData.hit=Math.abs(p.x)<LANE_W/2+0.25&&p.z>0&&p.z<LANE_L+0.2; } }
    if(name==='rage'){ if(i===0){ hitFeel(0.5,0.06,0.5); rage=true; $('rage').setAttribute('aria-pressed','true'); visor=2.6; const h=pt(bones.head,VISOR); if(fxOn)[0,0.12,0.24].forEach(dl=>ringAt(h,{r0:0.15,r1:1.5,dur:0.6,a:0.3,bill:true,delay:dl})); } else { hitFeel(0.3,0.03,0.3); if(fxOn){ const tip=tipW(); dust(tip,6,1.3,0.6); ringAt(tip,{r0:0.1,r1:0.9,dur:0.26,a:0.4}); } } }
    if(name==='spawn'){ hitFeel(0.3,0.04,0.3); const tip=tipW(); if(fxOn){ dust(tip,6,1.2,0.5); ringAt(tip,{r0:0.1,r1:0.9,dur:0.26,a:0.4}); } }
    if(name==='heavyHit'&&i===1){ hitFeel(0.2,0,0.2); if(fxOn)dust(tipW(),4,0.9,0.4); }
    if(name==='death'){ if(i===0){ hitFeel(0.5,0,0.4); if(fxOn){ dust(pt(bones.shinR,[0,0,0.02]).setY(0.02),7,1.4,0.6); dust(pt(bones.shinL,[0,0,0.02]).setY(0.02),7,1.4,0.6); } } else { hitFeel(0.25,0,0.2); cv.style.filter='saturate(0.45)'; } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='reaping'){ const k=Math.min(1,t/RST), on=t<RST; visorTo=on?1+1.3*k:1; edgeTo=t<RST+0.3?k:0;
      if(coneT>=0&&fxOn){ const u=cone.userData; cone.visible=coneRim.visible=on; cone.rotation.y=coneRim.rotation.y=u.yaw; cone.position.copy(u.o).setY(0.011); coneRim.position.copy(u.o).setY(0.012); cone.scale.setScalar(Math.max(0.001,k*CONE_R)); coneRim.material.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(on&&t>0.3&&Math.random()<d*14)motes(pt(bones.handR,BLADE),1,0.3,0.5); }
    if(n==='lance'){ const k=Math.min(1,t/GLT), on=t<GLT; visorTo=on?1+1.3*k:1; wheelTo=on?k:0; edgeTo=on?0.6*k:0;
      if(laneT>=0&&fxOn){ const u=lane.userData; lane.visible=laneFill.visible=on; lane.rotation.y=laneFill.rotation.y=u.yaw; lane.position.copy(u.o).setY(0.012); laneFill.position.copy(u.o).setY(0.011); laneFill.scale.set(LANE_W,Math.max(0.001,k*LANE_L),1); u.mat.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(on&&t>0.3&&Math.random()<d*14)motes(pt(bones.forearmL,[0.01,-0.18,0]),1,0.25,0.5); }
    if(n==='rage'){ visorTo=t>0.34?2.4:1+2*t; if(t>0.42&&t<1.15&&Math.random()<d*18)motes(pt(bones.head,[0,0.1,0]),1,0.5,0.9); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.8,1.4); }
    if(n==='death'){ visorTo=t>1.6?0:1-0.6*t/1.6; }
  }
  function updateFx(d){
    visor+=(visorTo-visor)*Math.min(1,d*(visor>visorTo?5:12)); edge+=(edgeTo-edge)*Math.min(1,d*8); wheel+=(wheelTo-wheel)*Math.min(1,d*(wheel>wheelTo?4:10)); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; const burn=rageW*(0.9+0.35*Math.sin(clockT*19)*Math.sin(clockT*7.3));
    const vx=visor>=1?0.3*(visor-1):-0.85*(1-visor);
    glowU.value.set(on*(vx+(sel.dead?0:0.8*burn)),on*edge*0.1,feel?flash:0,on*wheel*0.04);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(cone&&!(shot&&!shot.done&&shot.name==='reaping')){ cone.visible=coneRim.visible=false; coneT=-1; }
    if(lane&&!(shot&&!shot.done&&shot.name==='lance')){ lane.visible=laneFill.visible=false; laneT=-1; }
    // the sweep's band opens across the cone in 0.14 s (the blade is that fast) and fades in 0.3 s
    if(slash){ const u=slash.userData; if(u.t>=0){ u.t+=d; const k=Math.min(1,u.t/0.14), f=Math.max(0,1-Math.max(0,u.t-0.14)/0.3); if(f<=0){u.t=-1;slash.visible=false;} else { setSector(slash,2*CONE_A*k); slash.material.opacity=0.3*f; slash.visible=fxOn; } } }
    // the spikes: up in 0.07 s, stand 0.45 s, sink in 0.3 s
    SPIKES.forEach(m=>{ const u=m.userData; if(u.t<0)return; u.t+=d; const t=u.t-u.d; if(t<0){m.visible=false;return;} if(t>=0.82){u.t=-1;m.visible=false;return;} const up=t<0.07?t/0.07:t<0.52?1:1-(t-0.52)/0.3; const e=t<0.07?1-(1-up)*(1-up):up; m.scale.set(1,Math.max(0.001,u.h*e),1); m.visible=fxOn; if(!u.puff){u.puff=true; const w=m.position.clone().applyMatrix4(fxG.matrix); if(fxOn)dust(w,2,0.8,0.5); if(lane.userData.hit&&dummy&&w.distanceTo(targetW())<0.6){lane.userData.hit=false;hitDummy(0.35);} } });
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  // foot dust in the walk and the turns, and the scythe's rap once a loop in the idle
  const STEP={L:[0,'footL'],R:[0.5,'footR']}; const stepPrev={}; let idlePrev=0;
  function footfalls(){ ['walk','turnL','turnR'].forEach(n=>{ const a=A[n]; if(!a||a.__w<0.6)return; const T=META[n].dur; for(const k in STEP){ const u=((a.time/T-STEP[k][0])%1+1)%1; const key=n+k; if(stepPrev[key]!==undefined&&u<stepPrev[key]&&fxOn)dust(pt(bones[STEP[k][1]],[0,-0.03,0.05]),2,0.45,0.25); stepPrev[key]=u; } });
    const a=A.idle; if(a&&a.__w>0.6){ if(idlePrev<4.62&&a.time>=4.62&&fxOn)dust(tipW(),3,0.6,0.3); idlePrev=a.time; } }

''' + ln(355, 384).replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
import json
aud = json.load(open(sys.argv[5])) if len(sys.argv) > 5 else {}
reach = max((v['reach_mm'] for v in aud.values()), default=0); arm = max((v.get('arm_mm', 0) for v in aud.values()), default=0)
VW, VH = sys.argv[7].split('x'); VI0, VI1 = (sys.argv[8].split(',') if len(sys.argv) > 8 else ('0.1', '0.3'))
page = page.replace('__VW__', VW).replace('__VH__', VH).replace('__VI0__', VI0).replace('__VI1__', VI1).replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__REACH__', '0 mm' if reach < 0.5 else '%.0f mm at worst' % reach).replace('__ARM__', '0 mm in every move' if arm < 0.5 else '%.0f mm at worst' % arm).replace('__UNDER__', sys.argv[6] if len(sys.argv) > 6 else '')
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.8,0.8,1)" in page and 'spawn him back in' in page and 'sword' not in page and 'THORNS' not in page and 'thicket' not in page, [k for k in ('sword', 'THORNS', 'thicket') if k in page]
open(out, 'w').write(page); print('wrote', out, len(page))
