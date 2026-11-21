# Builds the Lich Ram's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text and the effects.
import sys, re, json, struct
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
s = open(S + '/wolfreview/index.html').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Lich Ram Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Lich Ram from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">Your export of the second Level III boss, with a four-legged skeleton and 12 moves added by hand. His lower jaw is cut free of the skull so it can gape and clack, the horns and skull move as one hard piece, and the heart in his ribs beats on its own joint. His timings are the game's. Pick a move, drag to turn him, and judge the weight and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds him down: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under 40 percent health: the heart beats faster and the eyes and horns burn, and it stays on over every move until you switch it off.</p>
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
      <img src="ram-views.png" alt="The Tripo Lich Ram from the front, his left, the back and his right, before rigging" width="810" height="864">
      <p class="note" style="padding-top:12px">He came through whole and in one welded piece: the two curled horns, the skull with both violet eyes, the open ribs with the heart inside, four separate legs with hooves, and the short tail. His head measures straight, so nothing was corrected. The lower jaw was fused to the skull along the teeth and at the hinge; I cut it free and closed both sides.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>27,925 <small>boss budget about 28,000 · not trimmed · 28,167 after the jaw cut</small></dd></div>
    <div><dt>Bones</dt><dd>27 <small>hips, spine, chest, 2 in the neck, head, jaw, heart, 2 in the tail, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>2.7 MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.2 u tall <small>to the top of the horns, the game's scale of 2.2, beside a 1 u hero</small></dd></div>
    <div><dt>Body length</dt><dd>1.4 u <small>short and upright, as your sheet. See the open choices.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What he does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>Dry bones that never rest: a slow sway, the skull looks left and then right, the jaw clacks twice, the tail flicks, and once a loop he cocks his head, chatters his teeth and a shiver runs down the spine. The heart beats in the ribs.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>A stiff, heavy plod in diagonal pairs with the skull carried low and the horns level. The jaw knocks on each step.</td><td>Game: 1.2 u/s. 0.7 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, the skull leading the turn and the tail swinging out.</td><td>Game: 75° a second. 0.7 s a cycle.</td></tr>
      <tr><td>Bone Rush</td><td>The chin tucks, the horns come level and the weight rocks back while the left forehoof paws the floor twice. He bursts off his hind legs and covers the lane in three bounds, each hoof on the floor for two or three frames. At the end he drives the crown of the horns into the floor: down on both fore-knees, rump high, hind legs trailing. The floor cracks. He sags, heaves twice with his hindquarters, then the horns tear out first and the forequarters heave up after them. He shakes his head and squares up.</td><td>Game: lane 1.3 u wide and up to 7 u long for 54 ticks, rush at 11 u/s, slam 2.5 frames, held 3 frames, stuck 75 ticks with the Horn Guard down, wrench free 2.5 frames. Here the hero stands 5 u away; the game needs him within 6 u and 25° of the Ram's facing.</td></tr>
      <tr><td>Grave Call</td><td>The right forehoof lifts and trembles, the heart swells and the skull goes up. The hoof stamps, the jaw gapes wide and rattles, and three souls are lobbed out: one at the hero and one 2.2 u to either side. A Grave Mole comes up out of the aimed grave.</td><td>Game: no warning before the call. Souls fly 60 ticks to Ember rings of radius 1.0 u. The gather here is the last 30 ticks before the call, stamp 2.5 frames, held 3 frames, settle 0.5 s. Every 390 ticks, 270 when enraged.</td></tr>
      <tr><td>Enrage</td><td>He drops his head and rakes the floor twice with the left forehoof, then throws the skull up with the jaw wide and rattles from the horns to the ribs. The Enraged state stays on after it.</td><td>Mine: 1.5 s. The game has no pose at 40 percent health, only the faster heart and the burning eyes and horns.</td></tr>
      <tr><td>Block</td><td>Horn Guard. The head dips to meet a shot on the horns and rocks back. Upper body only, so the hooves stay planted.</td><td>Mine: 0.36 s. The game stops party shots within 60° of his facing with no pose.</td></tr>
      <tr><td>Hurt</td><td>The skull whips aside, the jaw drops open and the tail tucks. Plays on top of any move.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Shoved back a step with the skull thrown away and the jaw hanging, he rattles his head and squares up.</td><td>1.1 s</td></tr>
      <tr><td>Spawn</td><td>The floor cracks and he grows out of it in a low crouch. The skull lifts, the eyes and heart light, the jaw clacks twice and the left forehoof stamps.</td><td>Game: grow in 7 frames, then stand. The rise, the clacks and the stamp are mine.</td></tr>
      <tr><td>Death</td><td>A jolt, the forelegs buckle, the hindquarters give and he goes down on his right side with the legs sliding out from under him. The skull stays up a moment, trembling, then drops, the jaw falls open and the heart goes dark.</td><td>2.7 s, then he stays down</td></tr>
    </tbody></table></div>

  <h2>The detail audit</h2>
  <p class="note">A checker takes every point of the model (NVERT of them) through every frame of every move (NFRAME frames) and looks for four things. Sizes are in u; he is 2.2 u tall.</p>
  <div class="audit"><table>
    <thead><tr><th>Checked</th><th>Found in the first build</th><th>Now</th></tr></thead>
    <tbody>
      <tr><td>A joint that jumps in one frame (a pop)</td><td>The right foreleg flipped over three times as he fell dead (up to 163° in a frame). Both forelegs snapped 111° as he wrenched free. A hind shin jumped 78° at the burst.</td><td>None in the death: the legs are now carried by the body as it rolls, and no leg joint turns more than 14° in a frame. The wrench free is in two beats, horns first, and has no pop. What is left is the left foreleg folding to its knee inside the game's 2.5-frame slam (SNAP_DEG° in a frame).</td></tr>
      <tr><td>Any part under the floor</td><td>The first slam pose was a heap with the chest and forelegs in the floor. Lying dead, the right shoulder was 0.06 u under.</td><td>The horns go HORN_U u into the floor in the slam, on purpose. Otherwise the worst is a hoof rim RIM_U u under as it rolls. Lying dead he is on the floor (DEATH_U u).</td></tr>
      <tr><td>One part pushed through another</td><td>The folded fore hooves sat inside the hind hooves for the whole time he is stuck (0.06 u). The hind legs lay through each other when dead (0.08 u). The lower horn pressed 0.08 u into the shoulder as he lay.</td><td>Stuck and dead are clear of those: the hind hooves stop inside the folded forelegs, and the hind legs part. Still there: a fore hoof passes 0.05 u into a hind leg for 4 to 7 frames in each bound, the horn presses 0.06 u into the shoulder for half a second as he lies down, and the cut edge of the jaw sits 0.03 u inside the neck at the hinge in most moves (0.06 u in the Heavy hit). With the head at its lowest, in the spawn crouch and the enrage coil, the horns and jaw press up to 0.07 u into the chest.</td></tr>
      <tr><td>Smoothness (a move that stops dead, a loop that jumps)</td><td>The walk loop jumped 6° where it restarts.</td><td>0 loop jumps in idle, walk and both turns.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted hoof moving on the floor (locked feet)</td><td>0 mm in every move, the three bounds of the rush and the stuck knees included</td></tr>
      <tr><td>A planted hoof its leg could not reach</td><td>0 mm. Twice a hoof in the air is aimed up to 0.14 u past the leg's reach (the last bound, the death's jolt); there the leg simply goes straight.</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Head facing straight</td><td>Straight on the model: the two horns and the two eyes mirror each other, so nothing was corrected.</td></tr>
      <tr><td>Tail</td><td>Runs as a spring: it trails the body and settles after it stops.</td></tr>
      <tr><td>Walk and turn</td><td>Hooves and knees point straight ahead, no splay.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The stuck pose.</strong> With horns this curled, the horns only reach the floor before the nose when the head is tipped right over. So he plants the crown: fore-knees down, rump up. The other reading is horns buried in a wall, standing. The game stops him at the lane's end, not at a wall, so I built the floor plant.</li>
        <li><strong>Enrage and Block.</strong> Both poses are new. The game shows neither: it only speeds the heart, lights the eyes and horns, and stops the shot.</li>
        <li><strong>Horn glow.</strong> The game's Ram has runes on the horns that burn while the Horn Guard holds and go dark while he is stuck. Your model's horns are plain, so here the whole horn takes a faint Violet glow. Runes would need to be painted into the texture.</li>
        <li><strong>The jaw.</strong> Cut free so it can gape and clack. Say if you would rather keep the skull in one piece with the mouth as drawn.</li>
        <li><strong>The rush as three bounds.</strong> 7 u in 0.65 s is fast for a body this short, so each bound covers 2.3 u. Two longer bounds or four shorter ones are a quick change.</li>
        <li><strong>Size.</strong> 2.2 u to the top of the horns, which makes the body 1.4 u long. If he should fill more of his 0.7 u hit circle, scale him up or export a longer back.</li>
        <li><strong>The death.</strong> He falls on his side in one piece. Falling apart into loose bones would be a new effect.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The ribs are one stiff cage with the chest. They do not flex with the breath.</li>
        <li>The jaw hinge is a cut edge: close up, a thin seam shows behind the teeth when the mouth is wide.</li>
        <li>The heart is carried by the chest and only swells and shrinks. It does not swing.</li>
        <li>The Grave Mole and the hero are grey stand-ins. The mole only rises and sinks.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a hoof can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for his power. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="ram-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=2.2;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',rush:'Bone Rush',call:'Grave Call',enrage:'Enrage',block:'Block',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['rush','call','enrage','block','heavyHit'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.2, MID=4.0, FAR=5.0; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, further out for the Grave Call and the Bone Rush\n  const WALK=1.2, RAGEWALK=1.2, TURN=75*Math.PI/180, LANE=54/60, SOUL=1.0;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.5,0.8,1); blob.position.set(0,0.004,0);")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.8,2.4,6.4],t:[0,1.0,0.9]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.6]},Side:{p:[10.5,1.5,0.8],t:[0,1.1,0.8]},Front:{p:[0.8,1.7,10.5],t:[0,1.1,0]},Back:{p:[-3.4,2.9,-7.8],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.4]}};")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(neck1|neck2|head|jaw|tail1|tail2)\\./;")
