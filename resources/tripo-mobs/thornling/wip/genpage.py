# Builds the Thornling's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/thornling'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/thornling.audit.json'))
glb = open(S + '/thornling.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/thornling.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Thornling Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Thornling from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The sixth mob: your export of the Level I bramble sprite, with a skeleton and nine moves added by hand. It skulks on two short root feet and plants its thorn patch the game's way: it roots, rears back with its bud blooming, and stamps the roots in on the plant tick. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Skulk sets what it does between plants, and Going turns it on the spot. Plant and Three plants play over it and repeat until you press them again. Hurt plays on top of anything. Death topples it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="thornling-views.png" alt="The Tripo Thornling from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a big round bramble head with a grin and lime eyes, leaves and a pink bud on a stem on top, a bramble body with pale thorns, two thin root arms with claws, two short root feet, and a little sack at its left hip (it rides the body).</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>21 <small>hips, a squash bone, the body, the head, the bud's stem and the bud, 3 in each arm, 4 in each root leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.7 u tall <small>to the bud's tip, the game's is 0.72 u; the head 0.36 u across (the game's knot 0.41 u), beside a 1 u hero. Its feet stand 0.15 u apart, the game's 0.22 u, and its roots are half the game's length.</small></dd></div>
    <div><dt>In the game</dt><dd>Gardener <small>26 health, never bites. Skulks at 1.3 u/s keeping 2.6 to 4.2 u from its target. Every 4 s it roots for 0.5 s and plants a thorn patch r 1.0 at its feet: 7 s, 35% slow, 3 damage every 40 ticks to anyone inside, at most three at once.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's sway, breath and the crown's slow sway. On top it looks one way and the other, rubs its claws, and once a loop the bud twitches.</td><td>Game sway and breath; the rest is mine. 5.4 s loop.</td></tr>
      <tr><td>Skulk</td><td>A scurry on its two short roots, leaning into the travel and waddling onto each planted root, the arms swinging. Each foot is pinned while it carries weight.</td><td>Game: 1.3 u/s, steps of 0.08 to 0.13 s. Its roots are half the game's, so it takes 6.7 strides a second.</td></tr>
      <tr><td>Turn left, turn right</td><td>Quick root steps round on the spot, the head leading.</td><td>240° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Plant</td><td>The game's plant key for key. The root is the warning: the toes grip, it drops into a crouch and the bud springs open. It rears up and back, coiled to its left, with a shiver building, and the stamp drives it down onto the roots, squashed, the toes stabbed into the floor, on the plant tick. The thorn patch springs up at its feet; it snaps back and settles. The claws rise and slam with it (mine).</td><td>Game: root in 3 frames, the stamp the last 2.5 frames of the 30-tick root, contact at 0.5 s, roots in 2 frames, snap back 2.5, settle 6. The patch lasts 7 s.</td></tr>
      <tr><td>Three plants</td><td>The game's three stamps in turn: coiled to its left, to its right, then the finisher with both roots straight down and a deeper squash.</td><td>In the game these are three plants 4 s apart, each in a new spot; here they run back to back on one patch.</td></tr>
      <tr><td>Hurt</td><td>The head jolts back and tilts, the body flinches, the bud shivers, the claws pull in. Plays on top of any move, so planted feet stay planted.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, then the bud pops open and it shakes its leaves.</td><td>Game: grow in 7 frames, about 10% over. The pop and the shake are mine.</td></tr>
      <tr><td>Death</td><td>Knocked back, it staggers and topples onto its back, the roots coming up off the floor, the arms flopping out, the bud drooping.</td><td>Mine: the game pops every foe flat where it stands.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>0 mm in every move</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Loops that jump when they restart (idle, skulk, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point under the floor</td><td>RIM_MM mm at worst: the root toes on the stamp, which the game stabs into the floor.</td></tr>
      <tr><td>Lying dead</td><td>Its lowest point rolls along the floor as it goes over (measured every 0.1 rad of the fall), so it never sinks or floats.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the weight, the timing and the stamp are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Death.</strong> It topples onto its back and stays down (the standard). The game pops every foe flat; I can build that instead.</li>
        <li><strong>The crouch.</strong> The game drops the body 0.06 u on the stamp. These roots are half as long, so it drops half as far.</li>
        <li><strong>The bloom.</strong> The game's tiny buds grow 1.9 times as they bloom. This bud is already big, so it swells 1.5 times, and it glows a faint indigo, brightest through the root.</li>
        <li><strong>The patch.</strong> A dark bramble-green disc r 1.0 with pale thorn points, as the game colours it.</li>
        <li><strong>Mine.</strong> The idle looks and claw rub, the arm swings, the turn rate, the spawn pop and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The leaves on its head are stiff and ride the head; they do not flutter.</li>
        <li>The sack rides the body and does not swing.</li>
        <li>Each root foot moves as one stiff piece, with only the front toes bending.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the thorn patch, the indigo glow on the bud, pale hit sparks and step dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="thornling-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=0.7;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const BRAMBLE=0x45634B, THORN=0x8f8a72, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Skulk',turnL:'Turn left',turnR:'Turn right',plant:'Plant',plant3:'Three plants',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['plant','plant3'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.0; let HOME=NEAR; // where the hero stands, in u, in front of it: the game keeps it 2.6 to 4.2 u off\n  const WALK=1.3, RAGEWALK=1.3, TURN=2*Math.PI/1.5, PATCH_R=1.0;")
rep("c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));", "c.tracks=c.tracks.filter(t=>!(t.name==='root.position')&&!(t.name==='root.scale'&&c.name!=='spawn'));")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.24,0.24,1); blob.position.set(0,0.004,0.04);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[1.9,1.5,-1.7],t:[0,0.3,1.3]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.4,1.2]},Side:{p:[3.4,0.7,0.4],t:[0,0.35,0.3]},Front:{p:[0.3,0.9,3.4],t:[0,0.35,0]},Back:{p:[-1.3,1.3,-2.8],t:[0,0.35,0.2]},Top:{p:[0,5.0,0.3],t:[0,0.2,0.5]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|head|crown|bud|armL|foreL|handL|armR|foreR|handR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),patch:+patch.material.opacity.toFixed(2),")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the indigo tell on the bud, the bramble thorn patch, pale hit sparks, step dust)
  const FXP=[], RINGS=[]; let dotTex=null, patch=null, patchT=-1, thorns=null;
  let eyes=1, eyesTo=1, tell=0.16, tellTo=0.16;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.9,1,48),new THREE.MeshBasicMaterial({color:0xe9dcc0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false}); scene.add(m);}
    // the thorn patch: the game's dark bramble-green ground disc r 1.0, with pale thorn points standing in it
    patch=new THREE.Mesh(new THREE.CircleGeometry(PATCH_R,64),new THREE.MeshBasicMaterial({color:BRAMBLE,transparent:true,opacity:0,depthWrite:false})); patch.rotation.x=-Math.PI/2; patch.position.y=0.008; patch.visible=false; fxG.add(patch);
    thorns=new THREE.Group(); const tg=new THREE.ConeGeometry(0.014,0.07,4), tm=new THREE.MeshStandardMaterial({color:THORN,roughness:1});
    for(let i=0;i<26;i++){ const a=i*2.399, r=PATCH_R*Math.sqrt((i+0.5)/26)*0.92; const m=new THREE.Mesh(tg,tm); m.position.set(Math.cos(a)*r,0.04,Math.sin(a)*r); m.rotation.set(0.35*Math.sin(i*1.7),0,0.35*Math.cos(i*2.3)); thorns.add(m); }
    thorns.visible=false; fxG.add(thorns);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,sx:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.bill=!!o.bill; r.delay=o.delay||0; r.m.material.color.setHex(o.col||0xe9dcc0); scene.add(r.m); r.m.position.copy(pos); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(patch){patch.visible=false;thorns.visible=false;patchT=-1;} }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0, PATCH_L=420/60;
  function fxStart(name){
    HOME=NEAR;
    if(name==='spawn'){ eyes=0; cv.style.filter=''; if(fxOn)dust(new THREE.Vector3(0,0,0),6,0.6,0.3); }
  }
  function fxContact(name,i){
    if(name==='plant'||name==='plant3'){ const big=name==='plant3'&&i===2; hitFeel(big?0.3:0.2,big?0.05:0.035,big?0.8:0.55);
      const f=toFloor(new THREE.Vector3(0,0,0.03)); patch.position.x=f.x; patch.position.z=f.z; thorns.position.set(f.x,0,f.z); patch.visible=fxOn; thorns.visible=fxOn; patchT=0;
      if(fxOn){ dust(new THREE.Vector3(0,0,0.05),big?8:5,0.8,0.25); ringAt(new THREE.Vector3(0,0.02,0.03),{r0:0.1,r1:PATCH_R,dur:0.22,a:0.3,col:0x8fa486}); } }
    if(name==='death'){ hitFeel(0.15,0,0.25); if(fxOn)dust(pt(bones.head,[0,0,0]).setY(0),8,0.7,0.3); }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='plant'||n==='plant3'){ const g=n==='plant3'?(META.plant3.dur/3):1e9; const tt=t%g; tellTo=tt<0.5?0.16+0.34*Math.min(1,tt/0.1):tt<0.65?0.5:0.16; }
    if(n==='death'){ eyesTo=t>1.2?0:1-0.6*t/1.2; tellTo=0.16*(1-Math.min(1,t/1.2)); if(t>1.2)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; tellTo=sel.dead?0:0.16; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*10); tell+=(tellTo-tell)*Math.min(1,d*8); flash=Math.max(0,flash-d*3.2);
    glowU.value.set((fxOn?1:0)*0.45*tell,0,feel?flash:0,0);
    if(patchT>=0){ patchT+=d; const inK=Math.min(1,patchT/0.1), outK=Math.min(1,Math.max(0,(PATCH_L-patchT)/0.4)); patch.material.opacity=0.8*inK*outK; thorns.scale.set(1,Math.max(0.01,(inK<1?1.15*inK:1)*outK),1); if(patchT>=PATCH_L){ patchT=-1; patch.visible=false; thorns.visible=false; } }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.material.opacity=r.a*(1-u); if(r.bill)r.m.quaternion.copy(cam.quaternion); else r.m.rotation.x=-Math.PI/2; });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.z+=(HOME-u.z)*Math.min(1,d*3); u.x+=(0-u.x)*Math.min(1,d*3); dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'footL'],FR:[0.5,'footR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,-0.02,0.04]),1,0.2,0.12);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0.15,0.15]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 0.7 * 1000))).replace('REACH_MM', str(round(max(v['reach_mm'] for k, v in au.items() if k != 'death') * 0.7)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS', 'fire(', 'lane', 'EMBER'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
