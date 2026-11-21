# Builds the Thornmother's review page from the Stag's (same bench, CSS and loop), swapping the text and the effects.
import sys
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
s = open(S + '/stagreview/index.html').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

rep('<title>Tripo Hollow Stag Review</title>', '<title>Tripo Thornmother Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Thornmother from Tripo, rigged</h1>
    <p class="lede">Your export of the second Level I boss, with a four-legged skeleton and 11 moves added by hand. Every thorn blade and seed pod has its own joint. Her timings are the game's. Pick a move, drag to turn her, and judge the weight and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what she does between attacks, and Going turns her on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds her down: press it again and she spawns back in. The bar names the part of the move that is playing, in the game's own words. Thorn patches from a Seed Volley stay on the floor for 12 s: charge through one and she tears it up.</p>
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
      <img src="thorn-views.png" alt="The Tripo Thornmother from the front, her left, the back and her right, before rigging" width="810" height="864">
      <p class="note" style="padding-top:12px">She came through whole: four thorn blades a side, four seed pods, the bristle crest, both tusks, the flop ears, the tail and four separate legs. Her head and body measure straight (0.1 degrees), so nothing was turned.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>27,383 <small>boss budget 30,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>40 <small>hips, spine, chest, neck, head, ears, 2 in the tail, 2 under the thicket, 8 blades, 4 pods, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>2.6 MB <small>one GLB with all 11 moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.2 u long <small>my guess from the game's scale of 2.2, beside a 1 u hero. Say if she should be bigger.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What she does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>Slow heavy breaths lift the thicket, her weight rolls, she sniffs low to her left, an ear flaps on each side, the tail whisks, and near the end she shakes her back so the blades rattle from front to rear.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>Diagonal pairs, as her gait in the game: short quick steps under a heavy body that rolls from side to side.</td><td>1.3 u/s, 0.4 s a cycle</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, head leading.</td><td>100° a second (my number: the game turns her instantly)</td></tr>
      <tr><td>Seed Volley</td><td>A dip, then her back bucks up and three pods leave: the two on her shoulders and one on her spine. The blades flare, the launch shoves her back, and the pods swell back out of the thicket.</td><td>Game: no warning, gather 1.5 frames, heave 2.5 frames, held 3 frames, settle 0.5 s. Pods fly 0.9 s to Ember rings of 1.0 u and root patches of 1.1 u.</td></tr>
      <tr><td>Briar Charge</td><td>Head down, haunches set, the hind-left hoof scrapes the floor twice while the blades stand. She bursts off her hind toes into a bounding gallop, lands both forehooves a step ahead to stop, pitches over them, rocks back once and settles.</td><td>Game: paw for the 1 s lane warning, burst 2.5 frames, 10 u/s, stop 2.5 frames, held 3 frames, 40-tick skid. Here she runs 5 u; in a fight she runs to the wall, up to 9 u.</td></tr>
      <tr><td>Call the wood</td><td>Coils, throws her head up and squeals with the thicket shaking and every blade standing, and stamps the left forehoof.</td><td>Mine: 1.5 s. The game plays only a roar sound when the boars and the mantis come at 75, 50 and 25 percent.</td></tr>
      <tr><td>Hurt</td><td>The head flinches away, the ears fly up, the back shivers and the blades bristle. Plays on top of any move, so planted hooves stay planted.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Shoved back a step, the head whips away, she shakes it off from head to back and squares up.</td><td>1.1 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor in a crouch with her pods small, heaves up, shakes the thicket so the blades stand and the pods swell, and stamps once.</td><td>Game: grow in 7 frames, then stand. The rise, the shake and the stamp are mine.</td></tr>
      <tr><td>Death</td><td>A jolt and a last squeal, the forelegs slide out ahead and her chin hits the floor, the hindquarters sit, and she rolls onto her right side. The blades sag and the pods wither.</td><td>2.5 s, then she stays down</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted hoof moving on the floor (locked feet)</td><td>0 mm in all 11 moves, the gallop included</td></tr>
      <tr><td>A planted hoof its leg could not reach</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>10 mm at worst, a hoof rim in the heavy hit and the spawn. Lying dead she is on the floor, not in it.</td></tr>
      <tr><td>Head and body facing straight</td><td>0.1 degrees off, measured on the model</td></tr>
      <tr><td>Ears, tail and the eight blades</td><td>Run as springs: they trail the body and ring after it stops.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Call the wood.</strong> A new pose for the three add waves. The game has only the sound.</li>
        <li><strong>Which hoof paws.</strong> Built as the game has it: the hind-left hoof scrapes back twice. A forehoof pawing is the more usual boar warning and shows better from above. Say if you want to see it.</li>
        <li><strong>The stop.</strong> Built on locked hooves, as the game's rule: she lands, pitches over her forehooves and rocks back. A true skid, hooves sliding half a body with dust, would break that rule but could feel heavier.</li>
        <li><strong>Pods.</strong> The game throws three pods, so three of her four leave. The fourth, at the back, only swells.</li>
        <li><strong>Size.</strong> Drawn 2.2 u long. The game's own sow is longer and lower.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Her mouth does not open. The jaw is one piece with the head, so the squeal is all head and neck.</li>
        <li>Each blade is one stiff piece that swings at its root. It does not bend along its length.</li>
        <li>The bark plates of the thicket bend with her back like skin, and the bristle crest moves with the head.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a hoof can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for her power, dark briar for the patches. They are kept dim on purpose.</li>
        <li>In the death her legs stay stiff as she rolls over.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="stag-model.js"></script>', '<script src="thorn-model.js"></script>')
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',quake:'Antler Quake',trample:'Trample',trampleWarn:'Trample with warning',call:'Call the herd',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',volley:'Seed Volley',charge:'Briar Charge',call:'Call the wood',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['quake','trample','trampleWarn','call','heavyHit'];", "const ACTIONS=['volley','charge','call','heavyHit'];")
rep("const HOME=1.5; // where the hero stands, in u, in front of him", "const HOME=3.0; // where the hero stands, in u, in front of her\n  const WALK=1.3, TURN=2*Math.PI/3.6, PAW=1.0, RUN=0.5, BRIAR=0x231b14;")
rep("blob.scale.set(0.55,1.0,1); blob.position.set(0.03,0.004,-0.1);", "blob.scale.set(0.72,1.2,1); blob.position.set(0,0.004,0);")
rep("const VIEWS={Close:{p:[4.4,2.3,6.4],t:[0,1.0,0.5]},'Game zoom':{p:[0,9.6,8.0],t:[0,0.6,0.6]},Side:{p:[8.6,1.3,0.6],t:[0,1.1,0.6]},Front:{p:[0.6,1.5,9.2],t:[0,1.1,0]},Back:{p:[-3.2,2.4,-7.2],t:[0,1.0,0.3]},Top:{p:[0,12,0.4],t:[0,0.4,0.3]}};",
    "const VIEWS={Close:{p:[5.6,2.7,7.4],t:[0,0.7,1.1]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.2]},Side:{p:[9.8,1.3,1.2],t:[0,0.9,1.2]},Front:{p:[0.8,1.5,10.6],t:[0,0.9,0]},Back:{p:[-3.4,2.7,-7.6],t:[0,0.9,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};")
rep("hurtAct=null, shot=null, dummy=null, crownGlow=null, eyeL=null, eyeR=null;", "hurtAct=null, shot=null, dummy=null;")
rep("const UPPER=/^(neck1|neck2|head|earL|earR|tail1|tail2)\\./;", "const UPPER=/^(neck|head|earL|earR|tail1|tail2|hump1|hump2|blade\\w+)\\./;")
rep("state:()=>({shot:shot&&shot.name,", "state:()=>({shot:shot&&shot.name,pods:PODS.filter(p=>p.t>=0).length,patches:PATCH.filter(g=>g.userData.t>=0).length,dummy:dummy?[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)]:null,")
rep("if(fxOn)sparks(pt(bones.chest,[0,0.02,0.22]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0.02,0.2]),6,0xfff4e0,1.6,0.25); }")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn her back in.'")
rep("const PIV=new THREE.Vector3(0.013*U,0,-0.06*U);", "const PIV=new THREE.Vector3(0,0,-0.06*U);")
rep("// ---- effects (dim on purpose; Ember marks the floor warning, Violet is his power)", "// ---- effects (dim on purpose; Ember marks the floor warnings, Violet is her power, dark briar the patches)")
rep("const FXP=[], RINGS=[]; let dotTex=null, tele=null, lane=null, cracks=null, trail=null, rune=null, summon=[]; const TN=16, tHist=[];",
    "const FXP=[], RINGS=[], PODS=[], PATCH=[]; let dotTex=null, lane=null, rune=null, summon=[];")
# makeFx: drop the quake ring, cracks and ribbon; add pods in flight and thorn patches
cut("    // the quake's floor warning: an Ember ring and a fill that grows to it", "    lane=new THREE.Mesh(", "")
cut("    // cracks: jagged lines out from the quake's centre", "    // the spawn's rune ring and the three places the herd answers from", r'''    // seed pods in flight, each over its Ember ring, and the thorn patches they root
    for(let i=0;i<6;i++){ const g=new THREE.Group(); const pm=new THREE.Mesh(new THREE.OctahedronGeometry(0.15,0),new THREE.MeshStandardMaterial({color:0xa988ee,emissive:VIOLET,emissiveIntensity:0.3,roughness:0.55,flatShading:true})); pm.scale.set(0.8,1.3,0.8); g.add(pm);
      const ring=new THREE.Mesh(new THREE.RingGeometry(0.955,1,56),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.7,depthWrite:false})); const fill=new THREE.Mesh(new THREE.CircleGeometry(1,56),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.15,depthWrite:false})); ring.rotation.x=fill.rotation.x=-Math.PI/2;
      fxG.add(g,ring,fill); g.visible=ring.visible=fill.visible=false; PODS.push({g,pm,ring,fill,t:-1,a:new THREE.Vector3(),b:new THREE.Vector3(),aimed:false}); }
    for(let i=0;i<9;i++){ const g=new THREE.Group(); const dm=new THREE.MeshBasicMaterial({color:0x2e2a22,transparent:true,opacity:0.45,depthWrite:false}); const disc=new THREE.Mesh(new THREE.CircleGeometry(1.1,40),dm); disc.rotation.x=-Math.PI/2; disc.position.y=0.008;
      const rm=new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0.3,depthWrite:false}); const rim=new THREE.Mesh(new THREE.RingGeometry(1.045,1.1,40),rm); rim.rotation.x=-Math.PI/2; rim.position.y=0.009; g.add(disc,rim);
      const tm=new THREE.MeshStandardMaterial({color:0x0d0a08,roughness:1,flatShading:true,transparent:true}); const sp=new THREE.Group(); for(let k=0;k<10;k++){ const c=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.46,5),tm); const a=k/10*6.283+i*0.7, r=k?0.3+0.62*((k*37%10)/10):0; c.position.set(Math.cos(a)*r,0.21,Math.sin(a)*r); c.rotation.set((k*13%7-3)*0.1,0,(k*29%7-3)*0.1); sp.add(c); } g.add(sp);
      g.userData={dm,rm,tm,sp,t:-1}; g.visible=false; fxG.add(g); PATCH.push(g); }
''')
rep("// the spawn's rune ring and the three places the herd answers from", "// the spawn's rune ring and the three places the wood answers from")
cut("    // eyes and the crown star's light", "    // a hero's height, for scale and to take the hit", "")
rep("dummy.userData={mat:dm,z:HOME,kick:0,hold:0}; dummy.position.set(0.03,0,HOME);", "dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME);")
rep("if(tele){tele.visible=false;lane.visible=false;cracks.visible=false;trail.visible=false;rune.visible=false;summon.forEach(s=>s.visible=false);} }",
    "if(lane){lane.visible=false;rune.visible=false;summon.forEach(s=>s.visible=false);} PODS.forEach(p=>{p.t=-1;p.g.visible=p.ring.visible=p.fill.visible=false;}); PATCH.forEach(g=>{g.userData.t=-1;g.visible=false;}); }")
# the three fx functions
cut("  let crackT=-1, runeT=-1, sumT=-1, laneT=-1;", "  function hitDummy(k){", r'''  let runeT=-1, sumT=-1, laneT=-1;
  function fxStart(name){
    antlerTo=0; if(lane)lane.visible=false; laneT=-1;
    if(name==='volley'){ crystal=0.75; antler=0.6; }
    if(name==='charge'&&fxOn){ laneT=0; lane.userData.o=toFloor(new THREE.Vector3(0,0,0)); lane.userData.f=new THREE.Vector3(0,0,1).applyAxisAngle(Y,-floorYaw); lane.userData.yaw=-floorYaw; }
    if(name==='spawn'){ crystal=0; eyes=0; crystalTo=0.25; eyesTo=1; cv.style.filter=''; if(fxOn){runeT=0; rune.position.copy(toFloor(new THREE.Vector3(0,0,0))).setY(0.013);} }
    if(name==='death'){ crystalTo=0; }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn)sparks(pt(bones.head,[0,0.0,0.24]),12,0xfff4e0,2.4,0.3); }
  }
  function launchPods(){ if(!fxOn)return; const tw=toFloor(targetW()); const side=new THREE.Vector3(1.9,0,0).applyAxisAngle(Y,-floorYaw);
    [['podC',0,true],['podL',1,false],['podR',-1,false]].forEach(([b,sg,aimed])=>{ const p=PODS.find(p=>p.t<0); if(!p)return; p.t=0; p.aimed=aimed; p.a.copy(toFloor(pt(bones[b],[0,0.03,0]))); p.b.copy(tw).addScaledVector(side,sg).setY(0); p.ring.position.copy(p.b).setY(0.012); p.fill.position.copy(p.b).setY(0.011); p.fill.scale.setScalar(0.001); sparks(pt(bones[b],[0,0.03,0]),3,0xd9c8ff,1.6,0.22); }); }
  function landPod(p){ const w=p.b.clone().applyMatrix4(fxG.matrix); dust(w,7,1.3,0.6); ringAt(w,{r0:0.3,r1:1.15,dur:0.32,a:0.45}); sparks(w.clone().setY(0.25),6,0xd9c8ff,1.8,0.28);
    const g=PATCH.find(g=>g.userData.t<0)||PATCH.reduce((a,b)=>a.userData.t>b.userData.t?a:b); g.position.copy(p.b); g.rotation.y=Math.random()*6; g.userData.t=0; g.visible=true;
    if(p.aimed&&dummy&&showTarget&&w.distanceTo(targetW())<1.3){ hitFeel(0.4,0.04,0); hitDummy(0.3); } }
  function tearPatch(g){ const w=g.position.clone().applyMatrix4(fxG.matrix); g.userData.t=-1; g.visible=false; if(fxOn){ sparks(w.clone().setY(0.3),14,BRIAR,3.4,0.4); sparks(w.clone().setY(0.3),6,0xd9c8ff,2.6,0.3); ringAt(w,{r0:0.4,r1:1.5,dur:0.3,a:0.4}); dust(w,6,1.6,0.7); } hitFeel(0.3,0.02,0); if(dummy&&showTarget&&w.distanceTo(targetW())<1.4)hitDummy(0.3); }
  function fxContact(name,i){
    if(name==='volley'){ hitFeel(0.45,0.05,0.6); antler=1.2; crystal=0.9; crystalTo=0.25; launchPods(); if(fxOn){ dust(pt(bones.hHoofL,[0,-0.04,0]),3,0.9,0.4); dust(pt(bones.hHoofR,[0,-0.04,0]),3,0.9,0.4); } }
    if(name==='charge'){ if(i===0){ if(dummy&&showTarget&&Math.abs(dummy.position.x)<0.9&&dummy.position.z>0&&dummy.position.z<1.6){ hitFeel(1,0.1,1); antler=1.4; const tip=pt(bones.head,[0,-0.06,0.2]); if(fxOn){ sparks(tip,14,0xfff4e0,3.4,0.32); ringAt(tip,{r0:0.1,r1:1.0,dur:0.26,a:0.5,bill:true}); } hitDummy(0.5); dummy.userData.sx=7; dummy.userData.hold=1.5; } }
      else { hitFeel(0.75,0.06,0.8); const l=pt(bones.fHoofL,[0,-0.04,0.03]), r=pt(bones.fHoofR,[0,-0.04,0.03]); if(fxOn){ dust(l,9,2.0,0.9); dust(r,9,2.0,0.9); ringAt(l.clone().lerp(r,0.5),{r0:0.3,r1:1.5,dur:0.4,a:0.4}); } } }
    if(name==='call'){ hitFeel(0.35,0.05,0.4); const h=pt(bones.fHoofL,[0,-0.04,0.03]); if(fxOn){ ringAt(h,{r0:0.15,r1:1.3,dur:0.5,a:0.4}); dust(h,7,1.2,0.6); sumT=0; const spots=[[-2.6,1.5],[2.6,1.5],[0,4.6]]; summon.forEach((s,k)=>{s.position.copy(toFloor(new THREE.Vector3(spots[k][0],0,spots[k][1]))).setY(0.013);}); } }
    if(name==='spawn'){ hitFeel(0.3,0.05,0.4); const h=pt(bones.fHoofR,[0,-0.04,0.03]); if(fxOn){ ringAt(h,{r0:0.15,r1:1.1,dur:0.45,a:0.4}); dust(h,7,1.2,0.6); } }
    if(name==='death'){ if(i===0){ hitFeel(0.35,0,0.3); if(fxOn)dust(pt(bones.head,[0,-0.1,0.15]),6,1.0,0.5); } else { hitFeel(0.7,0,0.5); if(fxOn)dust(pt(bones.spine,[0,0,0]),14,1.9,0.7); cv.style.filter='saturate(0.45)'; } }
  }
''')
rep("dummy.userData.kick=k; dummy.userData.hold=0.6;", "dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6);")
cut("    if(n==='quake'){ const k=Math.min(1,t/0.7);", "    if(n==='spawn'){ if(t>0.1&&t<0.9", r'''    if(n==='volley'){ eyesTo=t<0.2?2:1; }
    if(n==='charge'){ const k=Math.min(1,t/PAW), running=t>=PAW&&t<PAW+RUN; antlerTo=t<PAW?0.7*k:running?0.9:0; eyesTo=t<PAW+RUN?1+1.2*k:1; crystalTo=t<PAW+RUN?0.25+0.35*k:0.25;
      if(laneT>=0&&fxOn){ const L=RUN*10+1.2, u=lane.userData; lane.visible=t<PAW+RUN; lane.rotation.order='YXZ'; lane.rotation.y=u.yaw; lane.position.copy(u.o).addScaledVector(u.f,L/2-0.2).setY(0.011); lane.scale.set(1.4,L,1); lane.material.opacity=(0.1+0.14*k)*(running?1-(t-PAW)/RUN*0.7:1)+0.03*Math.sin(t*24)*k; }
      [0.39,0.75].forEach(c=>{ if(shot.prev<c&&t>=c&&fxOn){ const h=pt(bones.hHoofL,[0,-0.04,-0.02]); for(let i=0;i<5;i++)puff(h.clone().setY(0.05),new THREE.Vector3((Math.random()-0.5)*0.8,0.5+Math.random()*0.7,-1.4-Math.random()*1.2),{life:0.5+Math.random()*0.25,s0:0.14,s1:0.5,a:0.24,drag:3,floor:true}); } });
      [0.46,0.84].forEach(c=>{ if(shot.prev<c&&t>=c&&fxOn){ const m=pt(bones.head,[0,-0.1,0.24]); for(let i=0;i<4;i++)puff(m,new THREE.Vector3((Math.random()-0.5)*0.9,-0.3,0.9+Math.random()*0.6),{life:0.4,s0:0.08,s1:0.36,a:0.2,drag:4,col:0xcfcabd}); } });
      if(shot.prev<PAW&&t>=PAW&&fxOn){ dust(pt(bones.hHoofL,[0,-0.04,0]),8,2.2,0.9); dust(pt(bones.hHoofR,[0,-0.04,0]),8,2.2,0.9); }
      if(running){ if(fxOn&&Math.floor(t/0.045)!==Math.floor(shot.prev/0.045))dust(pt(bones.hips,[0,0,-0.1]).setY(0),2,0.9,0.5);
        PATCH.forEach(g=>{ if(g.userData.t<0)return; const w=g.position.clone().applyMatrix4(fxG.matrix); if(Math.hypot(w.x,w.z)<1.1+0.75)tearPatch(g); }); } }
    if(n==='call'){ antlerTo=t>0.4&&t<1.0?0.7:0; eyesTo=t>0.4&&t<1.0?1.7:1; crystalTo=t>0.4&&t<1.0?0.55:0.25; [0.46,0.6,0.74].forEach((c,i)=>{ if(shot.prev<c&&t>=c)ringAt(pt(bones.head,[0,-0.06,0.24]),{r0:0.15,r1:1.5,dur:0.6,a:0.3,bill:true,add:false}); }); }
''')
rep("if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,-0.1),1,2.2,1.4); antlerTo=t>0.5&&t<0.95?0.5:0; }",
    "if(n==='spawn'){ if(t>0.1&&t<0.9&&Math.random()<d*26)motes(new THREE.Vector3(0,0,0),1,2.2,1.4); antlerTo=t>0.5&&t<0.95?0.5:0; }")
rep("if(n==='death'){ eyesTo=t>1.2?0:1-0.5*t/1.2; if(t>0.7&&Math.random()<d*9)motes(pt(bones.spine,[0,0.06,0]),1,0.9,0.7); }",
    "if(n==='death'){ eyesTo=t>1.4?0:1-0.5*t/1.4; if(t>0.8&&Math.random()<d*9)motes(pt(bones.hump2,[0,0.04,0]),1,0.9,0.7); }")
rep("glowU.value.set(on*antler*0.5,on*Math.max(0,crystal+breathe*(crystal>0.05?1:0)),feel?flash:0,on*(sel.dead?0.05:0.3));",
    "glowU.value.set(on*antler*0.13,on*Math.max(0,crystal+breathe*(crystal>0.05?1:0)),feel?flash:0,on*(sel.dead?0.03:0.3*Math.min(2.2,eyes)));")
cut("    if(eyeL){ const o=on*Math.min(1,0.42*eyes);", "    FXP.forEach(p=>{ if(p.life<=0)return;", "")
cut("    if(crackT>=0){ crackT+=d;", "    if(runeT>=0){", "")
rep("if(lane&&!(shot&&!shot.done&&shot.name==='trampleWarn')){ lane.visible=false; laneT=-1; }", r'''if(lane&&!(shot&&!shot.done&&shot.name==='charge')){ lane.visible=false; laneT=-1; }
    PODS.forEach(p=>{ if(p.t<0)return; p.t+=d; const u=p.t/0.9; if(u>=1){ p.t=-1; p.g.visible=p.ring.visible=p.fill.visible=false; if(fxOn)landPod(p); return; }
      p.g.visible=p.ring.visible=p.fill.visible=fxOn; p.g.position.lerpVectors(p.a,p.b,u); p.g.position.y=p.a.y*(1-u)+0.12*u+1.7*4*u*(1-u); p.pm.rotation.y+=d*9; p.pm.rotation.x+=d*5; p.fill.scale.setScalar(Math.max(0.001,u)); p.ring.material.opacity=0.5+0.25*Math.sin(p.t*24)*u; });
    PATCH.forEach(g=>{ const u=g.userData; if(u.t<0)return; u.t+=d; if(u.t>=12){u.t=-1;g.visible=false;return;} const k=Math.min(1,u.t/0.22), out=Math.max(0,Math.min(1,(12-u.t)/1)); const e=1+0.25*Math.sin(Math.min(1,k)*Math.PI); u.sp.scale.set(1,k*e,1); u.dm.opacity=0.45*k*out; u.rm.opacity=0.3*k*out; u.tm.opacity=out; g.visible=fxOn; });''')
cut("    // the rack's ribbon", "    if(dummy){ const u=dummy.userData;", "")
rep("if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else u.z+=(HOME-u.z)*Math.min(1,d*3); dummy.position.z=u.z; }",
    "u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); } dummy.position.z=u.z; dummy.position.x=u.x; }")
rep("const STEP={FL:[0,'fHoofL'],HR:[0.04,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.54,'hHoofL']};", "const STEP={FL:[0,'fHoofL'],HR:[0.05,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.55,'hHoofL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.06,0.02]),2,0.5,0.3);", "dust(pt(bones[STEP[k][1]],[0,-0.04,0.02]),2,0.5,0.3);")
rep("let clockT=0, last=performance.now(), crownSpin=0;", "let clockT=0, last=performance.now();")
rep("dz+=(A.walk.__w)*1.8*md; dyaw+=(A.turnL.__w-A.turnR.__w)*(2*Math.PI/3)*md;", "dz+=(A.walk.__w)*WALK*md; dyaw+=(A.turnL.__w-A.turnR.__w)*TURN*md;")
rep("    if(bones.crown){ crownSpin+=md*(sel.dead?0.2:1.1); bones.crown.rotateY(crownSpin); }\n", "")
rep("let antler=0, antlerTo=0, crystal=0.25, crystalTo=0.25, eyes=1, eyesTo=1, trailOn=0;", "let antler=0, antlerTo=0, crystal=0.25, crystalTo=0.25, eyes=1, eyesTo=1; // antler: the blades' glow; crystal: the pods'")
for bad in ('tele', 'trail', 'cracks', 'crown', 'eyeL', 'trampleWarn', 'quake', 'crackT', 'trailOn', 'tHist'):
    import re
    m = re.search(r'\b' + bad + r'\b', s[s.index('<script>\n(function'):])
    if m: print('LEFTOVER', bad, s[s.index('<script>\n(function'):][max(0, m.start() - 60):m.start() + 60].replace('\n', ' '))
open(S + '/thornreview/index.html', 'w').write(s); print('ok', len(s))
