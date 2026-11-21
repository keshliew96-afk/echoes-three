# Builds the Vine Lasher's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/lasher'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/lasher.audit.json'))
glb = open(S + '/lasher.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/lasher.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Vine Lasher Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Vine Lasher from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The eighth mob: your export of the Level I lasher, with a skeleton and eleven moves added by hand. It creeps on its roots and throws the game's three-lash chain: a sweep from its right, a low backhand from its left and an overhead slam, each coiled over the game's 48-tick lane warning, thrown dead straight down the lane on the resolve tick and reeled back with the hero on the hook. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Creep sets what it does between lashes, and Going turns it on the spot. Each lash plays over it and repeats until you press it again; Lash chain plays all three back to back, the way the game cycles them. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="lasher-views.png" alt="The Tripo Vine Lasher from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a ribbed olive pod on a skirt of brown roots, a toothed red rim round a glowing yellow maw, two slit eyes, leaves and two red flowers at its base, and one long thorned vine that grows from its right side and lies coiled on the floor.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>52 <small>hips, the pod and a squash bone, the two halves of the rim, eight roots of four bones each, and the vine: fourteen bones and its tip</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.6 u wide <small>the pod's width, the same as the game's (0.6); it stands 0.8 u tall, the vine 1.7 u long against the game's 0.9 u at rest. Beside a 1 u hero.</small></dd></div>
    <div><dt>In the game</dt><dd>Puller <small>30 health, creeps at 0.8 u/s keeping 2.2 to 4.6 u from its target. With it inside 5 u it marks an Ember lane 0.7 u wide and up to 5.4 u long for 48 ticks, then lashes: 9 damage to all in the lane, and each hero caught is yanked 1.8 u toward the pod over 12 ticks. Again 220 ticks later.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The vine sways where it lies (the game's sway), the pod breathes, the rim opens and closes a little, and it turns its maw one way and back.</td><td>6 s loop. The breath and the look are mine.</td></tr>
      <tr><td>Creep</td><td>Drags itself on its roots in two sets of four, every root planted while it carries weight, the pod rocking onto each set; the vine drags along behind.</td><td>Game: 0.8 u/s, a root steps when it lags 0.07 u, in 0.1 to 0.22 s. Here a step every 0.175 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot on stepping roots, the pod leaning into the turn.</td><td>150° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Sweep, Backhand, Overhead slam</td><td>The game's three lashes key for key. The coil gathers (the two front roots step out to brace, the rim gapes, the maw glows) and tightens with a tremble; the throw leads with the pod's twist and lean, the vine's root a tick behind and its reach last, so it lands dead straight down the lane with the hook at its end and the rim clapping shut. The hook whips back onto the hero and reels it in while the pod hauls back, the front roots step home, then the vine snaps up and settles.</td><td>Game: the coil is the 48-tick lane warning (gather 0.25 s), the throw its last 5 ticks, contact on the resolve tick at 0.8 s held 2 frames, the reel on the 12-tick yank, snap back 2.5 frames, settle 6 frames with one overshoot.</td></tr>
      <tr><td>Lash chain</td><td>All three back to back, each snap back settling into the next lash's coil, as the game's model lab plays them.</td><td>1.28 s a lash.</td></tr>
      <tr><td>Hurt</td><td>The pod flinches back and squashes, the rim claps, the vine jerks. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, then the rim snaps open and shut and the vine lifts off the floor and drops back.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck back, the rim gapes, the glow goes out, the pod wilts back and slumps on its roots, and the vine lifts once and falls limp.</td><td>Mine: 0.55 s to slump. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted roots that slide</td><td>0 mm, in every move.</td></tr>
      <tr><td>Planted roots out of reach</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, creep, both turns)</td><td>0</td></tr>
      <tr><td>Anything under the floor</td><td>At worst UNDER cm: a root's underside on the braced front root, and the vine's belly as it drags. The vine lies on the floor, not in it, wherever it touches.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the creep, the whip of the throw and the reel are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The vine stretches.</strong> Its own length is 1.7 u; the lane is 5.4 u. Like the game's, it lays dead straight to the lane's end, so it stretches to about three times its length for the contact and the reel, its thorns drawn out with it. I can instead have it reach only its own length and say the lane is the danger.</li>
        <li><strong>Where the vine grows.</strong> The game's vine comes off the pod's face; this one grows from its right side. The coils keep the game's sides, but the backhand wraps round in front of the pod instead of starting from its left.</li>
        <li><strong>The jaws.</strong> The game's lid splits into two jaws over an indigo maw. Here the toothed rim's two halves are the jaws: they splay open on the coil and clap on the throw. The maw and eyes keep their yellow glow and brighten as the tell.</li>
        <li><strong>Death.</strong> It wilts and slumps where it stands (the standard falls and stays down; a plant on roots has nowhere to fall). The game pops it flat; I can build that instead.</li>
        <li><strong>Mine.</strong> The turn rate, the idle breath and look, the spawn and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Roots that touch are split between neighbouring root bones, so where two meet they bend together.</li>
        <li>The leaves and flowers at the base ride the pod stiffly.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember lane, dust where the hook lands, the maw glow, and the hero dragged 1.8 u and walking back. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="lasher-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.0;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Creep',turnL:'Turn left',turnR:'Turn right',chain:'Lash chain',lash1:'Sweep',lash2:'Backhand',lash3:'Overhead slam',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['chain','lash1','lash2','lash3'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.6; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 2.2 to 4.6 u stand-off and the lane\n  const WALK=0.8, RAGEWALK=0.8, TURN=Math.PI/1.2, LANE=5.4, LANE_W=0.7, TEL=48/60, PERIOD=TEL+12/60+2.5/30+6/30, YANK=1.8, YANK_T=12/60;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.42,0.42,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[6.9,3.3,1.0],t:[0,0.4,1.6]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.4,1.8]},Side:{p:[7.4,1.4,2.2],t:[0,0.4,2.2]},Front:{p:[0.3,1.2,3.4],t:[0,0.4,0]},Back:{p:[-1.6,1.6,-2.8],t:[0,0.4,0.3]},Top:{p:[0,9.5,2.4],t:[0,0.3,2.4]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(pod|sq|lipL|lipR|v\\d+|vend)\\./;")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(0.55,0.62,0.12)*uGlow.x*vMask.x")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,")
