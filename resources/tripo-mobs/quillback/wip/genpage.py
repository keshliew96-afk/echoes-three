# Builds the Quillback's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/quillback'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/quillback.audit.json'))
glb = open(S + '/quillback.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/quillback.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Quillback Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Quillback from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The third mob: your export of the Level I charger, with a skeleton and nine moves added by hand. It curls into a ball on the warning, launches on the game's tick, rolls down the lane at the game's speed and either runs out of steam and uncurls, or hits a wall, bounces back and sits dazed. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what it does between charges, and Going turns it on the spot. A Charge plays over it and repeats until you press it again; it stays in the middle of the stage and the floor rolls under it at the game's speed. Hurt plays on top of anything. Death holds it down: press it again and it spawns back in. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="quillback-views.png" alt="The Tripo Quillback from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a round coat of pale-tipped quills with a few olive leaves in it, a brown face with two ears and amber eyes painted on, and four short legs with dark claws. The coat, face and legs are one piece of mesh.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>22 <small>hips, a squash bone and the roll bone at the middle, the chest, the rump and the head that curl it into a ball, and 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.85 u long <small>0.7 u tall and 0.68 u wide beside a 1 u hero. Curled, it is a ball about 0.7 u across, the game's 0.34 u rolling radius; the game's lane is 0.7 u wide. Its feet stand 0.29 u apart front to back, the game's 0.24 u.</small></dd></div>
    <div><dt>In the game</dt><dd>Charger <small>26 health, walks 1.5 u/s; inside 5 u it warns a lane for 0.8 s, then rolls it at 6 u/s for up to 1 s and 12 contact damage. A wall stops it dazed for 0.5 s. One charge every 4 s.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>It breathes slowly, sniffs about and looks from side to side, as the game's does. Once a loop it noses the floor, and then gives its coat a quick shake.</td><td>Game: the breath, sniff and look. The nosing and the shake are mine. 6 s loop.</td></tr>
      <tr><td>Walk</td><td>A quick scurry on short legs in diagonal pairs, leaning into the travel with a little waddle, each foot pinned while it carries weight.</td><td>Game: 1.5 u/s, steps of 0.07 to 0.13 s. 6 strides a second.</td></tr>
      <tr><td>Turn left, turn right</td><td>Short quick steps round on the spot, the head leading.</td><td>225° a second (my number: the game turns it instantly). 0.33 s a cycle.</td></tr>
      <tr><td>Charge</td><td>The game's charge key for key. The head tucks in fast and the coat swells, it presses down and rocks back, and in the last third of the warning it shivers. Then the launch: it stretches and throws itself forward, the legs fold in, and it rolls down the lane, turning exactly as far as it travels. It rams the hero 0.32 s in (a contact squash) and rolls on. At the end of the lane it lurches on the last of its speed, rolls the rest of the way upright and uncurls with one overshoot.</td><td>Game: warning 48 ticks (0.8 s): coil 43, launch 5, the contact on the resolve tick. Legs fold in 2 frames, roll 60 ticks at 6 u/s (6 u). Lurch 3 frames, uncurl at least 0.4 s.</td></tr>
      <tr><td>Charge into a wall</td><td>The same coil and launch, then after half a second of rolling it hits a wall: a squash into it, a bounce back off it, and then it sits dazed, rolling back upright the way it came, the coat sagging (the punish window). Then it uncurls.</td><td>Game: thud 2 frames, bounce 5 frames, dazed for at least the 30-tick stagger (here 0.95 s, until it is upright), uncurl 0.38 s.</td></tr>
      <tr><td>Hurt</td><td>A flinch into a half curl: the head ducks into the coat and snaps back out. Plays on top of any move, so planted feet stay planted.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor already curled in a ball, uncurls with one overshoot, and shakes its quills.</td><td>Game: grow in 7 frames, about 10% over. The curled arrival and the shake are mine.</td></tr>
      <tr><td>Death</td><td>A jolt with the head up and the coat swelling. The legs give, it tips over onto its right side, the legs twitch and go still, and it lies half curled.</td><td>2.2 s, then it stays down. Mine: the game fades its foes out.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>REACH_MM mm at worst (the turns)</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Rolling</td><td>The ball turns exactly as far as it travels, so it never skids or spins in place. The curled coat is not a perfect ball, so it rides up and down over its own bumps (measured all the way round) and never sinks into the floor.</td></tr>
      <tr><td>Lowest point under the floor</td><td>RIM_MM mm at worst outside the death: the front quills brush the floor for two frames on the launch, as the legs fold in. Dying, the claws brush it as it tips; lying dead it rests on the floor.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the roll are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Size.</strong> I drew it 0.85 u long so the curled ball matches the game's rolling size. Standing, that makes it a little bigger than the game's (feet 0.29 u apart, the game's 0.24 u).</li>
        <li><strong>The crest.</strong> The game raises a separate crest of seven quills in the coil and flares its coat. This coat is one piece, so the whole coat swells (up to about 6%) instead. I can cut a crest of quills out onto their own bones if you want them to stand up.</li>
        <li><strong>The eyes.</strong> The game shuts its quillback's eyes as it tucks. These eyes are painted on the texture, so they stay open and show in the roll.</li>
        <li><strong>The tell.</strong> The game marks its quill tips indigo. Here the pale quill tips glow a faint indigo that brightens through the warning and fades in the daze.</li>
        <li><strong>Mine.</strong> The idle nosing and coat shake, the curled spawn, the turn rate and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Curled tight, the skin over the back of the neck stretches into a flat patch behind the head, which shows as it rolls.</li>
        <li>The body is long, not a dome like the game's, so standing in the coil it rocks back and dips a third as far as the game's, to keep its rump off the floor. The full rock is kept once it is a ball.</li>
        <li>Switching from Walk into a Charge blends in 0.18 s, so a foot can slide a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember warning lane on the floor, dust as it rolls, a pale hit spark and a plain stone wall for the crash. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="quillback-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=0.85;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const INDIGO=0x5B4BD6, EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',charge:'Charge',crash:'Charge into a wall',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['charge','crash'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.3; let HOME=NEAR; // where the hero stands, in u, in front of it: in the lane, where the roll reaches him 0.32 s in\n  const WALK=1.5, RAGEWALK=1.5, TURN=2*Math.PI/1.6, LANE=6.0, WALLZ=3.0+0.46;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.42,0.5,1); blob.position.set(0,0.004,0.0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.6,1.8,-0.6],t:[0,0.35,1.0]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.4,1.2]},Side:{p:[4.2,0.8,0.2],t:[0,0.4,0.2]},Front:{p:[0.4,0.9,4.4],t:[0,0.4,0]},Back:{p:[-1.6,1.5,-3.4],t:[0,0.4,0.2]},Top:{p:[0,6.6,0.3],t:[0,0.2,0.6]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(ball|chest|head|rump)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,wall:wall.visible,")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the Ember warning lane, the indigo tell on the quill tips, roll dust, pale hit sparks, a stone wall)
  const FXP=[], RINGS=[], BOLTS=[]; let dotTex=null, lane=null, bead=null, wall=null;
  let eyes=1, eyesTo=1, tell=0.16, tellTo=0.16, wallT=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48),new THREE.MeshBasicMaterial({color:0xe9dcc0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning: the charge's lane on the floor (0.7 u wide), a bead running out along it
    lane=new THREE.Group(); const lf=new THREE.Mesh(new THREE.PlaneGeometry(0.7,1),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.12,depthWrite:false})); lf.rotation.x=-Math.PI/2; lf.position.z=0.5;
    const le=new THREE.Mesh(new THREE.PlaneGeometry(0.74,0.03),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false})); le.rotation.x=-Math.PI/2; le.position.z=1;
    lane.add(lf,le); lane.userData={lf:lf.material,le:le.material}; lane.position.y=0.012; lane.visible=false; fxG.add(lane);
    bead=new THREE.Mesh(new THREE.CircleGeometry(0.07,20),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); bead.rotation.x=-Math.PI/2; bead.visible=false; lane.add(bead);
    // the wall for the crash: a plain stone slab across the lane
    wall=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,0.3),new THREE.MeshStandardMaterial({color:0x6f6a63,roughness:1})); wall.position.y=0.45; wall.visible=false; fxG.add(wall);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0,side:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||0xe9dcc0); scene.add(r.m); r.m.position.copy(pos); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane)lane.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0, TEL=48/60, R=0.36;
  const ballC=()=>pt(bones.ball,[0,0,0]);
  let rollDust=0;
  function fxStart(name){
    HOME=NEAR;
    if(name==='charge'||name==='crash'){ const crash=name==='crash';
      if(dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.side=0; u.hold=9; dummy.position.set(0,0,NEAR); dummy.visible=showTarget&&!crash; }
      const f=toFloor(new THREE.Vector3(0,0,0.3)); const L=crash?WALLZ-0.3:LANE;
      lane.position.x=f.x; lane.position.z=f.z; lane.rotation.y=-floorYaw; lane.children[0].scale.y=L; lane.children[0].position.z=L/2; lane.children[1].position.z=L; lane.userData.L=L; lane.visible=fxOn;
      if(crash){ const w=toFloor(new THREE.Vector3(0,0,WALLZ+0.15)); wall.position.x=w.x; wall.position.z=w.z; wall.rotation.y=-floorYaw; wall.visible=true; } else wall.visible=false; }
    else { wall.visible=false; if(dummy)dummy.visible=showTarget; }
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)dust(new THREE.Vector3(0,0,0),6,0.8,0.3); }
  }
  function fxContact(name,i){
    if(name==='charge'||name==='crash'){
      if(i===0){ hitFeel(0.15,0.03,0.45); lane.visible=false; if(fxOn)dust(new THREE.Vector3(0,0,-0.2),6,1.0,0.3); }
      if(i===1&&name==='charge'){ hitFeel(0.25,0.05,0.6); flash=0.2; hitDummy(); if(fxOn){ sparks(targetW().setY(0.45),6,SPARK,1.6,0.22); ringAt(targetW().setY(0.45),{r0:0.05,r1:0.4,dur:0.2,a:0.4,bill:true}); } }
      if(i===1&&name==='crash'){ hitFeel(0.4,0.06,0.9); flash=0.25; if(fxOn){ const p=new THREE.Vector3(0,0.35,R+0.05); sparks(p,8,SPARK,1.8,0.25); dust(new THREE.Vector3(0,0,R),8,1.0,0.4); ringAt(p,{r0:0.05,r1:0.5,dur:0.22,a:0.35,bill:true}); } } }
    if(name==='death'){ hitFeel(0.2,0,0.25); if(fxOn)dust(pt(bones.hips,[0,-0.2,0]).setY(0),8,0.8,0.3); }
  }
  // the ball rams him once and rolls on: he is knocked aside out of the lane, and walks back after the charge
  function hitDummy(){ if(!dummy||!showTarget)return; const u=dummy.userData; u.side=1.0; u.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='charge'||n==='crash'){ const k=Math.min(1,t/TEL);
      tellTo=t<TEL?0.16+0.25*(k<0.22?0.55*k/0.22:0.55+0.45*(k-0.22)/0.78):(n==='crash'&&t>TEL+0.5+0.2)?0.16+0.25*0.15:0.16+0.25*0.7;
      if(lane.visible&&t<TEL){ lane.userData.lf.opacity=0.07+0.11*k; lane.userData.le.opacity=0.35+0.35*k; bead.visible=true; bead.position.z=0.2+k*(lane.userData.L-0.2); bead.material.opacity=0.5+0.3*k; }
      const rolling=t>TEL+0.05&&(n==='charge'?t<TEL+1.0:t<TEL+0.5); if(rolling&&fxOn){ rollDust-=d; if(rollDust<=0){ rollDust=0.05; dust(new THREE.Vector3(0,0,-0.1),1,0.5,0.25); } } }
    if(n==='death'){ eyesTo=t>1.7?0:1-0.6*t/1.7; tellTo=0.16*(1-Math.min(1,t/1.7)); if(t>1.7)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; tellTo=sel.dead?0:0.16; if(lane)lane.visible=false; wallT+=d; if(wall&&wallT>0.8)wall.visible=false; } else wallT=0;
    eyes+=(eyesTo-eyes)*Math.min(1,d*10); tell+=(tellTo-tell)*Math.min(1,d*8); flash=Math.max(0,flash-d*3.2);
    glowU.value.set((fxOn?1:0)*0.45*tell,0,feel?flash:0,0);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.side>0){ u.x+=u.side*d*5; u.side=Math.max(0,u.side-d*4); }
      if(!busy){ u.hold=0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'fToeL'],HR:[0.0,'hToeR'],FR:[0.5,'fToeR'],HL:[0.5,'hToeL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,-0.01,0.02]),1,0.2,0.12);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0.02,0.1]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 0.85 * 1000))).replace('REACH_MM', str(round(max(v['reach_mm'] for v in au.values()) * 0.85)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS.filter', 'fire('):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
