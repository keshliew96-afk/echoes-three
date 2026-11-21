# Builds the Ash Keener's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/keener'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/keener.audit.json'))
glb = open(S + '/keener.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/keener.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Ash Keener Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Ash Keener from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Ashen Barrow's mourner: your export, with a skeleton and eight moves added by hand. A shrouded figure in ragged grave-cloth gliding a hand above the floor. It keeps a middle distance, then keens: it throws its head back with its arms spread while a long, narrow Ember cone locks on you, and wails down it. Inside, you take 10 and are slowed for 2 s. Three wails in turn, the game's poses key for key. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Hover or Glide sets what it does between wails, and Going turns it on the spot. Wails plays the game's three wails in turn on the hero stand-in 2.8 u ahead, each on its own cone, and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="keener-views.png" alt="The Tripo Ash Keener from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a tall shrouded figure in layered ragged grey cloth to the floor, a deep hood over a gaunt pale face with an open wailing mouth, glowing pale-blue eyes and long white hair, and two thin bony arms with clawed hands hanging out of the sleeves.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>15 <small>hips, a squash bone, spine, chest and head (the hood moves with the head); three down the skirt to the hem; per arm the upper arm, forearm and hand</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.75 u tall <small>the game's height (its keener stands about 1.75 u), gliding 0.08 u up beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Ash Keener <small>24 health. It glides at 1.45 u/s to keep 2.0 to 3.4 u from its target. Then it keens: an Ember cone r 4.2, half-angle 28°, aim locked, for 54 ticks; every hero inside when it lands takes 10 and is slowed by 40% for 2 s. Cooldown 270 ticks. Level III, the Ashen Barrow.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Hover</td><td>The game's glide in place: it bobs, sways, its head bobs and its sleeves swing. Mine on top: it looks one way, bows its head in grief, then looks the other way.</td><td>Game: 0.04 u bob at 1.6 rad/s, 0.05 sway, sleeves 0.12 at 1.4 rad/s, a 7.85 s loop of whole cycles.</td></tr>
      <tr><td>Glide</td><td>The same, leaning 0.08 into the travel with the skirt trailing.</td><td>Game: 1.45 u/s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot, the head first and the skirt swinging after.</td><td>180° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Wails</td><td>Three wails in turn, each on its own Ember cone. The keen: head thrown back, arms spread wide, the mouth's glow swelling; the wail throws the head and both arms forward and the robe flares. The lament from its left: it turns to its left with the left arm high and the right across its chest, then whips round with the left arm sweeping across. The dirge, the biggest: it sinks low with its arms over its face, then hurls itself forward and down with the arms flung back and the robe flaring widest. On each wail the mouth flares indigo, the cone flashes Ember, three pale sound-arcs roll down it and grave ash blows along the floor.</td><td>Game: the coil through the 54-tick cone, the wail on its last 2.5 frames, the contact held 3 frames shaking the body, snap back 2.5, settle 6, rest 0.15 s; 1.43 s a wail. The poses are the game's key poses.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the head snaps up, the arms fling out and the skirt whips. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in bowed, rises into the glide and lifts its head with its arms opening.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears back with its head up; the glide gives out, it sinks and topples forward onto its face, the robe lying flat behind it and the arms splayed.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (hover, glide, both turns)</td><td>0</td></tr>
      <tr><td>The hem through the floor</td><td>RIM_MM mm at worst (the dirge's sink)</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the wails and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The hood stays on.</strong> The game's keener throws its hood back to keen. Your hood is one piece with the head, so the head tips back inside it instead. If you want the hood to fall back, the model needs the hood as a separate piece, and I can redo it.</li>
        <li><strong>The arms spread less than the game's.</strong> The arms come out of the sleeves' rags, and spreading them as wide as the game's figure stretches the shoulders, so the spread is three quarters of the game's.</li>
        <li><strong>Mine.</strong> The turn rate, the idle's bow and looks, the hurt, the spawn after the grow-in and the death's fall.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The rags of the robe bend with the body in three bands; single rags do not flutter on their own.</li>
        <li>The rags nearest the arms move with the arms, so the sleeves lift with them.</li>
        <li>The eyes are painted, so they do not light; the mouth's indigo glow is a point drawn by the page.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember cone, the mouth's swell and flare, the cone's Ember flash, the three sound-arcs, the ash and its stain, and a pale tint on the hero while slowed. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="keener-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.75;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Hover',walk:'Glide',turnL:'Turn left',turnR:'Turn right',wails:'Wails',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['wails'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.8; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 2.0 to 3.4 u keep, inside the cone\n  const WALK=1.45, RAGEWALK=1.45, TURN=Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.42,0.24,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[7.4,3.4,5.0],t:[0,0.8,2.0]},'Game zoom':{p:[0,11.5,10.5],t:[0,0.6,1.8]},Side:{p:[8.4,1.6,1.8],t:[0,0.9,1.8]},Front:{p:[0.5,1.8,7.2],t:[0,1.0,0]},Back:{p:[-2.8,2.6,-5.4],t:[0,0.95,0.6]},Top:{p:[0,11,1.9],t:[0,0.3,1.9]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|head|sk1|sk2|sk3|armL|foreL|handL|armR|foreR|handR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),cone:cone.visible,mouth:+mouth.toFixed(2),slow:+slowT.toFixed(2),")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0,0.1]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(max(0, rim) * 1.75 * 1000))).replace('DEAD_MM', str(round(max(0, -dd) * 1.75 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
