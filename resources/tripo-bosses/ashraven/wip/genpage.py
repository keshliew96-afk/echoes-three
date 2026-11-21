# Builds the Ash Raven's review page from the Lich Ram's (same bench, CSS and loop), swapping the text and the effects.
import sys, re, json, struct
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
s = open(S + '/raven/wip/base-ram-v1.html').read()  # the Ram's page as it was published
AUD = json.load(open(S + '/raven/wip/audit-text.json'))  # the audit rows, written by hand from audit/raven.txt
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

rep('<title>Tripo Lich Ram Review</title>', '<title>Tripo Ash Raven Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Ash Raven from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">Your export of the third Level III boss, with a bird's skeleton and 12 moves added by hand. The model came with its wings folded and fused to its back, so I cut each wing free and gave it fourteen flight feathers that fan out as it opens. The lower beak is cut free so it can gape and caw, the hackles on its nape stand up, and the tail swings on a spring. Its timings are the game's. Pick a move, drag to turn it, and judge the weight and the hit. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Walk sets what it does between attacks, and Going turns it on the spot. An Action plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds it down: press it again and it spawns back in. The bar names the part of the move that is playing, in the game's own words. Enraged is its state under 40 percent health: the hackles stay up, the eyes and throat burn and it hops faster, and it stays on over every move until you switch it off. The camera lifts a little while it flies.</p>
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
      <img src="raven-views.png" alt="The Tripo Ash Raven from the front, its left, the back and its right, before rigging" width="810" height="864">
      <p class="note" style="padding-top:12px">It came through whole and in one welded piece: the cracked bone mask with both violet eyes, the ruff of hackles, the breast plumes, the folded wings, the tail and two legs with four talons each. The beak points straight ahead (0.5 degrees off), so nothing was corrected. The wings lie folded along the back and are one skin with the body, and the lower beak was fused to the upper.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>28,256 <small>boss budget about 28,000 · 26,908 as sent, the rest are the flight feathers and the skin I added under the wings and in the mouth</small></dd></div>
    <div><dt>Bones</dt><dd>48 <small>hips, chest, 2 in the neck, head, lower beak, hackles, 2 in the tail, a wing and 14 flight feathers each side, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>3.5 MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.4 u tall <small>to the top of the mask, the game's scale of 2.4, beside a 1 u hero</small></dd></div>
    <div><dt>Wingspan</dt><dd>3.6 u <small>with the feathers fanned, built here. See the open choices.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>A raven is never quite still. It breathes, snaps its head to look left and then right with a cock of the head, ruffles once so the hackles lift and the wings shrug, clacks its beak twice and flicks its tail.</td><td>6 s loop</td></tr>
      <tr><td>Walk</td><td>It hops, as the game's Raven does: both feet leave the floor together and land together, the right a frame after the left. It sinks and tips forward, kicks off its toes, the wings flick out from its sides in the air and the tail lifts, and it lands on bent legs. The head stays level.</td><td>Game: 1.35 u/s, 1.7 u/s enraged. One hop of 0.57 u every 0.42 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Hops round on the spot, 45 degrees a hop, the head leading.</td><td>Mine: 107 degrees a second. The game gives the Raven no turn rate.</td></tr>
      <tr><td>Carrion Dive</td><td>It crouches with the wings thrown up and one downbeat takes it off the floor. Two more carry it up to 1.5 u, where it hangs with its talons tucked and looks down the lane, beak open. It tips over and stoops with the wings swept back, comes down to a skim 0.45 u over the floor and tears down the lane with its legs trailed, leaving a furrow of ash and feathers. At the end it throws its talons forward and its wings up to brake, the left foot down a frame before the right. Then it turns its head into its left wing and runs its beak down the long feathers: the punish window. A shake, and it settles.</td><td>Game: Ember lane 1.2 u wide and up to 9 u long for 50 ticks. It hangs at 1.5 u, stoops in 2.5 frames, dives in the last 14 ticks at 0.45 u to the lane's end less its 0.8 u radius, lands in 2.5 frames, held 3 frames, preens until 40 ticks after the hit, settles in 0.6 s. Here the lane is the full 9 u and the hero stands 5 u away.</td></tr>
      <tr><td>Wing Gust</td><td>It crouches with its head low and the hackles up, the wings drawn up and back with their faces turned at the hero. On the beat it throws both wings wide and forward, cupped, rocking back on its legs, and the hero is blown away.</td><td>Game: Ember cone 3.4 u long, 60 degrees either side, for 40 ticks; beat 2.5 frames, held 3 frames, settle 0.55 s. Each body in it is blown 2.6 u over 10 ticks. It only gusts with a hero within 2.8 u.</td></tr>
      <tr><td>Omen</td><td>It draws itself up and raises its wings wide and high, and its head follows the mark as the mark follows the hero. When the mark locks, the head stills and tips back, the beak opens and the throat burns. On the caw the head is thrown up, the beak snaps wide and the crows come down out of the sky into the ring.</td><td>Game: Ember ring of radius 1.4 u on the hero for 84 ticks. It follows at 2.4 u/s for the first 54, is locked for the last 30, and the crows come down in the last 14. Caw 2.5 frames, held 3 frames, settle 0.6 s. Enraged, the ring leaves ash (radius 1.3 u, 4 s, 30 percent slow).</td></tr>
      <tr><td>Enrage</td><td>It hunches with the head low and the hackles up, the wings shrugged off its sides, then thrusts the head forward and screams with the wings flared and shaking. The Enraged state stays on after it.</td><td>Mine: 1.5 s. The game has no pose at 40 percent health: the hackles stay up, the eyes and throat burn, and it moves faster.</td></tr>
      <tr><td>Hurt</td><td>The head is knocked back and aside, the hackles flare and the beak gapes. Plays on top of any move.</td><td>0.42 s</td></tr>
      <tr><td>Heavy hit</td><td>Thrown back 0.3 u: the head whips, the wings fly open to catch it, it hops back on both feet, shakes itself and squares up.</td><td>1.1 s</td></tr>
      <tr><td>Spawn</td><td>It grows out of the floor in a low crouch, comes up with its wings half open, shakes the ash off and caws once.</td><td>Game: grow in 7 frames, then stand. The rise, the shake and the caw are mine.</td></tr>
      <tr><td>Death</td><td>Knocked upright with the wings flying open and the beak wide on a cry that does not come, its legs give, the right and then the left, and it comes down on its breast with the wings falling open across the floor. The head sways and sinks, and the beak lies down last, turned to one side. The eyes go dark.</td><td>2.6 s, then it stays down</td></tr>
    </tbody></table></div>

  <h2>The detail audit</h2>
  <p class="note">A checker takes every point of the model (NVERT of them) through every frame of every move (NFRAME frames) and looks for five things. Sizes are in u; it is 2.4 u tall.</p>
  <div class="audit"><table>
    <thead><tr><th>Checked</th><th>Found in the first build</th><th>Now</th></tr></thead>
    <tbody>
      <tr><td>A joint that jumps in one frame (a pop)</td><td>AUD_POP0</td><td>AUD_POP1</td></tr>
      <tr><td>Any part under the floor</td><td>AUD_FLOOR0</td><td>AUD_FLOOR1</td></tr>
      <tr><td>One part pushed through another</td><td>AUD_THRU0</td><td>AUD_THRU1</td></tr>
      <tr><td>Skin torn or pulled (a seam that opens)</td><td>AUD_STR0</td><td>AUD_STR1</td></tr>
      <tr><td>Smoothness (a move that stops dead, a loop that jumps)</td><td>AUD_LOOP0</td><td>AUD_LOOP1</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move, the hop, the turns and the dive's landing included</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, hop, both turns)</td><td>AUD_LOOPS</td></tr>
      <tr><td>Head facing straight</td><td>Straight on the model: the beak tip is 0.5 degrees off the middle line and the eyes mirror each other, so nothing was corrected.</td></tr>
      <tr><td>Hackles and tail</td><td>Run as springs: they trail the body and settle after it stops.</td></tr>
      <tr><td>Walk and turn</td><td>Feet and knees point straight ahead, no splay. Both feet leave and land together.</td></tr>
      <tr><td>Flight</td><td>One downbeat takes it off the floor, it hangs at 1.5 u, and it comes down on a braking beat with one foot landing a frame before the other.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the hit are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The wings.</strong> Your model has its wings folded only, so the open wing is mine: the folded wing turns out from the shoulder and 14 flat slate feathers fan from under it. A Tripo export with the wings spread would give the open wing your own feather art.</li>
        <li><strong>The hop.</strong> It hops everywhere, as the game's Raven does. A strutting walk with one foot at a time is the other choice.</li>
        <li><strong>The preen.</strong> The punish window after the dive is the Raven turning its head into its left wing and preening. The game's rig does the same.</li>
        <li><strong>The furrow.</strong> The game's notes call the dive's trail a furrow of embers. Ember is kept for floor warnings, so here the furrow is grey ash and black feathers with a few Violet motes.</li>
        <li><strong>Enrage.</strong> The pose is new. The game shows no pose at 40 percent, only the raised hackles and the burning eyes and throat.</li>
        <li><strong>The turn.</strong> 45 degrees a hop is mine; the game gives no rate.</li>
        <li><strong>How high.</strong> 1.5 u up before the dive and a skim at 0.45 u, both the game's. Say if it should climb higher on the page.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The flight feathers are flat slabs with no feather pattern, and the underside of each wing is a plain dark skin.</li>
        <li>Where the wings were cut from the back, the skin under them is a plain patch with a visible edge when the wings are raised high.</li>
        <li>The lower beak is a cut piece: close up, a thin seam shows at the corner of the mouth when it caws.</li>
        <li>The hero stand-in flashes as the Raven passes over it. The game lands the dive's 15 damage at the end of the dive, on everyone still in the lane.</li>
        <li>The crows and the hero are dark and grey stand-ins.</li>
        <li>Switching from Walk into an attack blends in 0.03 s, so a foot can jump a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page in the game's colours: Ember for the floor warnings, Violet for its power. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="ram-model.js"></script>', '<script src="raven-model.js"></script>')
