# Builds the Mire King's review page from the Gloam Wolf's (same bench, CSS, loop, Enraged switch and call move),
# swapping the text and the effects. Run: python3 -I genpage.py <out index.html> <TRIS>
import sys, re, json
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
s = open(S + '/toad/wip/base-wolf-v3.html').read()  # the wolf's page as it was when the heron's was first made
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Mire King Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Mire King from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 3</span></h1>
    <p class="lede">Your export of the second Level II boss, with a toad's skeleton and 13 moves added by hand. The model came with its mouth sealed and its crown fused to its head, so I cut the mouth open along the lip, built the inside and a tongue that reaches the length of the lane, and cut the crown free so it sits loose and jumps when he lands. The throat sac and the belly swell, the eyes sink when he blinks or swallows, and his legs fold the way the sculpt folds them. His timings are the game's. Pick a move, drag to turn him, and judge the weight and the hit. Nothing in the game has changed.</p>
    <p class="note"><strong>Changed 13 Nov, your ask:</strong> the Swallow is gone. In its place is the Venom Shake: he charges while the warts on his back light up violet, shakes himself, and each wart throws a gob of venom that lands somewhere round him and leaves a small pool.</p>
    <p class="note"><strong>Changed 14 Nov, your ask:</strong> the Belly Flop no longer winds up like a dive. He sinks onto his haunches with his hands on the floor, his hind legs push twice (the hips bob up onto the toes and stamp back down), and on the third push he jumps, now 2.2 u high instead of 1.4 u.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds him down: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is the game's state under 40% health: the sac beats faster, the eyes and crown gems burn, and the Belly Flop leaves a wider mire.</p>
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
      <img src="mireking-views.png" alt="The Tripo Mire King from the front, his left, the back and his right, before rigging" width="810" height="864">
      <p class="note" style="padding-top:12px">It came through whole and in one piece: the warty back, the cream belly, the lilac throat sac, all four legs with their fingers and toes, the weed on his rump and the rust crown with its violet gems. The head measures straight (under 1 degree). The mouth is a sealed line and the crown is one skin with the head.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>TRIS <small>boss budget 30,000 · 26,934 as sent, the rest are the inside of the mouth, the tongue, and the crown's underside and seat</small></dd></div>
    <div><dt>Bones</dt><dd>36 <small>hips, chest, head, jaw, throat sac, belly, crown, 2 eyes, 8 in the tongue, 2 in the weed, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only; the mouth and tongue colours are painted into unused corners of it</small></dd></div>
    <div><dt>File</dt><dd>3.2 MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>3.0 u to the crown tips <small>2.35 u wide and 2.5 u long, beside a 1 u hero. The game's toad is flatter: about 2.7 u wide and long, 2.4 u tall.</small></dd></div>
    <div><dt>Mouth, tongue, crown</dt><dd>Built here <small>the mouth is cut along the sculpted lip; the inside, the tongue and the crown's underside are plain pieces of mine. See what is rough.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A toad sits like a stone and lives in its throat. The sac flutters in quick runs with pauses between, and the flanks breathe slowly underneath. He blinks by pulling his eyes down into his head. Once a loop he looks to his left and shifts his weight, swallows, and drums the fingers of his left hand twice.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>A fat toad's crawl, not a hop: opposite hand and foot together, the belly swinging over whichever side carries it. The hand rolls up off its heel as it leaves, and the long hind foot peels off the floor heel first and is carried forward folded.</td><td>1.0 u/s, as the game. 0.9 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot, hands leading.</td><td>120° a second (my number: the game turns him instantly)</td></tr>
      <tr><td>Tongue Lash</td><td>He narrows his eyes and takes aim, then sits back on his haunches as the throat fills and the mouth cracks open. He throws his whole weight forward and the tongue goes the length of the lane to the hero. The pad sticks. The tongue drags the hero in as his body rocks back, then lets go and whips home, and the mouth shuts on a gulp with the eyes sinking.</td><td>Game: draw for the 48-tick lane (1.0 u wide), lash 2.5 frames, held 3 frames, a 12-tick yank of 2 u, settle. The lane here is 5 u, the game's lab length (in a fight it runs up to 7.5 u). The hero stands 4.7 u out and the tongue stops on them.</td></tr>
      <tr><td>Belly Flop</td><td>He sinks onto his haunches, hands flat on the floor, swelling. His hind legs push twice: each time his hips bob up onto his toes and his heels stamp back down. He loads low, then hands and feet push off together and he goes up and over in a high arc with every limb spread. He lands belly down with all four feet wide, the crown jumps off his head and drops back, his eyes shut, the belly shudders, and he gathers his limbs under him one at a time.</td><td>Game: a 66-tick ring (radius 2.0 u), the leap in the last 20 ticks; the two pushes fill the 46 ticks before it (stamps at 0.36 s and 0.62 s, mine); 2.2 u high at the top (your ask: higher; the game's leap time stays 20 ticks, so he goes up faster), land 2.5 frames, held 3 frames, settle. He leaves the mire: radius 2.0 u, 2.6 u enraged, 5 s. Here he travels 3.6 u; the game's range is 3 to 8 u.</td></tr>
      <tr><td>Venom Shake <em>(your move, 13 Nov)</em></td><td>He hunkers down and swells with his eyes drawn in, pumping three times, each quicker, while the eleven biggest warts on his back light up violet. A small twist one way, then he shakes like a wet dog: the body rolls, the head and the crown lag behind it, the belly and sac slosh. Each wart throws one gob of venom in a high arc. Every gob lands on an Ember mark and leaves a small violet pool. He settles with a satisfied puff of the throat.</td><td>Charge 78 ticks (1.3 s, the Swallow's old warning), shake 0.62 s at 6.5 shakes a second, settle to 2.6 s. Mine until the game has the move: 11 gobs, 0.5 s in the air, landing 1.8 to 4.6 u from him, pools 0.6 u across the radius for 5 s. The landing marks show from 0.6 s. On this page the first gob always lands on the hero so the hit shows.</td></tr>
      <tr><td>Call the brood <em>(pose is mine)</em></td><td>A breath in, then the sac blows right up and his body pumps the call out in three beats, eyes shut, the crown buzzing on his head. Three marks show where the toads and the leech answer.</td><td>The game calls adds at three quarters, half and a quarter health with no pose of its own. 1.7 s, the beats 0.26 s apart.</td></tr>
      <tr><td>Enrage <em>(pose is mine)</em></td><td>He swells, rears, and brings both hands down on the floor with a roar, mouth wide. From then on the sac beats faster and the eyes and gems burn.</td><td>The game marks enrage (under 40% health) with the sac, the eyes and the gems only. 1.5 s, the slam at 0.62 s.</td></tr>
      <tr><td>Hurt</td><td>The head jerks, the eyes shut, the sac jumps, the belly wobbles and the crown hops. Plays on top of any move, so planted feet stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Thrown back 0.3 u. He rocks up onto his haunches with his hands knocked off the floor and the crown nearly off, shuffles his feet back under him, drops onto his hands with a thud, and shakes his head.</td><td>1.25 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor squat and wide, bobs up with his throat filling, drops back onto his hands, and croaks once as the crown settles.</td><td>Game: grow in 7 frames, then stand. The bob and the croak are mine.</td></tr>
      <tr><td>Death</td><td>The blow throws his head up on a last croak. He rears, paws at the air and goes over backward. The crown comes off as he tips, lands beside him and rings down on its rim. He lies belly up: the legs kick twice and go slack, the tongue falls out of the side of his mouth, the throat empties and the eyes go down.</td><td>3.2 s, then he stays down</td></tr>
    </tbody></table></div>

  <h2>The detail audit</h2>
  <p class="note">The checker takes every point of the model (18,124 of them) through every frame of every move (1,458 frames) and looks for four things. Sizes are in u; he is 3.0 u to the crown tips.</p>
  <div class="audit"><table>
    <thead><tr><th>Checked</th><th>Found in the first build</th><th>Now</th></tr></thead>
    <tbody>
      <tr><td>A joint that jumps in one frame (a pop)</td><td>Six. Both hands snapped 39° as they came down in the Heavy hit. The fingers snapped 40° as the Belly Flop left the floor. Both hind feet snapped 62° as he went over in the death, and the weed flipped 118° under him twice in the same roll. The tongue turned 29° and 115° in one frame while still hidden in the mouth.</td><td>None. A hand or foot that leaves the floor now blends its position, its heel, its toes and its own frame together. The weed lies along the floor where it is pinned and cannot flip. The largest single-frame turns left are in the Belly Flop, where he now jumps harder: the weed whips 15° as he lands, both hind shins turn 13° in the push off, and the hands 12° as they leave the floor.</td></tr>
      <tr><td>Any part under the floor</td><td>The weed 0.47 u under as he rolled onto his back. The hind feet 0.10 u in the same roll. The belly 0.09 u at the Belly Flop landing. The tongue tip 0.05 u on the first frame of the lash. The fallen crown's rim 0.05 u while it rang down, and his head 0.02 u lying dead.</td><td>The weed tips 0.03 u for a few frames of the death roll. Nothing else, in any move.</td></tr>
      <tr><td>One part pushed through another</td><td colspan="2">Not fixed, and worth knowing. He is sculpted as one skin with his limbs pressed against his body, so the forearm already sits 0.09 u into the thigh while he idles. In the crawl the hind shin presses 0.18 u into the upper arm for half of each step. In the Venom Shake, swollen, the forearms press 0.11 u into the belly and the upper arms 0.08 u into the sac. Lying dead, the folded arms sit 0.17 u into the thighs. These are soft parts squeezed together and they read as a fat toad from play distance, but up close the skins pass through each other.</td></tr>
      <tr><td>Smoothness (a move that stops dead, a loop that jumps)</td><td>0 loop jumps.</td><td>The same.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted hand or foot moving on the floor (locked feet)</td><td>0 mm in every move, the Belly Flop's take-off and landing included</td></tr>
      <tr><td>A planted hand or foot its limb could not reach</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>None, apart from the weed tips in the death roll (0.03 u). On his back he rests on the floor: the body's height is solved from its own outline at every frame of the roll.</td></tr>
      <tr><td>Head facing straight</td><td>Under 1 degree off (0.9 between the eyes, 0.1 between the mouth corners), measured on the model. Nothing to correct.</td></tr>
      <tr><td>Legs at rest</td><td>The limb solver gives the sculpted fold back exactly when the feet are where the sculpt put them, so the idle is the pose you approved in Tripo.</td></tr>
      <tr><td>Venom spots</td><td>The 11 biggest warts on his back, found on the model itself (the skin measured against a smoothed copy of it) and kept at least 0.29 u apart. Each one glows and throws one gob.</td></tr>
      <tr><td>Crown and weed</td><td>Run as springs. The crown rocks and settles after every jolt and leaves the head only where a move throws it (Belly Flop, Hurt, Heavy hit, Spawn, Death). The weed hangs toward the floor and lies along it when he sits on it.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Venom Shake numbers.</strong> You gave the move; the numbers are mine: 11 gobs, each lands at a random spot 1.8 to 4.6 u from him, pools of 0.6 u that last 5 s, a 1.3 s charge. Say if there should be more or fewer, bigger pools, or a longer stay. It is a new mechanic, so it goes into the game only after the freeze.</li>
        <li><strong>Venom warning.</strong> I mark each landing spot in Ember from 0.6 s into the charge, so a player can step off it. Say if the spots should stay hidden until the shake.</li>
        <li><strong>Where the tongue stops.</strong> It stops on the hero and drags them in 2 u. The game hits everyone in the lane to its far end. Say if the tongue should always run the full lane and pull whoever it passes.</li>
        <li><strong>Call the brood.</strong> The game has no pose for the add calls. The three-beat croak is mine: keep it, shorten it, or drop it.</li>
        <li><strong>Enrage.</strong> The swell and the two-handed slam are mine. The game only changes the sac, the eyes and the gems.</li>
        <li><strong>The death.</strong> Belly up with the crown knocked off is my pick for a toad king. The quieter version slumps forward onto his chin with the crown still on.</li>
        <li><strong>The loose crown.</strong> It hops off his head on the Belly Flop landing, on a Heavy hit and when he is hurt. Say if it should stay fixed until the death.</li>
        <li><strong>Where the hero stands for the Belly Flop.</strong> The ring here is where he lands and the hero stands 1.7 u from its middle, so the hit shows without him landing on top of them. The game puts the ring on the hero.</li>
        <li><strong>Size.</strong> 3.0 u to the crown tips, which makes his body about 2.3 u tall, close to the game's toad (2.4 u), and a little narrower (2.35 u against 2.7 u). Say if he should be wider or bigger.</li>
        <li><strong>Turn speed.</strong> 120° a second is my number, the same as the wolf and the heron.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The inside of the mouth is a plain pocket of mine, violet at the lips and dark at the back. It has no teeth, gums or throat detail.</li>
        <li>The mouth is cut along the sculpted lip line. Closed, the cut shows as a thin dark seam that follows the lip's ticks.</li>
        <li>The tongue is a plain tube with a pad on the end, in two tones.</li>
        <li>He has no eyelids. A blink is the eye pulled down into the head, which smears the eye's paint for a frame or two.</li>
        <li>The throat sac and the belly swell as balls, evenly. They do not wrinkle when empty.</li>
        <li>Each hand and each foot is one piece: the fingers and toes curl together, not one by one.</li>
        <li>The body cannot flatten on the Belly Flop landing. The page's squash does that; the model only spreads its limbs and drops.</li>
        <li>The crown's underside is a flat rust lid, and the head under it is a plain teal patch. Both show when the crown is off.</li>
        <li>The overlaps the audit still finds are in its table: limbs pressed into the body, 0.18 u at most.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a hand can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for his power and his venom, a dark slick for the mire. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="mireking-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=3.0;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',lash:'Tongue Lash',flop:'Belly Flop',venom:'Venom Shake',croak:'Call the brood',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['lash','flop','venom','croak','enrage','heavyHit'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.0, LASHZ=4.7, FLOPD=3.6, FLOPZ=5.3; let HOME=NEAR; // where the hero stands, in u, in front of him: a stand-off, the far end of the lane, inside the flop's ring\n  const WALK=1.0, RAGEWALK=1.0, TURN=2*Math.PI/3.0, LANE=5.0, YANK=2.0, MIRE=0x2b4640, SLICK=0x86a89e, VPOOL=0.6, VLIFE=5.0, VFLY=0.5, VNEAR=1.8, VFAR=4.6, VDARK=0x3b2a66, VGOB=0x9a6cf0;\n  const WARTS=WARTS_JSON; // the venom spots: the joint each wart rides and its place from it")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(1.08,1.2,1); blob.position.set(0,0.004,0);")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[7.2,4.0,9.8],t:[0,1.45,1.2]},'Game zoom':{p:[0,12.4,10.8],t:[0,0.7,1.8]},Side:{p:[15,2.0,1.8],t:[0,1.3,1.8]},Front:{p:[0.8,2.0,14],t:[0,1.3,0]},Back:{p:[-4.6,3.8,-10.4],t:[0,1.2,0.8]},Top:{p:[0,18,0.4],t:[0,0.4,1.6]}};")
