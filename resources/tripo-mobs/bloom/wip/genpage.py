# Builds the Heart Bloom's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/bloom'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/bloom.audit.json'))
glb = open(S + '/bloom.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/bloom.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Heart Bloom Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Heart Bloom from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Hollow Heart's rooted pulse: your export of the Level IV bloom, with a skeleton and ten moves added by hand. It creeps on its roots, takes root for good, and pulses on the room's heartbeat: its petals open under the game's Ember ring and slam shut on the surge, three ways. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Rooted or Creep sets what it does between pulses, and Going turns it on the spot. Take root, Pulse and Pulse string play over it and repeat until you press them again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="bloom-views.png" alt="The Tripo Heart Bloom from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a closed bud of violet crystal petals round a glowing magenta heart, on a twisted dark stem with five crystal leaves, standing on eight spreading roots with crystal shards growing between them.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>42 <small>root, the knot, stem, neck and the bud, 5 petals round the bud, 4 in each of the 8 roots</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.1 u tall <small>the game's bloom stands about 1.05 u to the tips of its closed petals; its roots spread 0.7 u across here (the game's reach 1.1 to 1.5 u). Beside a 1 u hero.</small></dd></div>
    <div><dt>In the game</dt><dd>The Hollow Heart <small>34 health, creeps at 0.7 u/s and takes root for good once a hero is within 2.4 u (or after 4 s), shrugging off knockback. Rooted, on every second beat of the room's heart (every 6 s) it opens under an Ember ring r 2.3 round itself for 54 ticks and shuts on the surge for 12 to everyone inside. Every bloom in the room pulses on the same beat.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Rooted</td><td>Its life once rooted: the knot sunk onto its roots, the bud breathing open and the body swelling as the room's heart swells, a thump as it beats, the core glowing with it.</td><td>Game: the heart's 180 ticks, the swell over its last 30, the surge over its first 42; the petals breathe 0.12, the body swells 6%. 6 s loop (two beats).</td></tr>
      <tr><td>Creep</td><td>Shuffles forward on its roots, every other root stepping in turn, the knot bobbing and the bud nodding.</td><td>Game: 0.7 u/s, steps of 0.1 s. Four and four roots here; the game has seven.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot on its roots.</td><td>120° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Take root</td><td>Stops creeping and drives its roots in: they step a little wider in three frames, the knot sinks onto them with a jolt and settles with one overshoot, the bud shivering.</td><td>Game: the drive 3 frames, the settle 8. The game steps the roots 18% wider; these modelled roots reach 8% further.</td></tr>
      <tr><td>Pulse</td><td>The game's pulse key for key: through the 54-tick ring the petals open and twist to its left, the bud lifts and the core flares; on the resolve tick the petals slam shut past closed and the head squashes down, held 3 frames, then the snap back and the settle. The heart swells under the coil and beats on the snap.</td><td>Game: coil 54 ticks less the 2.5-frame strike, hold 3 frames, snap 3, settle 8, rest 0.3 s; the petals open at 14/s and slam at 40/s.</td></tr>
      <tr><td>Pulse string</td><td>The game's three pulses in turn: splayed to its left, splayed to its right, then the full bloom, the widest open and the hardest snap. In the game they come 6 s apart; here back to back, the hero put back inside the ring before each.</td><td>Game: each pulse as above.</td></tr>
      <tr><td>Hurt</td><td>The game's rooted reaction: a full squash, a light flinch at the bulb, the petals clenching. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, the petals unfurl a little and close, then it takes root.</td><td>Game: grow in 7 frames, about 10% over. The unfurl is mine; the game lets it creep for up to 4 s before it roots.</td></tr>
      <tr><td>Death</td><td>Struck, it shudders; the light goes out, the petals fall open and limp and the stem bows over to its front until the bud lies on the floor, the roots staying where they grip.</td><td>Mine: the bow takes 0.7 s. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted roots</td><td>Move 0 mm. Out of reach: at most 4 mm, in the creep.</td></tr>
      <tr><td>Loops that jump when they restart (rooted, creep, both turns)</td><td>0</td></tr>
      <tr><td>Below the floor</td><td>At most 3 mm, the root nearest the knot as it shuffles in the creep.</td></tr>
      <tr><td>Lying dead</td><td>The bud rests on the floor ahead of its roots (the bow that lays it there measured per 0.1 rad), DEAD_MM mm at worst.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the beat, the snap and the creep are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The petals.</strong> Your bud is one welded piece, so its five petals are bones laid round it by angle: they peel open from the top and stretch at the seams between them. I splay them half the game's angle so they do not tear. Separate petals in a new export could open as wide as the game's.</li>
        <li><strong>Size.</strong> Its height matches the game's at 1.1 u, but its roots spread half as far. Larger would match the roots and make it taller than the game's.</li>
        <li><strong>Mine.</strong> The turn rate, the spawn's unfurl, the creep's eight roots in two sets, the hurt's clench and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Opening, the bud shows no inside: the petals peel from a closed shell, so wide open it looks like a cup more than a flower.</li>
        <li>The roots are modelled nearly straight, so they have little give: the creep's steps are short and quick.</li>
        <li>The crystal leaves and shards ride the stem and roots and do not move on their own.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember ring, the core and petal glow, crystal shards and a violet ring on the snap, hit sparks and dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="bloom-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.1;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478, SHARD=0xc9a6ff;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Rooted',walk:'Creep',turnL:'Turn left',turnR:'Turn right',root:'Take root',pulse:'Pulse',pulses:'Pulse string',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['root','pulse','pulses'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.1; let HOME=NEAR; // where the hero stands, in u, in front of it: inside the 2.4 u where it takes root, inside its 2.3 u ring\n  const WALK=0.7, RAGEWALK=0.7, TURN=Math.PI/1.5, RAD=2.3, TEL=54/60, HB=180;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.36,0.36,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[5.0,2.5,-0.2],t:[0,0.45,1.0]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[6.4,1.2,0.8],t:[0,0.55,0.8]},Front:{p:[0.5,1.5,6.4],t:[0,0.6,0]},Back:{p:[-2.6,2.2,-4.8],t:[0,0.6,0.4]},Top:{p:[0,9,0.6],t:[0,0.3,0.6]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(stem|neck|bud|p\\d)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ring.visible,")
