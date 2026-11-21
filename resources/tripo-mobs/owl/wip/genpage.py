# Builds the Shriek Owl's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/owl'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/owl.audit.json'))
glb = open(S + '/owl.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/owl.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Shriek Owl Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Shriek Owl from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The seventh mob: your export of the Level I owl, with a skeleton and eight moves added by hand. It glides 1.5 u up in bursts of slow beats and shrieks the game's way: it rises into a hang, draws its head back with the wings thrown wide, and drives the wings down with the head snapping out on the cone's resolve tick. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Glide or Fly sets what it does between shrieks, and Going turns it on the spot. Shriek plays over it and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="owl-views.png" alt="The Tripo Shriek Owl from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a pale heart-shaped face with glowing purple eyes and ear tufts, a ragged brown body with violet cracks, two big wings spread and raised, grey talons, and a long ragged tail hanging below.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>13 <small>hips, a squash bone, the head, the tail, an arm and a hand in each wing, a shank and talons in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.7 u wingspan <small>the game's is about 2 u; the body 0.43 u wide (the game's 0.42); its middle rides 1.5 u up as in the game, beside a 1 u hero.</small></dd></div>
    <div><dt>In the game</dt><dd>Flier, ranged <small>18 health, glides at 2.4 u/s keeping 3.2 to 5.2 u from its target. Within 4.2 u it hangs and shrieks: an Ember cone r 3.8 u, 60° wide, warned for 54 ticks, then 8 damage and a 35% slow for 1.5 s to everyone in it. Again 230 ticks later.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Glide</td><td>The game's glide: bursts of slow beats with the wings held out between them, the hand folding on each upstroke, the bob and the breath, a slow look round.</td><td>Game: a beat of 5.2 rad/s (here 1.2 s a beat), bursts of 0.2 to 1 of the beat (here on a 6 s cycle, the game's 7.9 s), bob 0.06 u. 6 s loop.</td></tr>
      <tr><td>Fly</td><td>Flies forward nose down, the wings swept back and beating harder, the talons and the tail trailing.</td><td>Game: 2.4 u/s, the lean 0.13 rad, the beat a third harder.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot banked into the turn, the head leading.</td><td>180° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Shriek</td><td>The game's shriek key for key. It rises into the hang treading fast and shallow, the tail down as a brake. The gather draws the head back, flares the face and the wings wide, up and back, swells the chest and draws the talons up. The strike drives the wings down and forward, the head out and down at the cone and the body pitched into it with the contact squash; it holds the scream with the head trembling, kicks back on a braking upstroke and settles into the glide.</td><td>Game: the cone's 54 ticks (rise 12 ticks, the strike its last 3 frames), contact on the resolve tick at 0.9 s, held 4 frames, recoil 3, settle 12.</td></tr>
      <tr><td>Hurt</td><td>The head jolts back, the body flinches, the wings stutter up, the tail flicks. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in at its flying height, then flares its wings and face and settles into the glide.</td><td>Game: grow in 7 frames, about 10% over. The flare is mine.</td></tr>
      <tr><td>Death</td><td>The beat stops and it drops out of the air turning onto its back, and lies with the wings spread on the floor and the talons curled up.</td><td>Mine: the fall takes 0.55 s. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet</td><td>None planted: it never lands while alive.</td></tr>
      <tr><td>Loops that jump when they restart (glide, fly, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point while flying</td><td>LOW_U u above the floor (the tail tip).</td></tr>
      <tr><td>Lying dead</td><td>Rests on the floor, not in it: its lowest point is measured every 0.1 rad as it turns over.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the beat, the weight, the timing and the shriek are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Death.</strong> It falls and lies on its back (the standard). The game pops it flat in the air; I can build that instead.</li>
        <li><strong>The wings.</strong> This model holds its wings raised high. The game glides with them near level, so the glide lowers them by 0.6 rad; the hang and the gather lift them back to how you sent them.</li>
        <li><strong>The beak.</strong> The game opens the beak wide on the shriek. This beak is a tiny point fused to the face, so it cannot open; the face swells 11% instead (the game's disc flare).</li>
        <li><strong>The tell.</strong> The game's tell is the indigo pupils. These eyes already glow purple; they brighten through the gather.</li>
        <li><strong>Mine.</strong> The turn rate, the spawn flare and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Each wing bends only at the wrist; the feathers are stiff with it.</li>
        <li>The ragged tail is one stiff piece: it lifts, swings and fans as one.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember cone, pale shriek rings, the eye glow, a blue slow tint on the hero and landing dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="owl-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.7;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const RING=0xd8cbe8, EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Glide',walk:'Fly',turnL:'Turn left',turnR:'Turn right',shriek:'Shriek',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['shriek'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.4; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 4.2 u engage range and the cone\n  const WALK=2.4, RAGEWALK=2.4, TURN=Math.PI, CONE_R=3.8, CONE_HALF=Math.PI/6;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.4,0.32,1); blob.position.set(0,0.004,0.02);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[8.2,3.4,1.9],t:[0,0.8,1.6]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[5.6,1.5,1.2],t:[0,1.1,1.0]},Front:{p:[0.4,1.8,5.4],t:[0,1.3,0]},Back:{p:[-2.0,2.4,-4.4],t:[0,1.3,0.3]},Top:{p:[0,8.5,0.4],t:[0,0.5,1.2]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(hips|sq|head|tail|armL|handL|armR|handR|legL|talL|legR|talR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),cone:cone.visible,")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the Ember warning cone, pale shriek rings, the eye glow, a blue slow tint)
  const FXP=[], RINGS=[]; let dotTex=null, cone=null, coneFill=null, slowT=0;
  let eyes=1, eyesTo=1, tell=0.16, tellTo=0.16;
  function sector(r0,r1,a){ const g=new THREE.RingGeometry(r0,r1,48,1,-Math.PI/2-a,2*a); return g; }
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    // shriek rings: arcs of the cone that run out along the floor
    for(let i=0;i<8;i++){const m=new THREE.Mesh(sector(0.93,1,CONE_HALF),new THREE.MeshBasicMaterial({color:RING,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; RINGS.push({m,t:-1,dur:0.5,r0:0.1,r1:1,a:0.4,bill:false,arc:true}); fxG.add(m);}
    // the warning: the cone on the floor (r 3.8, 60 degrees), an edge and a fill that grows to the rim over the 54 ticks
    cone=new THREE.Group(); const ce=new THREE.Mesh(sector(0.04,CONE_R,CONE_HALF),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.07,depthWrite:false,side:THREE.DoubleSide}));
    const rim=new THREE.Mesh(sector(CONE_R-0.05,CONE_R,CONE_HALF),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.55,depthWrite:false,side:THREE.DoubleSide}));
    coneFill=new THREE.Mesh(sector(0.04,1,CONE_HALF),new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:0.12,depthWrite:false,side:THREE.DoubleSide}));
    [ce,rim,coneFill].forEach(m=>{m.rotation.x=-Math.PI/2; cone.add(m);}); cone.userData={ce:ce.material,rim:rim.material}; cone.position.y=0.012; cone.visible=false; fxG.add(cone);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,kick:0,hold:0}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function ringAt(pos,o){ if(!fxOn)return; const r=RINGS.find(r=>r.t<0); if(!r)return; r.t=0; r.dur=o.dur||0.5; r.r0=o.r0||0.1; r.r1=o.r1||1; r.a=o.a||0.4; r.delay=o.delay||0; r.m.material.color.setHex(o.col||RING); r.m.position.copy(pos); r.m.rotation.set(-Math.PI/2,0,-floorYaw*0); r.m.visible=false; }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); RINGS.forEach(r=>{r.t=-1;r.m.visible=false;}); if(cone)cone.visible=false; slowT=0; }
  const targetW=()=>new THREE.Vector3(dummy.position.x,0,dummy.position.z);
  const SPARK=0xe9dcc0, TEL=54/60;
  function fxStart(name){
    HOME=NEAR;
    if(name==='shriek'){ const f=toFloor(new THREE.Vector3(0,0,0)); cone.position.x=f.x; cone.position.z=f.z; cone.rotation.y=-floorYaw; coneFill.scale.setScalar(0.01); cone.visible=fxOn; }
    if(name==='spawn'){ eyes=0; cv.style.filter=''; }
  }
  function fxContact(name,i){
    if(name==='shriek'){ hitFeel(0.25,0.05,0.5); flash=0.15; cone.visible=false; if(fxOn){ const f=toFloor(new THREE.Vector3(0,0.02,0)); for(let k=0;k<4;k++){ const r=RINGS.find(r=>r.t<0); if(!r)break; r.t=0; r.dur=0.45; r.r0=0.2; r.r1=CONE_R; r.a=0.45; r.delay=k*0.07; r.m.material.color.setHex(RING); r.m.position.set(f.x,0.02,f.z); r.m.rotation.set(-Math.PI/2,0,0); r.m.parent.updateMatrixWorld(); r.m.rotation.z=0; r.m.userData.yaw=-floorYaw; r.m.visible=false; } }
      if(dummy&&showTarget){ const u=dummy.userData; u.mat.emissiveIntensity=feel?0.4:0; u.kick=0.12; slowT=1.5; } }
    if(name==='death'){ hitFeel(0.15,0,0.25); if(fxOn)dust(pt(bones.hips,[0,0,0]).setY(0),8,0.8,0.3); }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(n==='shriek'){ const k=Math.min(1,t/TEL); tellTo=t<TEL?0.16+0.5*k:t<TEL+0.3?0.7:0.16; if(cone.visible&&t<TEL){ coneFill.scale.setScalar(Math.max(0.01,k*CONE_R)); cone.userData.rim.opacity=0.35+0.3*k; cone.userData.ce.opacity=0.05+0.05*k; } }
    if(n==='death'){ eyesTo=t>1.2?0:1-0.6*t/1.2; tellTo=0.16*(1-Math.min(1,t/1.2)); if(t>1.2)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ eyesTo=t>0.2?1:0; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ eyesTo=sel.dead?0:1; tellTo=sel.dead?0:0.16; if(cone)cone.visible=false; }
    eyes+=(eyesTo-eyes)*Math.min(1,d*10); tell+=(tellTo-tell)*Math.min(1,d*8); flash=Math.max(0,flash-d*3.2);
    glowU.value.set((fxOn?1:0)*0.6*tell,0,feel?flash:0,0);
    if(bones.hips){ const hy=bones.hips.getWorldPosition(tmp2).y; const k=Math.max(0.5,Math.min(1.15,1.45-0.45*hy)); blob.scale.set(0.4*k,0.32*k,1); }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    RINGS.forEach(r=>{ if(r.t<0)return; r.t+=d; const u=(r.t-r.delay)/r.dur; if(u<0){r.m.visible=false;return;} if(u>=1){r.t=-1;r.m.visible=false;return;} r.m.visible=true; const e=1-(1-u)*(1-u); r.m.scale.setScalar(r.r0+(r.r1-r.r0)*e); r.m.rotation.set(-Math.PI/2,0,(r.m.userData.yaw||0)); r.m.material.opacity=r.a*(1-u); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); if(slowT>0){ slowT-=d; u.mat.color.setHex(0x5f6f86); } else u.mat.color.setHex(0x6b645c);
      if(u.kick>0){ u.z+=u.kick*d*6; u.kick=Math.max(0,u.kick-d*0.6); } else { u.z+=(HOME-u.z)*Math.min(1,d*3); } u.x+=(0-u.x)*Math.min(1,d*3); dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0.08,0.1]),5,0xe9dcc0,1.1,0.2); }")
lowfly = min(v['lowest'] for k, v in au.items() if k != 'death')
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly * 1.7:.2f}')
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS', 'fire(', 'lane', 'wall'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
