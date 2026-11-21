# Builds the Briar Wasp's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/wasp'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/wasp.audit.json'))
glb = open(S + '/wasp.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/wasp.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Briar Wasp Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Briar Wasp from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The fifth mob: your export of the Level I wasp, with a skeleton and nine moves added by hand. It hovers at the game's 0.9 u, buzzes about, and darts down the game's Ember lane in its three stings: a hook from its right, a corkscrew from its left, then the plunge. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Hover or Buzz sets what it does between darts, and Going turns it on the spot. Dart and Dart string play over it and repeat until you press them again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="wasp-views.png" alt="The Tripo Briar Wasp from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a spiky brown head and thorax with big amber eyes and two curled antennae, four veined wings, eight thin legs hanging under the thorax, and a striped abdomen ending in a long brown stinger.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>30 <small>hips, a squash bone, the head and 2 antennae, 3 in the abdomen and the stinger, 4 wings, 2 in each of the 8 legs</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.78 u long <small>head to stinger, the game's wasp is about 0.78 u too; wings 0.78 u across (the game's 0.64 u); the thorax rides 0.9 u up as in the game, beside a 1 u hero.</small></dd></div>
    <div><dt>In the game</dt><dd>Flier, swarm of 3 <small>10 health, buzzes at 2.7 u/s on a 2.6 u orbit round its target. Every 165 ticks it darts: an Ember lane 0.6 u wide and up to 3.6 u long for 42 ticks, then a dart down it at 9 u/s for 4 to everyone it crosses. A swarm's three opening darts come 45 ticks apart.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Hover</td><td>The game's hover: the bob, the wing beat, the abdomen pumping and swaying. On top it looks one way and the other and flicks its antennae.</td><td>Game: hover 0.9 u, bob 0.06 u at about 7 rad/s. The looks are mine. 5.4 s loop.</td></tr>
      <tr><td>Buzz</td><td>Flies forward leaning nose down, the legs trailing.</td><td>Game: 2.7 u/s, the lean 0.16 rad at full speed. The trailing legs are mine.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot, banked a little, the abdomen swinging wide.</td><td>240° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Dart</td><td>The game's first dart key for key. The coil on the lane: nose down along it, the abdomen cocked up and aside with the stinger drawn out and held high, wings spread and beating hard, a buzz tremor building. The strike whips the abdomen under as it drops, the stinger thrusts out, and it holds the stab down the lane, pulls up nose high and settles with one overshoot. The legs tuck for the dive (mine).</td><td>Game: lane 42 ticks, the strike its last 2.5 frames, the dart 24 ticks at 9 u/s (3.6 u), pull up 2.5 frames, settle 6. The hero stands 2.6 u down the lane (the game's orbit) and is struck 0.22 s into the dart.</td></tr>
      <tr><td>Dart string</td><td>The game's three stings in turn: the hook from its right, the corkscrew from its left (a half barrel roll), then the plunge, the biggest. In the game these are a swarm's three sisters each darting once; here one wasp does all three, and the page puts the hero back in front of it before each.</td><td>Game: each dart as above, the next one starting 0.1 s into the last one's hover.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back and up, the abdomen flicks, the wings stutter back, the legs flail. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in at its hover height, then flares its wings, shakes and settles into the hover.</td><td>Game: grow in 7 frames, about 10% over. The flare and the shake are mine.</td></tr>
      <tr><td>Death</td><td>The beat stops, it drops out of the air with the wings swept back, tumbles onto its right side, bounces once and lies with its legs curled; the abdomen twitches twice.</td><td>Mine: the fall takes 0.42 s (gravity from 0.9 u). The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet</td><td>None planted: it never lands while alive.</td></tr>
      <tr><td>Loops that jump when they restart (hover, buzz, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point while flying</td><td>LOW_U u above the floor (the head, in the plunge).</td></tr>
      <tr><td>Lying dead</td><td>The body rests on the floor; a leg tip dips DEAD_MM mm under it for one frame as it lands.</td></tr>
      <tr><td>The wing beat</td><td>10 beats a second (the game's 60 rad/s is 9.5), so each beat is a whole 6 frames and every loop closes.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the beat, the weight, the timing and the hits are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Death.</strong> The standard says a foe falls and stays down, so it drops and lies on its side. The game pops every foe flat in the air instead; I can build that if you prefer.</li>
        <li><strong>The stab.</strong> The abdomen curls by the game's numbers. This abdomen is longer than the game's, so at the stab the stinger points back and a little down rather than at the floor. I can curl it deeper so the point hangs below the body.</li>
        <li><strong>The legs.</strong> The game folds six short legs under the thorax. These eight long legs hang under it, trail when it flies and tuck for the dive.</li>
        <li><strong>The tell.</strong> The game's stinger is indigo. Here the stinger glows a faint indigo that brightens through the coil; its own brown stays underneath.</li>
        <li><strong>Mine.</strong> The looks and antenna flicks in the hover, the turn rate, the tucked legs, the spawn flare and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Each wing is one stiff blade: it beats, rises and sweeps, but does not bend.</li>
        <li>The wings beat 10 times a second; on a slow screen that can look like a flicker rather than a blur.</li>
        <li>The stinger stretches along its length to show the game's thrust, so it thins a little as it grows.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember lane, the indigo glow, pale hit sparks and landing dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="wasp-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=0.8;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const INDIGO=0x5B4BD6, EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Hover',walk:'Buzz',turnL:'Turn left',turnR:'Turn right',dart:'Dart',string:'Dart string',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['dart','string'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.6; let HOME=NEAR; // where the hero stands, in u, in front of it: the game's orbit, in the lane\n  const WALK=2.7, RAGEWALK=2.7, TURN=2*Math.PI/1.5, LANE=3.6;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.2,0.24,1); blob.position.set(0,0.004,0.1);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[3.6,1.9,-0.4],t:[0,0.6,1.0]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[4.2,1.0,0.6],t:[0,0.7,0.6]},Front:{p:[0.4,1.4,3.6],t:[0,0.8,0]},Back:{p:[-1.4,1.9,-3.0],t:[0,0.8,0.2]},Top:{p:[0,6.0,0.3],t:[0,0.4,0.8]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(hips|sq|head|g0|g1|g2|gs|antL|antR|wfL|wfR|whL|whR|l\\d[LR]|k\\d[LR])\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the Ember warning lane, the indigo tell on the stinger, pale hit sparks, landing dust)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, bead=null;
  let eyes=1, eyesTo=1, tell=0.16, tellTo=0.16, dartN=-1;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48),new THREE.MeshBasicMaterial({color:0xe9dcc0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning: the dart's lane on the floor (0.6 u wide, 3.6 u long), a bead running out along it
    lane=new THREE.Group(); const lf=new THREE.Mesh(new THREE.PlaneGeometry(0.6,1),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.12,depthWrite:false})); lf.rotation.x=-Math.PI/2; lf.position.z=0.5;
    const le=new THREE.Mesh(new THREE.PlaneGeometry(0.64,0.03),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false})); le.rotation.x=-Math.PI/2; le.position.z=1;
    lane.add(lf,le); lane.userData={lf:lf.material,le:le.material,L:LANE}; lane.position.y=0.012; lane.visible=false; fxG.add(lane);
    bead=new THREE.Mesh(new THREE.CircleGeometry(0.06,20),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); bead.rotation.x=-Math.PI/2; bead.visible=false; lane.add(bead);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0,side:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||0xe9dcc0); scene.add(r.m); r.m.position.copy(pos); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(lane)lane.visible=false; dartN=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0, TEL=42/60, GAP=META.dart?META.dart.dur-0.1:1.43;
  const tip=()=>pt(bones.gs,[0,-0.02,-0.22]);
  // each dart: the hero back in front of it, 2.6 u down a fresh lane
  function newDart(){
    if(dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.side=0; u.hold=9; dummy.position.set(0,0,NEAR); }
    const f=toFloor(new THREE.Vector3(0,0,0.2)); lane.position.x=f.x; lane.position.z=f.z; lane.rotation.y=-floorYaw; lane.children[0].scale.y=LANE; lane.children[0].position.z=LANE/2; lane.children[1].position.z=LANE; lane.visible=fxOn;
  }
  function fxStart(name){
    HOME=NEAR; dartN=-1; blob.visible=true;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)ringAt(new THREE.Vector3(0,0.9,0),{r0:0.05,r1:0.45,dur:0.3,a:0.25,bill:true}); }
  }
  function fxContact(name,i){
    if(name==='dart'||name==='string'){
      if(i%2===0){ hitFeel(0.08,0.02,0.3); lane.visible=false; bead.visible=false; if(fxOn)ringAt(tip(),{r0:0.03,r1:0.25,dur:0.16,a:0.3,bill:true,col:INDIGO}); }
      else { const big=name==='string'&&i===5; hitFeel(big?0.3:0.2,big?0.05:0.04,big?0.6:0.45); flash=0.2; hitDummy(); if(fxOn){ const p=targetW().setY(0.6); sparks(p,big?8:5,SPARK,1.5,0.22); ringAt(p,{r0:0.05,r1:0.35,dur:0.18,a:0.35,bill:true}); } } }
    if(name==='death'){ hitFeel(0.12,0,0.2); if(fxOn)dust(pt(bones.hips,[0,0,0]).setY(0),6,0.6,0.25); }
  }
  // the dart crosses him: he is knocked back and tipped, and walks back between darts
  function hitDummy(){ if(!dummy||!showTarget)return; const u=dummy.userData; u.kick=0.35; u.tip=0.35; u.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='dart'||n==='string'){ const k=n==='string'?Math.min(2,Math.floor(t/GAP)):0; const tt=t-k*GAP; const kk=Math.min(1,tt/TEL);
      if(k!==dartN&&tt<TEL){ dartN=k; newDart(); }
      tellTo=tt<TEL?0.16+0.3*kk:tt<TEL+0.45?0.5:0.16;
      if(lane.visible&&tt<TEL){ lane.userData.lf.opacity=0.07+0.11*kk; lane.userData.le.opacity=0.35+0.35*kk; bead.visible=true; bead.position.z=0.2+kk*(LANE-0.2); bead.material.opacity=0.5+0.3*kk; } }
    if(n==='death'){ eyesTo=t>1.2?0:1-0.6*t/1.2; tellTo=0.16*(1-Math.min(1,t/1.2)); if(t>1.2)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; tellTo=sel.dead?0:0.16; if(lane)lane.visible=false; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*10); tell+=(tellTo-tell)*Math.min(1,d*8); flash=Math.max(0,flash-d*3.2);
    glowU.value.set((fxOn?1:0)*0.45*tell,0,feel?flash:0,0);
    // the shadow under a flier: smaller and fainter the higher it is
    if(bones.hips){ const hy=bones.hips.getWorldPosition(tmp2).y; const k=Math.max(0.45,Math.min(1.2,1.2-0.6*hy)); blob.scale.set(0.2*k,0.26*k,1); }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.kick>0){ u.z+=u.kick*d*6; u.kick=Math.max(0,u.kick-d*1.5); } u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.5*u.tip;
      if(!busy){ u.hold=0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.sq,[0,0.02,0.05]),5,0xe9dcc0,1.1,0.2); }")
lowfly = min(v['lowest'] for k, v in au.items() if k != 'death')
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly * 0.8:.2f}').replace('DEAD_MM', str(round(-dd * 0.8 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS', 'fire(', 'wall'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
