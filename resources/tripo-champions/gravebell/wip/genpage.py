# Builds the Gravebell Ringer's review page from the Thornmother's page (the bench, the controls and the play loop are
# shared; the words, the numbers and the effects are his own). usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB> <audit json> <under-floor sentence> <views WxH>
import sys, json
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Gravebell Ringer Review</title>\n' + ln(2, 59)
BODY = r"""
<div class="wrap">
  <div>
    <h1>Gravebell Ringer from Tripo, rigged</h1>
    <p class="lede">Your export of the Ashen Barrow champion, with a skeleton and 11 moves added by hand. Their timings are the game's. Pick a move, drag to turn him, and judge the weight, the toll and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves him kneeling where he fell: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under half health: it stays on over every move until you switch it off, and he walks faster. In the Grave Call the hero stands 5 u off, and the ash stays for 5 s.</p>
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
      <img src="gravebell-views.png" alt="The Tripo Gravebell Ringer from the front, his left, the back and his right" width="__VW__" height="__VH__">
      <p class="note" style="padding-top:12px">He came through whole: nothing doubled and nothing missing. Two things were changed. The bell was one piece with the staff, so I cut it free at its shackle and it can swing. The top of the staff was one piece with his shoulder and hood, so I cut that free too and closed the cut. The fists, the lower staff, the hair and the robe are still one welded skin: see What is rough.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · 11,936 as sent, 64 added to close the cuts, so he sits exactly on the budget</small></dd></div>
    <div><dt>Bones</dt><dd>22 <small>hips, spine, chest, head, the staff, the bell, 3 in each arm, 2 in the robe's front and 2 in its back, 3 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, as sent</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.5 u to the hood <small>and 2.8 u to the top of the staff. My guess from the game's body radius of 0.62 u, beside a 1 u hero. Say if he should be bigger.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>An old ringer waiting at the barrow. He breathes slowly under the hood and eases his weight from foot to foot. The hood turns left and then right. Near the end of the loop he hitches the staff on his shoulder, and the bell tolls once and settles.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>A slow funeral walk. Short steps under the long robe, the body bowed a little under the staff, the bell swinging a beat behind each step. The robe trails. The feet point straight ahead.</td><td>Game: 0.95 u/s. 1.1 s for two steps. Enraged: 1.09 u/s, the same steps played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, hood leading, the bell swinging wide.</td><td>100° a second (my number: the game turns him instantly)</td></tr>
      <tr><td>Death Knell</td><td>He hitches the staff up off his shoulder. Then he arches back, and the staff tips far back until the bell hangs behind him. On the warning's end he bows hard from the hips, his left foot steps in, and the staff whips forward over his shoulder: the bell is flung out before him and tolls. He holds the bow while the bell swings, then straightens and shoulders the staff again.</td><td>Game: 1.3 s ring warning (r 3.6 u round himself), the toll 2.5 frames landing on the warning's end, held 3 frames, the bell swings 0.38 s, settle 0.47 s. 11 damage and a 45 percent slow for 2.5 s. The hero stands 2.8 u off.</td></tr>
      <tr><td>Grave Call</td><td>He lifts the staff off his shoulder and draws himself up, twisting away to his right with the hood still on the hero. The staff trembles. On the warning's end he whips round to his left and drops his weight, and the bell is flung out sideways off his shoulder. Under the hero the grave opens in ash. The bell rocks and he shoulders the staff.</td><td>Game: 1.07 s ring warning (r 1.8 u under a hero up to 8 u away), the call 2.5 frames landing on the warning's end, held 3 frames, the bell rocks 0.32 s, settle 0.48 s. 14 damage, then ash that slows 30 percent for 5 s. The hero stands 5 u off.</td></tr>
      <tr><td>Rage</td><td>He hunches over the staff. Then he rears up with the hood thrown back and shakes the staff, and the bell clangs from side to side over his shoulder. His right foot stamps and the staff drops back. The Enraged state stays on after it: hunched and trembling, the bell shivering, eyes burning.</td><td>Mine: 1.6 s. The game does not stop him: below half health he walks 15 percent faster and his moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The head and chest flinch back. The bell swings out. Plays on top of any move, so planted feet stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Thrown back two steps, the hood snapped back, the staff jolted up off his shoulder and the bell thrown out behind. He catches himself, the staff drops back on the shoulder with a clank, and he squares up.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor bowed low over his staff, as if he had come up out of a grave. He straightens, lifts the hood to look at the party, and lets the staff fall back on his shoulder: the bell lands behind him and tolls.</td><td>Game: grow in 7 frames, then a 1.6 s entrance. The bow and the toll are mine.</td></tr>
      <tr><td>Death</td><td>A jolt, and the bell clangs. He sags, both knees give and come down, and he bows over until the hood hangs on his chest, the staff still on his shoulder. The bell tolls on, slower and smaller each swing, and hangs still. He rang himself to his grave. The eyes go out.</td><td>2.8 s, then he stays down</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>__REACH__</td></tr>
      <tr><td>A fist leaving the staff</td><td>__ARM__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor, the robe's torn hem included</td><td>__UNDER__</td></tr>
      <tr><td>The feet</td><td>Tripo set his feet toes-out, the left about 12° and the right about 10°. Every move turns them in so the toes point straight ahead, by your rule for humanoids. A planted foot keeps its heading when his hips turn.</td></tr>
      <tr><td>The head</td><td>Faces straight ahead at rest. In the Grave Call the trunk twists and the hood stays on the hero.</td></tr>
      <tr><td>The bell</td><td>One stiff piece on its own joint at the shackle. It hangs straight down whatever the staff does, and every toll is a swing of the bell itself. Its shackle slides round the staff's top, so the bell hangs under the staff when the staff comes forward, as a bell on a rope would.</td></tr>
      <tr><td>The bell against him</td><td>Looked at from the front, the side, the back and above at the peak of both attacks, the rage, the spawn and the end of the death: the bell stays clear of the hood and his back.</td></tr>
      <tr><td>The robe</td><td>Two joints in front and two behind. The strips from the belt trail in the walk and swing after a toll. Below the knee the robe slides up under itself when he bows or sinks, and in the death it lays itself out on the floor.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>How he tolls.</strong> He rings with his whole body: a bow for the Death Knell, a twist for the Grave Call, and the bell swings off the staff. He cannot swing the staff out in his arms, because the model has no arms inside the sleeves (see What is rough). If you want a big two-handed swing overhead, the model needs a new export with the arms and the staff held clear of the chest.</li>
        <li><strong>Death.</strong> He kneels, bows, and the bell tolls itself still. Two other ways to play it: he topples forward stiff as a post onto the bell, or he sinks into the floor as into a grave with the bell last. Say which you prefer.</li>
        <li><strong>The walk.</strong> Feet straight ahead, short slow steps, bowed under the staff. Say if you want him more hunched or shuffling.</li>
        <li><strong>Rage.</strong> A new 1.6 s roar. The game has no pause at half health. The Enraged button shows the state without the roar.</li>
        <li><strong>Size.</strong> Drawn 2.5 u to the hood.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Tripo welded his fists, the lower staff, the hair and the robe into one skin, and there are no arms inside the sleeves. So the fists stay where he carries them and the staff only rocks on his shoulder, under 30° either way. Where it rocks, the bandaged forearms and the cuffs stretch a little with it.</li>
        <li>The staff came as two pieces that overlap at his shoulder. Where they meet, a small step can show when the staff tips.</li>
        <li>The small bells and the rope on his belt are one skin with the robe. They do not swing.</li>
        <li>The hair is one skin with the chest and does not swing.</li>
        <li>The robe below the knee is two stiff halves. In the death they lie flat in front and behind, and his feet show behind him.</li>
        <li>The game's own Gravebell Ringer is a hunched skeleton under a wooden yoke. This model is a pale old man with the bell on a staff over his shoulder, so the moves are built for what he has.</li>
        <li>The ash patch on this page is only a grey disc. It shows the size and the 5 s, not the game's own look. The slow is only a Violet ring at the hero's feet for 2.5 s.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a foot can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for his power, grey for the ash. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
"""
JS_TOP = ln(160, 162) + '\n<script src="gravebell-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.8;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, ASH=0x77726c;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',deathKnell:'Death Knell',graveCall:'Grave Call',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['deathKnell','graveCall','rage','heavyHit'];
  const HOME=3.4, HOME_OF={deathKnell:2.8,graveCall:5.0}; // where the hero stands, in u, in front of him (he keeps 2.6 to 4.6 u off)
  const WALK=0.95, RAGEWALK=0.95*1.15, TURN=2*Math.PI/3.6, KNT=78/60, GCT=64/60, FAR=5.0, KN_R=3.6, CALL_R=1.8, SLOW_T=2.5, ASH_T=5.0;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.8,0.8,1)') + r'''
  const VIEWS={Close:{p:[5.2,3.3,8.2],t:[0,1.35,0.6]},'Game zoom':{p:[0,14.5,12.6],t:[0,0.5,2.6]},Side:{p:[12.2,2.0,1.4],t:[0,1.35,1.4]},Front:{p:[3.6,2.2,11.7],t:[0,1.4,0]},Back:{p:[-4.0,3.6,-8.9],t:[0,1.35,0.6]},Top:{p:[0,18,0.4],t:[0,0.4,2.2]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // the mask marks the face (x), the bell (y) and the staff (z). The eyes are drawn in the texture, so only the violet
    // texels of the face flare (and go dark when he dies); the bell takes a Violet charge, the staff a fainter one
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat ey=smoothstep(0.1,0.3,min(diffuseColor.r,diffuseColor.b)-diffuseColor.g)*vMask.x;\ntotalEmissiveRadiance+=vec3(0.62,0.35,1.0)*uGlow.x*ey+vec3(0.42,0.26,1.0)*(uGlow.y*vMask.y+uGlow.w*vMask.z)+vec3(0.55)*uGlow.z;');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|head|upperarmL|forearmL|handL|staff|bell|upperarmR|forearmR|handR)\.quaternion/; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),warn:warn.visible,mark:mark.visible,ash:+ashT.toFixed(2),slow:+slowT.toFixed(2),dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,bell:bones.bell?pt(bones.bell,BELL).toArray().map(v=>+v.toFixed(2)):null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,EYES),6,0xfff4e0,1.6,0.25)").replace('spawn her back in', 'spawn him back in').replace('PIV=new THREE.Vector3(0,0,-0.06*U)', 'PIV=new THREE.Vector3(0,0,0)') + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is his power, grey is the ash)
  const FXP=[], RINGS=[]; let dotTex=null, rune=null, warn=null, warnFill=null, mark=null, markFill=null, ash=null, ashRim=null, shack=null;
  let eyes=1, eyesTo=1, bellG=0, bellTo=0, staffG=0, staffTo=0, slowT=-1, ashT=-1;
  const EYES=[0,0.045,0.09], BELL=[0.014,-0.1,0.005], CHEST_FRONT=[0,0.02,0.12], markW=new THREE.Vector3(0,0,FAR);
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<120;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the Death Knell's warning: an Ember ring round him that fills. The Grave Call's: a smaller one under the hero.
    const mkWarn=(r)=>{ const w=new THREE.Mesh(new THREE.RingGeometry(1-0.035*2.5/r,1,80),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})), f=new THREE.Mesh(new THREE.CircleGeometry(1,80),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false})); w.rotation.x=f.rotation.x=-Math.PI/2; w.scale.setScalar(r); w.visible=f.visible=false; fxG.add(w,f); return [w,f]; };
    [warn,warnFill]=mkWarn(KN_R); [mark,markFill]=mkWarn(CALL_R);
    // the ash the Grave Call leaves: a grey patch for 5 s
    ash=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:ASH,transparent:true,opacity:0,depthWrite:false})); ashRim=new THREE.Mesh(new THREE.RingGeometry(0.955,1,64),new THREE.MeshBasicMaterial({color:ASH,transparent:true,opacity:0,depthWrite:false}));
    [ash,ashRim].forEach(m=>{ m.rotation.x=-Math.PI/2; m.scale.setScalar(CALL_R); m.visible=false; fxG.add(m); });
    // the slow: a Violet shackle round the hero's feet
    shack=new THREE.Mesh(new THREE.RingGeometry(0.36,0.43,40),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); shack.rotation.x=-Math.PI/2; shack.visible=false; scene.add(shack);
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.1); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296) + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(warn){warn.visible=warnFill.visible=false;mark.visible=markFill.visible=false;rune.visible=false;ash.visible=ashRim.visible=false;ashT=-1;shack.visible=false;slowT=-1;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const bellW=()=>pt(bones.bell,BELL);
  const underW=()=>pt(bones.hips,[0,0,0]).setY(0.02);
  let runeT=-1, warnT=-1, markT=-1;
  function fxStart(name){
    bellTo=0; staffTo=0; if(warn){warn.visible=warnFill.visible=false;mark.visible=markFill.visible=false;} warnT=-1; markT=-1;
    if(name==='deathKnell'){ if(dummy&&showTarget&&Math.abs(dummy.userData.z-HOME_OF.deathKnell)>0.3){ dummy.userData.z=HOME_OF.deathKnell; dummy.userData.x=0; } const o=toFloor(new THREE.Vector3(0,0,0)); warn.position.copy(o).setY(0.012); warnFill.position.copy(o).setY(0.011); warnFill.scale.setScalar(0.001); if(fxOn)warnT=0; }
    if(name==='graveCall'){ if(dummy&&showTarget){ if(Math.abs(dummy.userData.z-FAR)>0.05||Math.abs(dummy.userData.x)>0.05){ dummy.userData.z=FAR; dummy.userData.x=0; dummy.position.set(0,0,FAR); } dummy.userData.hold=GCT+0.5; dummy.userData.kick=0; }
      markW.set(0,0,FAR); const o=toFloor(markW.clone()); mark.position.copy(o).setY(0.012); markFill.position.copy(o).setY(0.011); markFill.scale.setScalar(0.001); mark.userData.f=o.clone(); if(fxOn)markT=0; }
    if(name==='spawn'){ eyes=0; eyesTo=1; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,CHEST_FRONT),12,0xfff4e0,2.4,0.3); }
    if(name==='death'){ hitFeel(0.5,0.06,0.4); flash=0.4; if(fxOn)sparks(pt(bones.chest,CHEST_FRONT),10,0xfff4e0,2.2,0.3); }
  }
  const tollRings=(a)=>{ const b=bellW(); [0,0.1].forEach(dl=>ringAt(b,{r0:0.12,r1:0.95,dur:0.5,a,bill:true,delay:dl})); };
  function fxContact(name,i){
    if(name==='deathKnell'){ hitFeel(0.9,0.08,0.6); eyes=2.2; bellG=2.0; const o=underW();
      if(fxOn){ ringAt(o,{r0:0.4,r1:KN_R,dur:0.3,a:0.5}); ringAt(o,{r0:0.3,r1:KN_R*0.72,dur:0.36,a:0.3,delay:0.06}); tollRings(0.35); sparks(bellW(),8,0xd9c8ff,1.6,0.3); }
      if(dummy&&showTarget&&targetW().length()<KN_R+0.2){ dummy.userData.mat.emissiveIntensity=feel?0.45:0; dummy.userData.hold=Math.max(dummy.userData.hold,SLOW_T); slowT=0; } }
    if(name==='graveCall'){ hitFeel(0.7,0.06,0); eyes=2.0; bellG=1.6;
      if(fxOn){ tollRings(0.28); ringAt(markW,{r0:CALL_R,r1:0.3,dur:0.26,a:0.5}); ringAt(markW,{r0:0.3,r1:CALL_R,dur:0.3,a:0.3,col:ASH,delay:0.04}); dust(markW,12,2.0,0.9); for(let k=0;k<10;k++){ const a=Math.random()*6.283, r=Math.random()*CALL_R*0.8; puff(new THREE.Vector3(markW.x+Math.cos(a)*r,0.05,markW.z+Math.sin(a)*r),new THREE.Vector3(0,1.6+Math.random()*1.4,0),{life:0.6+Math.random()*0.4,s0:0.22,s1:0.6,a:0.26,col:ASH,drag:2.2}); }
        ashT=0; ash.position.copy(mark.userData.f).setY(0.0125); ashRim.position.copy(mark.userData.f).setY(0.013); }
      if(dummy&&showTarget&&targetW().distanceTo(markW)<CALL_R+0.2){ dummy.userData.mat.emissiveIntensity=feel?0.45:0; dummy.userData.hold=Math.max(dummy.userData.hold,1.4); } }
    if(name==='rage'){ if(i===0){ hitFeel(0.5,0.06,0.5); rage=true; $('rage').setAttribute('aria-pressed','true'); eyes=2.6; bellG=1.6; const h=pt(bones.head,EYES); if(fxOn)[0,0.12,0.24].forEach(dl=>ringAt(h,{r0:0.15,r1:1.5,dur:0.6,a:0.3,bill:true,delay:dl})); } else { hitFeel(0.3,0.03,0.3); if(fxOn){ const f=pt(bones.footR,[0,-0.05,0.06]).setY(0.02); dust(f,8,1.6,0.6); ringAt(f,{r0:0.15,r1:1.2,dur:0.28,a:0.3,col:DUST}); } } }
    if(name==='spawn'){ hitFeel(0.2,0.02,0.2); bellG=1.0; if(fxOn)tollRings(0.22); }
    if(name==='heavyHit'){ if(i===1){ hitFeel(0.2,0,0.2); if(fxOn)dust(pt(bones.footL,[0,-0.05,0.06]).setY(0.02),4,0.9,0.4); } if(i===2){ bellG=0.8; if(fxOn)tollRings(0.16); } }
    if(name==='death'){ if(i===1){ hitFeel(0.6,0.05,0.4); cv.style.filter='saturate(0.6)'; if(fxOn){ [bones.shinL,bones.shinR].forEach(b=>dust(pt(b,[0,0,0]).setY(0.02),6,1.6,0.6)); ringAt(underW(),{r0:0.3,r1:1.6,dur:0.32,a:0.3,col:DUST}); } } if(i===2){ bellG=0.9; if(fxOn)tollRings(0.18); } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='deathKnell'){ const k=Math.min(1,t/KNT), on=t<KNT; eyesTo=on?1+1.2*k:1; bellTo=on?0.3+0.7*k:0; staffTo=on?0.6*k:0;
      if(warnT>=0&&fxOn){ warn.visible=warnFill.visible=on; warnFill.scale.setScalar(Math.max(0.001,k*KN_R)); warn.material.opacity=0.45+0.25*Math.sin(t*24)*k; } }
    if(n==='graveCall'){ const k=Math.min(1,t/GCT), on=t<GCT; eyesTo=on?1+1.2*k:1; bellTo=on?0.3+0.7*k:0; staffTo=on?0.6*k:0;
      if(markT>=0&&fxOn){ mark.visible=markFill.visible=on; markFill.scale.setScalar(Math.max(0.001,k*CALL_R)); mark.material.opacity=0.45+0.25*Math.sin(t*24)*k; if(on&&t>0.3&&Math.random()<d*16)motes(markW,1,CALL_R*1.3,0.7); } }
    if(n==='rage'){ eyesTo=t>0.34?2.4:1+2*t; bellTo=t>0.34&&t<1.1?1:0; if(t>0.42&&t<1.1&&fxOn&&Math.random()<d*18)motes(bellW(),1,0.4,0.8); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.8,1.4); }
    if(n==='death'){ eyesTo=t>1.7?Math.max(0,1-(t-1.7)/0.9):1; }
  }
  function updateFx(d){
    eyes+=(eyesTo-eyes)*Math.min(1,d*(eyes>eyesTo?5:12)); bellG+=(bellTo-bellG)*Math.min(1,d*(bellG>bellTo?4:10)); staffG+=(staffTo-staffG)*Math.min(1,d*(staffG>staffTo?4:10)); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; const burn=rageW*(0.9+0.35*Math.sin(clockT*19)*Math.sin(clockT*7.3));
    const ex=eyes>=1?0.35*(eyes-1):-0.9*(1-eyes);
    glowU.value.set(on*(ex+(sel.dead?0:0.6*burn)),on*bellG*0.035,feel?flash:0,on*staffG*0.015);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(warn&&!(shot&&!shot.done&&shot.name==='deathKnell')){ warn.visible=warnFill.visible=false; warnT=-1; }
    if(mark&&!(shot&&!shot.done&&shot.name==='graveCall')){ mark.visible=markFill.visible=false; markT=-1; }
    // the ash: a grey patch that lies for 5 s and fades
    if(ash){ if(ashT>=0){ ashT+=d; const u=ashT/ASH_T; if(u>=1){ ashT=-1; ash.visible=ashRim.visible=false; } else { const k=Math.min(1,ashT/0.2)*(u>0.85?(1-u)/0.15:1); ash.visible=ashRim.visible=fxOn; ash.material.opacity=0.3*k; ashRim.material.opacity=0.45*k; if(fxOn&&Math.random()<d*5){ const a=Math.random()*6.283, r=Math.random()*CALL_R*0.85, w=ash.getWorldPosition(new THREE.Vector3()); puff(new THREE.Vector3(w.x+Math.cos(a)*r,0.04,w.z+Math.sin(a)*r),new THREE.Vector3(0,0.35,0),{life:1.1,s0:0.12,s1:0.4,a:0.14,col:ASH,drag:0.5}); } } } else { ash.visible=ashRim.visible=false; } }
    // the slow: the shackle follows the hero for 2.5 s
    if(shack){ if(slowT>=0&&dummy&&showTarget){ slowT+=d; const u=slowT/SLOW_T; if(u>=1){ slowT=-1; shack.visible=false; } else { shack.visible=fxOn; shack.position.set(dummy.position.x,0.016,dummy.position.z); shack.rotation.z=clockT*1.4; shack.material.opacity=(u>0.8?(1-u)/0.2:1)*(0.45+0.15*Math.sin(clockT*9)); } } else { shack.visible=false; } }
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3);
      if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
    if(bones.head&&bones.footL){ const hd=pt(bones.head,[0,0,0]), ft=pt(bones.footL,[0,0,0]).add(pt(bones.footR,[0,0,0])).multiplyScalar(0.5); const dx=hd.x-ft.x, dz=hd.z-ft.z, len=Math.hypot(dx,dz); blob.position.set(ft.x+dx*0.5,0.004,ft.z+dz*0.5); blob.rotation.z=len>0.05?Math.atan2(-dx,-dz):0; blob.scale.set(0.8,0.8+len*0.42,1); }
  }
  // foot dust in the walk and the turns
  const STEP={L:[0,'footL'],R:[0.5,'footR']}; const stepPrev={};
  function footfalls(){ ['walk','turnL','turnR'].forEach(n=>{ const a=A[n]; if(!a||a.__w<0.6)return; const T=META[n].dur; for(const k in STEP){ const u=((a.time/T-STEP[k][0])%1+1)%1; const key=n+k; if(stepPrev[key]!==undefined&&u<stepPrev[key]&&fxOn)dust(pt(bones[STEP[k][1]],[0,-0.05,0.06]),2,0.45,0.25); stepPrev[key]=u; } }); }

''' + ln(355, 384).replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
aud = json.load(open(sys.argv[5]))
reach = max(v['reach_mm'] for v in aud.values()); arm = max(v.get('arm_mm', 0) for v in aud.values())
VW, VH = sys.argv[7].split('x')
page = page.replace('__VW__', VW).replace('__VH__', VH).replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__REACH__', '0 mm in every move' if reach < 0.5 else '%.0f mm at worst' % reach).replace('__ARM__', '0 mm in every move' if arm < 0.5 else '%.0f mm at worst' % arm).replace('__UNDER__', sys.argv[6])
bad = [k for k in ('sword', 'THORNS', 'thicket', ' her ', 'scythe', 'antler', 'chainHook', 'lockTurn', 'LINKS', 'keyG', 'teethW', 'fistW', 'bones.key', 'the key', 'Lockkeeper', 'boot', '__TRIS__', '__MB__', '__UNDER__', '__VW__') if k in page]
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.8,0.8,1)" in page and 'spawn him back in' in page and 'bones.head,EYES),6' in page and 'PIV=new THREE.Vector3(0,0,0)' in page and not bad, bad
open(out, 'w').write(page); print('wrote', out, len(page))
