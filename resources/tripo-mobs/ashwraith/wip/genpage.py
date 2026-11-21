# Builds the Ash Wraith's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/ashwraith'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/ashwraith.audit.json'))
glb = open(S + '/ashwraith.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/ashwraith.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Ash Wraith Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Ash Wraith from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The first Level V mob: your export of the Ember Kiln's stalker, with a skeleton and eight moves added by hand. It floats, drifts, and makes the game's one attack: it fades into ash, an Ember ring opens behind the hero, and it rises on the ring whole and rakes, then hangs spent. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Hover or Drift sets what it does between attacks, and Going turns it on the spot. Fade and rake plays over it and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="ashwraith-views.png" alt="The Tripo Ash Wraith from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a cracked iron bell for a hood, the crack glowing like embers, with a hanging ring on top and two orange eyes under the rim, a ragged column of ash that tapers to a point, and two long thin arms ending in cinder claws.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>15 <small>root, hips, a squash bone, spine, chest, the hood, 3 down the ash skirt, 3 in each arm</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.35 u tall <small>ring to tail tip, floating with its tail 0.15 u off the floor. The game's wraith reaches about 1.37 u to the top of its hood on its 0.35 u hover. Beside a 1 u hero.</small></dd></div>
    <div><dt>In the game</dt><dd>The Kiln, from room 3 <small>24 health, drifts at 1.7 u/s keeping 2.4 to 5.0 u from its target. On a hero 1.2 to 5.4 u off it fades: an Ember ring r 1.3 opens 1.4 u behind the hero for 60 ticks while it cannot be hit, then it rises on the ring facing him and rakes for 11. It hangs spent for 90 ticks, slowed and taking 30% more. Every 260 ticks; campaign rooms only.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Hover</td><td>The game's float: a slow bob, the arms swaying, the skirt rippling. On top it turns its hood one way and the other and flexes its claws.</td><td>Game: bob 0.06 u at 1.7 rad/s (rounded to a 3.7 s period so the loop closes). The looks and claw flex are mine. 7.4 s loop.</td></tr>
      <tr><td>Drift</td><td>Floats forward leaning into it, the skirt trailing.</td><td>Game: 1.7 u/s, the lean 0.15 rad. The trailing skirt is mine.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot, the skirt swinging wide.</td><td>180° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Fade and rake</td><td>The game's attack key for key. It collapses into a swirl of ash where it floats, squashing and spinning, and is gone. The Ember ring fills behind the hero while a wisp of ash hangs where it was. It rises on the ring whole at once, turned to face him, both claws high, and rakes them down across him. Then it hangs spent: low, slumped, arms dangling, the eyes nearly out, and creeps back to its float.</td><td>Game: the fade 0.2 s (scaled down and spun 5 turns' worth of radians, gone from 97%), the ring 60 ticks, the rake on the rise (the claws swing down over half a second), spent 90 ticks with the last 40 creeping back. On the page it moves to the ring at the rise.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the hood snaps up, the arms fling out and the skirt whips. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in out of a swirl of ash, slumped, then straightens into the float with its arms opening.</td><td>Game: grow in 7 frames, about 10% over. The rise and the arms are mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears back, the float gives out and it pitches forward onto its front, the skirt draped behind it, the hood tipped onto its rim and the arms splayed. The eyes go out.</td><td>Mine: the fall takes about half a second. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet</td><td>None: it floats and never touches the floor while alive.</td></tr>
      <tr><td>Loops that jump when they restart (hover, drift, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point while alive</td><td>LOW_U u above the floor (the tail tip, slumped spent after the rake).</td></tr>
      <tr><td>Lying dead</td><td>Its lowest point rests on the floor through the fall and after, measured per 0.1 rad of tip so it never sinks or floats (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the float, the timing and the rake are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The look.</strong> Your model is a bell-hooded wraith with orange eyes; the game's is a hunched hooded column of ash with indigo pin-eyes and a gold ember in its chest. I kept your design. Here the eyes take a faint indigo glow over their orange, brightest as it rises; I can glow them orange instead.</li>
        <li><strong>The teleport.</strong> The game moves it to the ring in one tick and turns it to face the hero. The page does the same: the floor jumps under it at the rise. It reads as a surprise in the game; on the page you lose sight of the move for a frame.</li>
        <li><strong>Death.</strong> The standard says a foe falls and stays down, so it pitches onto its front. The game pops every foe flat; it could instead crumble into ash like its fade, if you prefer.</li>
        <li><strong>Mine.</strong> The looks and claw flex in the hover, the turn rate, the trailing skirt, the spawn rise and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The skirt is one tail of three bones: it trails and ripples as one piece, not as separate tattered strips like the game's eight.</li>
        <li>The bell hood is rigid on one bone; its hanging ring does not swing.</li>
        <li>Lying dead, the long claws of one hand stand up off the floor rather than lying flat.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember ring, the ash swirls and flakes, the indigo in the eyes, pale hit sparks and landing dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="ashwraith-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.35;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const INDIGO=0x5B4BD6, EMBER=0xFF5A36, DUST=0x8d8478, ASH=0x8a8580;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Hover',walk:'Drift',turnL:'Turn left',turnR:'Turn right',rake:'Fade and rake',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['rake'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.4; let HOME=NEAR; // where the hero stands, in u, in front of it: inside the game's 2.4 to 5.0 u keep and its 5.4 u fade range\n  const WALK=1.7, RAGEWALK=1.7, TURN=Math.PI, BEHIND=1.4, RAD=1.3, RISE=1.0;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.3,0.24,1); blob.position.set(0,0.004,0.02);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[7.0,3.2,2.4],t:[0,0.5,2.4]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.6]},Side:{p:[8.2,1.4,2.2],t:[0,0.7,2.2]},Front:{p:[0.6,1.8,7.8],t:[0,0.8,0.4]},Back:{p:[-2.6,2.6,-4.4],t:[0,0.8,1.2]},Top:{p:[0,11.5,2.6],t:[0,0.4,2.6]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(hips|sq|spine|chest|head|sk1|sk2|sk3|armL|foreL|handL|armR|foreR|handR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),mark:mark.visible,")
rep("c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));", "c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'&&c.name!=='rake'));")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the Ember ring behind the hero, the ash it fades into and rises from, a faint indigo in the eyes, pale hit sparks, landing dust)
  const FXP=[], RINGS=[]; let dotTex=null, mark=null, moteT=0, markZ=0;
  let eyes=1, eyesTo=1, tell=0.25, tellTo=0.25;
  // the camera rides the jump to the mark so the floor and the hero hold still on screen, then glides back to the chosen view between rakes
  let jumped=false; const camTo=new THREE.Vector3(), tgtTo=new THREE.Vector3();
  const curView=()=>{ const b=Object.values(B.views).find(b=>b.getAttribute('aria-pressed')==='true'); return b?b.dataset.k:'Close'; };
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<120;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48),new THREE.MeshBasicMaterial({color:0xe9dcc0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning: the game's Ember ring r 1.3 on the mark, 1.4 u behind the hero, filling over its 60 ticks
    mark=new THREE.Group(); const mf=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.1,depthWrite:false})); mf.rotation.x=-Math.PI/2;
    const me=new THREE.Mesh(new THREE.RingGeometry(RAD-0.05,RAD,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.5,depthWrite:false})); me.rotation.x=-Math.PI/2;
    mark.add(mf,me); mark.userData={mf,me}; mark.position.y=0.012; mark.visible=false; fxG.add(mark);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0,side:0,tip:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||0xe9dcc0); scene.add(r.m); r.m.position.copy(pos); r.m.visible=false; }
  // a column of ash turning round where it stands (floor: left behind on the floor where it faded)
  function ashSwirl(n,r,h,spd,life,floor){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, rr=r*(0.5+Math.random()*0.6); puff(new THREE.Vector3(Math.cos(a)*rr,0.1+h*Math.random(),Math.sin(a)*rr),new THREE.Vector3(-Math.sin(a)*spd,0.3+0.4*Math.random(),Math.cos(a)*spd),{life:life*(0.7+Math.random()*0.6),s0:0.07,s1:0.26,a:0.2,col:ASH,drag:1.2,floor}); } }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(mark)mark.visible=false; blob.visible=true; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0;
  function fxStart(name){
    HOME=NEAR; blob.visible=true; mark.visible=false;
    if(name==='rake'){ markZ=(dummy?dummy.userData.z:NEAR)+BEHIND; const f=toFloor(new THREE.Vector3(0,0,markZ)); mark.position.x=f.x; mark.position.z=f.z; mark.userData.mf.scale.setScalar(0.01); mark.visible=fxOn; if(fxOn)ashSwirl(10,0.22,1.0,0.9,0.6,true); }
    if(name==='spawn'){ eyes=0; tell=0; cv.style.filter=''; if(fxOn)ashSwirl(12,0.25,0.9,0.8,0.6,false); }
  }
  function fxContact(name,i){
    // it rises on the mark, turned round to face the hero 1.4 u in front of it
    if(name==='rake'){ mark.visible=false; const M0=fxG.matrix.clone().invert(); moveFloor(markZ,Math.PI); const M=fxG.matrix.clone().multiply(M0); cam.position.applyMatrix4(M); orbit.target.applyMatrix4(M); orbit.update(); jumped=true; if(dummy){ const u=dummy.userData; u.z=BEHIND; u.x=0; dummy.position.set(0,0,BEHIND); }
      hitFeel(0.3,0.05,0.5); flash=0.25; hitDummy(); tell=0.9; if(fxOn){ ashSwirl(16,0.3,1.1,1.6,0.5,false); const p=targetW().setY(0.6); sparks(p,6,SPARK,1.5,0.22); ringAt(p,{r0:0.05,r1:0.4,dur:0.2,a:0.35,bill:true}); } }
    if(name==='death'){ hitFeel(0.12,0,0.2); if(fxOn)dust(pt(bones.head,[0,0,0]).setY(0),7,0.6,0.25); }
  }
  // the rake knocks him back and tips him; he steps back to his place between rakes
  function hitDummy(){ if(!dummy||!showTarget)return; const u=dummy.userData; u.kick=0.35; u.tip=0.35; u.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='rake'){
      if(t<RISE){ const k=Math.min(1,t/RISE); mark.userData.mf.scale.setScalar(Math.max(0.01,RAD*k)); mark.userData.mf.material.opacity=0.05+0.1*k; mark.userData.me.material.opacity=0.3+0.35*k; tellTo=t<0.2?0.7:0; blob.visible=t<0.16;
        moteT-=d; if(fxOn&&moteT<=0){ moteT=t<0.25?0.03:0.09; ashSwirl(t<0.25?2:1,t<0.25?0.25:0.12,t<0.25?1.0:0.45,0.6,0.7,true); } }
      else { blob.visible=true; tellTo=t<RISE+0.4?0.9:t<RISE+1.5?0.08:0.25; } }
    if(n==='death'){ tellTo=0.25*(1-Math.min(1,t/1.0)); if(t>1.2)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ tellTo=t>0.25?0.25:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ tellTo=sel.dead?0:0.25; if(mark)mark.visible=false; blob.visible=true; }
    tell+=(tellTo-tell)*Math.min(1,d*8); flash=Math.max(0,flash-d*3.2);
    if(jumped&&!busy){ const v=VIEWS[curView()]; camTo.set(...v.p); tgtTo.set(...v.t); const k=Math.min(1,d*2.5); cam.position.lerp(camTo,k); orbit.target.lerp(tgtTo,k); if(cam.position.distanceTo(camTo)<0.02&&orbit.target.distanceTo(tgtTo)<0.02){ jumped=false; } }
    glowU.value.set((fxOn?1:0)*0.45*tell,0,feel?flash:0,0);
    // the shadow under it: smaller and fainter the higher it floats
    if(bones.hips){ const hy=bones.hips.getWorldPosition(tmp2).y; const k=Math.max(0.45,Math.min(1.2,1.2-0.6*hy)); blob.scale.set(0.3*k,0.24*k,1); }
    // ash flaking off the skirt while it floats (the game's flakes of ash), never while gone or dead
    const gone=busy&&shot.name==='rake'&&shot.action.time<RISE;
    if(fxOn&&!sel.dead&&!gone){ moteT-=d; if(moteT<=0){ moteT=0.22+0.1*Math.random(); puff(pt(bones.sk2,[0,-0.06,0]),new THREE.Vector3((Math.random()-0.5)*0.15,0.25+0.15*Math.random(),(Math.random()-0.5)*0.15),{life:1.1,s0:0.04,s1:0.09,a:0.18,col:ASH,drag:0.5}); } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.kick>0){ u.z+=u.kick*d*6; u.kick=Math.max(0,u.kick-d*1.5); } u.tip=Math.max(0,u.tip-d*1.2); dummy.rotation.x=0.5*u.tip;
      if(!busy){ u.hold=0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0.02,0.08]),5,0xe9dcc0,1.1,0.2); }")
lowfly = min(v['lowest'] for k, v in au.items() if k != 'death')
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly * 1.35:.2f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.35 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS', 'fire(', 'wall', 'lane', 'bead', 'dart'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