# the three glows: throat sac, the inside of the mouth and the tongue, crown gems and eyes
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x+vec3(0.55,0.22,0.9)*uGlow.y*vMask.y+vec3(0.55)*uGlow.z+vec3(0.8,0.75,1.0)*uGlow.w*vMask.z;",
    "totalEmissiveRadiance+=vec3(0.5,0.3,0.9)*uGlow.x*max(vMask.x,0.0)+vec3(0.62,0.3,1.0)*uWart*max(-vMask.x,0.0)+vec3(0.45,0.2,0.9)*uGlow.y*vMask.y+vec3(0.55)*uGlow.z+vec3(0.62,0.4,1.0)*uGlow.w*vMask.z;")
rep("varying vec3 vMask;\\nuniform vec4 uGlow;", "varying vec3 vMask;\\nuniform vec4 uGlow;\\nuniform float uWart;")
rep("mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU;", "mesh.material.onBeforeCompile=sh=>{sh.uniforms.uGlow=glowU; sh.uniforms.uWart=wartU;")
rep("glowU={value:new THREE.Vector4(0,0.25,0,0.3)},", "glowU={value:new THREE.Vector4(0,0.25,0,0.3)}, wartU={value:0},")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(head|jaw|sac|belly|crown|eyeL|eyeR)\\./;")
cut("      if(c.name==='rageHold'){", "      if(c.name==='hurt'){", "")
rep("tele:[ringT.visible,coneT.visible]", "tele:[ringT.visible,laneT.visible],mire:MIRES.filter(m=>m.t>=0).length,venom:[VP.filter(q=>q.t>=0).length,VG.filter(q=>q.t>=0).length,VM.filter(q=>q.visible).length,+wart.toFixed(2)],tip:bones.tg7?pt(bones.tg7,[0,0,0.078]).toArray().map(v=>+v.toFixed(2)):null")
rep("const PIV=new THREE.Vector3(0,0,-0.04*U);", "const PIV=new THREE.Vector3(0,0,-0.08*U);")
rep("const FXP=[], RINGS=[], CLAWS=[]; let dotTex=null, ringT=null, ringF=null, coneT=null, rune=null, summon=[];",
    "const FXP=[], RINGS=[], CLAWS=[], MIRES=[], VP=[], VG=[], VM=[], VS=[]; let vspots=[], vland=[], wart=0, wartTo=0; let dotTex=null, ringT=null, ringF=null, laneT=null, rune=null, summon=[];")
