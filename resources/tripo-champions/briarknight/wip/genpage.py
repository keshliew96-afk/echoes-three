# Builds the Briar Knight's review page from the Thornmother's page (the bench, the controls and the play loop are
# shared; the words, the numbers and the effects are his). usage: python3 -I genpage.py <thornmother index.html> <out index.html> <tris> <glb MB>
import sys
L = open(sys.argv[1]).read().split('\n'); out = sys.argv[2]; TRIS = sys.argv[3]; MB = sys.argv[4]
ln = lambda a, b: '\n'.join(L[a - 1:b])          # 1-based, inclusive

HEAD = '<title>Tripo Briar Knight Review</title>\n' + ln(2, 59) + '\n<style>.new{font:600 11px var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--accent);border:1px solid var(--accent);border-radius:4px;padding:1px 5px;margin-left:6px;white-space:nowrap}.changes{margin:0 0 8px;padding-left:20px;max-width:75ch}.changes li{margin:6px 0}</style>'
BODY = r'''
<div class="wrap">
  <div>
    <h1>Briar Knight from Tripo, rigged</h1>
    <p class="lede">Your export of the Hollow Wood champion, with both shields taken off, a two-legged skeleton and 11 moves added by hand. His timings are the game's. Pick a move, drag to turn him, and judge the weight and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death leaves him on one knee: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under half health: it stays on over every move until you switch it off, and he walks faster. The thicket from a Thorn Ring stays on the floor for 5 s.</p>
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
      <img src="briarknight-views.png" alt="The Tripo Briar Knight from the front, his left, the back and his right, with both shields, before they were removed" width="810" height="810">
      <p class="note" style="padding-top:12px">He came with a second shield fused onto his sword arm. I cut it off and rebuilt the outside of that forearm from the armour around it. In Version 3 the round shield on his left arm is gone too, as you asked (below). The crown of briars, the tabard, the vines and the sword came through whole.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>__TRIS__ <small>champion budget 12,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>21 <small>hips, spine, chest, head, 2 in the left arm, 3 in the sword arm, the sword, 4 in the tabard, 3 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only, with a strip added for the rebuilt forearm</small></dd></div>
    <div><dt>File</dt><dd>__MB__ MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.4 u tall <small>my guess from the game rig (crown at 2.75 u), beside a 1 u hero. Say if he should be bigger.</small></dd></div>
  </dl>

  <h2>Changed in Version 3</h2>
  <ul class="changes">
    <li><strong>No shield.</strong> The round shield was fused into the outer half of his left forearm, so cutting it off left that arm half gone. His left arm below the shoulder plate is now a mirror of his sword arm, with the fist closed where the sword grip ran through it. Both arms now match.</li>
    <li><strong>The left arm in every move</strong> is an empty fist: low and a little forward in his stance, swinging at his side in the walk, across his chest in the charge, thrown wide in the roar and the heavy hit, laid on the raised knee in the kneel.</li>
    <li><strong>Spawn</strong> had him strike the sword on the shield. Now he salutes, the hilt before his visor and the left fist on his heart, then cuts the blade down and out so its point finds the hero.</li>
  </ul>
  <img src="shield-removed-v3.jpg" alt="The Briar Knight before and after the left shield was removed, from the front, front left, his left, the back and above" width="1600" height="896" style="width:100%;height:auto;border-radius:8px;margin:0 0 12px">

  <h2>Changed in Version 2</h2>
  <ul class="changes">
    <li><strong>Death</strong> ends like your picture: on one knee, the sword planted in front of him, the helm bowed. He no longer falls on his face.</li>
    <li><strong>Walk</strong> has the feeling of your picture: a slow, sure advance with the helm low, the arms hanging and the sword low at his side.</li>
    <li><strong>No 外八.</strong> The model stands with its legs spread and its boots turned out. The walk now puts the feet close to one line, 0.42 u apart, and turns each boot in so the knees and toes point straight ahead. The turns on the spot are narrower too.</li>
    <li><strong>A fault of mine in Version 1, fixed in every move:</strong> the sword arm was twisted half a turn along its length whenever it reached for a point, which crushed the right shoulder plate. It now turns the way the arm was modelled.</li>
  </ul>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What he does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A vigil. Slow breath in the chest and shoulders, his weight eases from one foot to the other, the helm sweeps left and then right, he rolls the sword's point once and flexes the left fist.</td><td>6 s loop</td></tr>
      <tr><td>Walk <span class="new">new</span></td><td>From your picture: he comes on slowly and does not hurry. The body is upright and nearly still, the helm is low and stays on the hero, both arms hang, the left fist at his side and the sword low with its point out to his right, just off the floor. The feet fall close to one line with the knees and toes straight ahead (no 外八).</td><td>Game: 1.25 u/s. 1.0 s for two steps. Enraged: 1.44 u/s, the same steps played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, helm leading.</td><td>112° a second (my number: the game turns him instantly)</td></tr>
      <tr><td>Bramble Charge</td><td>The right foot goes back, the left forearm comes across his chest and the sword comes level beside it like a couched lance. He sinks, cocks back and shakes. He is thrown forward off the back foot into a low sprint, left shoulder first, digs the lead foot in ahead of him to stop, rocks back once and squares up.</td><td>Game: couch for the 1 s lane warning, drive 2.5 frames landing on the warning's end, 9 u/s down a lane 1.1 u wide and up to 6.5 u long, stop held 3 frames and a beat, settle 0.5 s. Here he runs the full 6.5 u; the hero stands 4.5 u off (he picks the farthest hero).</td></tr>
      <tr><td>Thorn Ring</td><td>The left foot steps wide, the left arm swings out and the sword goes up high with its point down, trembling. He drives it into the floor in front of him with both knees deep. Thorns burst across the ring and a thicket stays. He draws the blade out and stands.</td><td>Game: raise for the 1.2 s ring warning (r 2.8 u round him), plant 2.5 frames landing on the warning's end, held 3 frames, recoil 0.2 s, settle 0.5 s. Thicket r 2.2 u for 5 s.</td></tr>
      <tr><td>Rage</td><td>He folds in over his left forearm, then stamps the right foot and throws both arms wide with the helm back, shaking. The Enraged state stays on after it: hunched, quick breath, the visor burning.</td><td>Mine: 1.6 s. The game does not stop him: below half health the visor burns, he walks 15 percent faster and his moves come back 30 percent sooner.</td></tr>
      <tr><td>Hurt</td><td>The helm and chest flinch away and the arms jolt. Plays on top of any move, so planted feet stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Driven back two short steps with the left arm knocked wide, he catches himself low, shakes his helm and squares up.</td><td>1.15 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor in a crouch, stands to his full height and salutes: the hilt before his visor, the blade upright, the left fist on his heart. Then he cuts the blade down and out so its point finds the hero. <span class="new">new</span></td><td>Game: grow in 7 frames, then a 1.6 s entrance. The rise and the salute are mine.</td></tr>
      <tr><td>Death <span class="new">new</span></td><td>From your picture: he does not fall. A jolt, the sword's point drops to the floor ahead of him and he leans on it, the left foot steps forward, the right knee gives and comes down. He ends on one knee with the sword upright under his right hand, his left forearm on the raised knee and the helm bowed. The visor goes dark.</td><td>2.3 s, then he stays kneeling</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move, the sprint included</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>__REACH__</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>__UNDER__</td></tr>
      <tr><td>The sword in his fist</td><td>As sent, the guard only touched the front corner of the fist. It is seated 0.03 deeper so no gap opens when the hand turns.</td></tr>
      <tr><td>The tabard, front and back</td><td>Two joints each, run as springs: they trail the body, ring after it stops and rest on the floor instead of passing through it.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Sword or lance.</strong> The game's Briar Knight carries a lance and a seven-sided buckler. Tripo gave him a short sword held point down and a round shield, which is now gone. The charge couches the sword like the lance. Say if you want a lance made for him instead.</li>
        <li><strong>Visor colour.</strong> His visor is yellow-green in the texture and flares in that colour here. The game's tell is an indigo visor. Say if it should be recoloured.</li>
        <li><strong>Rage.</strong> A new 1.6 s roar. The game has no pause at half health, only the burning visor. The Enraged button shows the state without the roar.</li>
        <li><strong>The stop.</strong> Built on locked feet, as the game's rule: he digs one foot in and rocks back. A true skid with dust would break that rule but could feel heavier.</li>
        <li><strong>The sword's point in the walk.</strong> It is carried just off the floor. Dragging it along the floor with a scratch line and sparks would be a new effect: say if you want it.</li>
        <li><strong>Size.</strong> Drawn 2.4 u tall.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Both forearms are now the same rebuilt arm, so seen from either side the outer forearm is smoother and plainer than the rest of the armour. A regenerate from front and back views only would give it real detail.</li>
        <li>The new left arm is its own piece tucked up inside the left shoulder plate, not joined to it. I saw no gap in the stills, but a gap could open under the plate when the arm swings wide.</li>
        <li>His arms are short and thick, so the sword hand cannot reach across his body, and the left fist sits on the left of his chest in the salute.</li>
        <li>His sword is short, so the hand on the planted sword sits at chest height, not beside the helm as in your picture.</li>
        <li>The vines and thorns bend with the armour like skin.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a foot can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for his power, dark briar for the thorns. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>
'''
JS_TOP = ln(160, 162) + '\n<script src="briarknight-model.js"></script>\n<script>\n(function(){\n  const $=id=>document.getElementById(id);\n' + r'''  const cv=$('cv'), stage=cv.parentElement, META=window.MODEL_META, U=2.4;
  const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478, BRIAR=0x1c1610;
  const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',charge:'Bramble Charge',ring:'Thorn Ring',rage:'Rage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};
  const ACTIONS=['charge','ring','rage','heavyHit'];
  const HOME=3.0, HOME_OF={charge:4.5,ring:2.0}; // where the hero stands, in u, in front of him
  const WALK=1.25, RAGEWALK=1.25*1.15, TURN=2*Math.PI/3.2, GO=1.0, RUN=6.5/9, LANE_W=1.1, LANE_L=6.5, RINGT=1.2, RING_R=2.8, THICKET_R=2.2, THICKET_S=5;
''' + ln(173, 184).replace('blob.scale.set(0.72,1.2,1)', 'blob.scale.set(0.8,0.8,1)') + r'''
  const VIEWS={Close:{p:[4.6,2.9,7.0],t:[0,1.15,0.7]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.2]},Side:{p:[9.8,1.6,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.9,10.4],t:[0,1.2,0]},Back:{p:[-3.4,3.1,-7.6],t:[0,1.1,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};
''' + ln(186, 202) + r'''
  let rage=false, rageW=0, rageAct=null; toggle('rage',()=>rage,v=>rage=v);

  // ---- model
  let model=null, mixer=null, mesh=null, A={}, bones={}, glowU={value:new THREE.Vector4(0,0,0,0)}, hurtAct=null, shot=null, dummy=null;
  const bin=atob(window.MODEL_GLB_B64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,'',gltf=>{
    model=gltf.scene; model.scale.setScalar(U); scene.add(model);
    model.traverse(o=>{if(o.isBone)bones[o.name]=o; if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
    // the mask marks the visor (x) and the sword (y): the visor flares in its own colour, the blade takes a Violet edge
    mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 _mask;\nvarying vec3 vMask;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMask=_mask;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMask;\nuniform vec4 uGlow;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(0.62,0.85,0.18)*uGlow.x*vMask.x+vec3(0.42,0.26,1.0)*uGlow.y*vMask.y+vec3(0.55)*uGlow.z;');};
    helper=new THREE.SkeletonHelper(model); helper.visible=false; scene.add(helper);
    mixer=new THREE.AnimationMixer(model);
    const UPPER=/^(spine|chest|head|upperarmL|forearmL|upperarmR|forearmR|handR|sword)\./; const restC=gltf.animations.find(c=>c.name==='hurt');
    gltf.animations.forEach(c=>{
      c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));
      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}
      if(c.name==='hurt'){const h=new THREE.AnimationClip('hurtAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,h,60); hurtAct=mixer.clipAction(h); hurtAct.blendMode=THREE.AdditiveAnimationBlendMode; hurtAct.setLoop(THREE.LoopOnce,1); hurtAct.clampWhenFinished=false; return;}
      const a=mixer.clipAction(c); const loop=META[c.name].loop; a.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1); a.clampWhenFinished=true; a.setEffectiveWeight(0); a.__w=0; a.play(); if(!loop)a.paused=true; A[c.name]=a;});
    A.idle.__w=1; A.idle.setEffectiveWeight(1);
    makeFx(); $('load').hidden=true; refresh();
    window.__review={sel,pick,A,META,bones,state:()=>({shot:shot&&shot.name,rage,rageW:+rageW.toFixed(2),thorns:THORNS.filter(c=>c.userData.t>=0).length,thicket:thicket.userData.t>=0?+thicket.userData.t.toFixed(2):-1,lane:lane.visible,warn:warn.visible,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,t:shot&&+shot.action.time.toFixed(3),fx:FXP.filter(p=>p.life>0).length,rings:RINGS.filter(r=>r.t>=0).length,glow:glowU.value.toArray().map(v=>+v.toFixed(2)),floor:[+floorPos.x.toFixed(2),+floorPos.z.toFixed(2),+floorYaw.toFixed(2)],weights:Object.fromEntries(Object.entries(A).filter(([k,a])=>a.__w>0.01).map(([k,a])=>[k,+a.__w.toFixed(2)]))}),setSpeed:v=>speed=v,step:(dt)=>tick(dt),pause:v=>paused=v,cam,orbit};
  },e=>{$('load').textContent='The model could not be read.';});

''' + ln(225, 262).replace("sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25)", "sparks(pt(bones.head,[0,0.05,0.09]),6,0xfff4e0,1.6,0.25)").replace('spawn her back in', 'spawn him back in').replace('PIV=new THREE.Vector3(0,0,-0.06*U)', 'PIV=new THREE.Vector3(0,0,0)') + '\n\n' + ln(264, 266) + r'''

  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is his power, dark briar the thorns)
  const FXP=[], RINGS=[], THORNS=[]; let dotTex=null, lane=null, rune=null, warn=null, warnFill=null, thicket=null;
  let visor=1, visorTo=1, edge=0, edgeTo=0;
  const SWORD_TIP=[-0.085,-0.43,0.143], CHEST_FRONT=[0,0.02,0.15];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<110;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    lane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.2,depthWrite:false})); lane.rotation.x=-Math.PI/2; lane.position.y=0.011; lane.visible=false; fxG.add(lane);
    // the Thorn Ring's warning: an Ember ring round him that fills, then thorns across it and the thicket that stays
    warn=new THREE.Mesh(new THREE.RingGeometry(0.975,1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); warnFill=new THREE.Mesh(new THREE.CircleGeometry(1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.13,depthWrite:false}));
    warn.rotation.x=warnFill.rotation.x=-Math.PI/2; warn.scale.setScalar(RING_R); warn.visible=warnFill.visible=false; fxG.add(warn,warnFill);
    const tm=new THREE.MeshBasicMaterial({color:0x060504});
    for(let i=0;i<40;i++){ const cne=new THREE.Mesh(new THREE.ConeGeometry(0.11,1,5),tm); cne.geometry.translate(0,0.5,0); cne.visible=false; cne.userData={t:-1,h:0.5,d:0}; fxG.add(cne); THORNS.push(cne); }
    thicket=new THREE.Group(); const dm=new THREE.MeshBasicMaterial({color:0x2e2a22,transparent:true,opacity:0.45,depthWrite:false}); const disc=new THREE.Mesh(new THREE.CircleGeometry(THICKET_R,56),dm); disc.rotation.x=-Math.PI/2; disc.position.y=0.008;
    const rm=new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.3,depthWrite:false}); const rim=new THREE.Mesh(new THREE.RingGeometry(THICKET_R-0.06,THICKET_R,56),rm); rim.rotation.x=-Math.PI/2; rim.position.y=0.009; thicket.add(disc,rim);
    const km=new THREE.MeshStandardMaterial({color:0x0d0a08,roughness:1,flatShading:true,transparent:true}); const sp=new THREE.Group(); for(let k=0;k<26;k++){ const cn=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.34,5),km); const a=k*2.399, r=0.75+1.35*Math.sqrt((k+0.5)/26); cn.position.set(Math.cos(a)*r,0.16,Math.sin(a)*r); cn.rotation.set((k*13%7-3)*0.12,0,(k*29%7-3)*0.12); sp.add(cn); } thicket.add(sp);
    thicket.userData={dm,rm,km,sp,t:-1}; thicket.visible=false; fxG.add(thicket);
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.3); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dmm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dmm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dmm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dmm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
''' + ln(291, 296) + r'''
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane){lane.visible=false;rune.visible=false;warn.visible=warnFill.visible=false;thicket.userData.t=-1;thicket.visible=false;} THORNS.forEach(c=>{c.userData.t=-1;c.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  let runeT=-1, laneT=-1, warnT=-1;
  function fxStart(name){
    edgeTo=0; if(lane){lane.visible=false;warn.visible=warnFill.visible=false;} laneT=-1; warnT=-1;
    if(name==='charge'&&fxOn){ laneT=0; lane.userData.o=toFloor(new THREE.Vector3(0,0,0)); lane.userData.f=new THREE.Vector3(0,0,1).applyAxisAngle(Y,-floorYaw); lane.userData.yaw=-floorYaw; }
    if(name==='ring'&&fxOn){ warnT=0; const o=toFloor(new THREE.Vector3(0,0,0)); warn.position.copy(o).setY(0.012); warnFill.position.copy(o).setY(0.011); warnFill.scale.setScalar(0.001); }
    if(name==='spawn'){ visor=0; visorTo=1; rage=false; $('rage').setAttribute('aria-pressed','false'); cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,CHEST_FRONT),12,0xfff4e0,2.4,0.3); }
  }
  function burstThorns(){ if(!fxOn)return; const o=toFloor(new THREE.Vector3(0,0,0));
    THORNS.forEach((c,i)=>{ const a=i*2.399+0.4, r=0.85+(RING_R-0.95)*Math.sqrt((i+0.5)/THORNS.length); c.position.set(o.x+Math.cos(a)*r,0,o.z+Math.sin(a)*r); c.rotation.set((i*13%7-3)*0.07,i,(i*29%7-3)*0.07); c.userData.t=0; c.userData.h=0.45+0.5*((i*37%10)/10); c.userData.d=0.05*(r/RING_R); c.scale.set(1,0.001,1); c.visible=true; });
    thicket.position.copy(o); thicket.rotation.y=Math.random()*6; thicket.userData.t=0; thicket.visible=true; }
  function fxContact(name,i){
    if(name==='charge'&&i===1){ hitFeel(0.6,0.05,0.7); const l=pt(bones.footL,[0,-0.06,0.1]), r=pt(bones.footR,[0,-0.06,0.1]); if(fxOn){ dust(l,8,1.9,0.8); dust(r,8,1.9,0.8); ringAt(l.clone().lerp(r,0.5),{r0:0.3,r1:1.3,dur:0.36,a:0.35}); } }
    if(name==='ring'){ hitFeel(0.9,0.08,1); visor=2.2; const tip=pt(bones.sword,SWORD_TIP).setY(0.02); burstThorns(); if(fxOn){ ringAt(tip,{r0:0.3,r1:RING_R,dur:0.32,a:0.5}); ringAt(tip,{r0:0.2,r1:1.2,dur:0.22,a:0.4}); dust(tip,12,2.4,0.9); sparks(tip.clone().setY(0.2),10,0xd9c8ff,2.8,0.3); }
      if(dummy&&showTarget&&targetW().length()<RING_R+0.3){ hitDummy(0.45); } }
    if(name==='rage'){ hitFeel(0.5,0.06,0.5); rage=true; $('rage').setAttribute('aria-pressed','true'); visor=2.6; const h=pt(bones.head,[0,0.03,0.08]); if(fxOn){ [0,0.12,0.24].forEach(dl=>ringAt(h,{r0:0.15,r1:1.5,dur:0.6,a:0.3,bill:true,delay:dl})); dust(pt(bones.footR,[0,-0.06,0.08]),8,1.5,0.7); } }
    if(name==='spawn'){ hitFeel(0.3,0.04,0.3); const m=pt(bones.sword,[-0.04,-0.2,0.07]); if(fxOn){ sparks(m,9,0xfff4e0,2.2,0.28); ringAt(m,{r0:0.1,r1:0.8,dur:0.25,a:0.4,bill:true}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.25,0,0.2); const tip=pt(bones.sword,SWORD_TIP).setY(0.02); if(fxOn){ sparks(tip.clone().setY(0.08),5,0xfff4e0,1.6,0.22); dust(tip,4,0.8,0.4); } } else { hitFeel(0.6,0,0.5); if(fxOn){ dust(pt(bones.shinR,[0,0,0.03]).setY(0.02),10,1.6,0.7); dust(pt(bones.footL,[0,-0.06,0.05]),4,0.9,0.4); } cv.style.filter='saturate(0.45)'; } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='charge'){ const k=Math.min(1,t/GO), running=t>=GO&&t<GO+RUN; visorTo=t<GO+RUN?1+1.3*k:1; edgeTo=t<GO+RUN?0.5*k:0;
      if(laneT>=0&&fxOn){ const u=lane.userData; lane.visible=t<GO+RUN; lane.rotation.order='YXZ'; lane.rotation.y=u.yaw; lane.position.copy(u.o).addScaledVector(u.f,LANE_L/2+0.3).setY(0.011); lane.scale.set(LANE_W,LANE_L,1); lane.material.opacity=(0.1+0.14*k)*(running?1-(t-GO)/RUN*0.7:1)+0.03*Math.sin(t*24)*k; }
      if(shot.prev<0.3&&t>=0.3&&fxOn)dust(pt(bones.footR,[0,-0.06,0.05]),3,0.7,0.3);
      if(shot.prev<GO&&t>=GO&&fxOn){ dust(pt(bones.footR,[0,-0.06,0]),9,2.2,0.9); }
      if(running){ if(dummy)dummy.userData.hold=Math.max(dummy.userData.hold,0.25); if(fxOn&&Math.floor(t/0.05)!==Math.floor(shot.prev/0.05))dust(pt(bones.hips,[0,0,-0.08]).setY(0),2,0.9,0.5);
        if(!shot.hit&&dummy&&showTarget&&Math.abs(dummy.position.x)<0.9&&dummy.position.z>0&&dummy.position.z<1.15){ shot.hit=true; hitFeel(1,0.1,1); const c=pt(bones.chest,CHEST_FRONT); if(fxOn){ sparks(c,14,0xfff4e0,3.4,0.32); ringAt(c,{r0:0.1,r1:1.0,dur:0.26,a:0.5,bill:true}); } hitDummy(0.5); dummy.userData.sx=7; dummy.userData.hold=1.5; } } }
    if(n==='ring'){ const k=Math.min(1,t/RINGT), on=t<RINGT; visorTo=on?1+1.3*k:1; edgeTo=t<RINGT+0.25?k:0;
      if(warnT>=0&&fxOn){ warn.visible=warnFill.visible=on; warnFill.scale.setScalar(Math.max(0.001,k*RING_R)); warn.material.opacity=0.45+0.25*Math.sin(t*24)*k; }
      if(on&&t>0.6&&Math.random()<d*16)motes(pt(bones.sword,SWORD_TIP),1,0.3,0.6); }
    if(n==='rage'){ visorTo=t>0.34?2.4:1+2*t; if(t>0.42&&t<1.15&&Math.random()<d*18)motes(pt(bones.head,[0,0.05,0]),1,0.5,0.9); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,2.0,1.4); }
    if(n==='death'){ visorTo=t>1.55?0:1-0.6*t/1.55; }
  }
  function updateFx(d){
    visor+=(visorTo-visor)*Math.min(1,d*(visor>visorTo?5:12)); edge+=(edgeTo-edge)*Math.min(1,d*8); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; const burn=rageW*(0.9+0.35*Math.sin(clockT*19)*Math.sin(clockT*7.3));
    glowU.value.set(on*(0.22*visor+(sel.dead?0:0.5*burn)),on*edge*0.16,feel?flash:0,0);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(lane&&!(shot&&!shot.done&&shot.name==='charge')){ lane.visible=false; laneT=-1; }
    if(warn&&!(shot&&!shot.done&&shot.name==='ring')){ warn.visible=warnFill.visible=false; warnT=-1; }
    // thorns: up in 5 frames from the middle outwards, stand a beat, sink back
    THORNS.forEach(c=>{ const u=c.userData; if(u.t<0)return; u.t+=d; const t=u.t-u.d; if(t>=0.8){u.t=-1;c.visible=false;return;} const up=Math.max(0,Math.min(1,t/0.085)), dn=Math.max(0,Math.min(1,(t-0.45)/0.35)); const e=up*(1+0.25*Math.sin(up*Math.PI))*(1-dn*dn); c.scale.set(1,Math.max(0.001,u.h*e),1); c.visible=fxOn&&t>=0; });
    if(thicket){ const u=thicket.userData; if(u.t>=0){ u.t+=d; if(u.t>=THICKET_S){u.t=-1;thicket.visible=false;} else { const k=Math.min(1,u.t/0.3), out=Math.max(0,Math.min(1,(THICKET_S-u.t)/1)); u.sp.scale.set(1,Math.max(0.001,k),1); u.dm.opacity=0.45*k*out; u.rm.opacity=0.3*k*out; u.km.opacity=out; thicket.visible=fxOn; } } }
    if(dummy){ const u=dummy.userData, home=HOME_OF[sel.action]||HOME; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(home-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
  // foot dust in the walk and the turns
  const STEP={L:[0,'footL'],R:[0.5,'footR']}; const stepPrev={};
  function footfalls(){ ['walk','turnL','turnR'].forEach(n=>{ const a=A[n]; if(!a||a.__w<0.6)return; const T=META[n].dur; for(const k in STEP){ const u=((a.time/T-STEP[k][0])%1+1)%1; const key=n+k; if(stepPrev[key]!==undefined&&u<stepPrev[key]&&fxOn)dust(pt(bones[STEP[k][1]],[0,-0.06,0.05]),2,0.5,0.3); stepPrev[key]=u; } }); }

''' + ln(355, 384).replace("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);").replace("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;") + '\n</script>\n'
page = HEAD + '\n' + BODY + JS_TOP
import json
aud = json.load(open(sys.argv[5])) if len(sys.argv) > 5 else {}
reach = max((v['reach_mm'] for v in aud.values()), default=0)
page = page.replace('__TRIS__', TRIS).replace('__MB__', MB).replace('__REACH__', '0 mm' if reach < 0.5 else '%.0f mm at worst' % reach).replace('__UNDER__', sys.argv[6] if len(sys.argv) > 6 else '')
assert 'mixer.update(md);' in page and 'RAGEWALK/WALK' in page and 'WALK*fast*md' in page and "blob.scale.set(0.8,0.8,1)" in page and 'spawn him back in' in page
open(out, 'w').write(page); print('wrote', out, len(page))
