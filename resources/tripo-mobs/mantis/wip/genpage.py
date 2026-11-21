# Builds the Spitting Mantis's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/mantis'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/mantis.audit.json'))
glb = open(S + '/mantis.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/mantis.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Spitting Mantis Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Spitting Mantis from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The second mob: your export of the Level I shooter, with an insect skeleton and ten moves added by hand. The head snaps from look to look, the wing covers fan out as a threat while the spit loads, the two bladed forelegs lash on the spit, and the four walking legs keep their feet pinned while they carry weight. His walk speed, the spit's warning and its three versions use the game's numbers. Pick a move, drag to turn him, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. A Spit plays over it and repeats until you press it again; the game plays the three versions in turn. Hurt plays on top of anything. Death holds him down: press it again and he spawns back in. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="mantis-views.png" alt="The Tripo Spitting Mantis from the front, his right side, the back and his left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">He came through whole: the triangular head with both eyes and antennae, the long pronotum, two spined raptorial forelegs folded in the guard, four thin walking legs with claws, and the wing covers lying over the abdomen.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>32 <small>thorax, pronotum, head, 2 in the abdomen, both antennae, both wing covers, 3 in each foreleg, 4 in each walking leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.1 u long <small>head 0.92 u up, the game's mantis height, beside a 1 u hero. His feet stand 0.9 u apart front to back; the game's mantis is 0.41 u, so this one is a longer bug.</small></dd></div>
    <div><dt>In the game</dt><dd>Shooter <small>15 health, keeps 2.4 to 3.5 u away, one spit every 2.5 s for 10, warned 0.7 s ahead</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What he does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The head never scans smoothly: it holds a look, then snaps to the next with a small overshoot, as in the game. Under it the body rocks, the abdomen breathes, the antennae sweep and twitch, and once a loop the left foreleg gives a grooming flick.</td><td>Game: a look every 0.9 s, each snap 4 ticks. 5.4 s loop.</td></tr>
      <tr><td>Walk</td><td>The four walking legs step in diagonal pairs with high knees, each foot pinned while it carries weight. The forelegs ride in the guard and are never walked on.</td><td>Game: 1.6 u/s. 0.3 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Short steps round on the spot, the head leading and the abdomen swinging out.</td><td>200° a second (my number: the game turns him instantly). 0.35 s a cycle.</td></tr>
      <tr><td>Spit (three versions)</td><td>He rears back over his hind legs, the forelegs come up and open, the wing covers fan out, the abdomen pumps three times and the eyes brighten while the warning lane fills. A short coil, then the head and thorax whip forward and down, the forelegs lash down and snap shut and the shot leaves his mouth. He is shoved back, recoils past his guard and settles with one overshoot. Left blade leads, right blade leads (the other blade lands 2 ticks later, the body leans toward the leader), or both crash together with a deeper bow and a bigger shove.</td><td>Game: warning 42 ticks (0.7 s): rear and load 31, coil 6, strike 5 ticks, the contact on the resolve tick. Held 2 frames, recoil 5 frames, settle 0.4 s. The shot flies at 4 u/s.</td></tr>
      <tr><td>Hurt</td><td>The head and pronotum flinch back, the forelegs flare, the antennae lay back. Plays on top of any move, so planted feet stay planted.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor crouched with the blades tucked, rises, throws the forelegs open with a flash of the wing covers, and settles into the guard.</td><td>Game: grow in 7 frames, about 10% over, then stand. The rise and the blade display are mine.</td></tr>
      <tr><td>Death</td><td>A jolt with the forelegs flying open and the head thrown back. The legs give and the body drops onto its belly with the walking legs splaying flat, it tips to one side, the forelegs fold on the floor in front, the legs twitch and go still and the wing covers slip half open.</td><td>2.2 s, then he stays down</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor</td><td>RIM_MM mm at worst outside the death. Dying, the abdomen touches the floor for a few frames as he lands; lying dead he rests on it.</td></tr>
      <tr><td>Antennae and abdomen</td><td>Run as springs: they trail the body and settle after it stops.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Body length.</strong> At the game's height this mantis is about twice as long as the game's, so he takes more floor. If you want him to match the game's footprint I can draw him smaller (about 0.8 u long), which makes him shorter than the game's too.</li>
        <li><strong>The tell.</strong> The game marks the mantis with an indigo glint on the eyes. Here the eyes brighten through the warning and flare on the spit in the model's own colour; I can tint them indigo.</li>
        <li><strong>The jaws.</strong> The game's mantis flares two bone mandibles on the spit. This model has no separate jaws, so the head kicks on the contact frame instead.</li>
        <li><strong>Idle flick.</strong> The grooming flick of the left foreleg is mine.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The model's forelegs fold tighter than the game's sticks, so their swings are three quarters of the game's angles to keep the blades out of the head and body.</li>
        <li>The wing covers move as two stiff plates.</li>
        <li>The thin legs bend at their joints only; the femurs do not flex.</li>
        <li>Switching from Walk into a Spit blends in 0.18 s, so a foot can slide a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember warning lane on the floor and the Foe Crimson sickle shot the game uses for him, a pale hit spark. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="mantis-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.1;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const CRIMSON=0xB8141F, EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',spitA:'Spit: left blade leads',spitB:'Spit: right blade leads',spitC:'Spit: both blades',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['spitA','spitB','spitC'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.0; let HOME=NEAR; // where the hero stands, in u, in front of him: inside his 2.4 to 3.5 u band\n  const WALK=1.6, RAGEWALK=1.6, TURN=2*Math.PI/1.8, SHOT=4.0, RANGE=7.0;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.3,0.55,1); blob.position.set(0,0.004,0.06);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[5.8,2.1,0.2],t:[0,0.42,1.3]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.4,1.2]},Side:{p:[5.4,0.9,0.6],t:[0,0.5,0.4]},Front:{p:[0.4,1.0,5.4],t:[0,0.55,0]},Back:{p:[-1.9,1.7,-4.0],t:[0,0.5,0.3]},Top:{p:[0,7.6,0.3],t:[0,0.2,0.6]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(pron|head|antL|antR|abd1|abd2|wingL|wingR|rCoxaL|rFemurL|rTibiaL|rCoxaR|rFemurR|rTibiaR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,bolts:BOLTS.filter(b=>b.t>=0).length,")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the Ember warning lane, the Foe Crimson sickle shot, pale hit sparks)
  const FXP=[], RINGS=[], BOLTS=[]; let dotTex=null, lane=null, bead=null;
  let eyes=1, eyesTo=1;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48),new THREE.MeshBasicMaterial({color:CRIMSON,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the warning: the shot's lane on the floor, its charge bead running out along it
    lane=new THREE.Group(); const lf=new THREE.Mesh(new THREE.PlaneGeometry(0.16,1),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.14,depthWrite:false})); lf.rotation.x=-Math.PI/2; lf.position.z=0.5;
    const le=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.03),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false})); le.rotation.x=-Math.PI/2; le.position.z=1;
    lane.add(lf,le); lane.userData={lf:lf.material,le:le.material}; lane.position.y=0.012; lane.visible=false; fxG.add(lane);
    bead=new THREE.Mesh(new THREE.CircleGeometry(0.07,20),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); bead.rotation.x=-Math.PI/2; bead.visible=false; lane.add(bead);
    // the sickle shot: a crescent and its trail
    for(let i=0;i<3;i++){ const gq=new THREE.Group(); const cr=new THREE.Mesh(new THREE.RingGeometry(0.05,0.085,20,1,Math.PI*0.15,Math.PI*0.7),new THREE.MeshBasicMaterial({color:CRIMSON,transparent:true,opacity:0.9,depthWrite:false,side:THREE.DoubleSide})); cr.rotation.x=-Math.PI/2; cr.rotation.z=-Math.PI/2;
      const tr=new THREE.Mesh(new THREE.PlaneGeometry(0.05,0.22),new THREE.MeshBasicMaterial({color:CRIMSON,transparent:true,opacity:0.35,depthWrite:false,side:THREE.DoubleSide})); tr.rotation.x=-Math.PI/2; tr.position.z=-0.13; gq.add(cr,tr); gq.visible=false; scene.add(gq); BOLTS.push({g:gq,t:-1,o:new THREE.Vector3(),d:new THREE.Vector3(),hit:false}); }
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||CRIMSON); scene.add(r.m); r.m.position.copy(pos); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); BOLTS.forEach(b=>{b.t=-1;b.g.visible=false;}); if(lane)lane.visible=false; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0, TEL=42/60;
  const mouth=()=>pt(bones.head,[0,-0.065,0.08]);
  const blade=(s)=>pt(bones['rTibia'+s],[0,-0.3,-0.02]);
  function fxStart(name){
    HOME=NEAR;
    if(name.startsWith('spit')){ if(dummy){ const u=dummy.userData; u.z=NEAR; u.x=0; u.kick=0; u.sx=0; u.hold=0; dummy.position.set(0,0,NEAR); }
      if(fxOn){ const m=toFloor(mouth().setY(0)); lane.position.x=m.x; lane.position.z=m.z; lane.rotation.y=-floorYaw; const L=RANGE; lane.children[0].scale.y=L; lane.children[0].position.z=L/2; lane.children[1].position.z=L; lane.userData.L=L; lane.visible=true; } }
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)dust(new THREE.Vector3(0,0,0.2),6,0.8,0.3); }
  }
  function fire(){ const b=BOLTS.find(b=>b.t<0); if(!b||!fxOn&&!showTarget)return; const m=mouth(); b.o.copy(m).setY(Math.max(0.35,m.y*0.6)); b.d.set(0,0,1); b.t=0; b.hit=false; b.g.visible=fxOn; b.g.position.copy(b.o); }
  function fxContact(name,i){
    if(name.startsWith('spit')){
      const both=name==='spitC';
      if(i===0){ hitFeel(both?0.3:0.2,0.04,both?0.8:0.55); flash=0.2; lane.visible=false; fire(); if(fxOn){ ringAt(mouth(),{r0:0.04,r1:0.3,dur:0.18,a:0.5,bill:true}); sparks(mouth(),4,CRIMSON,1.2,0.18); } }
      if(fxOn){ const s=name==='spitA'?(i===0?'L':'R'):name==='spitB'?(i===0?'R':'L'):null; (s?[s]:['L','R']).forEach(k=>sparks(blade(k),3,SPARK,0.9,0.16)); } }
    if(name==='death'){ hitFeel(0.25,0,0.25); if(fxOn)dust(pt(bones.hips,[0,-0.1,0]).setY(0),8,0.8,0.3); }
  }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.5); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n.startsWith('spit')){ const k=Math.min(1,t/TEL); eyesTo=t<TEL?1+1.6*k:t<TEL+0.2?3:1;
      if(lane.visible&&t<TEL){ lane.userData.lf.opacity=0.08+0.12*k; lane.userData.le.opacity=0.35+0.35*k; bead.visible=true; bead.position.z=0.2+k*(lane.userData.L-0.2); bead.material.opacity=0.5+0.3*k; } }
    if(n==='death'){ eyesTo=t>1.7?0:1-0.6*t/1.7; if(t>1.7)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; if(lane)lane.visible=false; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*10); flash=Math.max(0,flash-d*3.2);
    glowU.value.set(0,0,feel?flash:0,(fxOn?1:0)*0.22*eyes);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    BOLTS.forEach(b=>{ if(b.t<0)return; b.t+=d; const dist=SHOT*b.t; b.g.position.copy(b.o).addScaledVector(b.d,dist); b.g.rotation.y=b.t*0; b.g.visible=fxOn;
      if(!b.hit&&dummy&&showTarget&&b.g.position.z>=dummy.position.z-0.22){ b.hit=true; b.t=-1; b.g.visible=false; hitDummy(0.12); if(fxOn){ sparks(targetW().setY(b.o.y),6,SPARK,1.6,0.22); sparks(targetW().setY(b.o.y),3,CRIMSON,1.0,0.2); } return; }
      if(dist>RANGE){ b.t=-1; b.g.visible=false; } });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'mClawL'],HR:[0.02,'hClawR'],FR:[0.5,'mClawR'],HL:[0.52,'hClawL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,-0.02,0.02]),1,0.25,0.15);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0.02,0.03]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 1.1 * 1000))).replace('REACH_MM', str(round(max(v['reach_mm'] for v in au.values()))))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