rep("META=window.MODEL_META, U=2.2;", "META=window.MODEL_META, U=2.4;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',rush:'Bone Rush',call:'Grave Call',enrage:'Enrage',block:'Block',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',dive:'Carrion Dive',gust:'Wing Gust',omen:'Omen',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['rush','call','enrage','block','heavyHit'];", "const ACTIONS=['dive','gust','omen','enrage','heavyHit'];")
rep("const NEAR=2.2, MID=4.0, FAR=5.0; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, further out for the Grave Call and the Bone Rush\n  const WALK=1.2, RAGEWALK=1.2, TURN=75*Math.PI/180, LANE=54/60, SOUL=1.0;",
    "const NEAR=2.3, MID=4.0, FAR=5.0; let HOME=NEAR; // where the hero stands, in u, in front of it: the game's stand-off, further out for the Omen and the dive\n  const WALK=1.35, RAGEWALK=1.7, TURN=(45/0.42)*Math.PI/180, LANE=50/60, CONE=40/60, LANE_LEN=9.0;")
rep("blob.scale.set(0.5,0.8,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.55,0.7,1); blob.position.set(0,0.004,0);")
rep("const VIEWS={Close:{p:[4.8,2.4,6.4],t:[0,1.0,0.9]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.6]},Side:{p:[10.5,1.5,0.8],t:[0,1.1,0.8]},Front:{p:[0.8,1.7,10.5],t:[0,1.1,0]},Back:{p:[-3.4,2.9,-7.8],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.4]}};",
    "const VIEWS={Close:{p:[5.0,2.6,6.6],t:[0,1.2,0.9]},'Game zoom':{p:[0,11.2,9.9],t:[0,0.6,1.8]},Side:{p:[11,1.7,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.9,11],t:[0,1.2,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.1,0.6]},Top:{p:[0,15,0.4],t:[0,0.4,1.6]}};")