rep("tele:[ringT.visible,coneT.visible],", "tele:[laneG.visible,GRAVES.filter(g=>g.userData.t>=0).length,crackG.visible,guardT>=0],heart:+bones.heart.scale.x.toFixed(2),")
rep("const PIV=new THREE.Vector3(0,0,-0.04*U);", "const PIV=new THREE.Vector3(0,0,0.02*U);")
rep("vec3(0.8,0.75,1.0)*uGlow.w*vMask.z", "vec3(0.7,0.36,1.0)*uGlow.w*vMask.z")
FX = r'''  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is his power)
  const FXP=[], RINGS=[], GRAVES=[], RUB=[]; let dotTex=null, laneG=null, crackG=null, guardG=null, rune=null, bolt=null;
  let horn=0.3, hornTo=0.3, heart=0.35, heartTo=0.35, eyes=1, eyesTo=1, hbPh=0, hbB=0, hbFast=0, hSize=1, hSizeTo=1, guardT=-1, crackT=-1, crackHold=false, laneT=-1, runeT=-1, rushHit=false;
  const RM=META.rush, RGO=RM.cues.lane[1], RSTOP=RM.cues.stuck[0], RFREE=RM.cues.stuck[1]+2.5/60, RHELD=RM.phases[5][1], GHIT=META.call.contact[0], EROAR=META.enrage.contact[0];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<120;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // Bone Rush's warning: an Ember lane 1.3 u wide and 7 u long from his feet, with a fill that runs down it
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    laneG=new THREE.Group(); const lf=flat(1.3,7,0,3.5,0.14), le=[flat(0.035,7,-0.65,3.5,0.6),flat(0.035,7,0.65,3.5,0.6),flat(1.3,0.035,0,7,0.6),flat(1.3,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // Grave Call: three Ember rings of radius 1.0 u, a lobbed soul for each, and a stand-in mole in the aimed one
    for(let i=0;i<3;i++){ const gq=new THREE.Group(); const e=new THREE.Mesh(new THREE.RingGeometry(0.965,1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false})); const f=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.12,depthWrite:false})); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002;
      const soul=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:0xa98cf5,transparent:true,depthWrite:false,opacity:0.85})); soul.scale.setScalar(0.5); soul.visible=false; fxG.add(soul);
      const mole=new THREE.Group(); const mm=new THREE.MeshStandardMaterial({color:0x5b5148,roughness:1}); const mb=new THREE.Mesh(new THREE.SphereGeometry(0.3,14,10),mm); mb.scale.set(1,0.85,1.3); mb.position.y=0.2; const ms=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.3,10),mm); ms.rotation.x=-Math.PI/2; ms.position.set(0,0.2,-0.45); const md=new THREE.Mesh(new THREE.SphereGeometry(0.46,14,8),new THREE.MeshStandardMaterial({color:0x3d3731,roughness:1})); md.scale.set(1,0.22,1); mole.add(mb,ms); mole.visible=false; md.visible=false;
      gq.add(e,f,mole,md); gq.userData={e,f,soul,mole,md,t:-1,from:new THREE.Vector3(),aimed:i===0}; gq.position.y=0.012; gq.visible=false; fxG.add(gq); GRAVES.push(gq); }
    // the cracked floor where the horns go in (and where he comes up), and the rubble it throws
    crackG=new THREE.Group(); { const pos=[]; let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647; return seed/2147483647;};
      for(let i=0;i<9;i++){ let a=i/9*Math.PI*2+rnd()*0.4, x=0, z=0, w=0.03+0.02*rnd(); const n=4, L=(0.45+0.6*rnd())/n;
        for(let k=0;k<n;k++){ const a2=a+(rnd()-0.5)*0.9, x2=x+Math.cos(a2)*L, z2=z+Math.sin(a2)*L, w2=w*(1-(k+1)/n), px=-Math.sin(a2), pz=Math.cos(a2);
          pos.push(x+px*w,0,z+pz*w, x-px*w,0,z-pz*w, x2+px*w2,0,z2+pz*w2, x-px*w,0,z-pz*w, x2-px*w2,0,z2-pz*w2, x2+px*w2,0,z2+pz*w2); x=x2; z=z2; w=w2; a=a2; } }
      const cg=new THREE.BufferGeometry(); cg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); const cm=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:0x1b1815,transparent:true,opacity:0.7,depthWrite:false,side:THREE.DoubleSide})); crackG.add(cm); crackG.userData.mat=cm.material; }
    crackG.position.y=0.009; crackG.visible=false; fxG.add(crackG);
    const rm=new THREE.MeshStandardMaterial({color:0x4c463f,roughness:1,transparent:true}); for(let i=0;i<10;i++){ const m=new THREE.Mesh(new THREE.DodecahedronGeometry(0.05+0.04*((i*37)%10)/10,0),rm); m.visible=false; fxG.add(m); RUB.push({m,v:new THREE.Vector3(),on:false}); } RUB.mat=rm;
    // Horn Guard: the arc he stops shots in, 60 degrees either side of his facing, and a shot to stop
    guardG=new THREE.Mesh(new THREE.RingGeometry(1.22,1.3,48,1,(270-60)*Math.PI/180,120*Math.PI/180),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); guardG.rotation.x=-Math.PI/2; guardG.position.y=0.02; guardG.visible=false; scene.add(guardG);
    bolt=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:0xe9dcc0,transparent:true,depthWrite:false,opacity:0.9})); bolt.scale.setScalar(0.3); bolt.visible=false; bolt.userData={t:-1,v:new THREE.Vector3(),from:new THREE.Vector3()}; scene.add(bolt);
    // the spawn's rune ring
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.3); fxG.add(rune);
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.55,a:0.22,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ if(col===0xfff4e0)col=0xe9dcc0; if(col===0xd9c8ff)col=0xa98cf5; for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  function motes(pos,n,spread,rise){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.2,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.2,rise*(0.5+Math.random()),(Math.random()-0.5)*0.2),{life:0.9+Math.random()*0.7,s0:0.07,s1:0.02,a:0.38,col:VIOLET}); } }
  function rake(hoof){ if(!fxOn)return; const h=pt(bones[hoof],[0,-0.03,0.02]); for(let i=0;i<5;i++)puff(h.clone().setY(0.05),new THREE.Vector3((Math.random()-0.5)*0.8,0.5+Math.random()*0.7,-1.4-Math.random()*1.2),{life:0.5+Math.random()*0.25,s0:0.14,s1:0.5,a:0.24,drag:3,floor:true}); }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(o.local?pos:toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function hideTele(){ if(laneG)laneG.visible=false; laneT=-1; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); GRAVES.forEach(g=>{g.userData.t=-1;g.visible=false;g.userData.soul.visible=false;}); if(rune)rune.visible=false; runeT=-1; crackG.visible=false; crackT=-1; crackHold=false; RUB.forEach(r=>{r.m.visible=false;r.on=false;}); guardG.visible=false; guardT=-1; bolt.visible=false; bolt.userData.t=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const muzzle=()=>pt(bones.head,[0,-0.07,0.19]);
  const hornFloor=()=>pt(bones.head,[0,0.1,-0.02]).setY(0);
  const hornFront=()=>pt(bones.head,[0,0.1,0.1]);
  function crackAt(w,sc,hold){ if(!fxOn)return; const p=toFloor(w); crackG.position.set(p.x,0.009,p.z); crackG.rotation.y=Math.random()*6.28; crackG.scale.setScalar(sc); crackG.visible=true; crackT=0; crackHold=hold;
    RUB.forEach((r,i)=>{ const a=i/RUB.length*6.28+Math.random()*0.5, v=(0.8+Math.random()*1.4)*sc; r.m.position.set(p.x+Math.cos(a)*0.2*sc,0.05,p.z+Math.sin(a)*0.2*sc); r.v.set(Math.cos(a)*v,1.6+Math.random()*1.6,Math.sin(a)*v); r.on=true; r.m.visible=true; r.m.rotation.set(Math.random()*3,Math.random()*3,0); }); }
  function rubbleKick(k){ RUB.forEach(r=>{ if(!r.m.visible)return; r.v.set((Math.random()-0.5)*k,0.7+Math.random()*k,(Math.random()-0.5)*k); r.on=true; }); }
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,z); } }
  function launchGraves(){ if(!fxOn)return; const c=toFloor(showTarget?targetW():new THREE.Vector3(0,0,MID)), side=new THREE.Vector3(1,0,0).applyAxisAngle(Y,-floorYaw), from=toFloor(muzzle()); from.y=muzzle().y;
    GRAVES.forEach((g,i)=>{ const u=g.userData; g.position.copy(c).addScaledVector(side,i===0?0:i===1?2.2:-2.2).setY(0.012); g.rotation.y=-floorYaw; u.t=0; u.from.copy(from); u.landed=false; g.visible=true; u.e.visible=u.f.visible=true; u.mole.visible=u.md.visible=false; u.soul.visible=true; }); }
  function fxStart(name){
    hideTele(); HOME=NEAR; rushHit=false;
    if(name==='rush'){ setHero(FAR); if(dummy)dummy.userData.hold=3.3; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw; } }
    if(name==='call')setHero(MID);
    if(name==='block'){ bolt.userData.t=0; bolt.userData.from.set(showTarget?dummy.position.x:0,0.55,showTarget?dummy.position.z:NEAR); bolt.visible=fxOn; bolt.material.opacity=0.9; }
    if(name==='enrage'){ rage=true; $('rage').setAttribute('aria-pressed','true'); }
    if(name==='spawn'){ horn=0; eyes=0; heart=0; hSize=0.8; cv.style.filter=''; if(fxOn){ runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013); crackAt(new THREE.Vector3(0,0,0.1),1.25,false); dust(new THREE.Vector3(0,0,0.1),14,2.2,1.1); } }
    if(name==='death'){ rage=false; $('rage').setAttribute('aria-pressed','false'); }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(muzzle(),12,0xfff4e0,2.4,0.3); }
  }
  function fxContact(name,i){
    if(name==='rush'){ if(i===0){ hitFeel(0.3,0,0.25); if(fxOn){ dust(pt(bones.hHoofL,[0,-0.03,0]),7,2.0,0.8); dust(pt(bones.hHoofR,[0,-0.03,0]),7,2.0,0.8); } }
      else { const h=hornFloor(); hitFeel(1,0.1,1); horn=0; if(fxOn){ crackAt(h,1,true); dust(h,16,2.6,1.1); ringAt(h,{r0:0.3,r1:1.6,dur:0.32,a:0.4,col:DUST}); sparks(h.clone().setY(0.12),8,0xd9c8ff,2.4,0.3); } } }
    if(name==='call'){ const h=pt(bones.fHoofR,[0,-0.03,0.03]); hitFeel(0.6,0.05,0.5); if(fxOn){ dust(h,8,1.6,0.7); ringAt(h,{r0:0.2,r1:1.3,dur:0.34,a:0.45}); ringAt(muzzle(),{r0:0.1,r1:0.8,dur:0.3,a:0.35,bill:true}); } launchGraves(); }
    if(name==='enrage'){ hitFeel(0.35,0.03,0.3); if(fxOn){ sparks(muzzle(),8,0xd9c8ff,2.0,0.25); ringAt(muzzle(),{r0:0.1,r1:0.9,dur:0.3,a:0.4,bill:true}); ringAt(muzzle(),{r0:0.1,r1:1.3,dur:0.42,a:0.25,bill:true,delay:0.1}); } }
    if(name==='block'){ const h=hornFront(); hitFeel(0.25,0.03,0.2); horn=1.5; guardT=0; if(fxOn){ sparks(h,7,0xfff4e0,2.2,0.25); sparks(h,5,0xd9c8ff,1.8,0.25); ringAt(h,{r0:0.08,r1:0.55,dur:0.22,a:0.45,bill:true}); } const b=bolt.userData; b.t=1; b.v.set(2.6*(Math.random()<0.5?-1:1),3.2,1.5); }
    if(name==='spawn'){ hitFeel(0.3,0.03,0.3); if(fxOn){ const h=pt(bones.fHoofL,[0,-0.03,0.03]); dust(h,7,1.4,0.6); ringAt(h,{r0:0.15,r1:0.9,dur:0.28,a:0.4}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.45,0,0.4); if(fxOn)dust(pt(bones.chest,[0,-0.1,0.05]).setY(0),12,1.6,0.6); } else { hitFeel(0.3,0,0.2); if(fxOn)dust(muzzle().setY(0),5,0.9,0.4); cv.style.filter='saturate(0.45)'; } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, p0=shot.prev, cross=(c)=>p0<c&&t>=c;
    if(n==='rush'){
      if(t<RGO){ eyesTo=1+1.0*Math.min(1,t/0.6); hornTo=0.55; hbFast=0.8; [0.32,0.62].forEach(c=>{ if(cross(c))rake('fHoofL'); }); }
      else if(t<RSTOP){ eyesTo=2; hornTo=0.7; hbFast=1.2; if(fxOn&&Math.random()<d*40){ const b=['fHoofL','fHoofR','hHoofL','hHoofR'][Math.floor(Math.random()*4)], h=pt(bones[b],[0,-0.03,0]); if(h.y<0.2)dust(h,2,0.8,0.5); }
        if(!rushHit&&dummy&&showTarget&&dummy.userData.z<1.1&&dummy.userData.z>-0.6&&Math.abs(dummy.userData.x)<1.0){ rushHit=true; const u=dummy.userData; hitFeel(0.5,0.05,0.3); if(fxOn)sparks(targetW().setY(0.5),12,0xfff4e0,3.0,0.3); u.sx=10; u.hold=2.6; u.mat.emissiveIntensity=feel?0.45:0; } }
      else if(t<RFREE){ hornTo=0; eyesTo=0.6; hbFast=0.5; [RHELD+0.62,RHELD+0.98].forEach(c=>{ if(cross(c)&&fxOn){ dust(hornFloor(),5,1.0,0.5); rubbleKick(0.7); hitFeel(0.15,0,0.1); } }); }
      else { hornTo=0.3; eyesTo=1; hbFast=0.3; }
      if(cross(RFREE)){ crackHold=false; hitFeel(0.45,0.03,0.3); horn=1.1; if(fxOn){ const h=hornFloor(); dust(h,10,2.0,1.2); rubbleKick(1.8); sparks(hornFront(),6,0xd9c8ff,2.0,0.25); } } }
    if(n==='call'){ if(t<GHIT){ hSizeTo=1+0.28*Math.min(1,t/0.5); heartTo=0.35+1.0*Math.min(1,t/0.5); eyesTo=1.7; hbFast=1.2; if(t>0.15&&Math.random()<d*12)motes(pt(bones.heart,[0,0,0]),1,0.4,0.8); } else { hSizeTo=1; heartTo=t<GHIT+0.2?1.1:0.35; eyesTo=t<0.9?1.7:1; hbFast=0.4; } }
    if(n==='enrage'){ hbFast=1.5; heartTo=0.9; eyesTo=t>EROAR-0.05&&t<1.2?2.3:1.4; hornTo=t>EROAR?0.9:0.3; [0.18,0.4].forEach(c=>{ if(cross(c))rake('fHoofL'); }); if(t>EROAR&&t<1.2&&Math.random()<d*18)motes(pt(bones.heart,[0,0.05,0]),1,0.7,1.0); }
    if(n==='block'){ if(t<0.04&&bolt.userData.t===0)bolt.position.lerpVectors(bolt.userData.from,hornFront(),Math.min(1,t/0.04)); }
    if(n==='spawn'){ eyesTo=t>0.45?1:0; heartTo=t>0.3?0.6:0; hornTo=t>0.8?0.3:0; hSizeTo=t>0.3?1:0.8; if(t>0.05&&t<0.8&&Math.random()<d*24)motes(new THREE.Vector3(0,0,0),1,1.8,1.3); }
    if(n==='death'){ const k=Math.max(0,Math.min(1,(t-1.2)/0.95)); eyesTo=t>1.85?0:1-0.6*Math.min(1,t/1.85); heartTo=0.35*(1-k); hSizeTo=1-0.18*k; hornTo=0; hbFast=-0.5*Math.min(1,t/1.2); if(t>1.2&&t<2.2&&Math.random()<d*10)motes(pt(bones.heart,[0,0,0]),1,0.4,0.7); }
  }
  function heartBeat(d){ if(!bones.heart)return; const rg=sel.dead?0:rageW; hbPh+=d*Math.max(0.3,1.0+0.9*rg+hbFast); const u=hbPh%1; hbB=Math.exp(-u*9)+0.55*Math.exp(-((u+0.78)%1)*11); hSize+=(hSizeTo-hSize)*Math.min(1,d*7); bones.heart.scale.setScalar(hSize*(1+0.1*hbB*Math.min(1,heart/0.3))); }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy&&!GRAVES.some(g=>g.userData.t>=0))HOME=NEAR; if(!busy){ hornTo=sel.dead?0:0.3; heartTo=sel.dead?0:0.35; eyesTo=sel.dead?0:1; hSizeTo=sel.dead?0.82:1; hbFast=0; if(laneT>=0&&laneT<LANE)hideTele(); }
    const rg=sel.dead?0:rageW;
    horn+=(hornTo+(hornTo>0.05?0.5*rg:0)-horn)*Math.min(1,d*6); heart+=(heartTo+(sel.dead?0:0.4*rg)-heart)*Math.min(1,d*5); eyes+=(eyesTo+(sel.dead?0:1.0*rg)-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; glowU.value.set(on*horn*0.24,on*heart*(0.7+0.6*hbB)*0.55,feel?flash:0,on*0.3*Math.min(2.4,eyes));
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    // the lane fills for 54 ticks, then fades as he runs down it
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/LANE), out=Math.max(0,(laneT-LANE)/0.25); if(out>=1||!fxOn)hideTele(); else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=3.5*k; u.lf.material.opacity=(0.08+0.1*k+0.02*Math.sin(laneT*24)*k)*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    // the graves: a soul flies 60 ticks to each ring, then it bursts; the aimed one raises a mole
    GRAVES.forEach((g,i)=>{ const u=g.userData; if(u.t<0)return; u.t+=d; const k=Math.min(1,u.t/SOUL);
      if(u.t<SOUL){ u.e.material.opacity=0.45+0.25*k+0.06*Math.sin(u.t*24)*k; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.08+0.08*k; const s=u.soul; s.position.lerpVectors(u.from,g.position,k); s.position.y=u.from.y*(1-k)+0.15*k+2.4*4*k*(1-k); s.scale.setScalar(0.46+0.1*Math.sin(u.t*30)); if(fxOn&&Math.random()<d*26)puff(s.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,0.15,0),{life:0.45,s0:0.12,s1:0.02,a:0.35,col:VIOLET}); }
      else if(!u.landed){ u.landed=true; u.e.visible=u.f.visible=false; u.soul.visible=false; const w=g.getWorldPosition(new THREE.Vector3()); ringAt(w,{r0:0.3,r1:1.0,dur:0.3,a:0.5}); dust(w,7,1.5,0.8); sparks(w.clone().setY(0.2),6,0xd9c8ff,2.2,0.3); if(i===0)hitFeel(0.4,0.03,0);
        if(dummy&&showTarget&&targetW().distanceTo(w)<1.0+0.3){ sparks(targetW().setY(0.5),10,0xfff4e0,2.6,0.3); hitDummy(1.1); dummy.userData.hold=1.3; }
        if(u.aimed){ u.mole.visible=u.md.visible=true; } }
      if(u.landed){ const m=u.t-SOUL; if(u.aimed){ const up=Math.min(1,m/0.2)*(1-Math.max(0,Math.min(1,(m-0.55)/0.25))); u.mole.position.y=-0.5*(1-up); u.md.scale.set(up,0.22*up+0.001,up); if(m>0.8){u.t=-1;g.visible=false;} } else if(m>0.1){u.t=-1;g.visible=false;} } });
    // cracks hold while the horns are in, then fade with their rubble
    if(crackT>=0){ if(!crackHold)crackT+=d; const a=1-Math.min(1,crackT/2.6); crackG.userData.mat.opacity=0.7*a; RUB.mat.opacity=Math.min(1,a*1.6); if(a<=0||!fxOn){ crackG.visible=false; crackT=-1; RUB.forEach(r=>{r.m.visible=false;r.on=false;}); } }
    RUB.forEach(r=>{ if(!r.on)return; r.v.y-=9*d; r.m.position.addScaledVector(r.v,d); r.m.rotation.x+=d*6; r.m.rotation.z+=d*4; if(r.m.position.y<0.04&&r.v.y<0){ r.m.position.y=0.04; r.on=false; } });
    if(guardT>=0){ guardT+=d; const u=guardT/0.5; guardG.visible=fxOn&&u<1; guardG.material.opacity=0.55*(1-u); if(u>=1)guardT=-1; }
    { const b=bolt.userData; if(b.t===0&&!(shot&&shot.name==='block'&&!shot.done&&fxOn)){ b.t=-1; bolt.visible=false; } if(b.t>=1){ b.t+=d; b.v.y-=6*d; bolt.position.addScaledVector(b.v,d); bolt.material.opacity=Math.max(0,0.9*(1-(b.t-1)/0.35)); if(b.t>1.35||!fxOn){ b.t=-1; bolt.visible=false; } } }
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { const side=u.z<1.5&&HOME>u.z+0.2?1.5:0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(side-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  // paw dust in the walk and the turns", FX)
rep("  // paw dust in the walk and the turns", "  // hoof dust in the walk and the turns")
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'fHoofL'],HR:[0.04,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.54,'hHoofL']};")
rep("    mixer.update(md);", "    mixer.update(md); heartBeat(md);")
sc = s[s.index('<script>\n(function'):]
for bad in ('ringT', 'ringF', 'coneT', 'CLAWS', 'summon', 'sumT', 'buds', 'budsTo', 'throat', 'throatTo', 'LEAP', 'pounce', 'rend', 'howl', 'maneF', 'maneR', 'earL', 'tele', 'paws', 'slow'):
    m = re.search(r'\b' + bad + r'\b', sc)
    if m: print('LEFTOVER', bad, sc[max(0, m.start() - 60):m.start() + 60].replace('\n', ' '))
U = 2.2
au = json.load(open(S + '/audit/ram.json'))
bm = json.load(open(S + '/ram/wip/out/lichram.meta.json'))
glb = open(S + '/ram/wip/out/lichram.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = [p for me in gj['meshes'] for p in me['primitives']][0]; nv = gj['accessors'][pr['attributes']['POSITION']]['count']
nf = sum(round(v['dur'] * 60) + 1 for v in bm.values())
import subprocess
txt = open(S + '/audit/ram.txt').read()
rows = {}
cur = None
for line in txt.splitlines():
    m = re.match(r'^(\w+)\s+floor (.*)$', line)
    if m: cur = m.group(1); rows[cur] = {'floor': m.group(2), 'snaps': ''}
    elif 'snaps:' in line and cur: rows[cur]['snaps'] = line.split('snaps:')[1]
def floor_mm(name, skip=()):
    return max([int(x) for part, x in re.findall(r'(\w+) -(\d+)mm', rows[name]['floor']) if part not in skip] or [0])
horn_mm = max(int(x) for part, x in re.findall(r'(\w+) -(\d+)mm', rows['rush']['floor']) if part == 'head')
rim = max(floor_mm(k, skip=('head',)) for k in rows if k != 'death'); dd = floor_mm('death')
snap = max(int(x) for x in re.findall(r'(\d+) deg@', rows['rush']['snaps']))
print('verts', nv, 'frames', nf, 'horn mm', horn_mm, 'rim mm', rim, 'death mm', dd, 'snap', snap)
f2 = lambda mm: f'{mm * U / 1000:.2f}'
s = s.replace('NVERT', f'{nv:,}').replace('NFRAME', f'{nf:,}').replace('HORN_U', f2(horn_mm)).replace('RIM_U', f2(rim)).replace('DEATH_U', f2(dd)).replace('SNAP_DEG', str(snap))
open(S + '/ramreview/index.html', 'w').write(s); print('ok', len(s))
