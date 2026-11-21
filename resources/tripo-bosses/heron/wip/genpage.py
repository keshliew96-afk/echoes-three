# Builds the Drowned Heron's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text and the effects.
import sys, re, json
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
s = open(S + '/heron/wip/base-wolf-v3.html').read()  # the wolf's page as it was when this one was first made
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Drowned Heron Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Drowned Heron from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 3</span></h1>
    <p class="lede">Your export of the first Level II boss, with a bird's skeleton and 12 moves added by hand. The model came with its wings folded and fused to the body, so I cut each wing free and gave it twelve flight feathers that fan out when it opens. The bill gapes, the neck is four bones so the S can coil and strike, and the crest, breast plumes, tail and weed all swing. Its timings are the game's. Pick a move, drag to turn it, and judge the weight and the hit. Nothing in the game has changed.</p>
    <p class="lede"><strong>New in version 3.</strong> Submerge and Surface are rebuilt to your direction: it flies up and dives down flying, and on surfacing it bursts up into the air and lands softly. It comes out of the water slowly enough to watch and flies higher than the first build of this version did. Version 2 added Bill Flurry (three rapid jabs at one target) and the frame-by-frame audit; its table is under the moves.</p>
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
        <p class="rule">Idle or Walk sets what it does between attacks, and Going turns it on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds it down: press it again and it spawns back in. The bar names the part of the move that is playing, in the game's own words. The dark pool is the millrace: it shows only while the bird is under.</p>
        <div class="row" id="speeds"><span class="lab">Speed</span></div>
        <div class="row" id="views"><span class="lab">View</span></div>
        <div class="row"><span class="lab">Show</span>
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
      <img src="heron-views.png" alt="The Tripo Drowned Heron from the front, its left, the back and its right, before rigging" width="810" height="864">
      <p class="note" style="padding-top:12px">It came through whole: both stilt legs with their toes, the S neck, the long bill, the three crest plumes, the breast plumes and the tail. The head measures straight (0.3 degrees). The wings are folded and are one skin with the body, and the violet weed hangs from the wing tips.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>TRIS <small>boss budget 30,000 · 27,104 as sent, the rest are the feathers and the skin I added under the wings</small></dd></div>
    <div><dt>Bones</dt><dd>51 <small>hips, chest, 4 in the neck, head, lower bill, 2 in the crest, 2 in the breast plumes, 2 in the tail, a wing and 12 feathers each side, 2 weed strands, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>3.7 MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>3.0 u tall <small>hips 1.5 u up, as the game's heron (1.45 u), beside a 1 u hero</small></dd></div>
    <div><dt>Wings</dt><dd>Built here <small>cut out of the folded model; the 24 flight feathers and the wing undersides are flat slate pieces of mine. See the open choices.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A heron stands very still and moves in snaps. It breathes, the S of the neck eases, the head flicks left and then right with a cock of the head, the crest lifts each time it looks, the wings ruffle once, the bill clacks once, and the weed sways.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>A wader's stalk: two slow high steps. Each foot comes up with its toes hanging and reaches. The head holds still in the air and then darts forward once a step, and the tail and the weed swing against the steps.</td><td>2.0 u/s, as the game. 0.9 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, the head leading.</td><td>120° a second (my number: the game turns it instantly)</td></tr>
      <tr><td>Bill Spear</td><td>One foot goes back and the weight with it. The S draws tight over its back, the head sinks between the shoulders and the bill gapes at the hero. Then the neck fires straight down the lane, the feet leave the floor and it skims the lane on spread wings with its legs trailed, one wingbeat on the way. The legs swing down, both feet land with the wings thrown forward to brake, and it steps up and folds.</td><td>Game: coil for the 48-tick lane (1.0 u wide, to 2.5 u past its target), thrust 2.5 frames, dash at 11 u/s (here 4.95 u in 0.45 s, the hero 2.4 u away at its stand-off), land 2.5 frames, braced 3 frames, settle 0.5 s. The straight neck reaches 2.2 u, so the bill meets the hero as the dash starts.</td></tr>
      <tr><td>Wingbeat</td><td>A small dip, then it goes up on its toes with both wings raised open over its back and the head drawn back. The wings slam down and forward, the body drops with them, and the wings fold.</td><td>Game: wings up for the 42-tick ring (radius 2.2 u around the bird), beat 2.5 frames, held 3 frames, settle 0.55 s. The hero stands 1.7 u away here so the hit shows: the ring punishes crowding.</td></tr>
      <tr><td>Bill Flurry <em>(new, your ask)</em></td><td>It looks at the one it has picked, and a small mark closes under that hero. The neck coils into its S with the bill aimed down at them. Then three jabs: the first from its left, the second from its right, each snatched back half way, and the third from above after a bigger wind and a step in, driven deeper. It draws up tall and flicks the bill clean.</td><td>Not in the game, so the numbers are mine: aim 36 ticks, then a jab every 10 frames (strike 2.5 frames, held 3, back 4.5), the third 2 frames later and held 3. All three land inside 0.37 s. One target only: no ring, no lane. The hero stands 2.05 u away; the bill reaches 1.85 u, and 1.95 u on the third.</td></tr>
      <tr><td>Submerge and Surface</td><td><em>Rebuilt to your direction.</em> It crouches with the wings thrown up, and one downbeat takes it off the floor. It rises 1.5 u, hangs with the wings high and tips its bill at the water. Then it stoops: wings swept back, bill, neck, body and trailed legs one line, steeply down and fast. The bill goes in first and the toes last. The violet ripple is all that shows while the ring fills. Then the bill breaks the water and it comes up head first: bill, head, neck, and the wings flung wide as the shoulders clear. One downbeat carries it on up until its feet are 1.9 u clear of the floor. It hangs, and comes down slowly on braking wingbeats with its legs reaching: one foot, then the other, the knees taking the weight. It shakes off and folds.</td><td>Submerge: crouch 0.1 s, off the floor at 0.16 s, top of the rise at 0.4 s, stoop from 0.44 s at about 16 u/s, bill in the water at 0.53 s (DIVEAT u ahead of its feet), toes under at 0.72 s. These are mine: the game's Submerge has no warning and is over in 4 frames. Under for 0.4 s here (the game: up to 360 ticks). Surface: the game's 48-tick ring (radius 1.8 u). Nothing shows until its last 0.22 s, when the bill breaks the water and the bird rises at about 12 u/s; the wings fling wide on the ring's last tick, which is the hit, and hold 3 frames. The game's own burst is 2.5 frames, which read as a blink. Then mine: highest 0.34 s after the hit, feet down 1.2 s after it, settled at 1.7 s.</td></tr>
      <tr><td>Hurt</td><td>The neck recoils, the crest stands, the bill snaps open and the tail flicks. Plays on top of any move, so planted feet stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Thrown back 0.3 u. The neck whips, the wings fly open to catch its balance, it takes two long steps back, shakes, and squares up.</td><td>1.1 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor in a crouch, comes up tall, shakes the water off with its wings half open, and clacks its bill twice.</td><td>Game: grow in 7 frames, then stand. The rise, the shake and the clacks are mine.</td></tr>
      <tr><td>Death</td><td>The neck flings up and the bill opens on a cry that does not come. One leg gives, then the other, and the body comes down on its breast with the wings falling open across the floor. The neck sways, folds, and the bill lies down last.</td><td>2.6 s, then it stays down</td></tr>
    </tbody></table></div>

  <h2>The detail audit, version 2</h2>
  <p class="note">You asked for an audit. I wrote a checker that takes every point of the model (18,775 of them) through every frame of every move (1,386 frames) and looks for four things. Sizes are in u; the bird is 3.0 u tall.</p>
  <div class="audit"><table>
    <thead><tr><th>Checked</th><th>Found in version 1</th><th>Now</th></tr></thead>
    <tbody>
      <tr><td>A joint that jumps in one frame (a pop)</td><td>Five. Both shins flipped over (150°) in one frame as the Bill Spear landed. The crest feathers flipped from one side to the other (80° to 89°) in one frame in the Spear and the Wingbeat. A dive foot spun 180°.</td><td>None. The landing legs now swing down from the hip like clock hands. Feathers are on rods, so a fast head drags them and cannot flip them; the fastest feather move is 34° a frame, across three or four frames. Version 3's new dive was audited the same way: its first build flipped both knees as it burst out of the water, and that is fixed.</td></tr>
      <tr><td>Any part under the floor</td><td>Lying dead: breast plumes 0.06 u, head and bill 0.04 u, breast 0.02 u.</td><td>Nothing, in any move. (The dive goes under on purpose.)</td></tr>
      <tr><td>One part pushed through another</td><td>30 overlaps deeper than 0.06 u. The worst: the folded leg up inside the belly on the Heavy hit and the Spear's landing (0.12 u), the legs through the tail in the walk, the wings through the trailing legs in the old dive, the crest into the flung-back neck at death, the coiled neck into the breast.</td><td>8 deeper than 0.09 u, each a few frames long: weed strands across the shin in the walk (0.11 u), the breast plumes against the thighs in the Spear's dash and landing (0.11 u), the hock tucked into the belly feathers on the Spear's last step (0.11 u). In the new flight the trailed legs brush the tail feathers (0.09 u). The rest are under the water. These are soft feathers and weed brushing a leg; I left them and name them here.</td></tr>
      <tr><td>Smoothness (a move that stops dead, a loop that jumps)</td><td>0 loop jumps. The idle stops six times on purpose (a heron moves in snaps).</td><td>The same, with the pops above gone.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move, the Bill Spear's take-off and landing included</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>None while it stands, walks, attacks or lies dead. In Submerge it goes fully under on purpose: its highest point is UNDER_U u below the floor.</td></tr>
      <tr><td>Head facing straight</td><td>0.3 degrees off, measured on the model. Nothing to correct.</td></tr>
      <tr><td>Crest, breast plumes, tail and weed</td><td>Run as springs: they trail the body and settle after it stops. The weed always hangs toward the floor, whatever the wing does. The tail swings up behind whenever the hips come down, so it never passes through the floor.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The wings.</strong> Built from the folded model, so an open wing is the folded wing's outer skin with my flat feathers fanned behind it. It reads as a wing from play distance. If you want painted, layered feathers up close, send one open wing as its own Tripo piece (about 3,000 triangles) and I will fit it to both shoulders.</li>
        <li><strong>Bill Flurry.</strong> The name, the 36-tick aim, the 10-frame rhythm and the small Ember mark under the target are mine. The third jab is the heavy one. Say if all three should hit alike, if it should be faster, or if it should step forward with each jab.</li>
        <li><strong>The fly-up takes time.</strong> The bill is in the water 0.53 s after the move starts. In the game Submerge is instant, so the game would have to wait for it. Say if it should be quicker.</li>
        <li><strong>How high.</strong> 1.5 u up before the dive, and its feet 1.9 u clear of the floor after the burst. The camera lifts a little to keep it in the picture. Say if either should be higher or lower.</li>
        <li><strong>How fast it comes out.</strong> 0.22 s from the bill breaking the water to the wings clear. Say if it should be slower still.</li>
        <li><strong>Where the dive goes in.</strong> It dives DIVEAT u ahead of its feet, bursts up from the same pool and lands where it stood. The game brings it up beside a hero; say if the dive should aim at the hero too.</li>
        <li><strong>Submerge and Surface as one button.</strong> The game plays them apart, with the add wave between. Say if you want two buttons.</li>
        <li><strong>The dash.</strong> The game's rig skims 0.42 u above its standing height, which carries the bill over a hero's head. I fly it low so the bill goes through the hero at chest height, and the hit lands when the bill gets there. The game counts the hit when the body arrives, about 0.1 s later.</li>
        <li><strong>Size.</strong> 3.0 u tall puts its hips where the game's heron has them. The game's notes call it 2.2 times a hero's height. Say if it should be smaller.</li>
        <li><strong>Turn speed.</strong> 120° a second is my number, the same as the wolf.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The flight feathers are single flat blades in two slate tones. They have no barbs or paint, and where they meet the wing there is a visible step.</li>
        <li>The skin I closed under each wing and on the body behind it is one flat colour.</li>
        <li>The lower bill is cut out of a closed bill, so the inside of the mouth is a plain dark surface.</li>
        <li>The breast plumes move at their free tips only. The white breast itself is part of the body.</li>
        <li>The three crest plumes move together, not one by one.</li>
        <li>The overlaps the audit still finds are listed in its table: soft feathers and weed against a leg, 0.11 u at most.</li>
        <li>Going under, the body is cut off at the floor line. The pool hides the cut from most angles, not from all.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a foot can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for its power, pale water and silt for the millrace. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="heron-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=3.0;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',spear:'Bill Spear',peck:'Bill Flurry',wingbeat:'Wingbeat',submerge:'Submerge and Surface',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['spear','peck','wingbeat','submerge','heavyHit'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.4, CLOSE=1.7; let HOME=NEAR; // where the hero stands, in u, in front of it: the game's stand-off, and inside the rings for Wingbeat and Surface\n  const WALK=2.0, TURN=2*Math.PI/3.0, WATER=0xA9C0C4, SILT=0x4E5848;")
