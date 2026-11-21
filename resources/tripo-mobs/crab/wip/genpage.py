# Builds the Weir Crab's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/crab'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/crab.audit.json'))
glb = open(S + '/crab.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/crab.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Weir Crab Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Weir Crab from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Sunken Mill's shield crab: your export, with an eight-legged skeleton and ten moves added by hand. It scuttles sideways across a hero's line while edging in, its two great claws held up before its face as the guard, and snaps three ways, the game's poses key for key: the big claw hooking in, the small claw's jab, and both claws scissoring down. After a snap the claws lie down in front and the face is open for the game's 45 ticks. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Scuttle sets what it does between snaps, and Going turns it on the spot. A snap plays over it and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="crab-views.png" alt="The Tripo Weir Crab from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a broad slate shell crusted with moss and barnacles and a rusted nail driven through it, two amber eyes on stalks, and two great rust-brown claws held up before its face like a pair of shields, on short arms. Underneath, eight walking legs, four a side, with pale joints and rusty tips.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>41 <small>hips, the shell's squash, 2 eye stalks, 2 arms, 2 claws and 4 in each of the 8 legs</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.25 u wide <small>its legs span about 1.2 u, the game's crab's stance, beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Weir Crab <small>40 health. Scuttles sideways across its target's line at 1.9 u/s while edging in at 0.6, flipping side every 75 ticks, and turns at 300° a second. Its raised claws are a guard that blocks shots from within 60° of its front. Within 1.3 u it snaps: an Ember cone r 1.4, half-angle 55°, for 42 ticks, 10 damage. The guard is down from the wind-up until 45 ticks after. Every 180 ticks. Level II, the Sunken Mill.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's breath and the claws' faint tremble. Mine on top: the eye stalks look about each on its own, it shifts its weight, and a leg resettles.</td><td>6 s loop</td></tr>
      <tr><td>Scuttle</td><td>The game's scuttle: sideways to its left while edging in, on two alternating sets of four legs, the body leaning into the sidestep and the eyes turned the way it goes.</td><td>Game: 1.9 u/s sideways, 0.6 in; my steps, about six a second for each leg.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot.</td><td>Game: 300° a second.</td></tr>
      <tr><td>Claw hook</td><td>The game's first snap: it rears back with its big right claw cocked high and out, the plate tipped open; then it lunges and hooks the claw in and down across its front.</td><td rowspan="3">Game: the coil through the 42-tick cone, the strike in the last 2.5 frames, the contact held 3 frames with a recoil shove, snap back 2.5, settle 6. The guard lies down from the snap back until 45 ticks after the strike, then rises.</td></tr>
      <tr><td>Claw jab</td><td>The game's second: the left claw drawn straight back beside the eyes, the body turned to lead with it, then a straight jab.</td></tr>
      <tr><td>Scissor slam</td><td>The game's third and biggest: both claws lifted high and wide, the body rearing; it hops in and both claws come down together.</td></tr>
      <tr><td>Hurt</td><td>The shell jolts and squashes, the eye stalks snap back flat, and the claws flinch up. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, rises on its legs, the eyes pop up and the claws come up into the guard.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears and the claws fly up; the legs give and curl in, it sinks onto its belly with the claws falling open in front, and the eye stalks fold back.</td><td>Mine: 2 s, then it stays down. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet that slide</td><td>SLIDE_MM mm at worst (in the snaps' lunge)</td></tr>
      <tr><td>Legs stretched past their length</td><td>REACH_MM mm at worst (a leg reaching as it gives in the death)</td></tr>
      <tr><td>Anything below the floor</td><td>RIM_MM mm at worst: a claw's lower edge or a planted toe's tip at the instant of the snap.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the scuttle, the snaps and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The pincers.</strong> Each of your claws is one solid plate, so it cannot open and shut like the game's hinged finger. I tip the plate's top back for the game's gape and drive it down for the snap. I can cut a moving finger out of the top of each claw if you want the pincer to open.</li>
        <li><strong>The lunge.</strong> I lunge it about half the game's 0.14 u, so all eight planted feet keep their hold on the floor.</li>
        <li><strong>The guard down.</strong> The game lowers both claws to the floor in front after a snap. Your claws already reach the floor, so I tip them forward flat instead, which opens the face.</li>
        <li><strong>Mine.</strong> The scuttle's step rate, the idle's looks, the hurt, the spawn after the grow-in and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The arms are short and mostly hidden behind the claws, so the claws swing from just behind the plates.</li>
        <li>The shell, the barnacles and the nail move as one piece.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember cone, a faint indigo on the claws while it coils (the game's tell), pale sparks and dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="crab-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.25;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Scuttle',turnL:'Turn left',turnR:'Turn right',snap1:'Claw hook',snap2:'Claw jab',snap3:'Scissor slam',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['snap1','snap2','snap3'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.15; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 1.3 u snap\n  const WALK=0.6, SIDE=1.9, RAGEWALK=0.6, TURN=300*Math.PI/180, TEL=42/60, CONE_R=1.4, CONE_HALF=55*Math.PI/180;")
rep("function moveFloor(dz,dyaw){ // he moves forward dz and turns left dyaw: the floor does the opposite\n    floorPos.z-=dz;", "function moveFloor(dz,dyaw,dx=0){ // it moves forward dz, to its left dx and turns left dyaw: the floor does the opposite\n    floorPos.z-=dz; floorPos.x-=dx;")
rep("let dz=0, dyaw=0; dz+=(A.walk.__w)*WALK*fast*md;", "let dz=0, dyaw=0, dxs=(A.walk.__w)*SIDE*md; dz+=(A.walk.__w)*WALK*fast*md;")
rep("if(dz||dyaw)moveFloor(dz,dyaw);", "if(dz||dyaw||dxs)moveFloor(dz,dyaw,dxs);")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(1.0,0.62,0.22)*uGlow.x*vMask.x")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.62,0.6,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[3.1,1.6,2.4],t:[0,0.4,0.4]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.3,0.5]},Side:{p:[5.0,0.9,0.5],t:[0,0.4,0.5]},Front:{p:[0.5,1.1,5.0],t:[0,0.4,0]},Back:{p:[-1.9,1.7,-4.0],t:[0,0.4,0.2]},Top:{p:[0,6.8,0.3],t:[0,0.2,0.45]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|eyeL|eyeR|armL|armR|clawL|clawR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),cone:cone.visible,")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={A:[0.0,'c1L'],B:[0.125,'c1R'],C:[0.5,'c3L'],D:[0.625,'c3R']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,0,0]),1,0.2,0.12);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.sq,[0,0.05,0.3]),5,0xe9dcc0,1.1,0.2); }")
snaps = {k: v for k, v in au.items() if k.startswith('snap')}
slide = max(v['slide_mm'] for v in au.values())
rim = max(-v['lowest'] for k, v in snaps.items())
reach = max(v['reach_mm'] for v in au.values())
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 1.25 * 1000))).replace('REACH_MM', str(round(reach * 1.25))).replace('SLIDE_MM', f'{slide * 1.25:.1f}')
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET,', 'muzzle', 'motes', 'gore', 'Hoof', 'tusk', 'fang', 'bites'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'slide', slide, 'reach', reach)
