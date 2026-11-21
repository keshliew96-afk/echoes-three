# Builds the Lockkeeper's review page from the Thornmother's page (the bench, the controls and the play loop are
# shared; the words, the numbers and the effects are his own). usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB> <audit json> <under-floor sentence> <views WxH>
import sys, json
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Lockkeeper Review</title>\n' + ln(2, 59)
BODY = r"""
<div class="wrap">
  <div>
    <h1>Lockkeeper from Tripo, rigged</h1>
    <p class="lede">Your export of the Drowned Mill champion, with a skeleton and 11 moves added by hand. Their timings are the game's. Pick a move, drag to turn him, and judge the weight, the cast and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves him lying where he fell: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under half health: it stays on over every move until you switch it off, and he walks faster. In the Chain Hook the hero stands 5 u off and is dragged in to his feet.</p>
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
      <img src="lockkeeper-views.png" alt="The Tripo Lockkeeper from the front, his left, the back and his right" width="__VW__" height="__VH__">
      <p class="note" style="padding-top:12px">He came through whole: one piece, two arms, nothing doubled. One thing was changed. The key was one piece with his left fist, so I cut it free and rebuilt the part of its ring that the fist hid. Now it can leave the hand on its chain.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · 11,845 as sent, 82 added to close the cut and finish the key's ring</small></dd></div>
    <div><dt>Bones</dt><dd>19 <small>hips, spine, chest, head, 3 in each arm, the key, the coat's front and back, 3 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, as sent</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.3 u tall <small>and 1.3 u across the arms. My guess from the game's body radius of 0.64 u, beside a 1 u hero. Say if he should be bigger.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A toll keeper at his gate. He breathes slowly under the coat and eases his weight from boot to boot. The hat turns left and then right. His right hand comes out for the toll and goes back. Near the end of the loop he hefts the key and lets it drop, and it swings on its ring.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>Short quick steps under the long coat, the body rolling a little from boot to boot. The hat stays level, the right arm swings and the key swings on its ring a beat behind the fist. The boots point straight ahead.</td><td>Game: 1.05 u/s. 0.8 s for two steps. Enraged: 1.2 u/s, the same steps played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, hat leading.</td><td>112° a second (my number: the game turns him instantly)</td></tr>
      <tr><td>Chain Hook</td><td>His left arm goes out to the side and the key slips out of the fist on a hand of chain. He whirls it beside him, over the top and forward, two and a half turns, faster each turn, while the right hand points down the lane at the hero. Then he steps in and casts: the key leaves the circle and flies down the lane, teeth first. The chain goes taut, he throws his weight back, and the hero is dragged to his feet with the key. The key comes off the hero and swings back into his fist.</td><td>Game: whirl for the 0.97 s lane warning (up to 7.5 u long, 0.9 u wide), cast 2.5 frames landing on the warning's end, held 3 frames, the hero dragged in over 0.17 s from the hit to 1.84 u from his middle, key home 0.32 s after that, settle 0.5 s. 10 damage. The hero stands 5 u off.</td></tr>
      <tr><td>Lock Turn</td><td>He draws himself up with the key lifted before him, teeth down. Then he stoops and drives the teeth into the floor a step ahead of his left boot, his right arm thrown out behind for balance. He leans on it and the fist winds back. On the warning's end he turns the key a quarter turn with his whole weight. The ring round him snaps shut and the hero inside is slowed. He pulls the key out and stands.</td><td>Game: 1.17 s ring warning (r 2.5 u round himself), the turn 2.5 frames landing on the warning's end, held 3 frames, pull out 0.3 s, settle 0.55 s. 16 damage and a 50 percent slow for 1.5 s. The key goes into the floor at 0.64 s (my number). The hero stands 1.9 u off.</td></tr>
      <tr><td>Rage</td><td>He hunches over the key, drawn to his chest. Then he thrusts it up beside his hat, teeth to the sky, throws his head back, drives the right fist down and wide, and shakes. The key drops to swing and his right boot stamps. The Enraged state stays on after it: hunched, the key fist up and trembling, eyes burning.</td><td>Mine: 1.6 s. The game does not stop him: below half health he walks 15 percent faster and his moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The head and chest flinch back and the arms jerk. The key swings. Plays on top of any move, so planted boots stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Thrown back two steps, hat snapped back, the right arm flung up and the key swung out ahead of him on its ring. He catches himself, the key swings back, and he squares up.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor stooped under his hat, as if he had come up out of the water. He straightens his back, lifts the hat to look at the party, hefts the key and lets it drop to swing, and holds out his right hand: the toll.</td><td>Game: grow in 7 frames, then a 1.6 s entrance. The stoop and the toll are mine.</td></tr>
      <tr><td>Death</td><td>A jolt. He totters back two steps and both hands bring the key to his chest. Then he tips over backwards like a felled post and lands flat on his back, the key held on his chest with its teeth to his boots. He kept the key. The eyes go out.</td><td>2.5 s, then he stays down</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted boot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted boot its leg could not reach</td><td>__REACH__</td></tr>
      <tr><td>A hand that could not reach its mark (the key hand in the hook, the stoop, the rage and the death)</td><td>__ARM__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor</td><td>__UNDER__</td></tr>
      <tr><td>The feet</td><td>Tripo set his boots toes-out, the left about 6° and the right about 12°. Every move turns them in so the toes point straight ahead, by your rule for humanoids. A planted boot keeps its heading when his hips turn.</td></tr>
      <tr><td>The head</td><td>Faces straight ahead at rest. The hat, its weeds and the moustache are one stiff piece with the head.</td></tr>
      <tr><td>The key</td><td>One stiff piece on its own joint at the top of its ring. In the fist it hangs straight down whatever the arm does, and swings and settles after a drop or a blow. Out of the fist it flies where the move sends it.</td></tr>
      <tr><td>The chained forearm</td><td>The chain wrapped round his left forearm is stiff with the forearm, so no link stretches. The wrist bends below it.</td></tr>
      <tr><td>The shoulders</td><td>The weights were evened out over each sleeve, armpit and the cape, so no rag stays behind when an arm goes up.</td></tr>
      <tr><td>The coat</td><td>The front and the back of the coat below the belt are on springs: they trail in the walk and swing after a cast or a blow.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Death.</strong> He falls on his back with the key held to his chest. Two other ways to play it: he sinks to his knees and the key drops from his hand, or he goes down through the floor as into water with the key hand last. Say which you prefer.</li>
        <li><strong>The whirl.</strong> The key circles beside him. Over his head like a lasso would read better from the game's camera, but the sleeve tears at the shoulder when the arm goes straight up. Say if you want it tried anyway.</li>
        <li><strong>Lock Turn.</strong> He stoops low to reach the floor, because his arms are short. Going down on one knee would look steadier, but the coat has no joints below the belt at the sides and would sink into the floor.</li>
        <li><strong>The walk.</strong> Boots straight ahead, short quick steps. Say if he counts as a heavy character and should waddle toes-out instead.</li>
        <li><strong>Rage.</strong> A new 1.6 s roar. The game has no pause at half health. The Enraged button shows the state without the roar.</li>
        <li><strong>Size.</strong> Drawn 2.3 u tall.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The chain between the fist and the flying key is drawn by this page, as plain links. The model has no spare chain: the chain on his forearm stays wrapped while the key is 5 u away.</li>
        <li>While the key is away his left fist stays closed on nothing.</li>
        <li>The padlock, the tags and the rings on his belt are one skin with the coat. They do not swing.</li>
        <li>The coat has two joints, front and back. In the Lock Turn's stoop the back of the coat lifts in one stiff piece, and in the death it lies stiff along his legs.</li>
        <li>The game's own Lockkeeper carries a lock-box lantern and wears the key on a chain over his shoulder. This model has no lantern and holds the key in his fist, so the moves are built for what he has.</li>
        <li>The hero stand-in slides in a straight line when hooked, and the slow is only a Violet ring at its feet for 1.5 s.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a boot can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for his power. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
"""
JS_TOP = ln(160, 162) + '\n<script src="lockkeeper-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.3;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, RUST=0x5a4334;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',chainHook:'Chain Hook',lockTurn:'Lock Turn',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['chainHook','lockTurn','rage','heavyHit'];
  const HOME=2.6, HOME_OF={chainHook:5.0,lockTurn:1.9}; // where the hero stands, in u, in front of him (he keeps 1.6 to 3.4 u off)
  const WALK=1.05, RAGEWALK=1.05*1.15, TURN=2*Math.PI/3.2, HKT=58/60, DRAG=10/60, FAR=5.0, NEAR=1.84, LANE_L=7.5, LANE_W=0.9, KEYHOME=HKT+DRAG+0.32, LTT=70/60, STAB=0.64, PULL=LTT+0.1+0.3, RING_R=2.5, SLOW_T=1.5, NLINK=60;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.8,0.8,1)') + r'''
  const VIEWS={Close:{p:[4.3,2.7,6.8],t:[0,1.1,0.6]},'Game zoom':{p:[0,11.6,10.4],t:[0,0.5,2.0]},Side:{p:[10.2,1.6,1.4],t:[0,1.1,1.4]},Front:{p:[0.8,1.8,10.2],t:[0,1.15,0]},Back:{p:[-3.3,3.0,-7.4],t:[0,1.1,0.6]},Top:{p:[0,15,0.4],t:[0,0.4,1.8]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // the mask marks the eyes (x), the key (y) and the chained forearm (z). The eye glow is drawn in the texture, so only
    // the cyan texels of the face flare (and go dark when he dies); the key takes a Violet charge, the chain a fainter one
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat ey=smoothstep(0.3,0.55,min(diffuseColor.g,diffuseColor.b)-diffuseColor.r)*vMask.x;\ntotalEmissiveRadiance+=vec3(0.25,0.9,1.0)*uGlow.x*ey+vec3(0.42,0.26,1.0)*(uGlow.y*vMask.y+uGlow.w*vMask.z)+vec3(0.55)*uGlow.z;');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|head|upperarmL|forearmL|handL|key|upperarmR|forearmR|handR)\.quaternion/; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),lane:lane.visible,warn:warn.visible,hole:hole.visible,links:LINKS.filter(m=>m.visible).length,slow:+slowT.toFixed(2),drag:dummy?+dummy.userData.drag.toFixed(2):null,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,key:bones.key?pt(bones.key,[0,0,0]).toArray().map(v=>+v.toFixed(2)):null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,EYES),6,0xfff4e0,1.6,0.25)").replace('spawn her back in', 'spawn him back in').replace('PIV=new THREE.Vector3(0,0,-0.06*U)', 'PIV=new THREE.Vector3(0,0,0)') + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is his power)
  const FXP=[], RINGS=[], LINKS=[]; let dotTex=null, rune=null, lane=null, laneFill=null, warn=null, warnFill=null, hole=null, shack=null;
  let eyes=1, eyesTo=1, keyG=0, keyTo=0, armG=0, armTo=0, slowT=-1, holeT=-1;
  const EYES=[0,0.055,0.09], GRIP=[0.0025,-0.02,0.004], TEETH=[0.012,-0.29,0.009], CHEST_FRONT=[0,0.02,0.14];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<120;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the Chain Hook's warning: an Ember lane in front of him that fills along its length
    const lg=new THREE.PlaneGeometry(1,1); lg.translate(0,-0.5,0);
    laneFill=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    lane=new THREE.Group(); const lm=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false});
    [[-LANE_W/2,0.035,LANE_L,-LANE_L/2],[LANE_W/2,0.035,LANE_L,-LANE_L/2],[0,LANE_W,0.035,-LANE_L],[0,LANE_W,0.035,0]].forEach(([x,w,h,y])=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lm); e.position.set(x,y,0); lane.add(e);}); lane.userData.mat=lm;
    [lane,laneFill].forEach(m=>{m.rotation.order='YXZ'; m.rotation.x=-Math.PI/2; m.visible=false; fxG.add(m);});
    // the chain between his fist and the flying key: plain links, every other one turned a quarter
    const kg=new THREE.TorusGeometry(0.05,0.014,5,10), km=new THREE.MeshStandardMaterial({color:RUST,roughness:0.85,metalness:0.2});
    for(let i=0;i<NLINK;i++){ const m=new THREE.Mesh(kg,km); m.visible=false; scene.add(m); LINKS.push(m); }
    // the Lock Turn's warning: an Ember ring round him that fills; a Violet keyhole where the teeth stand in the floor
    warn=new THREE.Mesh(new THREE.RingGeometry(0.975,1,80),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); warnFill=new THREE.Mesh(new THREE.CircleGeometry(1,80),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    warn.rotation.x=warnFill.rotation.x=-Math.PI/2; warn.scale.setScalar(RING_R); warn.visible=warnFill.visible=false; fxG.add(warn,warnFill);
    hole=new THREE.Group(); const hm=new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false}); const h1=new THREE.Mesh(new THREE.RingGeometry(0.26,0.3,40),hm), h2=new THREE.Mesh(new THREE.CircleGeometry(0.07,20),hm), h3=new THREE.Mesh(new THREE.PlaneGeometry(0.06,0.16),hm); h3.position.y=-0.1; [h1,h2,h3].forEach(m=>hole.add(m)); hole.rotation.x=-Math.PI/2; hole.userData.mat=hm; hole.visible=false; fxG.add(hole);
    // the slow: a Violet shackle round the hero's feet
    shack=new THREE.Mesh(new THREE.RingGeometry(0.36,0.43,40),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); shack.rotation.x=-Math.PI/2; shack.visible=false; scene.add(shack);
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.1); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0,drag:-1}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296) + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane){lane.visible=laneFill.visible=false;rune.visible=false;warn.visible=warnFill.visible=false;hole.visible=false;holeT=-1;shack.visible=false;slowT=-1;} LINKS.forEach(m=>m.visible=false); if(dummy)dummy.userData.drag=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const fistW=()=>pt(bones.handL,GRIP);
  const teethW=()=>pt(bones.key,TEETH);
  const underW=()=>pt(bones.hips,[0,0,0]).setY(0.02);
  let runeT=-1, laneT=-1, warnT=-1;
  function fxStart(name){
    keyTo=0; armTo=0; if(lane){lane.visible=laneFill.visible=false;warn.visible=warnFill.visible=false;hole.visible=false;} laneT=-1; warnT=-1; holeT=-1; if(dummy)dummy.userData.drag=-1;
    if(name==='chainHook'){ if(dummy&&showTarget){ if(Math.abs(dummy.userData.z-FAR)>0.05){ dummy.userData.z=FAR; dummy.userData.x=0; } dummy.userData.hold=HKT+0.3; dummy.userData.kick=0; } lane.userData.o=toFloor(new THREE.Vector3(0,0,0)); lane.userData.yaw=-floorYaw; if(fxOn)laneT=0; }
    if(name==='lockTurn'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.lockTurn)>0.3){ dummy.userData.z=HOME_OF.lockTurn; dummy.userData.x=0; } const o=toFloor(new THREE.Vector3(0,0,0)); warn.position.copy(o).setY(0.012); warnFill.position.copy(o).setY(0.011); warnFill.scale.setScalar(0.001); if(fxOn)warnT=0; }
    if(name==='spawn'){ eyes=0; eyesTo=1; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,CHEST_FRONT),12,0xfff4e0,2.4,0.3); }
  }
  function fxContact(name,i){
    if(name==='chainHook'){ if(i===0){ hitFeel(0.8,0.07,0); eyes=2.0; keyG=1.8;
        if(dummy&&showTarget){ const p=targetW(); if(Math.abs(p.x)<LANE_W/2+0.25&&p.z>0&&p.z<LANE_L+0.2){ dummy.userData.drag=0; dummy.userData.from=dummy.userData.z; dummy.userData.kick=0; dummy.userData.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(p.clone().setY(0.9),8,0xfff4e0,2.0,0.25); } } }
      else { hitFeel(0.2,0,0.2); if(fxOn)sparks(fistW(),4,0xfff4e0,1.0,0.2); } }
    if(name==='lockTurn'){ const tip=teethW().setY(0.02);
      if(i===0){ hitFeel(0.35,0.03,0.3); if(fxOn){ dust(tip,7,1.4,0.5); ringAt(tip,{r0:0.1,r1:0.7,dur:0.22,a:0.4}); holeT=0; hole.position.copy(toFloor(tip)).setY(0.014); } }
      else { hitFeel(0.9,0.08,1); eyes=2.2; keyG=2.0; const o=underW(); if(fxOn){ ringAt(o,{r0:RING_R,r1:0.5,dur:0.3,a:0.5}); ringAt(o,{r0:0.4,r1:RING_R,dur:0.26,a:0.3,delay:0.02}); sparks(tip.clone().setY(0.08),8,0xfff4e0,1.6,0.25); dust(tip,6,1.6,0.5); }
        if(dummy&&showTarget&&targetW().length()<RING_R+0.2){ dummy.userData.mat.emissiveIntensity=feel?0.45:0; dummy.userData.hold=Math.max(dummy.userData.hold,SLOW_T); slowT=0; } } }
    if(name==='rage'){ if(i===0){ hitFeel(0.5,0.06,0.5); rage=true; $('rage').setAttribute('aria-pressed','true'); eyes=2.6; keyG=1.6; const h=pt(bones.head,EYES); if(fxOn)[0,0.12,0.24].forEach(dl=>ringAt(h,{r0:0.15,r1:1.5,dur:0.6,a:0.3,bill:true,delay:dl})); } else { hitFeel(0.3,0.03,0.3); if(fxOn){ const f=pt(bones.footR,[0,-0.05,0.06]).setY(0.02); dust(f,8,1.6,0.6); ringAt(f,{r0:0.15,r1:1.2,dur:0.28,a:0.3,col:DUST}); } } }
    if(name==='spawn'){ hitFeel(0.2,0.02,0.2); if(fxOn)sparks(fistW(),4,0xfff4e0,1.0,0.2); }
    if(name==='heavyHit'&&i===1){ hitFeel(0.2,0,0.2); if(fxOn)dust(pt(bones.footL,[0,-0.05,0.06]).setY(0.02),4,0.9,0.4); }
    if(name==='death'){ hitFeel(0.85,0.06,0.5); cv.style.filter='saturate(0.6)'; if(fxOn){ [bones.head,bones.chest,bones.hips].forEach(b=>dust(pt(b,[0,0,0]).setY(0.02),7,2.0,0.7)); ringAt(pt(bones.spine,[0,0,0]).setY(0.02),{r0:0.3,r1:1.9,dur:0.32,a:0.35,col:DUST}); } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='chainHook'){ const k=Math.min(1,t/HKT), on=t<HKT; eyesTo=on?1+1.2*k:1; keyTo=t<KEYHOME?0.3+0.7*k:0; armTo=t<KEYHOME?k:0;
      if(laneT>=0&&fxOn){ const u=lane.userData; lane.visible=laneFill.visible=on; lane.rotation.y=laneFill.rotation.y=u.yaw; lane.position.copy(u.o).setY(0.012); laneFill.position.copy(u.o).setY(0.011); laneFill.scale.set(LANE_W,Math.max(0.001,k*LANE_L),1); u.mat.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(t>0.26&&t<HKT&&fxOn&&Math.random()<d*40)puff(teethW(),new THREE.Vector3(0,0,0),{life:0.16,s0:0.12,s1:0.03,a:0.22,col:VIOLET,drag:0,g:0}); }
    if(n==='lockTurn'){ const k=Math.min(1,t/LTT), on=t<LTT; eyesTo=on?1+1.2*k:1; keyTo=t<PULL?(t>STAB?0.5+0.5*k:0.4*k):0; armTo=on?0.6*k:0;
      if(warnT>=0&&fxOn){ warn.visible=warnFill.visible=on; warnFill.scale.setScalar(Math.max(0.001,k*RING_R)); warn.material.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(holeT>=0&&t>PULL)holeT=-1; }
    if(n==='rage'){ eyesTo=t>0.34?2.4:1+2*t; keyTo=t>0.34&&t<1.1?1:0; if(t>0.42&&t<1.1&&fxOn&&Math.random()<d*18)motes(teethW(),1,0.4,0.8); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.8,1.4); }
    if(n==='death'){ eyesTo=t>1.3?Math.max(0,1-(t-1.3)/0.8):1; }
  }
  const _lz=new THREE.Vector3();
  function drawChain(){
    let n=0; if(shot&&!shot.done&&shot.name==='chainHook'&&bones.key&&bones.handL){ const a=fistW(), b=pt(bones.key,[0,0,0]), len=a.distanceTo(b);
      if(len>0.12){ const t=shot.action.time, slack=t>HKT+DRAG?Math.min(1,(t-HKT-DRAG)/0.12):0; n=Math.min(NLINK,Math.max(2,Math.round(len/0.088)));
        for(let i=0;i<n;i++){ const k=(i+0.5)/n, m=LINKS[i]; m.position.copy(a).lerp(b,k); m.position.y-=0.16*slack*Math.sin(Math.PI*k)*Math.min(1,len/1.2); if(m.position.y<0.03)m.position.y=0.03;
          m.lookAt(_lz.copy(b)); m.rotateZ(i%2?Math.PI/2:0); m.rotateX(Math.PI/2); m.scale.set(1,1.45,1); m.visible=true; } } }
    for(let i=n;i<NLINK;i++)LINKS[i].visible=false;
  }
  function updateFx(d){
    eyes+=(eyesTo-eyes)*Math.min(1,d*(eyes>eyesTo?5:12)); keyG+=(keyTo-keyG)*Math.min(1,d*(keyG>keyTo?4:10)); armG+=(armTo-armG)*Math.min(1,d*(armG>armTo?4:10)); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; const burn=rageW*(0.9+0.35*Math.sin(clockT*19)*Math.sin(clockT*7.3));
    const ex=eyes>=1?0.35*(eyes-1):-0.9*(1-eyes);
    glowU.value.set(on*(ex+(sel.dead?0:0.6*burn)),on*keyG*0.12,feel?flash:0,on*armG*0.04);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(lane&&!(shot&&!shot.done&&shot.name==='chainHook')){ lane.visible=laneFill.visible=false; laneT=-1; }
    if(warn&&!(shot&&!shot.done&&shot.name==='lockTurn')){ warn.visible=warnFill.visible=false; warnT=-1; holeT=-1; }
    // the keyhole: lit while the teeth stand in the floor
    if(hole){ if(holeT>=0){ holeT+=d; hole.visible=fxOn; hole.userData.mat.opacity=Math.min(1,holeT/0.1)*(0.4+0.12*Math.sin(clockT*14)); } else hole.visible=false; }
    // the slow: the shackle follows the hero for 1.5 s
    if(shack){ if(slowT>=0&&dummy&&showTarget){ slowT+=d; const u=slowT/SLOW_T; if(u>=1){ slowT=-1; shack.visible=false; } else { shack.visible=fxOn; shack.position.set(dummy.position.x,0.016,dummy.position.z); shack.rotation.z=clockT*1.4; shack.material.opacity=(u>0.8?(1-u)/0.2:1)*(0.45+0.15*Math.sin(clockT*9)); } } else { shack.visible=false; } }
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3);
      if(u.drag>=0){ u.drag=(shot&&shot.name==='chainHook'&&!shot.done)?Math.max(0,shot.action.time-HKT):u.drag+d; const k=Math.min(1,u.drag/DRAG); u.z=u.from+(NEAR-u.from)*k; if(k>=1){ u.drag=-1; u.hold=1.5; } }
      else if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
    drawChain();
    if(bones.head&&bones.footL){ const hd=pt(bones.head,[0,0,0]), ft=pt(bones.footL,[0,0,0]).add(pt(bones.footR,[0,0,0])).multiplyScalar(0.5); const dx=hd.x-ft.x, dz=hd.z-ft.z, len=Math.hypot(dx,dz); blob.position.set(ft.x+dx*0.5,0.004,ft.z+dz*0.5); blob.rotation.z=len>0.05?Math.atan2(-dx,-dz):0; blob.scale.set(0.8,0.8+len*0.42,1); }
  }
  // boot dust in the walk and the turns
  const STEP={L:[0,'footL'],R:[0.5,'footR']}; const stepPrev={};
  function footfalls(){ ['walk','turnL','turnR'].forEach(n=>{ const a=A[n]; if(!a||a.__w<0.6)return; const T=META[n].dur; for(const k in STEP){ const u=((a.time/T-STEP[k][0])%1+1)%1; const key=n+k; if(stepPrev[key]!==undefined&&u<stepPrev[key]&&fxOn)dust(pt(bones[STEP[k][1]],[0,-0.05,0.06]),2,0.45,0.25); stepPrev[key]=u; } }); }

''' + ln(355, 384).replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
aud = json.load(open(sys.argv[5]))
reach = max(v['reach_mm'] for v in aud.values()); arm = max(v.get('arm_mm', 0) for v in aud.values())
VW, VH = sys.argv[7].split('x')
page = page.replace('__VW__', VW).replace('__VH__', VH).replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__REACH__', '0 mm in every move' if reach < 0.5 else '%.0f mm at worst' % reach).replace('__ARM__', '0 mm in every move' if arm < 0.5 else '%.0f mm at worst' % arm).replace('__UNDER__', sys.argv[6])
bad = [k for k in ('sword', 'THORNS', 'thicket', ' her ', 'scythe', 'antler', '__TRIS__', '__MB__', '__UNDER__', '__VW__') if k in page]
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.8,0.8,1)" in page and 'spawn him back in' in page and 'bones.head,EYES),6' in page and 'PIV=new THREE.Vector3(0,0,0)' in page and not bad, bad
open(out, 'w').write(page); print('wrote', out, len(page))