FX = r'''  // ---- effects (stand-ins, dim on purpose: the Ember lane, dust where the hook lands, the maw's glow, the yank)
  const FXP=[], RINGS=[]; let dotTex=null, lane=null, laneFill=null;
  let tell=0, tellTo=0, glowOff=0;
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<90;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    // the warning: the lane on the floor (0.7 wide, 5.4 long), its edges, and a fill that runs out to its end over the 48 ticks
    lane=new THREE.Group(); const mk=(w,l,z,op)=>{const g=new THREE.PlaneGeometry(w,l); g.translate(0,l/2+z,0); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:EMBER,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide})); m.rotation.x=Math.PI/2; return m;};
    const base=mk(LANE_W,LANE,0,0.06), e1=mk(0.04,LANE,0,0.5), e2=mk(0.04,LANE,0,0.5), cap=mk(LANE_W,0.04,LANE-0.04,0.5);
    e1.position.x=LANE_W/2-0.02; e2.position.x=-LANE_W/2+0.02; laneFill=mk(LANE_W,1,0,0.12);
    [base,e1,e2,cap,laneFill].forEach(m=>lane.add(m)); lane.userData={edges:[e1.material,e2.material,cap.material],base:base.material}; lane.position.y=0.012; lane.visible=false; fxG.add(lane);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); head.position.y=0.8; dummy.add(body,head); dummy.userData={mat:dm,z:HOME,x:0,yank:-1,from:HOME}; dummy.position.set(0,0,HOME); scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; }
  function dust(pos,n,spd,up){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.03),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.45+Math.random()*0.3,s0:0.06,s1:0.22,a:0.18,drag:3,floor:true});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.01,a:0.5,col,g:-2.5,drag:2});} }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); if(lane)lane.visible=false; }
  // where the lash is: which lash (0..2) and how far into it
  function lashTau(name,t){ if(name==='chain'){ const n=Math.min(2,Math.floor(t/PERIOD)); return [n,t-n*PERIOD]; } return [+name.slice(4)-1,t]; }
  const isLash=(n)=>n==='chain'||/^lash\d$/.test(n);
  function fxStart(name){ HOME=NEAR; if(name==='spawn'){ glowOff=1; cv.style.filter=''; } }
  function fxContact(name,i){
    if(isLash(name)){ hitFeel(0.3,0.05,0.5); flash=0.18; if(fxOn){ dust(toFloor(new THREE.Vector3(0,0,LANE)).applyMatrix4(fxG.matrix),6,0.7,0.3); }
      if(dummy&&showTarget){ const u=dummy.userData; u.mat.emissiveIntensity=feel?0.45:0; u.yank=0; u.from=u.z; if(fxOn)dust(new THREE.Vector3(u.x,0,u.z),8,0.9,0.4); } }
    if(name==='death'){ hitFeel(0.15,0,0.25); if(fxOn)dust(new THREE.Vector3(0,0,0),8,0.8,0.3); }
  }
  function fxOngoing(d){
    if(!shot||shot.done)return; const n=shot.name, t=shot.action.time;
    if(isLash(n)){ const [k,tau]=lashTau(n,t);
      if(tau<TEL){ const f=toFloor(new THREE.Vector3(0,0,0)); lane.position.x=f.x; lane.position.z=f.z; lane.rotation.y=-floorYaw; lane.visible=fxOn; const kk=tau/TEL; laneFill.scale.y=Math.max(0.01,kk*LANE); lane.userData.edges.forEach(m=>m.opacity=0.3+0.3*kk); tellTo=0.25+0.75*Math.min(1,tau/(TEL-5/60)); }
      else { lane.visible=false; tellTo=tau<TEL+0.2?0.6:0.15; } }
    if(n==='death'){ glowOff=Math.min(1,t/0.8); tellTo=0; if(t>1.1)cv.style.filter='saturate(0.45)'; }
    if(n==='spawn'){ glowOff=t>0.25?0:1; }
  }
  function updateFx(d){
    const busy=shot&&!shot.done; if(!busy){ tellTo=0; glowOff=sel.dead?1:0; if(lane)lane.visible=false; }
    tell+=(tellTo-tell)*Math.min(1,d*10); flash=Math.max(0,flash-d*3.2);
    // the model's own glow is in its texture; the tell brightens it (x), and death and spawn dim it (the page's grey-out)
    glowU.value.set((fxOn?1:0)*0.55*tell,0,feel?flash:0,0); mesh.material.color.setScalar(1-0.25*glowOff);
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); if(p.s.position.y<0.02)p.s.position.y=0.02; const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4);
      if(u.yank>=0){ u.yank+=d; const k=Math.min(1,u.yank/YANK_T); u.z=u.from-YANK*k; if(u.yank>=YANK_T+0.25)u.yank=-1; }
      else { const dz=HOME-u.z; u.z+=Math.sign(dz)*Math.min(Math.abs(dz),1.6*d); }
      u.x+=(0-u.x)*Math.min(1,d*3); dummy.position.z=u.z; dummy.position.x=u.x; }
  }
'''
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.sq,[0,0.25,0.15]),5,0xe9dcc0,1.1,0.2); }")
under = max(-v['lowest'] for k, v in au.items())
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('UNDER', f'{under * 100:.1f}')
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'motes', 'idleFx', 'BOLTS', 'fire(', 'wall', 'rage', 'bones.head', 'jaw'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'under', under)