rep("let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}", "let renderer; try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}); renderer.localClippingEnabled=true;}")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.5,0.85,1); blob.position.set(0,0.004,-0.1);")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[5.9,3.2,8.3],t:[0,1.9,0.9]},'Game zoom':{p:[0,11.6,10.2],t:[0,0.9,1.2]},Side:{p:[14,2.2,1.0],t:[0,1.8,1.0]},Front:{p:[0.8,2.3,14],t:[0,1.8,0]},Back:{p:[-4.6,3.8,-10.4],t:[0,1.6,0.6]},Top:{p:[0,17,0.4],t:[0,0.4,1.0]}};")
rep("  let rage=false, rageW=0, rageAct=null;\n", "")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("mesh.material.onBeforeCompile=sh=>{", "mesh.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),0)]; // the floor is water to this bird: what is under it is not drawn\n    mesh.material.onBeforeCompile=sh=>{")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./; const restC=gltf.animations.find(c=>c.name==='hurt');", "const UPPER=/^(neck1|neck2|neck3|neck4|head|jaw|crest1|crest2|plume1|plume2|tail1|tail2)\\./;")
i = s.index("      if(c.name==='rageHold'){"); j = s.index("      if(c.name==='hurt'){", i); s = s[:i] + s[j:]
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],", "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,laneT.visible],pool:+poolK.toFixed(2),")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,-0.01,0.06]),6,0xfff4e0,1.6,0.25); }")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("// ---- floor motion: the floor moves under him, he stays in the middle of the stage", "// ---- floor motion: the floor moves under it, it stays in the middle of the stage")
rep("function moveFloor(dz,dyaw){ // he moves forward dz and turns left dyaw: the floor does the opposite", "function moveFloor(dz,dyaw){ // it moves forward dz and turns left dyaw: the floor does the opposite")
rep("const PIV=new THREE.Vector3(0,0,-0.04*U);", "const PIV=new THREE.Vector3(0,0,-0.03*U);")
FX = r'''  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is its power, pale water and silt are the millrace)
  const FXP=[], RINGS=[]; let dotTex=null, ringT=null, ringF=null, laneT=null, rune=null, pool=null, ripple=null;
  let weeds=0.3, weedsTo=0.3, throat=0.15, throatTo=0.15, eyes=1, eyesTo=1, poolK=0, poolTo=0, under=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<140;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the floor warnings: one Ember ring with a fill that grows to it (Wingbeat, Surface) and one Ember lane (Bill Spear)
    ringT=new THREE.Mesh(new THREE.RingGeometry(0.965,1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); ringF=new THREE.Mesh(new THREE.CircleGeometry(1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    ringT.rotation.x=ringF.rotation.x=-Math.PI/2; ringT.position.y=0.014; ringF.position.y=0.013; ringT.visible=ringF.visible=false; fxG.add(ringT,ringF);
    laneT=new THREE.Group(); const lfM=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.16,depthWrite:false}), leM=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false});
    const lf=new THREE.Mesh(new THREE.PlaneGeometry(1,1),lfM); lf.rotation.x=-Math.PI/2; const edge=(w,l,x,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),leM); m.rotation.x=-Math.PI/2; m.position.set(x,0.001,z); laneT.add(m); return m;};
    laneT.add(lf); laneT.userData={lf,lfM,leM,eL:edge(0.035,1,-0.4825,0),eR:edge(0.035,1,0.4825,0),eF:edge(1,0.035,0,0)}; laneT.position.y=0.013; laneT.visible=false; fxG.add(laneT);
    // the millrace: a dark pool where it went under, and the violet ripple that is all the game shows while it is down
    pool=new THREE.Mesh(new THREE.CircleGeometry(1,56),new THREE.MeshBasicMaterial({color:0x33424a,transparent:true,opacity:0,depthWrite:false})); pool.rotation.x=-Math.PI/2; pool.position.y=0.008; pool.visible=false; fxG.add(pool);
    ripple=new THREE.Mesh(new THREE.RingGeometry(0.85,1,48),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); ripple.rotation.x=-Math.PI/2; ripple.position.y=0.018; ripple.visible=false; fxG.add(ripple);
    // the spawn's rune ring
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.5); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.55,a:0.22,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ if(col===0xfff4e0)col=0xe9dcc0; if(col===0xd9c8ff)col=0xa98cf5; for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  // water thrown up: drops that rise and fall back
  function drops(pos,n,out,up,spread){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2, r=Math.random()*(spread||0.3); puff(tmp2.copy(pos).add(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r)),new THREE.Vector3(Math.cos(a)*out*(0.4+Math.random()),up*(0.6+Math.random()*0.5),Math.sin(a)*out*(0.4+Math.random())),{life:0.5+Math.random()*0.45,s0:0.11,s1:0.05,a:0.55,col:WATER,g:-7,drag:0.3});} }
  function silt(pos,n,spread){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.08).add(new THREE.Vector3(Math.cos(a)*spread*Math.random(),0,Math.sin(a)*spread*Math.random())),new THREE.Vector3(Math.cos(a)*0.5,0.12,Math.sin(a)*0.5),{life:1.1+Math.random()*0.5,s0:0.4,s1:0.95,a:0.2,col:SILT,drag:2.4,floor:true});} }
  function motes(pos,n,spread,rise){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.2,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.2,rise*(0.5+Math.random()),(Math.random()-0.5)*0.2),{life:0.9+Math.random()*0.7,s0:0.07,s1:0.02,a:0.38,col:VIOLET}); } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET); r.m.material.blending=THREE.NormalBlending;
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.02); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function ripples(pos,n,r1,d0){ for(let i=0;i<n;i++)ringAt(pos,{r0:0.3,r1:r1*(1+i*0.25),dur:1.0,a:0.4,col:WATER,delay:(d0||0)+i*0.2}); }
  function hideTele(){ if(ringT){ringT.visible=ringF.visible=laneT.visible=false;} tele=null; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); if(rune)rune.visible=false; if(ripple)ripple.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const billTip=()=>pt(bones.head,[0,-0.052,0.25]);
  const feet=()=>['footL','footR'].map(b=>pt(bones[b],[0,-0.03,0.04]));
  const here=()=>toFloor(new THREE.Vector3(0,0,0));
  const poolW=()=>new THREE.Vector3(pool.position.x,0.03,pool.position.z).applyMatrix4(fxG.matrix); // where it went in, and where it comes out
  let runeT=-1, tele=null;
  function fxStart(name){
    hideTele(); HOME=(name==='wingbeat'||name==='submerge')?CLOSE:name==='death'?3.3:name==='peck'?2.05:NEAR; const m=META[name]; // the hero steps back from the death: the neck falls a long way forward
    if(name==='spear'){ if(dummy){ const u=dummy.userData; u.sx=0; u.kick=0; u.hold=0; } tele={kind:'lane',len:NEAR+2.5,t0:0,dur:m.cues.go[0],at:here(),yaw:-floorYaw}; }
    if(name==='wingbeat')tele={kind:'ring',r:2.2,t0:0,dur:m.contact[0],at:here()};
    if(name==='peck')tele={kind:'ring',r:0.42,t0:0,dur:m.cues.mark[1],at:toFloor(showTarget&&dummy?new THREE.Vector3(0,0,2.05):new THREE.Vector3(0,0,2.05)),follow:true}; // one target: a small mark under the hero it has picked
    if(name==='spawn'){ weeds=0; eyes=0; poolTo=0; cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(here()).setY(0.013);} }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.chest,[0,0.05,0.1]),12,0xfff4e0,2.4,0.3); }
  }
  function fxContact(name,i){
    const kind=(META[name].kinds||[])[i];
    if(kind==='spear'){ hitFeel(1,0.1,1);
      if(dummy&&showTarget&&Math.abs(dummy.position.x)<0.8){ const d=targetW(); if(fxOn){ sparks(d.clone().setY(0.55),10,0xfff4e0,3.0,0.3); drops(d.clone().setY(0.4),7,1.8,2.0,0.2); ringAt(d.clone().setY(0.55),{r0:0.15,r1:0.9,dur:0.24,a:0.45,bill:true}); } hitDummy(0.12); dummy.userData.sx=10; dummy.userData.hold=1.5; } }
    if(kind==='peck'||kind==='peck3'){ const big=kind==='peck3', p=billTip(); hideTele(); hitFeel(big?0.8:0.4,big?0.08:0.035,big?0.8:0.35); throat=0.8;
      if(fxOn){ sparks(p,big?10:5,0xfff4e0,big?3.0:2.0,big?0.3:0.2); ringAt(p,{r0:0.08,r1:big?0.8:0.45,dur:big?0.26:0.16,a:big?0.45:0.35,bill:true}); if(big)drops(p,6,1.6,1.8,0.15); }
      if(dummy&&showTarget&&targetW().distanceTo(p.clone().setY(0))<0.6){ hitDummy(big?0.4:0.1); dummy.userData.hold=big?1.0:0.5; } }
    if(kind==='wingbeat'){ const c=tele?tele.at.clone().applyMatrix4(fxG.matrix):new THREE.Vector3(); hideTele(); hitFeel(0.85,0.08,0.8);
      if(fxOn){ ringAt(c,{r0:0.5,r1:2.4,dur:0.4,a:0.5}); for(let k=0;k<12;k++){ const a=(k/12)*Math.PI*2+Math.random()*0.3; puff(new THREE.Vector3(Math.cos(a)*0.7,0.3,Math.sin(a)*0.7),new THREE.Vector3(Math.cos(a)*5.5,0.2,Math.sin(a)*5.5),{life:0.32+Math.random()*0.1,s0:0.2,s1:0.5,a:0.24,col:WATER,drag:4,floor:true}); } drops(c,10,2.6,1.3,0.9); silt(c,4,1.2); }
      if(dummy&&showTarget&&targetW().distanceTo(c)<2.2){ if(fxOn)sparks(targetW().setY(0.5),10,0xfff4e0,2.8,0.3); hitDummy(0.5); dummy.userData.hold=0.9; } }
    if(kind==='dive'){ const p=billTip().setY(0), q=toFloor(new THREE.Vector3(0,0,0.6)); hitFeel(0.35,0,0.25); poolTo=1; pool.position.x=ripple.position.x=q.x; pool.position.z=ripple.position.z=q.z;
      if(fxOn){ ringAt(p,{r0:0.1,r1:1.0,dur:0.4,a:0.5,col:WATER}); drops(p,8,0.5,3.2,0.06); } } // the bill goes in clean: a small ring and a thin column of drops
    if(kind==='surface'){ const c=tele?tele.at.clone().applyMatrix4(fxG.matrix):new THREE.Vector3(); hideTele(); hitFeel(0.95,0.09,0.9); poolTo=0;
      if(fxOn){ const w=poolW(); ringAt(c,{r0:0.4,r1:1.9,dur:0.36,a:0.55}); ripples(w,3,2.0,0.1); drops(w.clone().setY(0.6),18,1.5,4.4,0.5); drops(w,8,2.6,1.6,0.8); silt(w,5,0.9); motes(w.clone().setY(1.6),6,1.2,1.2); }
      if(dummy&&showTarget&&targetW().distanceTo(c)<1.8){ if(fxOn)sparks(targetW().setY(0.5),10,0xfff4e0,2.8,0.3); hitDummy(0.5); dummy.userData.hold=0.9; } }
    if(kind==='clack'){ hitFeel(0.18,0,0.12); throat=0.9; if(fxOn){ sparks(billTip(),4,0xd9c8ff,1.4,0.2); ringAt(billTip(),{r0:0.08,r1:0.55,dur:0.22,a:0.35,bill:true}); } }
    if(kind==='thud'){ if(i===0){ hitFeel(0.45,0,0.4); if(fxOn){ dust(pt(bones.chest,[0,-0.1,0.05]).setY(0),10,1.5,0.6); ripples(pt(bones.chest,[0,0,0]).setY(0),2,1.4,0); } } else { hitFeel(0.25,0,0.15); if(fxOn)dust(billTip().setY(0),4,0.8,0.35); cv.style.filter='saturate(0.45)'; } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, m=META[n], cu=m.cues||{}; const cross=(c)=>shot.prev<c&&t>=c;
    if(n==='submerge'&&cross(cu.ring[0]))tele={kind:'ring',r:1.8,t0:cu.ring[0],dur:cu.ring[1]-cu.ring[0],at:here()};
    if(tele&&fxOn){ const k=Math.max(0,Math.min(1,(t-tele.t0)/tele.dur)), pulse=0.03*Math.sin(t*24)*k;
      if(tele.kind==='ring'){ ringT.visible=ringF.visible=true; ringT.position.x=ringF.position.x=tele.at.x; ringT.position.z=ringF.position.z=tele.at.z; ringT.scale.setScalar(tele.r); ringF.scale.setScalar(Math.max(0.001,tele.r*k)); ringT.material.opacity=0.45+0.25*k+pulse*3; ringF.material.opacity=0.1+0.08*k; }
      else { const u=laneT.userData, L=tele.len; laneT.visible=true; laneT.position.x=tele.at.x; laneT.position.z=tele.at.z; laneT.rotation.y=tele.yaw; u.lf.scale.set(1,Math.max(0.001,L*k),1); u.lf.position.z=L*k/2; u.eL.scale.y=u.eR.scale.y=L; u.eL.position.z=u.eR.position.z=L/2; u.eF.position.z=L; u.lfM.opacity=0.1+0.1*k+pulse; u.leM.opacity=0.4+0.3*k; } }
    if(n==='spear'){ const go=cu.go[0], land=cu.land[0]; eyesTo=t<go?1+1.2*Math.min(1,t/0.6):1; weedsTo=t<land?0.75:0.3; throatTo=t>0.2&&t<go?0.8:0.15;
      if(cross(go)){ hideTele(); if(fxOn){ feet().forEach(p=>dust(p,5,1.6,0.6,WATER)); drops(new THREE.Vector3(0,0.1,-0.2),8,1.6,2.0,0.3); } }
      if(t>go&&t<land&&fxOn){ if(Math.random()<d*46)puff(new THREE.Vector3((Math.random()-0.5)*0.5,0.06,-0.2),new THREE.Vector3((Math.random()-0.5)*0.5,0.25,0),{life:0.5+Math.random()*0.3,s0:0.22,s1:0.6,a:0.2,col:WATER,drag:2,floor:true}); if(Math.random()<d*20)motes(pt(bones.weedL,[0,-0.08,0]),1,0.2,0.1); if(Math.random()<d*20)motes(pt(bones.weedR,[0,-0.08,0]),1,0.2,0.1); }
      if(cross(land)){ hitFeel(0.4,0,0.55); if(fxOn){ feet().forEach(p=>{dust(p,6,1.9,0.7,WATER); ringAt(p,{r0:0.1,r1:0.7,dur:0.4,a:0.35,col:WATER});}); drops(new THREE.Vector3(0,0.1,0.3),8,2.0,1.6,0.3); } } }
    if(n==='wingbeat'){ const hit=m.contact[0]; weedsTo=t<hit+0.1?0.3+0.6*Math.min(1,t/hit):0.3; eyesTo=t<hit?1.7:1; throatTo=t>0.3&&t<hit+0.15?0.6:0.15; }
    if(n==='submerge'){ const [dv,sf]=m.contact, s0=cu.ring[0], off=cu.off[0], land=cu.land[0]; under=(t>cu.feet[0]+0.03&&t<sf-0.06)?1:0; weedsTo=t>s0||t<dv?0.8:0.3; eyesTo=(t>s0&&t<sf+0.3)||t<dv?1.8:1; throatTo=t>sf-0.05&&t<sf+0.4?0.9:0.15;
      if(cross(off)){ hitFeel(0.15,0,0.2); if(fxOn){ feet().forEach(p=>{dust(p,4,1.5,0.5,WATER); ringAt(p.setY(0),{r0:0.1,r1:0.8,dur:0.45,a:0.35,col:WATER});}); for(let k=0;k<10;k++){ const a=(k/10)*Math.PI*2; puff(new THREE.Vector3(Math.cos(a)*0.5,0.2,Math.sin(a)*0.5),new THREE.Vector3(Math.cos(a)*3.6,0.1,Math.sin(a)*3.6),{life:0.3,s0:0.2,s1:0.5,a:0.2,col:WATER,drag:4,floor:true}); } } } // the downbeat that lifts it blows the wet floor outward
      if(t>s0&&t<sf-0.05&&fxOn&&Math.random()<d*(8+30*(t-s0))){ const p=poolW(); puff(p.add(new THREE.Vector3((Math.random()-0.5)*0.7,0.05,(Math.random()-0.5)*0.7)),new THREE.Vector3(0,0.5+Math.random()*0.5,0),{life:0.35,s0:0.08,s1:0.16,a:0.45,col:WATER}); }
      if(t>sf&&t<land&&fxOn&&Math.random()<d*34)drops(pt(bones.chest,[(Math.random()-0.5)*0.2,-0.1,-0.1]),1,0.3,0.1,0.2); // water runs off it in the air
      if(cross(land)){ hitFeel(0.1,0,0.15); if(fxOn)feet().forEach(p=>{ringAt(p.setY(0),{r0:0.08,r1:0.6,dur:0.5,a:0.3,col:WATER}); dust(p,2,0.5,0.2,WATER);}); } } // a soft landing: a ripple under each foot, no more
    if(n==='submerge'&&fxOn){ const dv=m.contact[0], ft=cu.feet[0]; const at=poolW();
      if(cross(dv+0.05)){ ringAt(at,{r0:0.3,r1:1.6,dur:0.5,a:0.5,col:WATER}); ripples(at,3,1.5,0.1); drops(at,14,1.5,3.0,0.25); silt(at,5,0.5); } // the body follows the bill in: the big splash
      if(t>dv+0.05&&t<ft&&Math.random()<d*40)drops(at,1,1.2,1.6,0.25);
      if(cross(ft)){ ringAt(at,{r0:0.08,r1:0.7,dur:0.4,a:0.4,col:WATER}); drops(at,5,0.6,1.8,0.08); } } // the toes go under last
    if(n==='peck'){ const h1=m.contact[0], h3=m.contact[2]; eyesTo=t<h3+0.1?1+1.1*Math.min(1,t/0.4):1; throatTo=t>0.15&&t<h3+0.3?0.7:0.15; weedsTo=t<h3?0.6:0.3;
      if(tele&&tele.follow&&dummy&&showTarget){ const q=toFloor(targetW()); tele.at.x=q.x; tele.at.z=q.z; } }
    if(n==='spawn'){ eyesTo=t>0.4?1:0; weedsTo=t>0.4?0.3:0; if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,1.8,1.4); if(cross(0.5)&&fxOn)drops(pt(bones.chest,[0,0,0]),12,2.2,1.2,0.5); }
    if(n==='heavyHit'&&cross(0.12)&&fxOn)drops(pt(bones.chest,[0,0,0]),6,1.6,1.2,0.3);
    if(n==='death'){ eyesTo=t>1.9?0:1-0.5*t/1.9; weedsTo=t>1.0?0:0.3; throatTo=t>0.1&&t<0.4?0.9:0; if(t>1.1&&Math.random()<d*8)motes(pt(bones.chest,[0,0.05,-0.05]),1,1.0,0.7); }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ weedsTo=sel.dead?0:0.3; throatTo=sel.dead?0:0.15; eyesTo=sel.dead?0:1; hideTele(); under=0; poolTo=0; }
    weeds+=(weedsTo-weeds)*Math.min(1,d*6); throat+=(throatTo-throat)*Math.min(1,d*5); eyes+=(eyesTo-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; const breathe=0.06*Math.sin(clockT*2.1);
    glowU.value.set(on*Math.max(0,weeds+breathe*(weeds>0.05?1:0))*0.55,on*throat*0.3,feel?flash:0,on*0.3*Math.min(2.4,eyes));
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    // the pool stays whatever Effects says: it is what hides the cut at the floor line
    poolK+=(poolTo-poolK)*Math.min(1,d*(poolTo>poolK?14:2.2)); pool.visible=poolK>0.01; pool.material.opacity=0.62*poolK; pool.scale.setScalar(0.8*(0.55+0.45*poolK));
    ripple.visible=fxOn&&under>0&&poolK>0.3; ripple.material.opacity=0.4+0.22*Math.sin(clockT*4); ripple.scale.setScalar(0.8+0.12*Math.sin(clockT*2.2));
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d;
      else { const wide=u.z<1.3?1.7:0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(wide-u.x)*Math.min(1,d*(wide?5:3)); } // it walks back round the bird, not through it
      dummy.position.z=u.z; dummy.position.x=u.x; }
    // its shadow shrinks while it is in the air and goes when it is under; the camera lifts a little when it flies high
    const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-1.6)/0.5)), dn=Math.max(0,Math.min(1,(hy-0.2)/0.8)); blob.scale.set(0.5*(1-0.3*k),0.85*(1-0.3*k),1); blob.material.opacity=0.17*(1-0.45*k)*dn;
    const lift=Math.max(0,hy-2.4)*0.75; camLift+=(lift-camLift)*Math.min(1,d*5); const dl=camLift-camLast; if(Math.abs(dl)>1e-4){ orbit.target.y+=dl; cam.position.y+=dl; camLast=camLift; }
  }
  let camLift=0, camLast=0;
'''
cut("  // ---- effects (dim on purpose", "  // paw dust in the walk and the turns", FX)
rep("  // paw dust in the walk and the turns", "  // a small ripple under each foot in the walk and the turns")
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={L:[0,'footL'],R:[0.5,'footR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "ringAt(pt(bones[STEP[k][1]],[0,-0.03,0.04]).setY(0),{r0:0.1,r1:0.5,dur:0.6,a:0.3,col:WATER});")
rep("    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n", "")
rep("dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;", "dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;")
rep("vec3(0.42,0.26,1.0)*uGlow.x*vMask.x+vec3(0.55,0.22,0.9)*uGlow.y*vMask.y", "vec3(0.42,0.26,1.0)*uGlow.x*vMask.x+vec3(0.5,0.24,0.95)*uGlow.y*vMask.y")
sc = s[s.index('<script>\n(function'):]
for bad in ('rage', 'rageW', 'rageAct', 'RAGEWALK', 'LEAP', 'FAR', 'coneT', 'CLAWS', 'summon', 'sumT', 'buds', 'budsTo', 'paws', 'muzzle', 'fHoofL', 'fHoofR', 'hHoofL', 'maneF', 'maneR', 'pounce', 'rend', 'howl', 'enrage', 'fast', 'restC', 'slow'):
    m = re.search(r'\b' + bad + r'\b', sc)
    if m: print('LEFTOVER', bad, sc[max(0, m.start() - 60):m.start() + 60].replace('\n', ' '))
for bad in (' he ', ' him ', ' his ', 'He ', 'His '):
    for m in re.finditer(bad, s): print('PRONOUN', s[max(0, m.start() - 50):m.start() + 50].replace('\n', ' '))
rows = json.load(open(S + '/heron/wip/out/heron.audit.json'))
rim = max(-v['lowest'] for k, v in rows.items() if k not in ('death', 'submerge')); dd = -rows['death']['lowest']; top = -rows['submerge']['topMin']
assert rim <= 0.0005, rim
assert all(v['slide_mm'] == 0 and v['loopPopDeg'] == 0 for v in rows.values())
import struct
glb = open(S + '/heron/wip/out/heron.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
tris = sum(gj['accessors'][p['indices']]['count'] for me in gj['meshes'] for p in me['primitives']) // 3
meta = json.load(open(S + '/heron/wip/out/heron.meta.json')); s = s.replace('DIVEAT', '%.1f' % meta['submerge']['cues']['at'][0])
s = s.replace('TRIS', f'{tris:,}').replace('DEATH_MM', str(round(dd * 3.0 * 1000))).replace('UNDER_U', f'{top * 3.0:.1f}')
open(S + '/heronreview/index.html', 'w').write(s); print('ok', len(s), 'tris', tris, 'rim', rim, 'death', dd, 'top', top)
