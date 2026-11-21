# Builds the Rotcap's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/rotcap'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/rotcap.audit.json'))
glb = open(S + '/rotcap.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/rotcap.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Rotcap Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Rotcap from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The fourth mob: your export of the Level I toadstool, with a skeleton and eight moves added by hand. It shambles on two root feet, swings its cap in the game's three-hit combo (hook, reverse swipe, slam), and dies the game's way: the cap swells, it pops, and its spores burst 0.8 s later. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what it does between bites, and Going turns it on the spot. The Cap combo plays over it and repeats until you press it again. Hurt plays on top of anything. Death pops it and leaves the burst: press it again and it sprouts back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="rotcap-views.png" alt="The Tripo Rotcap from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a wide red cap with tan warts and glowing yellow cracks, grey gills, a pale stalk with a scowling face and yellow eyes, two root arms with claws, two clusters of root feet, and two little toadstools growing behind the roots (they ride the feet).</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>19 <small>hips, a squash bone, 2 in the stalk, the cap, 3 in each root arm, 4 in each root leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.7 u tall <small>the cap 0.64 u across, the game's 0.68 u, its rim 0.39 u up as in the game, beside a 1 u hero. Its feet stand 0.22 u apart, the game's 0.16 u.</small></dd></div>
    <div><dt>In the game</dt><dd>Melee <small>22 health, shambles at 1.1 u/s, bites on contact for 7 once a second per target. Its death bursts: an Ember ring r 1.2 lands 0.8 s later for 10 and leaves a spore slick (30% slow) for 2.5 s.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>It breathes, the cap bobs and sways, it looks one way and the other with its whole stalk, the root fingers twitch, and once a loop the cap puffs. Pale spores drift round the cap, as in the game.</td><td>Mine, apart from the spores. 6 s loop.</td></tr>
      <tr><td>Walk</td><td>A waddle on its two root feet: it rolls onto each planted root, lurches up, and the cap sways a beat behind. Each root cluster is pinned while it carries weight.</td><td>Game: 1.1 u/s. 0.35 s a stride (the game's roots are longer and take 0.67 s; these short roots need quicker steps).</td></tr>
      <tr><td>Turn left, turn right</td><td>Short root steps round on the spot, the stalk and cap leading.</td><td>180° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Cap combo</td><td>The game's three hits key for key. A cap hook from its right across to its left, a reverse swipe back with the cap whirling on its stalk, then the held rear-up with the gills bared, a pull-back with a hop and the slam that drives the cap down with the deepest squash. Each hit's lead root steps in to plant on the contact. The root arms throw out with each strike (mine).</td><td>Game: the first contact 3.5 frames in, then one a second on the bite ticks; strikes 2.5 frames, held 2, snap 2.5, settle 5 frames; held wind-up, recover 0.35 s.</td></tr>
      <tr><td>Hurt</td><td>The cap jolts back and tilts, the stalk flinches, the arms pull in. Plays on top of any move, so planted feet stay planted.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Sprouts from the floor with the cap furled, unfurls with one overshoot and shakes off spores.</td><td>Game: grow in 7 frames, about 10% over. The unfurl and the shake are mine.</td></tr>
      <tr><td>Death</td><td>The game's burst: the cap swells, the body pops wide and is gone, and the Ember ring on the floor fills until the spores land and leave the slick.</td><td>Game: swell 0.09 s, pop 0.17 s, the ring lands 48 ticks (0.8 s) after the kill, the slick lasts 150 ticks.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor</td><td>RIM_MM mm at worst: the tips of the back roots as a foot lifts in the walk.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hits are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Death.</strong> The standard says a foe falls and stays down, but the game pops the Rotcap into its spore burst, so I built the game's. I can make a version that slumps and bursts instead.</li>
        <li><strong>The lunge.</strong> The game shoves the body 0.15 u and steps the lead root 0.16 u in. These roots are short, so both are 0.6 of that.</li>
        <li><strong>The tell.</strong> The game marks the cap's spots indigo. Here the tan warts glow a faint indigo; the model's own glowing yellow cracks stay as they are.</li>
        <li><strong>Mine.</strong> The idle, the arm swings in the combo, the turn rate and the unfurl on the spawn.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Each root cluster moves as one stiff piece, with only the front roots bending at the toe.</li>
        <li>The cap is one stiff piece: it nods, tilts, spins and swells, but the rim does not flex.</li>
        <li>Switching from Walk into the combo blends in 0.18 s, so a foot can slide a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: pale spores, the Ember burst ring and an olive spore slick on the floor, a pale hit spark. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="rotcap-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=0.7;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const SPORE=0xb7b98a, EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',chomp:'Cap combo',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['chomp'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=0.85; let HOME=NEAR; // where the hero stands, in u, in front of it: in its bite's reach\n  const WALK=1.1, RAGEWALK=1.1, TURN=2*Math.PI/2.0, BURST_R=1.2;")
rep("c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));", "c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'&&c.name!=='death'));")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.5,0.5,1); blob.position.set(0,0.004,0.0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[2.9,1.4,2.2],t:[0,0.4,0.35]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.4,0.6]},Side:{p:[3.6,0.8,0.4],t:[0,0.4,0.3]},Front:{p:[0.3,1.0,3.6],t:[0,0.4,0]},Back:{p:[-1.4,1.4,-3.0],t:[0,0.4,0.2]},Top:{p:[0,5.4,0.3],t:[0,0.2,0.4]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|cap|armL|foreL|handL|armR|foreR|handR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ring.visible,slick:+slick.material.opacity.toFixed(2),")
FX = r'''  // ---- effects (stand-ins, dim on purpose: drifting spores, the Ember burst ring, an olive spore slick, pale hit sparks)
  const FXP=[], RINGS=[]; let dotTex=null, ring=null, ringFill=null, slick=null, slickT=-1;
  let eyes=1, eyesTo=1, tell=0.16, tellTo=0.16, moteT=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<110;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48),new THREE.MeshBasicMaterial({color:0xe9dcc0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the burst's warning: an Ember ring r 1.2 on the floor that fills toward its landing
    ring=new THREE.Group(); const re=new THREE.Mesh(new THREE.RingGeometry(BURST_R-0.04,BURST_R,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.55,depthWrite:false,side:THREE.DoubleSide})); re.rotation.x=-Math.PI/2;
    ringFill=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.12,depthWrite:false})); ringFill.rotation.x=-Math.PI/2; ring.add(re,ringFill); ring.position.y=0.012; ring.visible=false; fxG.add(ring);
    slick=new THREE.Mesh(new THREE.CircleGeometry(BURST_R,64),new THREE.MeshBasicMaterial({color:SPORE,transparent:true,opacity:0,depthWrite:false})); slick.rotation.x=-Math.PI/2; slick.position.y=0.008; slick.visible=false; fxG.add(slick);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function spores(pos,n,spd,life,a){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()*0.6,Math.random()-0.5).normalize().multiplyScalar(spd*(0.3+Math.random()*0.7)); puff(pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.3,0,(Math.random()-0.5)*0.3)),v,{life:life*(0.7+Math.random()*0.6),s0:0.05,s1:0.12,a:a||0.25,col:SPORE,g:0.05,drag:1.5});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||0xe9dcc0); scene.add(r.m); r.m.position.copy(pos); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(ring)ring.visible=false; if(slick){slick.visible=false;slickT=-1;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0, BURST=48/60;
  const rim=()=>pt(bones.cap,[0,-0.05,0.42]);
  function fxStart(name){
    HOME=NEAR;
    if(name==='death'){ const f=toFloor(new THREE.Vector3(0,0,0)); ring.position.x=f.x; ring.position.z=f.z; slick.position.x=f.x; slick.position.z=f.z; ring.visible=fxOn; ringFill.scale.setScalar(0.01); slick.visible=false; slickT=-1; }
    blob.visible=true;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn){ dust(new THREE.Vector3(0,0,0),6,0.6,0.3); spores(new THREE.Vector3(0,0.5*U*1.4,0),6,0.4,1.0); } }
  }
  function fxContact(name,i){
    if(name==='chomp'){ const big=i===2; hitFeel(big?0.35:0.2,big?0.06:0.04,big?0.9:0.55); flash=big?0.25:0.15; hitDummy(big?0.12:0.07); if(fxOn){ sparks(rim(),big?7:4,SPARK,big?1.6:1.1,0.2); spores(rim(),big?6:3,0.6,0.7); if(big)dust(new THREE.Vector3(0,0,0.45),5,0.7,0.25); } }
    if(name==='death'&&i===0){ hitFeel(0.2,0.03,0); if(fxOn){ spores(new THREE.Vector3(0,0.55,0),16,1.1,0.9,0.3); ringAt(new THREE.Vector3(0,0.45,0),{r0:0.1,r1:0.6,dur:0.25,a:0.25,bill:true,col:SPORE}); } }
    if(name==='death'&&i===1){ hitFeel(0.3,0.04,0); ring.visible=false; slick.visible=fxOn; slickT=0; if(fxOn){ for(let k=0;k<10;k++){const a=k/10*Math.PI*2; spores(new THREE.Vector3(Math.cos(a)*BURST_R*0.7,0.1,Math.sin(a)*BURST_R*0.7),2,0.5,0.8,0.25);} dust(new THREE.Vector3(0,0,0),8,1.2,0.3); } }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.4); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='death'){ tellTo=0; blob.visible=t<0.24; if(ring.visible&&t<BURST){ const k=t/BURST; ringFill.scale.setScalar(Math.max(0.01,k*BURST_R)); ringFill.material.opacity=0.08+0.1*k; } }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; tellTo=sel.dead?0:0.16; if(ring&&!(shot&&shot.name==='death'))ring.visible=false; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*10); tell+=(tellTo-tell)*Math.min(1,d*8); flash=Math.max(0,flash-d*3.2);
    glowU.value.set((fxOn?1:0)*0.4*tell,0,feel?flash:0,0);
    // the game's idle spores: a few pale motes drifting round the cap
    if(fxOn&&!sel.dead){ moteT-=d; if(moteT<=0){ moteT=0.45; const a=Math.random()*Math.PI*2; puff(new THREE.Vector3(Math.cos(a)*0.32,0.5+Math.random()*0.15,Math.sin(a)*0.32),new THREE.Vector3(Math.cos(a)*0.05,0.08,Math.sin(a)*0.05),{life:1.6,s0:0.03,s1:0.06,a:0.3,col:SPORE,drag:0.5}); } }
    if(slickT>=0){ slickT+=d; const L=150/60; slick.material.opacity=slickT<0.2?0.14*slickT/0.2:slickT<L-0.4?0.14:Math.max(0,0.14*(L-slickT)/0.4); if(slickT>=L){ slickT=-1; slick.visible=false; } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'footL'],FR:[0.5,'footR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,-0.02,0.04]),1,0.25,0.15);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn){ sparks(pt(bones.cap,[0,0.1,0.2]),5,0xe9dcc0,1.1,0.2); spores(pt(bones.cap,[0,0.2,0]),3,0.4,0.6); } }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 0.7 * 1000))).replace('REACH_MM', str(round(max(v['reach_mm'] for v in au.values()) * 0.7)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS', 'fire(', 'lane'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
