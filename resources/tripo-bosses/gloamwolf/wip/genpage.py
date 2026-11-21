# Builds the Gloam Wolf's review page from the Thornmother's (same bench, CSS and loop), swapping the text and the effects.
import sys, re
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
s = open(S + '/thornreview/index.html').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

rep('<title>Tripo Thornmother Review</title>', '<title>Tripo Gloam Wolf Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Gloam Wolf from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 4</span></h1>
    <p class="lede">Your export of the third Level I boss, with a four-legged skeleton and 13 moves added by hand. His jaw opens, the bramble mane stands as hackles, and the tail hangs in three parts. His timings are the game's. Pick a move, drag to turn him, and judge the weight and the hit. Nothing in the game has changed.</p>
    <p class="lede"><strong>New in version 4.</strong> Every move went through a frame-by-frame audit of every point of the model. It found the forelegs flipping over in one frame in the Pounce and the death, the hind legs passing through each other in the turns, and paws in the floor. Those are fixed, and the fix made the bow truer to your photos: the forearms now lie flat with the elbows down. The table under the moves has the rest.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds him down: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is his state under 40 percent health: it stays on over every move until you switch it off, and he stalks faster.</p>
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
      <img src="wolf-views.png" alt="The Tripo Gloam Wolf from the front, his left, the back and his right, before rigging" width="810" height="864">
      <p class="note" style="padding-top:12px">He came through whole: four separate legs with claws, the open mouth with fangs, both ears, the bramble mane with its buds, and the hanging tail with its pale tip. His head measures straight (0.1 degrees). His body sat 2 degrees off line and is squared up in the rig.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>26,346 <small>boss budget 30,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>31 <small>hips, spine, chest, 2 in the neck, head, jaw, ears, 3 in the tail, 2 under the mane, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>2.8 MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.3 u long <small>the game's scale of 2.3: hips 1.15 u up, as the game's wolf, beside a 1 u hero</small></dd></div>
    <div><dt>Body length</dt><dd>Shorter than the game's <small>paws 1.07 u apart front to back; the game's wolf is 1.48 u at the same hip height. It matches your sheet. See the open choices.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What he does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>He never quite stands still: slow breath, the weight eases from side to side, the head swings to scan left and then right with the ears turning first, he lifts his nose to taste the air, licks his teeth, and the tail tip twitches.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>A stalk. Diagonal pairs, as his gait in the game, the hind paw a touch behind its partner. The head rides low and level while the shoulders roll under the mane.</td><td>1.7 u/s, 0.6 s a cycle. Enraged: 2.1 u/s, the same steps played faster.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot in short quick steps on a wider stance, head leading, tail swinging out.</td><td>120° a second (my number: the game turns him instantly). 0.45 s a cycle.</td></tr>
      <tr><td>Pounce</td><td>He bows like a wolf about to spring (your photos): the forepaws reach out one after the other, the forearms lie flat on the floor with the elbows down and the chest low between them, the rump stays high with the tail up and the hips winding from side to side, and his eyes stay level on the hero. He rocks back onto his haunches, the hind paws drive, he sails in an arc, and every paw comes down at once with the forepaws a step ahead while the body squashes. Then he walks out of the landing.</td><td>Game: crouch for the first 38 ticks of the 54-tick ring (radius 1.5 u), leap 16 ticks in a 1.1 u arc, land 2.5 frames, landed 3 frames, settle 0.45 s. Here the hero stands 4.5 u away; his range is 2.5 to 8.5 u.</td></tr>
      <tr><td>Rend</td><td>The weight rocks back, the right forepaw comes up high and wide and the lips pull back. He lunges, the paw rakes across and down and the jaw snaps shut. The paw steps home.</td><td>Game: wind up for the 36-tick cone (2.8 u long, 55° either side), rake 2.5 frames, held 3 frames, back 0.4 s.</td></tr>
      <tr><td>Moon Howl</td><td>He sits back on his haunches with his tail laid out behind him, the chest fills and the head comes up. The muzzle goes to the sky, the jaw opens and the howl shakes his throat, mane and tail.</td><td>Game: rise for the 60-tick ring (radius 3.2 u), cry 2.5 frames, held 3 frames and 0.3 s, settle 0.5 s. It slows the party 35% for 1.5 s, and his next two Pounces come back to back.</td></tr>
      <tr><td>Call the pack</td><td>Standing, he looks back over his left shoulder and gives two short barks with his tail up, then squares up.</td><td>Mine: 1.3 s. The game plays only a roar sound when the boars and the owl come at 75, 50 and 25 percent.</td></tr>
      <tr><td>Enrage</td><td>He drops his head and the mane stands. A snarl shudders from the head to the tail, the right forepaw tears at the floor twice, he snaps at the air and squares up. The Enraged state stays on after it.</td><td>Game: hackles up 0.35 s, enraged 1.6 s, at 40 percent health. Enraged: hackles stay up, ears pinned, lips back, quick breath, eyes and buds brighter.</td></tr>
      <tr><td>Hurt</td><td>The head flinches away with a snarl, the ears pin, the tail tucks and the mane bristles. Plays on top of any move, so planted paws stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Knocked back two steps with his head thrown aside, he catches himself low, shakes his head and squares up snarling.</td><td>1.1 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor in a crouch, comes up nose first, shakes the night out of his coat from head to tail, and snaps once at the air.</td><td>Game: grow in 7 frames, then stand. The rise, the shake and the snap are mine.</td></tr>
      <tr><td>Death</td><td>A jolt, then he tries one more howl and it dies in his throat. The forelegs slide out and the chest comes down, the hindquarters fold beside him, and the head lays over on the floor. The mane sags and the tail goes slack.</td><td>2.6 s, then he stays down</td></tr>
    </tbody></table></div>

  <h2>The detail audit, version 4</h2>
  <p class="note">A checker takes every point of the model (NVERT of them) through every frame of every move (NFRAME frames) and looks for four things. Sizes are in u; he is 2.3 u long.</p>
  <div class="audit"><table>
    <thead><tr><th>Checked</th><th>Found in version 3</th><th>Now</th></tr></thead>
    <tbody>
      <tr><td>A joint that jumps in one frame (a pop)</td><td>Eight, all in the forelegs: the elbow flipped over the top going into the bow (140°) and on landing (153°), and twice as he went down dead (178°).</td><td>None. The elbow now keeps to the back and underside of the leg whatever the body does. The fastest thing left is the hind legs' kick at take-off (57° a frame), which is the drive.</td></tr>
      <tr><td>Any part under the floor</td><td>In the bow the forearms were 0.02 u into the floor, and the forepaws 0.02 u as they left it. Forepaws 0.02 u on the Heavy hit, 0.01 u in the Moon Howl.</td><td>The Pounce is clean. Still there: a forepaw dips 0.02 u for two frames as the Heavy hit throws him back, and 0.01 u in the Howl.</td></tr>
      <tr><td>One part pushed through another</td><td>22 overlaps deeper than 0.07 u. The worst: the hind shins passing through each other in both turns (0.09 u), the forelegs up in the neck fur for the whole leap (0.13 u), the tail through the hind legs in the walk and the Hurt (0.10 u), the ears into the mane in the Howl (0.12 u).</td><td>12, and 6 deeper than 0.09 u: the right hind leg folded under the body when he lies dead (0.12 u, hidden under him), the forelegs brushing the chest fur for two frames at take-off (0.13 u), the mane against the back of the head in the Howl (0.11 u). The turns are clean.</td></tr>
      <tr><td>Smoothness (a move that stops dead, a loop that jumps)</td><td>0 loop jumps. The death's hardest jolt was the foreleg flip.</td><td>0 loop jumps. The death's hardest jolt is a twentieth of what it was.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted paw moving on the floor (locked feet)</td><td>0 mm in every move, the Pounce's take-off and landing included</td></tr>
      <tr><td>A planted paw its leg could not reach</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns, the enraged state)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>RIM_MM mm at worst, the rim of a planted forepaw as it rolls. Lying dead he is on the floor, not in it (DEATH_MM mm).</td></tr>
      <tr><td>Head facing straight</td><td>0.1 degrees off, measured on the model. The body's 2 degrees are taken out.</td></tr>
      <tr><td>Ears, tail and mane</td><td>Run as springs: they trail the body and settle after it stops. The tail swings back to lie on the floor whenever the hips come down, so it never passes through it.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Body length.</strong> You asked me to check it. The model is about a quarter shorter in the body than the game's wolf at the same height, so he reads tall and compact. It matches your sheet and I have not stretched him. If you want the long low hunter, that is a new export with a longer back.</li>
        <li><strong>Call the pack.</strong> A new pose for the three add waves. The game has only the sound.</li>
        <li><strong>Enraged.</strong> The game's rule is hackles up and faster feet. The pinned ears, the snarl and the brighter eyes are mine.</li>
        <li><strong>The Hunt.</strong> After a Moon Howl the game sends two Pounces back to back with a shorter crouch (48 ticks). This page plays the normal Pounce. Say if you want the Hunt as its own button.</li>
        <li><strong>Rend's paw.</strong> Built as the game has it: the right forepaw. The cone reaches 2.8 u, further than the paw, so the three claw trails carry the hit.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The jaw is cut out of a closed-lip model, so it opens about a hand's width and the mouth corners stretch. There are no teeth inside beyond the fangs you can see.</li>
        <li>The bramble mane moves as two stiff clumps, front and rear. Single twigs do not bend.</li>
        <li>The fur ruff bends with the neck like skin.</li>
        <li>In the Pounce the hind legs reach as far back as the joints allow, which is a little short of a full stretch.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a paw can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for his power. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="thorn-model.js"></script>', '<script src="wolf-model.js"></script>')