rep("const UPPER=/^(neck1|neck2|head|jaw|tail1|tail2)\\./;", "const UPPER=/^(neck1|neck2|head|jaw|hackle|tail1|tail2)\\./;")
rep("tele:[laneG.visible,GRAVES.filter(g=>g.userData.t>=0).length,crackG.visible,guardT>=0],heart:+bones.heart.scale.x.toFixed(2),",
    "tele:[laneG.visible,coneG.visible,omenG.visible,ashG.visible],crows:CROWS.filter(c=>c.on).length,feathers:FEA.filter(f=>f.life>0).length,camLift:+camLift.toFixed(2),")
rep("const PIV=new THREE.Vector3(0,0,0.02*U);", "const PIV=new THREE.Vector3(0,0,0.03*U);")
FX = r'''  // ---- effects (dim on purpose; Ember marks the floor warnings, Violet is its power, the rest is ash and black feathers)
  const FXP=[], RINGS=[], FEA=[], CROWS=[]; let dotTex=null, laneG=null, coneG=null, omenG=null, ashG=null;
  let eyes=1, eyesTo=1, throat=0, throatTo=0, laneT=-1, coneT=-1, omenT=-1, ashT=-1, diveHit=false, camLift=0, camLast=0;
  const ASH=0x46424c, INK=0x1c1a21;
  const DM=META.dive, DOFF=DM.cues.off[0], DGO=DM.cues.go[0], DHIT=DM.contact[0], DPRE=DM.cues.preen, GHIT=META.gust.contact[0], OHIT=META.omen.contact[0], OLOCK=META.omen.cues.lock[0], OCROW=META.omen.cues.crows[0], EHIT=META.enrage.contact[0], SCAW=META.spawn.contact[0];
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<140;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,64),new THREE.MeshBasicMaterial({color:VIOLET,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false});}
    const flat=(w,l,x,z,op)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.set(x,0,z); return m;};
    // Carrion Dive's warning: an Ember lane 1.2 u wide and 9 u long from its feet, with a fill that runs down it
    laneG=new THREE.Group(); const L=LANE_LEN, lf=flat(1.2,L,0,L/2,0.14), le=[flat(0.035,L,-0.6,L/2,0.6),flat(0.035,L,0.6,L/2,0.6),flat(1.2,0.035,0,L,0.6),flat(1.2,0.035,0,0,0.6)]; le.forEach(m=>m.position.y=0.002); laneG.add(lf,...le); laneG.userData={lf,le}; laneG.position.y=0.011; laneG.visible=false; fxG.add(laneG);
    // Wing Gust's warning: an Ember cone 3.4 u long, 60 degrees either side of its facing, with a fill that grows out of it
    coneG=new THREE.Group(); { const a0=(270-60)*Math.PI/180, a1=120*Math.PI/180; const fill=new THREE.Mesh(new THREE.CircleGeometry(3.4,48,a0,a1),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.12,depthWrite:false,side:THREE.DoubleSide})); const rim=new THREE.Mesh(new THREE.RingGeometry(3.37,3.4,48,1,a0,a1),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false,side:THREE.DoubleSide}));
      const side=(a)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.035,3.4),rim.material); m.rotation.x=-Math.PI/2; m.rotation.z=a; m.position.set(-Math.sin(a)*1.7,0.002,Math.cos(a)*1.7); return m;};
      fill.rotation.x=rim.rotation.x=-Math.PI/2; rim.position.y=0.002; coneG.add(fill,rim,side(Math.PI/3),side(-Math.PI/3)); coneG.userData={fill,rim}; }
    coneG.position.y=0.011; coneG.visible=false; fxG.add(coneG);
    // Omen: an Ember ring of radius 1.4 u on the hero, and the patch of ash it leaves when enraged
    omenG=new THREE.Group(); { const e=new THREE.Mesh(new THREE.RingGeometry(1.36,1.4,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.6,depthWrite:false})); const f=new THREE.Mesh(new THREE.CircleGeometry(1.4,64),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.12,depthWrite:false})); e.rotation.x=f.rotation.x=-Math.PI/2; e.position.y=0.002; omenG.add(e,f); omenG.userData={e,f}; }
    omenG.position.y=0.012; omenG.visible=false; fxG.add(omenG);
    ashG=new THREE.Mesh(new THREE.CircleGeometry(1.3,48),new THREE.MeshBasicMaterial({color:0x5d5864,transparent:true,opacity:0,depthWrite:false})); ashG.rotation.x=-Math.PI/2; ashG.position.y=0.008; ashG.visible=false; fxG.add(ashG);
    // the crows: dark darts that drop out of the sky into the ring
    const cm=new THREE.MeshStandardMaterial({color:INK,roughness:1,side:THREE.DoubleSide}); const wg=new THREE.BufferGeometry(); wg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0.1, 0.36,0.06,-0.16, 0,0,-0.06, 0,0,0.1, 0,0,-0.06, -0.36,0.06,-0.16, 0,0,-0.06, 0.07,0,-0.3, -0.07,0,-0.3],3)); wg.computeVertexNormals();
    for(let i=0;i<7;i++){ const gq=new THREE.Group(); const b=new THREE.Mesh(new THREE.SphereGeometry(0.07,10,8),cm); b.scale.set(1,0.9,2.6); const w=new THREE.Mesh(wg,cm); gq.add(b,w); gq.visible=false; fxG.add(gq); CROWS.push({m:gq,on:false,from:new THREE.Vector3(),to:new THREE.Vector3(),t0:0}); }
    // loose black feathers: they flutter down and lie where they fall
    const fm=new THREE.MeshStandardMaterial({color:0x24222b,roughness:1,side:THREE.DoubleSide,transparent:true}); const fg=new THREE.PlaneGeometry(0.06,0.2); for(let i=0;i<48;i++){ const m=new THREE.Mesh(fg,fm.clone()); m.visible=false; fxG.add(m); FEA.push({m,life:0,age:0,v:new THREE.Vector3(),spin:0,ph:0,down:false}); }
    RINGS.forEach(r=>scene.add(r.m));
    // a hero's height, for scale and to take the hit
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0,vx:0,vt:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.material.blending=THREE.NormalBlending; p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.05),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.55+Math.random()*0.3,s0:0.16,s1:0.55,a:0.22,drag:3,floor:true,col});} }
  function sparks(pos,n,col,spd,life){ if(col===0xfff4e0)col=0xe9dcc0; if(col===0xd9c8ff)col=0xa98cf5; for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.1,s1:0.02,a:0.5,col,g:-2.5,drag:2});} }
  function motes(pos,n,spread,rise){ for(let i=0;i<n;i++){ puff(tmp2.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*spread,Math.random()*0.2,(Math.random()-0.5)*spread)),new THREE.Vector3((Math.random()-0.5)*0.2,rise*(0.5+Math.random()),(Math.random()-0.5)*0.2),{life:0.9+Math.random()*0.7,s0:0.07,s1:0.02,a:0.38,col:VIOLET}); } }
  function feathers(pos,n,spd){ if(!fxOn)return; for(let i=0;i<n;i++){ const f=FEA.find(f=>f.life<=0); if(!f)return; f.life=3.2+Math.random(); f.age=0; f.down=false; f.m.position.copy(toFloor(pos)); f.m.position.y=Math.max(0.1,pos.y); const a=Math.random()*6.28; f.v.set(Math.cos(a)*spd*(0.4+Math.random()),0.6+Math.random()*1.2*spd,Math.sin(a)*spd*(0.4+Math.random())); f.spin=(Math.random()-0.5)*9; f.ph=Math.random()*6; f.m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3); f.m.material.opacity=1; f.m.visible=true; } }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||VIOLET);
    if(r.bill){scene.add(r.m); r.m.position.copy(pos);} else {fxG.add(r.m); r.m.position.copy(o.local?pos:toFloor(pos)).setY(0.016); r.m.rotation.set(-Math.PI/2,0,0);} r.m.visible=false; }
  function hideTele(){ if(laneG)laneG.visible=false; laneT=-1; if(coneG)coneG.visible=false; coneT=-1; if(omenG)omenG.visible=false; omenT=-1; CROWS.forEach(c=>{c.on=false;c.m.visible=false;}); }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); hideTele(); FEA.forEach(f=>{f.life=0;f.m.visible=false;}); ashG.visible=false; ashT=-1; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const beak=()=>pt(bones.head,[0,-0.05,0.2]);
  const throatPt=()=>pt(bones.head,[0,-0.06,0.08]);
  const feetMid=()=>pt(bones.footL,[0,-0.03,0.05]).add(pt(bones.footR,[0,-0.03,0.05])).multiplyScalar(0.5);
  const chestPt=()=>pt(bones.chest,[0,0.05,0.05]);
  function setHero(z){ HOME=z; if(dummy){ const u=dummy.userData; u.z=z; u.x=0; u.kick=0; u.sx=0; u.hold=0; u.vx=0; u.vt=0; dummy.position.set(0,0,z); } }
  function hitDummy(k){ if(!dummy||!showTarget)return; dummy.userData.kick=k; dummy.userData.hold=Math.max(dummy.userData.hold,0.6); dummy.userData.mat.emissiveIntensity=feel?0.45:0; }
  function fxStart(name){
    hideTele(); HOME=NEAR; diveHit=false;
    if(name==='dive'){ setHero(FAR); if(dummy)dummy.userData.hold=3.2; if(fxOn){ laneT=0; const p=toFloor(new THREE.Vector3(0,0,0)); laneG.position.set(p.x,0.011,p.z); laneG.rotation.y=-floorYaw; } }
    if(name==='gust'){ setHero(NEAR); if(fxOn){ coneT=0; const p=toFloor(new THREE.Vector3(0,0,0)); coneG.position.set(p.x,0.011,p.z); coneG.rotation.y=-floorYaw; } }
    if(name==='omen'){ setHero(MID); const u=dummy.userData; u.hold=2.3; u.vx=1.4; u.vt=0.85; if(fxOn){ omenT=0; omenG.position.copy(toFloor(targetW())).setY(0.012); omenG.visible=true; } }
    if(name==='enrage'){ rage=true; $('rage').setAttribute('aria-pressed','true'); }
    if(name==='spawn'){ eyes=0; throat=0; cv.style.filter=''; if(fxOn){ const o=new THREE.Vector3(0,0,0); dust(o,14,2.0,1.0,ASH); ringAt(o,{r0:0.3,r1:1.6,dur:0.5,a:0.3,col:ASH}); feathers(new THREE.Vector3(0,0.4,0),6,1.2); } }
    if(name==='death'){ rage=false; $('rage').setAttribute('aria-pressed','false'); }
    if(name==='heavyHit'){ hitFeel(0.55,0.09,0.6); flash=0.5; if(fxOn){ sparks(chestPt(),12,0xfff4e0,2.4,0.3); feathers(chestPt(),5,1.6); } }
  }
  function fxContact(name,i){
    if(name==='dive'){ const f=feetMid(); hitFeel(1,0.08,1); if(fxOn){ dust(f,14,2.6,1.0,ASH); ringAt(f,{r0:0.3,r1:1.8,dur:0.34,a:0.35,col:ASH}); sparks(f.clone().setY(0.2),8,0xd9c8ff,2.2,0.3); feathers(f.clone().setY(0.6),8,2.0); } }
    if(name==='gust'){ hitFeel(0.6,0.05,0.4); const fw=new THREE.Vector3(0,0,1).applyAxisAngle(Y,0);
      if(fxOn){ for(let k=0;k<22;k++){ const a=(Math.random()-0.5)*2*Math.PI/3; const v=new THREE.Vector3(Math.sin(a),0,Math.cos(a)).multiplyScalar(5+Math.random()*3); puff(new THREE.Vector3(Math.sin(a)*0.6,0.15+Math.random()*0.5,Math.cos(a)*0.6),v,{life:0.5,s0:0.2,s1:0.6,a:0.18,col:DUST,drag:3,floor:true}); } feathers(chestPt(),4,1.0); }
      if(dummy&&showTarget){ const u=dummy.userData, d=Math.hypot(u.x,u.z); if(d<3.4+0.3&&u.z>0&&Math.abs(Math.atan2(u.x,u.z))<Math.PI/3){ hitDummy(2.6); u.hold=1.4; if(fxOn)sparks(targetW().setY(0.5),8,0xfff4e0,2.0,0.25); } } }
    if(name==='omen'){ hitFeel(0.5,0.05,0.5); const c=omenG.getWorldPosition(new THREE.Vector3()); if(fxOn){ ringAt(beak(),{r0:0.1,r1:0.8,dur:0.3,a:0.4,bill:true}); dust(c,12,2.2,0.9,ASH); ringAt(c,{r0:0.3,r1:1.4,dur:0.32,a:0.45}); feathers(c.clone().setY(0.4),10,1.6); }
      if(dummy&&showTarget&&targetW().distanceTo(c.setY(0))<1.4+0.3){ hitDummy(0); dummy.userData.hold=1.0; if(fxOn)sparks(targetW().setY(0.5),10,0xfff4e0,2.4,0.3); }
      omenG.visible=false; omenT=-1; CROWS.forEach(k=>{k.on=false;k.m.visible=false;});
      if(rageW>0.5&&fxOn){ ashG.position.copy(omenG.position).setY(0.008); ashG.visible=true; ashT=0; } }
    if(name==='enrage'){ hitFeel(0.35,0.03,0.3); if(fxOn){ ringAt(beak(),{r0:0.1,r1:0.9,dur:0.3,a:0.4,bill:true}); ringAt(beak(),{r0:0.1,r1:1.3,dur:0.42,a:0.25,bill:true,delay:0.1}); feathers(chestPt(),8,1.8); } }
    if(name==='spawn'){ hitFeel(0.25,0.02,0.2); if(fxOn)ringAt(beak(),{r0:0.1,r1:0.7,dur:0.3,a:0.35,bill:true}); }
    if(name==='death'){ if(i===0){ hitFeel(0.45,0,0.4); if(fxOn){ dust(chestPt().setY(0),12,1.6,0.6,ASH); feathers(chestPt(),8,1.4); } } else { hitFeel(0.3,0,0.2); if(fxOn)dust(beak().setY(0),5,0.9,0.4,ASH); cv.style.filter='saturate(0.45)'; } }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time, p0=shot.prev, cross=(c)=>p0<c&&t>=c;
    if(n==='dive'){
      if(t<DGO){ eyesTo=1+0.6*Math.min(1,t/0.4); throatTo=t>0.3?0.3:0; }
      else if(t<DHIT){ eyesTo=1.9; throatTo=0.2;
        // the furrow: ash and feathers torn up under it as it skims down the lane
        const hy=bones.hips.getWorldPosition(tmp2).y; if(fxOn&&hy<1.4){ const c=chestPt(); if(Math.random()<d*70)puff(c.clone().setY(0.06),new THREE.Vector3((Math.random()-0.5)*2.4,0.4+Math.random()*0.9,-1-Math.random()*2),{life:0.7+Math.random()*0.4,s0:0.18,s1:0.6,a:0.26,drag:2.5,floor:true,col:ASH}); if(Math.random()<d*18)feathers(c.clone().setY(0.5),1,1.2); if(Math.random()<d*14)motes(c.clone().setY(0.2),1,0.6,0.5); }
        if(!diveHit&&dummy&&showTarget){ const u=dummy.userData; if(u.z<0.6&&u.z>-1.0&&Math.abs(u.x)<0.9){ diveHit=true; hitFeel(0.5,0.05,0.2); u.hold=Math.max(u.hold,1.6); u.mat.emissiveIntensity=feel?0.45:0; if(fxOn)sparks(targetW().setY(0.5),12,0xfff4e0,3.0,0.3); } } }
      else if(t<DPRE[1]){ eyesTo=1; throatTo=0; if(fxOn&&t>DPRE[0]+0.3&&Math.random()<d*2.5)feathers(pt(bones.wingL,[0,-0.15,-0.1]),1,0.3); }
      else { eyesTo=1; throatTo=0; }
      if(cross(DOFF)){ hitFeel(0.15,0,0.2); if(fxOn){ const f=feetMid(); for(let k=0;k<12;k++){ const a=(k/12)*Math.PI*2; puff(new THREE.Vector3(Math.cos(a)*0.5,0.12,Math.sin(a)*0.5).add(f.clone().setY(0)),new THREE.Vector3(Math.cos(a)*3.6,0.1,Math.sin(a)*3.6),{life:0.32,s0:0.2,s1:0.55,a:0.2,col:ASH,drag:4,floor:true}); } feathers(f.clone().setY(0.5),3,1.2); } } }
    if(n==='gust'){ if(t<GHIT){ eyesTo=1.6; throatTo=0.2; } else { eyesTo=t<GHIT+0.2?1.8:1; throatTo=t<GHIT+0.2?0.5:0; } }
    if(n==='omen'){ if(t<OHIT){ eyesTo=1.5+0.5*Math.min(1,t/OLOCK); throatTo=t<OLOCK?0.5*Math.min(1,t/0.5):1.0; } else { eyesTo=t<OHIT+0.25?2.2:1; throatTo=t<OHIT+0.25?1.4:0; }
      // the mark follows its hero at 2.4 u/s, then locks; the crows come down in the last 14 ticks
      if(omenT>=0&&t<OLOCK&&dummy){ const tg=toFloor(targetW()), p=omenG.position, dx=tg.x-p.x, dz=tg.z-p.z, dd=Math.hypot(dx,dz), st=Math.min(dd,2.4*d); if(dd>1e-6){ p.x+=dx/dd*st; p.z+=dz/dd*st; } }
      if(cross(OLOCK)&&fxOn)ringAt(omenG.getWorldPosition(new THREE.Vector3()),{r0:1.6,r1:1.4,dur:0.25,a:0.35,col:EMBER});
      if(cross(OCROW)&&fxOn){ const c=omenG.position; CROWS.forEach((k,i)=>{ const a=i/CROWS.length*6.28+Math.random()*0.6, r=Math.random()*1.0; k.to.set(c.x+Math.cos(a)*r,0.15,c.z+Math.sin(a)*r); k.from.set(c.x+Math.cos(a)*2.4-1.2,6.5+Math.random()*1.5,c.z+Math.sin(a)*2.4-2.0); k.t0=t; k.on=true; k.m.visible=true; k.m.position.copy(k.from); k.m.lookAt(k.to); }); }
      CROWS.forEach(k=>{ if(!k.on)return; const u=Math.min(1,(t-k.t0)/(OHIT-OCROW)); k.m.position.lerpVectors(k.from,k.to,u*u); k.m.lookAt(k.to.x,k.to.y,k.to.z); if(fxOn&&Math.random()<d*30)puff(k.m.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,0.2,0),{life:0.35,s0:0.12,s1:0.03,a:0.3,col:INK}); }); }
    if(n==='enrage'){ eyesTo=t>EHIT-0.05&&t<1.2?2.4:1.5; throatTo=t>EHIT-0.05&&t<1.2?1.3:0.3; if(t>EHIT&&t<1.1&&Math.random()<d*14)motes(throatPt(),1,0.4,0.8); }
    if(n==='spawn'){ eyesTo=t>0.4?1:0; throatTo=t>SCAW-0.05&&t<SCAW+0.25?1:0; if(t>0.05&&t<0.8&&Math.random()<d*20)puff(new THREE.Vector3((Math.random()-0.5)*1.4,0.1,(Math.random()-0.5)*1.4),new THREE.Vector3(0,0.8+Math.random(),0),{life:1.0,s0:0.2,s1:0.45,a:0.2,col:ASH}); }
    if(n==='death'){ eyesTo=t>1.85?0:1-0.6*Math.min(1,t/1.85); throatTo=0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy)HOME=NEAR; if(!busy){ eyesTo=sel.dead?0:1; throatTo=0; if(laneT>=0&&laneT<LANE)hideTele(); if(coneT>=0&&coneT<CONE){coneG.visible=false;coneT=-1;} if(omenT>=0){omenG.visible=false;omenT=-1;CROWS.forEach(k=>{k.on=false;k.m.visible=false;});} }
    const rg=sel.dead?0:rageW;
    eyes+=(eyesTo+(sel.dead?0:1.0*rg)-eyes)*Math.min(1,d*6); throat+=(throatTo+(sel.dead?0:0.6*rg)-throat)*Math.min(1,d*6); flash=Math.max(0,flash-d*3.2);
    const on=fxOn?1:0; glowU.value.set(on*0.3*Math.min(2.6,eyes),on*0.7*throat,feel?flash:0,0);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.03)p.s.position.y=0.03; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); });
    // the lane fills for 50 ticks, then fades as it lands
    if(laneT>=0){ laneT+=d; const k=Math.min(1,laneT/LANE), out=Math.max(0,(laneT-LANE)/0.25); if(out>=1||!fxOn)hideTele(); else { laneG.visible=true; const u=laneG.userData, a=1-out; u.lf.scale.y=Math.max(0.001,k); u.lf.position.z=LANE_LEN/2*k; u.lf.material.opacity=(0.08+0.1*k+0.02*Math.sin(laneT*24)*k)*a; u.le.forEach(m=>m.material.opacity=(0.4+0.3*k)*a); } }
    // the cone fills for 40 ticks, then is gone with the beat
    if(coneT>=0){ coneT+=d; const k=Math.min(1,coneT/CONE), out=Math.max(0,(coneT-CONE)/0.15); if(out>=1||!fxOn){ coneG.visible=false; coneT=-1; } else { coneG.visible=true; const u=coneG.userData, a=1-out; u.fill.scale.setScalar(Math.max(0.001,k)); u.fill.material.opacity=(0.08+0.1*k+0.02*Math.sin(coneT*24)*k)*a; u.rim.material.opacity=(0.4+0.3*k)*a; } }
    if(omenT>=0){ omenT+=d; const k=Math.min(1,omenT/(84/60)); const u=omenG.userData; u.f.scale.setScalar(Math.max(0.001,k)); u.f.material.opacity=0.08+0.08*k; u.e.material.opacity=0.45+0.25*k+0.06*Math.sin(omenT*24)*k; if(!fxOn){omenG.visible=false;omenT=-1;} }
    if(ashT>=0){ ashT+=d; const a=ashT<0.3?ashT/0.3:Math.max(0,1-(ashT-3.4)/0.6); ashG.material.opacity=0.32*a; if(ashT>4||!fxOn){ ashG.visible=false; ashT=-1; } else if(Math.random()<d*6)puff(ashG.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3((Math.random()-0.5)*2,0.05,(Math.random()-0.5)*2)),new THREE.Vector3(0,0.3,0),{life:1.2,s0:0.1,s1:0.3,a:0.18,col:ASH}); }
    FEA.forEach(f=>{ if(f.life<=0)return; f.age+=d; const m=f.m; if(!f.down){ f.v.y=Math.max(f.v.y-3.5*d,-0.7); f.v.x*=1-1.5*d; f.v.z*=1-1.5*d; m.position.addScaledVector(f.v,d); m.position.x+=Math.sin(f.age*7+f.ph)*0.4*d; m.rotation.z+=f.spin*d; m.rotation.x+=f.spin*0.4*d; if(m.position.y<0.015){ m.position.y=0.015; m.rotation.set(-Math.PI/2,0,f.ph); f.down=true; } }
      if(f.age>f.life-0.6)m.material.opacity=Math.max(0,(f.life-f.age)/0.6); if(f.age>=f.life||!fxOn){ f.life=0; m.visible=false; } });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.vt>0){ u.x+=u.vx*d; u.vt-=d; }
      u.x+=u.sx*d; u.sx=Math.max(0,u.sx-u.sx*d*8-d*0.3); if(u.kick>0){ u.z+=u.kick*d*9; u.kick=Math.max(0,u.kick-u.kick*d*9-d*0.2); } else if(u.hold>0)u.hold-=d; else { const side=u.z<1.5&&HOME>u.z+0.2?1.6:0; u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(side-u.x)*Math.min(1,d*4); } dummy.position.z=u.z; dummy.position.x=u.x; }
    // its shadow shrinks while it is in the air; the camera lifts a little when it flies high
    const hy=bones.hips.getWorldPosition(tmp).y, k=Math.max(0,Math.min(1,(hy-1.2)/1.3)); blob.scale.set(0.55*(1-0.35*k),0.7*(1-0.35*k),1); blob.material.opacity=0.17*(1-0.5*k);
    const lift=Math.max(0,hy-1.6)*0.6; camLift+=(lift-camLift)*Math.min(1,d*5); const dl=camLift-camLast; if(Math.abs(dl)>1e-4){ orbit.target.y+=dl; cam.position.y+=dl; camLast=camLift; }
  }
'''
cut("  // ---- effects (dim on purpose", "  // hoof dust in the walk and the turns", FX)
rep("  // hoof dust in the walk and the turns", "  // a puff of ash where both feet land in the hop and the turns")
rep("const STEP={FL:[0,'fHoofL'],HR:[0.04,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.54,'hHoofL']};", "const STEP={L:[0,'footL'],R:[0.04,'footR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25)", "dust(pt(bones[STEP[k][1]],[0,-0.03,0.06]),2,0.4,0.25)")
rep("    mixer.update(md); heartBeat(md);", "    mixer.update(md);")
rep("Down. Press Death again to spawn him back in.", "Down. Press Death again to spawn it back in.")
sc = s[s.index('<script>\n(function'):]
for bad in ('GRAVES', 'crackG', 'guardG', 'bolt', 'rune', 'heart', 'horn', 'hoof', 'Hoof', 'RUB', 'SOUL', 'rushHit', 'hbB', 'muzzle', 'MID_', 'mole'):
    m = re.search(r'\b' + bad + r'\b', sc)
    if m: print('LEFTOVER', bad, sc[max(0, m.start() - 60):m.start() + 60].replace('\n', ' '))
bm = json.load(open(S + '/raven/wip/out/ashraven.meta.json'))
glb = open(S + '/raven/wip/out/ashraven.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = [p for me in gj['meshes'] for p in me['primitives']][0]; nv = gj['accessors'][pr['attributes']['POSITION']]['count']
nf = sum(round(v['dur'] * 60) + 1 for v in bm.values())
print('verts', nv, 'frames', nf)
s = s.replace('NVERT', f'{nv:,}').replace('NFRAME', f'{nf:,}')
for k, v in AUD.items(): s = s.replace(k, v)
assert 'AUD_' not in s, re.findall(r'AUD_\w+', s)
open(S + '/ravenreview/index.html', 'w').write(s); print('ok', len(s))
