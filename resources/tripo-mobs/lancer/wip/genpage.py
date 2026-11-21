# Builds the Vein Lancer's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/lancer'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/lancer.audit.json'))
glb = open(S + '/lancer.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/lancer.glb') / 1e6
rim = 0
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Vein Lancer Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Vein Lancer from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Hollow Heart's ranged threat: your export, with a skeleton and eight moves added by hand. A gaunt grey-violet soldier in a dented kettle helm with a nose guard, a ragged tabard and bracers, violet veins under the skin and a long spear with a violet crystal head. It keeps its distance, then plants, locks its aim and marks an Ember lane 7 u long down the floor while it draws the spear back; when the lane is full the lance fills it at once and every hero still inside takes 10. The spear is gone from its hand and grows back from the veins. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between throws, and Going turns it on the spot. Lance plays the game's three throws in turn (over the shoulder, side-arm, then the two-handed plunge), each on its own full 7 u lane with the hero stand-in 4 u ahead on it, and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="lancer-views.png" alt="The Tripo Vein Lancer from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as two pieces: the soldier, standing straight with the arms down, and the spear, held upright in the right hand with its butt on the floor. Thin grey-violet limbs with violet veins showing through, a dark kettle helm with a nose guard and glowing violet eyes under it, a sash across the chest, a belt, a ragged tabard to the knees, leather bracers and wrapped shins.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>22 <small>a root, hips, spine, chest, neck and head; a collarbone, upper arm, forearm and hand each side; thigh, shin, foot and toe each side; the spear on its own bone in the right hand</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.76 u tall <small>to the top of the helm, the spear 2.2 u; the game's lancer is a tall thin figure on stilt legs, well over the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Vein Lancer <small>16 health. It walks at 1.5 u/s, keeping 3.4 to 5.6 u from its target and circling slowly between throws. Within 6.2 u it plants, locks its aim and marks an Ember lane 0.8 wide and up to 7 long (stopped by the walls) for 54 ticks; then every hero inside the lane takes 10 at once. Nothing travels, so stepping out of the lane is the answer and a barricade does not stop it. Cooldown 240 ticks. Level IV, the Hollow Heart.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>It breathes, the spear swaying a little in its grip, and turns its head one way, then the other.</td><td>Mine: a 4.4 s loop.</td></tr>
      <tr><td>Walk</td><td>Long strides on its stilt legs, leaning into the travel, the free arm swinging and the spear carried upright.</td><td>Game: 1.5 u/s. The stride is mine: 0.85 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, the head and chest leading.</td><td>180° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Lance</td><td>The game's three throws, on its own key poses, one after another. Over the shoulder: it twists away and lifts the spear high behind its head, the off hand pointing down the lane. Side-arm: it twists further and draws the spear back low at its side. The plunge: both hands high, the spear pointed down the lane. Through the telegraph it holds the pose while the veins and the spearhead brighten and the lane fills; the thrust takes the last 2.5 frames. At the contact the spear is gone from its hand, the lance fills the lane and the hero takes 10; it holds 3 frames, snaps back and settles while the spear grows back in its hand.</td><td>Game: the 54-tick lane (0.9 s) each throw; strike 2.5 frames, hold 3, snap 3, settle 9 (at 30 a second); the spear back 0.12 to 0.62 s after the contact. The 0.35 s rest between throws is mine (the game waits 240 ticks).</td></tr>
      <tr><td>Hurt</td><td>The chest rocks back and the head snaps up. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, lifts the spear hand as the spear forms in it from the veins, and settles.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rocks back; the spear crumbles out of its hand, the stilt legs fold and it drops to its knees, then topples forward onto its face and lies still.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet sliding while planted (walk, both turns, the throws)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>Anything through the floor, the spear included</td><td>Nothing, on any frame of any move.</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm above at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the throws and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The plunge points 38° down, not steeper.</strong> The game tips its spear further, but your spear is long enough that the head would go through the floor, so I stopped it there.</li>
        <li><strong>The arms reach the game's hand spots from your rest pose.</strong> The game places its hands by IK; I took its targets as moves away from where your model holds its hands, so the shapes match the game's while the arms stay your length.</li>
        <li><strong>The knees stay a touch bent at rest</strong> (about 13°). Your legs are modelled slightly bent; standing them dead straight made the knees pop when it starts walking.</li>
        <li><strong>All three throws play in a row.</strong> The game picks one per lance; here they follow each other with a short rest so you can compare them.</li>
        <li><strong>Mine.</strong> The idle, the stride, the turn rate, the hurt, the spawn after the grow-in, the death, and the rest between throws.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The spear does not slide through the grip during the draw and thrust as the game's does; it turns in the hand only.</li>
        <li>The off hand comes up to the shaft in the plunge but does not close on it.</li>
        <li>The tabard and sash move with the body; they do not swing on their own.</li>
        <li>The veins and the spearhead glow violet, drawn by the page, brighter as it aims; the eyes are painted.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember lane, the violet flare at the hand, the lane's edge flashing as it hits, the violet beam with its pale head running the lane, the burst where it stops, sparks off the edges, the scorched line cooling from Ember to violet, the hit on the hero, and motes running down the arm as the spear reforms. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="lancer-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=2.2;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',lances:'Lance',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['lances'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=4.0; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 3.4 to 5.6 u stand-off, on its lane\n  const WALK=1.5, RAGEWALK=1.5, TURN=Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.42,0.36,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.6;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.6,2.4,5.6],t:[0,1.0,1.2]},'Game zoom':{p:[0,11.5,10.4],t:[0,0.6,2.2]},Side:{p:[10,1.4,2.2],t:[0,1.0,2.2]},Front:{p:[0.6,1.6,7.4],t:[0,1.0,0]},Back:{p:[-3.0,2.8,-6.4],t:[0,1.0,1.2]},Top:{p:[0,15,2.8],t:[0,0.4,2.8]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|neck|head|clvL|clvR|armL|armR|foreL|foreR|handL|handR|spear)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,beam:beam.visible,veins:+veins.toFixed(2),tip:+tipG.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(0.62,0.42,1.0)*uGlow.x*vMask.x")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={HL:[0.1,'toeL'],HR:[0.6,'toeR']};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0.04,0.06]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, dd) * 2.2 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'cone', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'disc', 'rage'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd)
