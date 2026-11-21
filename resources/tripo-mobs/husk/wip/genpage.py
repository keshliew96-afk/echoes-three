# Builds the Hollow Husk's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/husk'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/husk.audit.json'))
glb = open(S + '/husk.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/husk.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Hollow Husk Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Hollow Husk from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Hollow Heart's rusher: your export, with a skeleton and nine moves added by hand. A starved, corrupted hound with the Heart's violet in its veins. It stalks in hunched, and it moves to the room's heartbeat: every 3 s its veins swell, then it surges at more than twice its pace for 0.7 s. In reach it bites, three snaps in a chain. The heartbeat, the surge and the bites use the game's numbers frame for frame. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Stalk sets what it does, and Going turns it on the spot. The veins pulse on the room's 3 s heartbeat whatever it is doing. Heartbeat plays one whole beat as the game moves it (the swell, the surge, then stalking to the next beat), the floor sliding under it, and repeats until you press it again. Bite chain plays the game's three bites on the hero stand-in in reach. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing.</p>
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
      <img src="husk-views.png" alt="The Tripo Hollow Husk from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a gaunt grey hound, its ribs showing, a ridge of spikes down its back, ragged ears, a bushy tail, bared teeth with the mouth a little open, glowing violet eyes, and violet veins over its body that meet at a heart in its chest.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>28 <small>hips, spine, chest, two in the neck, head, the lower jaw, both ears, 3 in the tail, 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only; the veins glow from their colour in it</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.3 u long <small>0.83 u to the ear tips beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Hollow Husk <small>22 health. It walks in at 1.6 u/s and bites on contact for 9, once every 48 ticks per hero. Every husk in the room moves to one shared heartbeat: every 180 ticks its veins swell for 30 ticks, then it surges at 2.2 times its pace for 42 ticks. Level IV, the Hollow Heart.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>Stands hunched, head low, breathing in slow heaves with the jaw slack. A twitchy look left and right, an ear flick, the tail twitching, and halfway a jerk of the head, like a tic.</td><td>Mine: a 4 s loop. The veins keep the room's beat.</td></tr>
      <tr><td>Stalk</td><td>A hunched trot in diagonal pairs (the left fore with the right hind), head low and forward, ears back, tail hanging.</td><td>Game: 1.6 u/s. The stride is mine: 0.31 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Short steps round on the spot, head leading.</td><td>225° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Heartbeat</td><td>One beat of the room's clock. The swell: its veins brighten, the heart throbs and the body shudders and draws in, jaw open. The surge: the same stride at 2.2 times the speed, crouched lower, head driving forward, ears flat. Then it stalks to the next beat. The feet keep to the real ground it covers, so they stay planted however fast it goes.</td><td>Game: a beat every 180 ticks (3 s), the swell 30 ticks, the surge 42 ticks at 2.2 times 1.6 u/s.</td></tr>
      <tr><td>Bite chain</td><td>Three bites on a hero in reach. A snap cocked to its right and ripped across to its left, with no warning; the mirror snap; then a lunge, reared back and driven down and forward with the deepest bite. On each, the jaw gapes on the wind-up and shuts on the contact, the front paws step in, the head kicks and jerks back, and it holds the next wind-up until the bite is ready again.</td><td>Game: a bite every 0.8 s per hero. Contacts at 2.5 frames, 0.8 s and 1.6 s on the game's hit timeline (strike 2.5 frames, contact 2, snap 2.5, settle 5; recover 0.35 s). 3.1 s in all.</td></tr>
      <tr><td>Hurt</td><td>The head snaps away with the jaw open, the ears pin and the tail tucks. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows from the floor low, jerks its head about like something waking wrong, gapes, then drops into its hunch.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it jolts with the head thrown up and the jaw wide; the legs buckle, it rolls onto its right side, the legs twitch and go still, the jaw slack and the veins dark.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted paws that slide (idle, stalk, both turns, the heartbeat, the bites)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, stalk, both turns; the heartbeat ends where it starts)</td><td>0</td></tr>
      <tr><td>Paws sinking into the floor</td><td>RIM_MM mm at worst</td></tr>
      <tr><td>Paws that cannot quite reach where they are put</td><td>REACH_MM mm at worst (the lunge's held wind-up)</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the surge, the snaps and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>A hound, not the game's figure.</strong> The game's husk is a hunched person that claws with its hands. Your model is a hound, so I built it as your hound: it trots on four legs and bites where the game's husk claws, on the same timings (three hits a chain, 0.8 s apart).</li>
        <li><strong>The heartbeat on the page.</strong> The veins pulse on the room's 3 s clock all the time. The body's swell and surge play in the Heartbeat move. Stalk on its own stays at the walking pace, so you can judge the stride.</li>
        <li><strong>Mine.</strong> The turn rate, the stride, the idle and its tic, the hurt, the spawn after the grow-in and the death's fall.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The mouth was modelled slightly open, so the lower jaw is cut on the gape line. Opened wide, the corners of the mouth stretch, and the inside is the texture's pink, not a real mouth.</li>
        <li>The back spikes and the ribs bend with the body like skin; the spikes do not move on their own.</li>
        <li>The ears and tail swing on springs; at the surge's speed the tail can look stiff.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the veins' violet glow on the heartbeat, a dim pulse from the heart on the surge, pale sparks at the teeth on each bite and dust under the paws. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="husk-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.3;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Stalk',turnL:'Turn left',turnR:'Turn right',beat:'Heartbeat',bite:'Bite chain',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['beat','bite'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.0; let HOME=NEAR; // where the hero stands, in u, in front of it: in reach of the jaws\n  const WALK=1.6, RAGEWALK=1.6, TURN=2*Math.PI/1.6;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.24,0.66,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[3.9,1.4,1.6],t:[0,0.42,0.5]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.3,0.5]},Side:{p:[5.8,0.8,0.5],t:[0,0.5,0.45]},Front:{p:[0.4,0.9,5.6],t:[0,0.5,0]},Back:{p:[-1.9,1.5,-4.2],t:[0,0.45,0.3]},Top:{p:[0,7.2,0.2],t:[0,0.2,0.45]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),veins:+veins.toFixed(2),")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(0.56,0.39,0.93)*uGlow.x*smoothstep(0.07,0.2,diffuseColor.b-diffuseColor.g)")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'fHoofL'],HR:[0.02,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.52,'hHoofL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),1,0.3,0.15);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,-0.04,0.18]),4,0xe9dcc0,1.2,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 1.3 * 1000))).replace('REACH_MM', str(round(max(v['reach_mm'] for v in au.values()) * 1.3))).replace('DEAD_MM', str(round(max(0, -dd) * 1.3 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET,', 'muzzle', 'motes', 'tusk', 'gore'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