rep("    // the floor warnings: one Ember ring with a fill that grows to it (Pounce, Moon Howl) and one Ember cone (Rend)",
    "    // the floor warnings: one Ember ring with a fill that grows to it (Belly Flop) and one Ember lane (Tongue Lash)")
cut("    const A0=(270-55)*Math.PI/180", "    // the spawn's rune ring", r'''    laneT=new THREE.Group(); const lg=new THREE.PlaneGeometry(1,1); lg.translate(0,-0.5,0);
    const lf=new THREE.Mesh(lg,new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false})); lf.rotation.x=-Math.PI/2;
    const em=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false});
    const strip=(w,l,x,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),em); m.rotation.x=-Math.PI/2; m.position.set(x,0.001,z); laneT.add(m);};
    strip(0.035,LANE,-0.5,LANE/2); strip(0.035,LANE,0.5,LANE/2); strip(1.035,0.035,0,LANE);
    laneT.add(lf); laneT.userData={fill:lf,fm:lf.material,em}; laneT.position.y=0.011; laneT.visible=false; fxG.add(laneT);
    // the mire the Belly Flop leaves: a dark slick with a pale rim that stays 5 s
    for(let i=0;i<3;i++){ const g2=new THREE.Group(); const dm2=new THREE.MeshBasicMaterial({color:MIRE,transparent:true,opacity:0,depthWrite:false}), rm=new THREE.MeshBasicMaterial({color:SLICK,transparent:true,opacity:0,depthWrite:false});
      const dd=new THREE.Mesh(new THREE.CircleGeometry(1,56),dm2), rr=new THREE.Mesh(new THREE.RingGeometry(0.955,1,56),rm); dd.rotation.x=rr.rotation.x=-Math.PI/2; rr.position.y=0.001; g2.add(dd,rr); g2.visible=false; fxG.add(g2); MIRES.push({g:g2,dm:dm2,rm,t:-1,r:2}); }
    // the Venom Shake: a pool, a gob in the air, an Ember landing mark and a glow for each wart
    WARTS.forEach((w,i)=>{ const g3=new THREE.Group(); const dm3=new THREE.MeshBasicMaterial({color:VDARK,transparent:true,opacity:0,depthWrite:false}), rm3=new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false});
      const d3=new THREE.Mesh(new THREE.CircleGeometry(1,36),dm3), r3=new THREE.Mesh(new THREE.RingGeometry(0.9,1,36),rm3); d3.rotation.x=r3.rotation.x=-Math.PI/2; r3.position.y=0.001; g3.add(d3,r3); g3.visible=false; fxG.add(g3); VP.push({g:g3,dm:dm3,rm:rm3,t:-1});
      const gm=new THREE.Mesh(new THREE.SphereGeometry(0.11,10,8),new THREE.MeshBasicMaterial({color:VGOB})); gm.visible=false; fxG.add(gm); VG.push({m:gm,t:-1,i,a:new THREE.Vector3(),b:new THREE.Vector3(),h:1.6});
      const mk=new THREE.Group(); const em3=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false}), ef3=new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false});
      const mr=new THREE.Mesh(new THREE.RingGeometry(0.93,1,36),em3), mf=new THREE.Mesh(new THREE.CircleGeometry(1,36),ef3); mr.rotation.x=mf.rotation.x=-Math.PI/2; mk.add(mr,mf); mk.userData={fill:mf,rm:em3}; mk.scale.setScalar(VPOOL); mk.visible=false; fxG.add(mk); VM.push(mk);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:0xa98cf5,transparent:true,depthWrite:false,opacity:0})); sp.visible=false; scene.add(sp); VS.push(sp); });
''')
rep("function hideTele(){ if(ringT){ringT.visible=ringF.visible=coneT.visible=false;} tele=null; }", "function hideTele(){ if(ringT){ringT.visible=ringF.visible=laneT.visible=false;} VM.forEach(q=>q.visible=false); tele=null; }")
rep("CLAWS.forEach(c=>{c.userData.t=-1;c.visible=false;}); }", "CLAWS.forEach(c=>{c.userData.t=-1;c.visible=false;}); MIRES.forEach(m=>{m.t=-1;m.g.visible=false;}); VP.forEach(q=>{q.t=-1;q.g.visible=false;}); VG.forEach(q=>{q.t=-1;q.m.visible=false;}); }")
rep("const muzzle=()=>pt(bones.head,[0,-0.05,0.17]);", "const muzzle=()=>pt(bones.head,[0,0.03,0.2]);")
rep("const paws=()=>['fHoofL','fHoofR','hHoofL','hHoofR'].map(b=>pt(bones[b],[0,-0.03,0.04]));",
    "const hands=()=>['fFingL','fFingR'].map(b=>pt(bones[b],[0,0,0]).setY(0.03)), hinds=()=>['hToeL','hToeR'].map(b=>pt(bones[b],[0,0,0]).setY(0.03)), paws=()=>hands().concat(hinds());\n  const tipW=()=>pt(bones.tg7,[0,0,0.078]);")