rep("META=window.MODEL_META, U=2.2;", "META=window.MODEL_META, U=2.3;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',volley:'Seed Volley',charge:'Briar Charge',call:'Call the wood',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['volley','charge','call','heavyHit'];", "const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];")
rep("const HOME=3.0; // where the hero stands, in u, in front of her\n  const WALK=1.3, TURN=2*Math.PI/3.6, PAW=1.0, RUN=0.5, BRIAR=0x231b14;",
    "const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;")
rep("blob.scale.set(0.72,1.2,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);")
rep("const VIEWS={Close:{p:[5.6,2.7,7.4],t:[0,0.7,1.1]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.2]},Side:{p:[9.8,1.3,1.2],t:[0,0.9,1.2]},Front:{p:[0.8,1.5,10.6],t:[0,0.9,0]},Back:{p:[-3.4,2.7,-7.6],t:[0,0.9,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};")
rep("let speed=1, paused=", "let rage=false, rageW=0, rageAct=null;\n  let speed=1, paused=")
rep("toggle('bones',", "toggle('rage',()=>rage,v=>{rage=v;});\n  toggle('bones',")
rep("hurtAct=null, shot=null, dummy=null;", "hurtAct=null, shot=null, dummy=null;")
rep("const UPPER=/^(neck|head|earL|earR|tail1|tail2|hump1|hump2|blade\\w+)\\./;", "const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./; const restC=gltf.animations.find(c=>c.name==='hurt');")
rep("      if(c.name==='hurt'){", "      if(c.name==='rageHold'){const h=new THREE.AnimationClip('rageAdd',c.duration,c.tracks.filter(t=>UPPER.test(t.name)).map(t=>t.clone())); THREE.AnimationUtils.makeClipAdditive(h,0,restC,60); rageAct=mixer.clipAction(h); rageAct.blendMode=THREE.AdditiveAnimationBlendMode; rageAct.setLoop(THREE.LoopRepeat,Infinity); rageAct.setEffectiveWeight(0); rageAct.play(); return;}\n      if(c.name==='hurt'){")
rep("state:()=>({shot:shot&&shot.name,pods:PODS.filter(p=>p.t>=0).length,patches:PATCH.filter(g=>g.userData.t>=0).length,", "state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],")
rep("if(fxOn)sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }")
rep("'Down. Press Death again to spawn her back in.'", "'Down. Press Death again to spawn him back in.'")
rep("const PIV=new THREE.Vector3(0,0,-0.06*U);", "const PIV=new THREE.Vector3(0,0,-0.04*U);")
FX = r'''  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is his power)
  const FXP=[], RINGS=[], CLAWS=[]; let dotTex=null, ringT=null, ringF=null, coneT=null, rune=null, summon=[];
  let buds=0.3, budsTo=0.3, throat=0.2, throatTo=0.2, eyes=1, eyesTo=1;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<110;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    // the floor warnings: one Ember ring with a fill that grows to it (Pounce, Moon Howl) and one Ember cone (Rend)
    ringT=new THREE.Mesh(new THREE.RingGeometry(0.965,1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); ringF=new THREE.Mesh(new THREE.CircleGeometry(1,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false}));
    ringT.rotation.x=ringF.rotation.x=-Math.PI/2; ringT.position.y=0.012; ringF.position.y=0.011; ringT.visible=ringF.visible=false; fxG.add(ringT,ringF);
    const A0=(270-55)*Math.PI/180, AL=110*Math.PI/180;
    coneT=new THREE.Group(); const cf=new THREE.Mesh(new THREE.CircleGeometry(2.8,40,A0,AL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.16,depthWrite:false})); const ce=new THREE.Mesh(new THREE.RingGeometry(2.72,2.8,40,1,A0,AL),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false}));
    cf.rotation.x=ce.rotation.x=-Math.PI/2; coneT.add(cf,ce); coneT.userData={cf:cf.material,ce:ce.material}; coneT.position.y=0.011; coneT.visible=false; fxG.add(coneT);
    // three claw trails across the cone
    [1.25,1.9,2.55].forEach((r,i)=>{ const m=new THREE.Mesh(new THREE.RingGeometry(r-0.035,r+0.035,40,1,A0+0.12,AL-0.24),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false})); m.rotation.x=-Math.PI/2; const gq=new THREE.Group(); gq.add(m); gq.position.y=0.02+0.004*i; gq.visible=false; gq.userData={mat:m.material,t:-1,d:i*0.012}; fxG.add(gq); CLAWS.push(gq); });
    // the spawn's rune ring and the three places the pack answers from
    const mkRune=(r)=>{const gq=new THREE.Group(); const o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.5,depthWrite:false})); const i2=new THREE.Mesh(new THREE.RingGeometry(r*0.62,r*0.66,6),o.material); const i3=new THREE.Mesh(new THREE.RingGeometry(r*0.4,r*0.43,3),o.material); [o,i2,i3].forEach(m=>{m.rotation.x=-Math.PI/2;gq.add(m);}); gq.userData.mat=o.material; gq.position.y=0.013; gq.visible=false; return gq;};
    rune=mkRune(1.5); fxG.add(rune); for(let i=0;i<3;i++){const s=mkRune(0.42); fxG.add(s); summon.push(s);}
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0,slow:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=o.add?THREE.AdditiveBlending:THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.55,a:0.22,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ if(col===0xfff4e0)col=0xe9dcc0; if(col===0xd9c8ff)col=0xa98cf5; for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,add:false,g:-2.5,drag:2});} }
  function motes(pos,n,spread,rise){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.2,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.2,rise*(0.5+Math.random()),(Math.random()-0.5)*0.2),{life:0.9+Math.random()*0.7,s0:0.07,s1:0.02,a:0.38,col:VIOLET,add:false}); } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET); r.m.material.blending=o.add?THREE.AdditiveBlending:THREE.NormalBlending;
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function hideTele(){ if(ringT){ringT.visible=ringF.visible=coneT.visible=false;} tele=null; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); if(rune){rune.visible=false;summon.forEach(s=>s.visible=false);} CLAWS.forEach(c=>{c.userData.t=-1;c.visible=false;}); }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const muzzle=()=>pt(bones.head,[0,-0.05,0.17]);
  const paws=()=>['fHoofL','fHoofR','hHoofL','hHoofR'].map(b=>pt(bones[b],[0,-0.03,0.04]));
  let runeT=-1, sumT=-1, tele=null;
  function fxStart(name){
    hideTele(); HOME=name==='pounce'?FAR:NEAR;
    if(name==='pounce'){ if(dummy){ const u=dummy.userData; u.z=FAR; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,FAR); } tele={kind:'ring',r:1.5,dur:LEAP,at:toFloor(new THREE.Vector3(0,0,FAR))}; }
    if(name==='howl')tele={kind:'ring',r:3.2,dur:1.0,at:toFloor(new THREE.Vector3(0,0,0))};
    if(name==='rend')tele={kind:'cone',dur:0.6,at:toFloor(new THREE.Vector3(0,0,0)),yaw:-floorYaw};
    if(name==='enrage'){ rage=true; $('rage').setAttribute('aria-pressed','true'); }
    if(name==='spawn'){ buds=0; eyes=0; cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='death'){ rage=false; $('rage').setAttribute('aria-pressed','false'); }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(muzzle(),12,0xfff4e0,2.4,0.3); }
  }
  function fxContact(name,i){
    if(name==='pounce'){ const c=tele?tele.at.clone().applyMatrix4(fxG.matrix):new THREE.Vector3(0,0,1); hideTele(); hitFeel(1,0.1,1); if(fxOn){ paws().forEach(p=>dust(p,6,2.0,0.9)); ringAt(c,{r0:0.4,r1:1.6,dur:0.34,a:0.5}); }
      if(dummy&&showTarget&&targetW().distanceTo(c)<1.5+0.3){ if(fxOn)sparks(targetW().setY(0.5),12,0xfff4e0,3.0,0.3); hitDummy(0.45); dummy.userData.hold=1.2; } }
    if(name==='rend'){ const y=tele?tele.yaw:-floorYaw, at=tele?tele.at.clone():toFloor(new THREE.Vector3()); hideTele(); hitFeel(0.8,0.08,0.7);
      if(fxOn){ CLAWS.forEach(c=>{ c.position.x=at.x; c.position.z=at.z; c.rotation.y=y; c.userData.t=0; }); const p=pt(bones.fHoofR,[0,-0.03,0.04]); dust(p,5,1.4,0.6); sparks(p.clone().setY(0.15),6,0xd9c8ff,2.2,0.25); }
      if(dummy&&showTarget){ const d=targetW(), l=d.length(); if(l<2.8+0.3&&(l<0.5||d.z/l>=Math.cos(55*Math.PI/180))){ if(fxOn)sparks(d.clone().setY(0.5),10,0xfff4e0,2.8,0.3); hitDummy(0.4); } } }
    if(name==='howl'){ const c=tele?tele.at.clone().applyMatrix4(fxG.matrix):new THREE.Vector3(); hideTele(); hitFeel(0.6,0.05,0.5); throat=1.3;
      if(fxOn){ ringAt(c,{r0:0.5,r1:3.2,dur:0.42,a:0.5}); ringAt(c,{r0:0.5,r1:3.2,dur:0.5,a:0.3,delay:0.1}); }
      if(dummy&&showTarget&&targetW().distanceTo(c)<3.2+0.3){ hitDummy(0.15); dummy.userData.slow=1.5; } }
    if(name==='call'){ hitFeel(0.25,0.02,0.25); throat=0.9; if(fxOn){ ringAt(muzzle(),{r0:0.12,r1:1.1,dur:0.4,a:0.35,bill:true}); if(i===1){ sumT=0; const spots=[[-2.8,1.2],[2.8,1.2],[0,-3.4]]; summon.forEach((s,k)=>{s.position.copy(toFloor(new THREE.Vector3(spots[k][0],0,spots[k][1]))).setY(0.013);}); } } }
    if(name==='enrage'||name==='spawn'){ hitFeel(0.3,0.03,0.3); if(fxOn){ sparks(muzzle(),7,0xd9c8ff,2.0,0.25); ringAt(muzzle(),{r0:0.1,r1:0.7,dur:0.25,a:0.4,bill:true}); } }
    if(name==='death'){ if(i===0){ hitFeel(0.45,0,0.4); if(fxOn)dust(pt(bones.chest,[0,-0.1,0.05]).setY(0),10,1.5,0.6); } else { hitFeel(0.3,0,0.2); if(fxOn)dust(muzzle().setY(0),5,0.9,0.4); cv.style.filter='saturate(0.45)'; } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, m=META[n];
    if(tele&&fxOn){ const k=Math.min(1,t/tele.dur), pulse=0.03*Math.sin(t*24)*k;
      if(tele.kind==='ring'){ ringT.visible=ringF.visible=true; ringT.position.x=ringF.position.x=tele.at.x; ringT.position.z=ringF.position.z=tele.at.z; ringT.scale.setScalar(tele.r); ringF.scale.setScalar(Math.max(0.001,tele.r*k)); ringT.material.opacity=0.45+0.25*k+pulse*3; ringF.material.opacity=0.1+0.08*k; }
      else { coneT.visible=true; coneT.position.x=tele.at.x; coneT.position.z=tele.at.z; coneT.rotation.y=tele.yaw; coneT.userData.cf.opacity=0.08+0.12*k+pulse; coneT.userData.ce.opacity=0.4+0.3*k; } }
    if(n==='pounce'){ eyesTo=t<LEAP?1+1.2*Math.min(1,t/0.6):1; budsTo=t<LEAP?0.6:0.3;
      if(shot.prev<38/60&&t>=38/60&&fxOn){ dust(pt(bones.hHoofL,[0,-0.03,0]),7,2.0,0.8); dust(pt(bones.hHoofR,[0,-0.03,0]),7,2.0,0.8); } }
    if(n==='rend'){ eyesTo=t<0.7?1.8:1; budsTo=t<0.7?0.7:0.3; throatTo=t<0.6?0.6:0.2; }
    if(n==='howl'){ const cry=t>1.0&&t<1.42; budsTo=t<1.5?0.3+0.7*Math.min(1,t/1.0):0.3; throatTo=cry?1.2:t<1.0?0.2+0.5*t:0.2; eyesTo=t<1.5?1.6:1;
      [1.08,1.2,1.32].forEach(c=>{ if(shot.prev<c&&t>=c)ringAt(muzzle(),{r0:0.15,r1:1.6,dur:0.6,a:0.3,bill:true}); }); }
    if(n==='call'){ budsTo=t>0.3&&t<0.9?0.7:0.3; throatTo=t>0.3&&t<0.9?0.6:0.2; }
    if(n==='enrage'){ if(t>0.2&&t<1.3&&Math.random()<d*14)motes(pt(bones.maneF,[0,0.08,0]),1,0.6,0.9);
      [0.63,0.95].forEach(c=>{ if(shot.prev<c&&t>=c&&fxOn){ const h=pt(bones.fHoofR,[0,-0.03,0.02]); for(let i=0;i<5;i++)puff(h.clone().setY(0.05),new THREE.Vector3((Math.random()-0.5)*0.8,0.5+Math.random()*0.7,-1.4-Math.random()*1.2),{life:0.5+Math.random()*0.25,s0:0.14,s1:0.5,a:0.24,drag:3,floor:true}); } }); }
    if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,2.2,1.4); }
    if(n==='death'){ eyesTo=t>1.9?0:1-0.5*t/1.9; budsTo=t>1.0?0:0.3; throatTo=t>0.2&&t<0.62?1.0:0; if(t>1.1&&Math.random()<d*9)motes(pt(bones.maneR,[0,0.06,0]),1,0.9,0.7); }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ budsTo=sel.dead?0:0.3; throatTo=sel.dead?0:0.2; eyesTo=sel.dead?0:1; hideTele(); }
    const rg=sel.dead?0:rageW;
    buds+=(budsTo+0.7*rg-buds)*Math.min(1,d*6); throat+=(throatTo+0.3*rg-throat)*Math.min(1,d*5); eyes+=(eyesTo+1.0*rg-eyes)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; const breathe=0.06*Math.sin(clockT*(2.1+4*rg));
    glowU.value.set(on*Math.max(0,buds+breathe*(buds>0.05?1:0))*0.5,on*throat*0.32,feel?flash:0,on*0.3*Math.min(2.4,eyes));
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    CLAWS.forEach(c=>{ const u=c.userData; if(u.t<0)return; u.t+=d; const k=(u.t-u.d)/0.3; if(k>=1){u.t=-1;c.visible=false;return;} c.visible=fxOn&&k>=0; u.mat.opacity=0.6*(1-Math.max(0,k))**1.5; });
    if(runeT>=0){ runeT+=d; const u=runeT/0.95; rune.visible=u<1&&fxOn; rune.rotation.y=runeT*2.2; rune.scale.setScalar(1.15-0.35*u); rune.userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); if(u>=1)runeT=-1; }
    if(sumT>=0){ sumT+=d; const u=sumT/1.3; summon.forEach((s,k)=>{ s.visible=u<1&&fxOn; s.rotation.y=sumT*(k%2?-2:2); s.scale.setScalar(0.6+0.5*Math.min(1,u*3)); }); summon[0].userData.mat.opacity=0.5*Math.sin(Math.PI*Math.min(1,u)); summon.forEach(s=>s.userData.mat.opacity=summon[0].userData.mat.opacity); if(sumT>0.25&&sumT<0.9&&Math.random()<d*30){const s=summon[Math.floor(Math.random()*3)]; motes(s.getWorldPosition(new THREE.Vector3()),1,0.6,1.2);} if(u>=1)sumT=-1; }
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(u.slow>0){ u.slow-=d; u.mat.color.setHex(0x5d5670); if(fxOn&&Math.random()<d*8)motes(targetW(),1,0.5,0.5); } else u.mat.color.setHex(0x6b645c);
      u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
    // his shadow shrinks while he is in the air
    const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-1.25)/1.1)); blob.scale.set(0.5*(1-0.3*k),1.25*(1-0.3*k),1); blob.material.opacity=0.17*(1-0.45*k);
  }
'''
cut("  // ---- effects (dim on purpose", "  // hoof dust in the walk and the turns", FX)
rep("  // hoof dust in the walk and the turns", "  // paw dust in the walk and the turns")
rep("const STEP={FL:[0,'fHoofL'],HR:[0.05,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.55,'hHoofL']};", "const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.04,0.02]),2,0.5,0.3);", "dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);")
rep("    mixer.update(md);", "    rageW+=((rage&&!sel.dead?1:0)-rageW)*Math.min(1,md/0.3); if(rageAct)rageAct.setEffectiveWeight(rageW); const fast=1+(RAGEWALK/WALK-1)*rageW; ['walk','turnL','turnR'].forEach(k=>A[k].timeScale=fast);\n    mixer.update(md);")
rep("dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;", "dz+=(A.walk.__w)*WALK*fast*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*fast*md;")
rep("vec3(0.50,0.30,1.0)*(uGlow.x*vMask.x+uGlow.y*vMask.y)", "vec3(0.42,0.26,1.0)*uGlow.x*vMask.x+vec3(0.55,0.22,0.9)*uGlow.y*vMask.y")
sc = s[s.index('<script>\n(function'):]
for bad in ('PODS', 'PATCH', 'lane', 'laneT', 'antler', 'antlerTo', 'crystal', 'crystalTo', 'PAW', 'RUN', 'BRIAR', 'hump1', 'hump2', 'launchPods', 'tearPatch', 'volley', 'charge'):
    m = re.search(r'\b' + bad + r'\b', sc)
    if m: print('LEFTOVER', bad, sc[max(0, m.start() - 60):m.start() + 60].replace('\n', ' '))
import json
au = json.load(open(S + '/wolf/wip/out/wolf.audit.json'))
rows = au if isinstance(au, dict) else {a['name']: a for a in au}
rim = max(-v['lowest'] for k, v in rows.items() if k != 'death'); dd = -rows['death']['lowest']
import struct
glb = open(S + '/wolf/wip/out/wolf.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = [p for me in gj['meshes'] for p in me['primitives']][0]; nv = gj['accessors'][pr['attributes']['POSITION']]['count']
nf = sum(v['frames'] for v in rows.values())
s = s.replace('NVERT', f'{nv:,}').replace('NFRAME', f'{nf:,}')
s = s.replace('RIM_MM', str(round(rim * 2.3 * 1000))).replace('DEATH_MM', str(round(dd * 2.3 * 1000)))
open(S + '/wolfreview/index.html', 'w').write(s); print('ok', len(s), 'rim', rim, 'death', dd)