rep("c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));", "c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the Ember ring round it, the core and crystal glow on the heart's beat and the pulse, crystal shards on the snap, pale hit sparks, dust)
  const FXP=[], RINGS=[]; let dotTex=null, ring=null, pulseN=-1;
  let core=0.35, coreTo=0.35, bud=0, budTo=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,64),new THREE.MeshBasicMaterial({color:0xe9dcc0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning: the game's Ember ring r 2.3 round itself, filling over its 54 ticks
    ring=new THREE.Group(); const rf=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.1,depthWrite:false})); rf.rotation.x=-Math.PI/2;
    const re=new THREE.Mesh(new THREE.RingGeometry(RAD-0.06,RAD,72),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.5,depthWrite:false})); re.rotation.x=-Math.PI/2;
    ring.add(rf,re); ring.userData={rf,re}; ring.position.y=0.012; ring.visible=false; scene.add(ring);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0,side:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.flat=!!o.flat; r.delay=o.delay||0; r.m.material.color.setHex(o.col||0xe9dcc0); scene.add(r.m); r.m.position.copy(pos); r.m.rotation.set(o.flat?-Math.PI/2:0,0,0); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(ring)ring.visible=false; pulseN=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0, PSEC=META.pulse?META.pulse.dur:1.67;
  // the room's heart: the swell over the last 30 of its 180 ticks, the surge over the first 42 (the game's clock)
  const heart=(ph)=>{ ph=((ph%HB)+HB)%HB; const sm=k=>{k=Math.max(0,Math.min(1,k));return k*k*(3-2*k);}; return {swell:ph>=HB-30?sm((ph-(HB-30))/30):0, surge:ph<42?1-0.6*sm(ph/42):0}; };
  const flareAt=(t)=>{ const c=Math.max(0,Math.min(1,t/(TEL-2.5/30))); const cc=0.85*(1-(1-Math.min(1,c/0.4))**2)+0.15*c; return t<TEL-2.5/30?0.85*cc:t<TEL+0.2?1:Math.max(0,0.55*(1-(t-TEL-0.2)/0.35)); };
  const corePt=()=>pt(bones.bud,[0,0.18,0]);
  function fxStart(name){
    HOME=NEAR; blob.visible=true; ring.visible=false; pulseN=-1;
    if(name==='spawn'){ core=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='pulse'||name==='pulses'){ ring.visible=false; const big=name==='pulses'&&i===2; hitFeel(big?0.35:0.25,big?0.05:0.04,big?0.6:0.45); flash=0.2;
      if(dummy&&Math.hypot(dummy.position.x,dummy.position.z)<=RAD+0.3)hitDummy();
      if(fxOn){ ringAt(new THREE.Vector3(0,0.03,0),{r0:0.3,r1:RAD,dur:0.25,a:0.35,flat:true,col:SHARD}); sparks(corePt(),big?10:7,SHARD,1.6,0.3); const p=targetW().setY(0.6); sparks(p,5,SPARK,1.4,0.22); } }
    if(name==='root'||name==='spawn'){ hitFeel(0.1,0.02,0.2); if(fxOn)for(let k=0;k<8;k++){ const a=k*Math.PI/4; dust(new THREE.Vector3(Math.sin(a)*0.32,0,Math.cos(a)*0.32),1,0.4,0.2); } }
    if(name==='death'){ hitFeel(0.1,0,0.15); if(fxOn)dust(pt(bones.bud,[0,0.2,0]).setY(0),6,0.5,0.2); }
  }
  // the surge knocks him back and tips him; he steps back to his place between pulses
  function hitDummy(){ if(!dummy||!showTarget)return; const u=dummy.userData; u.kick=0.35; u.tip=0.35; u.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='pulse'||n==='pulses'){ const k=n==='pulses'?Math.min(2,Math.floor(t/PSEC)):0, tt=t-k*PSEC;
      if(k!==pulseN){ pulseN=k; if(dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; dummy.position.set(0,0,NEAR); } }
      const h=heart(HB-54+tt*60), fl=flareAt(tt);
      coreTo=Math.min(1,0.35+0.35*h.swell+0.3*h.surge+0.55*fl); budTo=0.35*h.swell+0.7*fl;
      if(tt<TEL){ const kk=tt/TEL; ring.visible=fxOn; ring.userData.rf.scale.setScalar(Math.max(0.01,RAD*kk)); ring.userData.rf.material.opacity=0.05+0.1*kk; ring.userData.re.material.opacity=0.3+0.35*kk; } else ring.visible=false; }
    if(n==='death'){ coreTo=0.35*(1-Math.min(1,t/0.3)); budTo=0; if(t>1.2)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ coreTo=t>0.25?0.35:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done;
    if(!busy||shot.name==='root'||shot.name==='hurt'){ if(sel.dead){ coreTo=0; budTo=0; } else if(A.idle&&A.idle.__w>0.5){ const h=heart(A.idle.time*60); coreTo=Math.min(1,0.35+0.35*h.swell+0.3*h.surge); budTo=0.35*h.swell; } else { coreTo=0.35; budTo=0; } if(ring&&!busy)ring.visible=false; }
    core+=(coreTo-core)*Math.min(1,d*12); bud+=(budTo-bud)*Math.min(1,d*12); flash=Math.max(0,flash-d*3.2);
    glowU.value.set((fxOn?1:0)*0.9*core,0,feel?flash:0,(fxOn?1:0)*0.25*bud);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.kick>0){ u.z+=u.kick*d*6; u.kick=Math.max(0,u.kick-d*1.5); } u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.5*u.tip;
      if(!busy){ u.hold=0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.bud,[0,0.15,0.1]),5,0xe9dcc0,1.1,0.2); }")
lowfly = min(v['lowest'] for k, v in au.items() if k != 'death')
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly * 1.1:.2f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.1 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS', 'fire(', 'wall', 'lane', 'bead', 'dart', 'mark', 'ASH', 'RISE', 'jumped'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