cut("  let runeT=-1, sumT=-1, tele=null;", "  function hitDummy(k){", r'''  let runeT=-1, sumT=-1, tele=null;
  const cue=(n,k,i)=>{const c=META[n].cues; return c&&c[k]?c[k][i||0]:0;};
  function placeHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.kick=0; u.sx=0; u.hold=0; u.slow=0; dummy.position.set(0,0,z); } }
  function mireAt(c,r){ if(!fxOn)return; const m=MIRES.find(m=>m.t<0)||MIRES.reduce((a,b)=>a.t>b.t?a:b); m.t=0; m.r=r; m.g.position.copy(toFloor(c)).setY(0.008+0.001*MIRES.indexOf(m)); m.g.scale.setScalar(0.3*r); m.g.visible=true; }
  function fxStart(name){
    hideTele(); HOME=NEAR;
    if(name==='lash'){ placeHero(LASHZ); tele={kind:'lane',w:1.0,len:LANE,dur:META.lash.contact[0],at:toFloor(new THREE.Vector3(0,0,0)),yaw:-floorYaw}; }
    if(name==='flop'){ placeHero(FLOPZ); tele={kind:'ring',r:2.0,dur:META.flop.contact[0],at:toFloor(new THREE.Vector3(0,0,FLOPD))}; }
    if(name==='venom'){ placeHero(NEAR); const n=WARTS.length; vland=WARTS.map(()=>false); // where each gob will land: the first on the hero, the rest scattered right round him
      vspots=WARTS.map((w,i)=>{ if(i===0)return toFloor(new THREE.Vector3(0,0,NEAR)).setY(0); const a=0.5+(i-1)/(n-1)*(Math.PI*2-1.0)+(Math.random()-0.5)*0.4, r=VNEAR+Math.random()*(VFAR-VNEAR); return toFloor(new THREE.Vector3(Math.sin(a)*r,0,Math.cos(a)*r)).setY(0); });
      VM.forEach((mk,i)=>mk.position.copy(vspots[i]).setY(0.012+0.0005*i)); }
    if(name==='enrage'){ rage=true; $('rage').setAttribute('aria-pressed','true'); }
    if(name==='spawn'){ buds=0; eyes=0; cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='death'){ rage=false; $('rage').setAttribute('aria-pressed','false'); hitFeel(0.5,0.07,0.4); flash=0.5; if(fxOn)sparks(muzzle(),10,0xfff4e0,2.2,0.3); }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(muzzle(),12,0xfff4e0,2.4,0.3); }
  }
  function venomSpit(i){ if(!fxOn||!vspots[i])return; const w=WARTS[i], g=VG[i], from=pt(bones[w.bone],w.off); g.a.copy(toFloor(from)); g.b.copy(vspots[i]); g.h=1.5+Math.random()*0.9; g.t=0; g.m.visible=true; g.m.position.copy(g.a);
    sparks(from,3,0xd9c8ff,1.6,0.2); }
  function venomLand(i,b){ vland[i]=true; VM[i].visible=false; const c=b.clone().applyMatrix4(fxG.matrix); const q=VP[i]; q.t=0; q.g.position.copy(b).setY(0.009+0.0006*i); q.g.visible=true;
    ringAt(c.clone().setY(0.03),{r0:0.15,r1:VPOOL*1.2,dur:0.26,a:0.45}); sparks(c.clone().setY(0.12),5,0xd9c8ff,1.7,0.25); hitFeel(0.1,0,0);
    if(dummy&&showTarget&&targetW().distanceTo(c)<VPOOL+0.25){ sparks(targetW().setY(0.5),8,0xfff4e0,2.4,0.3); hitDummy(0.12); dummy.userData.hold=1.6; } }
  function fxContact(name,i){
    if(name==='lash'){ hideTele(); hitFeel(0.6,0.08,0); const tp=tipW(); if(fxOn){ sparks(tp,10,0xd9c8ff,2.6,0.28); ringAt(tp,{r0:0.1,r1:0.7,dur:0.22,a:0.5,bill:true}); }
      if(dummy&&showTarget&&Math.abs(dummy.position.x)<0.8&&dummy.position.z<LANE+0.3){ hitDummy(0); dummy.userData.hold=1.3; shot.z0=dummy.userData.z; shot.caught=true; if(fxOn)sparks(targetW().setY(0.6),8,0xfff4e0,2.4,0.3); } }
    if(name==='flop'){ const c=tele?tele.at.clone().applyMatrix4(fxG.matrix):new THREE.Vector3(); hideTele(); hitFeel(1,0.1,1);
      if(fxOn){ paws().forEach(p=>dust(p,6,2.4,0.9)); for(let k=0;k<10;k++){const a=k/10*Math.PI*2; dust(new THREE.Vector3(c.x+Math.cos(a)*1.1,0,c.z+Math.sin(a)*1.1),2,2.2,0.7);} ringAt(c,{r0:0.6,r1:2.0,dur:0.36,a:0.5}); mireAt(c,rage?2.6:2.0); }
      if(dummy&&showTarget&&targetW().distanceTo(c)<2.0+0.3){ if(fxOn)sparks(targetW().setY(0.5),12,0xfff4e0,3.0,0.3); hitDummy(0.4); dummy.userData.hold=1.4; dummy.userData.slow=2.5; } }
    if(name==='venom'){ hitFeel(0.35,0.03,0.3); if(fxOn){ ringAt(pt(bones.chest,[0,0.1,0]),{r0:0.5,r1:1.7,dur:0.3,a:0.3,bill:true}); hands().forEach(q=>dust(q,3,1.0,0.4)); } }
    if(name==='croak'){ hitFeel(0.3,0.02,0.2); if(fxOn){ ringAt(muzzle(),{r0:0.2,r1:1.5,dur:0.5,a:0.35,bill:true}); sumT=0; const spots=[[-3.0,1.4],[3.0,1.4],[0,-3.6]]; summon.forEach((q,k)=>{q.position.copy(toFloor(new THREE.Vector3(spots[k][0],0,spots[k][1]))).setY(0.013);}); } }
    if(name==='enrage'){ hitFeel(0.7,0.06,0.6); if(fxOn){ hands().forEach(p=>dust(p,7,2.0,0.8)); ringAt(new THREE.Vector3(0,0,0.9),{r0:0.4,r1:2.4,dur:0.4,a:0.45}); sparks(muzzle(),8,0xd9c8ff,2.2,0.3); } }
    if(name==='heavyHit'){ hitFeel(0.35,0.02,0.4); if(fxOn)hands().forEach(p=>dust(p,5,1.4,0.6)); }
    if(name==='spawn'){ if(i===0){ hitFeel(0.4,0.03,0.5); if(fxOn)paws().forEach(p=>dust(p,4,1.4,0.6)); } else { hitFeel(0.2,0.02,0.15); if(fxOn)ringAt(muzzle(),{r0:0.2,r1:1.3,dur:0.45,a:0.35,bill:true}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.7,0.05,0.5); if(fxOn){ const b=pt(bones.hips,[0,0,0]).setY(0); for(let k=0;k<8;k++){const a=k/8*Math.PI*2; dust(new THREE.Vector3(b.x+Math.cos(a)*0.9,0,b.z+Math.sin(a)*0.9),2,1.8,0.6);} } }
      else { hitFeel(0.25,0,0); if(fxOn){ const cw=pt(bones.crown,[0,0,0]); sparks(cw.clone().setY(0.12),7,0xfff4e0,1.8,0.25); dust(cw,3,0.8,0.3); } } }
  }
''')
cut("  function fxOngoing(d){", "  function updateFx(d){", r'''  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, m=META[n];
    if(tele&&fxOn){ const k=Math.min(1,t/tele.dur), pulse=0.03*Math.sin(t*24)*k;
      if(tele.kind==='ring'){ ringT.visible=ringF.visible=true; ringT.position.x=ringF.position.x=tele.at.x; ringT.position.z=ringF.position.z=tele.at.z; ringT.scale.setScalar(tele.r); ringF.scale.setScalar(Math.max(0.001,tele.r*k)); ringT.material.opacity=0.45+0.25*k+pulse*3; ringF.material.opacity=0.1+0.08*k; }
      else { laneT.visible=true; laneT.position.x=tele.at.x; laneT.position.z=tele.at.z; laneT.rotation.y=tele.yaw; const u=laneT.userData; u.fill.scale.set(tele.w,Math.max(0.001,tele.len*k),1); u.fm.opacity=0.1+0.1*k+pulse; u.em.opacity=0.45+0.25*k; } }
    if(n==='lash'){ const dr=cue('lash','yank',0), re=cue('lash','yank',1), hm=cue('lash','home',0);
      budsTo=t<m.contact[0]?0.3+0.9*Math.min(1,t/0.6):0.3; throatTo=t>0.45&&t<hm?1.2:0.2; eyesTo=t<hm?1.7:1;
      if(shot.caught&&dummy&&t>=dr&&t<=re+0.02){ const u=dummy.userData; u.z=shot.z0-YANK*Math.min(1,(t-dr)/(re-dr)); u.hold=1.0; // the tongue hauls the hero in 2 u over 12 ticks
        if(fxOn&&Math.random()<d*40)puff(targetW().setY(0.05),new THREE.Vector3((Math.random()-0.5)*0.6,0.3,0.8),{life:0.35,s0:0.12,s1:0.4,a:0.2,drag:3,floor:true}); }
      if(shot.prev<hm&&t>=hm&&fxOn)sparks(muzzle(),4,0xd9c8ff,1.2,0.2); }
    if(n==='flop'){ const lp=cue('flop','leap',0), cr=cue('flop','crown',0); if(dummy&&t<m.contact[0])dummy.userData.hold=0.3; /* the hero stands their ground under the ring */ eyesTo=t<m.contact[0]?1+1.0*Math.min(1,t/0.6):1; budsTo=t<lp?0.3+0.6*Math.min(1,t/0.5):0.3;
      [0,1].forEach(i=>{ const c=cue('flop','stamp',i); if(shot.prev<c&&t>=c){ hitFeel(0.18,0,0.12); if(fxOn)hinds().forEach(p=>dust(p,4,1.2,0.45)); } }); // the two pushes stamp
      if(shot.prev<lp&&t>=lp&&fxOn)hinds().forEach(p=>dust(p,7,2.0,0.8));
      if(shot.prev<cr&&t>=cr&&fxOn)sparks(pt(bones.crown,[0,0,0]),4,0xfff4e0,1.0,0.2); }
    if(n==='venom'){ const sh=m.contact[0], st=cue('venom','shake',1), ch=Math.min(1,Math.max(0,(t-0.12)/(sh-0.3)));
      wartTo=t<sh?0.2+0.9*ch+0.3*ch*Math.max(0,Math.sin(t*(6+10*ch))):t<st?1.3-0.9*(t-sh)/(st-sh):0; eyesTo=t<st?1.6:1; budsTo=t<sh?0.3:t<st+0.4?0.9:0.3; if(dummy&&t<st+0.5)dummy.userData.hold=0.3;
      VM.forEach((mk,i)=>{ const land=m.cues.spit[i]+VFLY, on=fxOn&&t>=0.6&&t<land&&!vland[i]; mk.visible=on; if(on){ const k=(t-0.6)/(land-0.6); mk.userData.fill.scale.setScalar(Math.max(0.001,k)); mk.userData.rm.opacity=0.45+0.25*k+0.08*Math.sin(t*24)*k; } });
      m.cues.spit.forEach((c,i)=>{ if(shot.prev<c&&t>=c)venomSpit(i); });
      if(fxOn&&t>0.3&&t<sh&&Math.random()<d*16*ch){ const w=WARTS[Math.floor(Math.random()*WARTS.length)]; motes(pt(bones[w.bone],w.off),1,0.1,0.7); }
      if(fxOn&&t>=sh&&t<st&&Math.random()<d*45){ const w=WARTS[Math.floor(Math.random()*WARTS.length)]; sparks(pt(bones[w.bone],w.off),1,0xd9c8ff,2.6,0.3); } }
    if(n==='croak'){ const on=t>0.44&&t<1.3; budsTo=on?1.3:0.3; eyesTo=on?1.5:1; [1,2].forEach(k=>{ const c=cue('croak','call',k); if(shot.prev<c&&t>=c){ ringAt(muzzle(),{r0:0.2,r1:1.5,dur:0.5,a:0.3,bill:true}); hitFeel(0.15,0,0.12); } }); }
    if(n==='enrage'){ budsTo=t<1.2?1.2:0.3; throatTo=t>0.5&&t<1.2?1.3:0.2; if(t>0.2&&t<1.3&&Math.random()<d*14)motes(pt(bones.crown,[0,0.1,0]),1,0.7,0.9); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,2.6,1.4); budsTo=t>0.7&&t<1.15?1.2:0.3; }
    if(n==='death'){ eyesTo=t>2.4?0:1-0.6*t/2.4; budsTo=t<0.4?1.0:t>1.4?0:0.3; throatTo=t<0.5?0.8:t>2.0?0:0.3; if(t>1.5&&t<2.6&&Math.random()<d*8)motes(pt(bones.belly,[0,0,0]),1,1.0,0.7); if(shot.prev<2.6&&t>=2.6)cv.style.filter='saturate(0.45)'; }
  }
''')
rep("on*throat*0.32,", "on*throat*0.2,")
rep("    if(runeT>=0){ runeT+=d;", "    VP.forEach(q=>{ if(q.t<0)return; q.t+=d; const u=q.t/VLIFE; if(u>=1||!fxOn){q.t=-1;q.g.visible=false;return;} const g=Math.min(1,q.t/0.22), e=1-(1-g)*(1-g); q.g.scale.setScalar(VPOOL*(0.35+0.65*e)); const a=Math.min(1,(1-u)*5); q.dm.opacity=0.62*a; q.rm.opacity=0.45*a*(0.75+0.25*Math.sin(q.t*4+q.g.position.x)); if(Math.random()<d*1.6*a){ const an=Math.random()*6.283, rr=Math.random()*VPOOL*0.7; motes(q.g.position.clone().add(new THREE.Vector3(Math.cos(an)*rr,0.03,Math.sin(an)*rr)).applyMatrix4(fxG.matrix),1,0.05,0.6); } });\n    VG.forEach(g=>{ if(g.t<0)return; g.t+=d; const u=Math.min(1,g.t/VFLY); g.m.position.lerpVectors(g.a,g.b,u); g.m.position.y=g.a.y*(1-u)+g.h*4*u*(1-u)+0.06*u; const sq=1+0.35*Math.sin(u*Math.PI); g.m.scale.set(1/Math.sqrt(sq),sq,1/Math.sqrt(sq)); g.m.visible=fxOn;\n      if(fxOn&&Math.random()<d*36)puff(g.m.position.clone().applyMatrix4(fxG.matrix),new THREE.Vector3(0,-0.2,0),{life:0.28,s0:0.1,s1:0.02,a:0.32,col:0x8a63e6});\n      if(u>=1){ g.t=-1; g.m.visible=false; venomLand(g.i,g.b); } });\n    wart+=(wartTo-wart)*Math.min(1,d*10); wartU.value=fxOn?Math.max(0,wart)*0.55:0;\n    VS.forEach((sp,i)=>{ const on=fxOn&&wart>0.03&&bones[WARTS[i].bone]; sp.visible=!!on; if(on){ const w=WARTS[i]; sp.position.copy(pt(bones[w.bone],[w.off[0]+w.n[0]*0.02,w.off[1]+w.n[1]*0.02,w.off[2]+w.n[2]*0.02])); sp.scale.setScalar((0.5+0.35*Math.min(1.3,wart))*w.r*U*2.2); sp.material.opacity=Math.min(0.5,0.38*wart); } });\n    MIRES.forEach(m=>{ if(m.t<0)return; m.t+=d; const u=m.t/5.0; if(u>=1||!fxOn){m.t=-1;m.g.visible=false;return;} const g=Math.min(1,m.t/0.3), e=1-(1-g)*(1-g); m.g.scale.setScalar(m.r*(0.3+0.7*e)); const a=Math.min(1,(1-u)*5); m.dm.opacity=0.42*a; m.rm.opacity=0.38*a*(0.8+0.2*Math.sin(m.t*3)); });\n    if(runeT>=0){ runeT+=d;")
rep("const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-1.25)/1.1)); blob.scale.set(0.5*(1-0.3*k),1.25*(1-0.3*k),1); blob.material.opacity=0.17*(1-0.45*k);",
    "const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-0.9)/1.2)); blob.scale.set(1.08*(1-0.3*k),1.2*(1-0.3*k),1); blob.material.opacity=0.17*(1-0.45*k); bones.belly.getWorldPosition(tmp); blob.position.set(tmp.x,0.004,tmp.z+0.18); // the shadow stays under the body when it goes over on its back")
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'fFingL'],HR:[0.1,'hToeR'],FR:[0.5,'fFingR'],HL:[0.6,'hToeL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25)", "dust(pt(bones[STEP[k][1]],[0,0,0]),2,0.4,0.25)")
# enraged: the sac beats faster (the game's mark), on top of whatever plays
rep("    mixer.update(md);\n", "    mixer.update(md);\n    if(rageW>0.01&&bones.sac&&!sel.dead)bones.sac.scale.multiplyScalar(1+0.08*rageW*Math.max(0,Math.sin(clockT*9)));\n")
# a clip whose length is not a whole number of frames still ends
rep("if(a.time>=m.dur-1e-3){ shot.done=true;", "if(a.time>=Math.min(m.dur,a.getClip().duration)-1e-3){ shot.done=true;")

s = s.replace('TRIS', sys.argv[2] if len(sys.argv) > 2 else '29,656')
import json, os
W = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'warts.json')))
s = s.replace('WARTS_JSON', json.dumps([{'bone': w['bone'], 'off': [round(x, 4) for x in w['off']], 'n': [round(x, 3) for x in w['n']], 'r': round(w['r'], 4)} for w in W], separators=(',', ':')))
for w in ['wolf', 'Wolf', 'pounce', 'howl', 'coneT', 'fHoof', 'hHoof', 'maneF']:
    if w in s: print('left over:', w, s.count(w))
open(sys.argv[1], 'w').write(s)
print('wrote', sys.argv[1], len(s))
