# Builds the Ember Newt's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/newt'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/newt.audit.json'))
glb = open(S + '/newt.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/newt.glb') / 1e6
dd = au["death"]["lowest"]; lw = min(au["lunge"]["lowest"], au["turnL"]["lowest"], au["turnR"]["lowest"])

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Ember Newt Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Ember Newt from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Ember Kiln's skitterer: your export, with a skeleton and eight moves added by hand. A small sooty fire lizard, dark brown-red with glowing cracks and spots, a row of flame spines down its back, yellow eyes and a long tapering tail. It skitters in fast and low; close by, it crouches while an Ember lane marks its line through you, then shoots down the lane, bites as it passes, skids to a stop and rests there panting. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Skitter sets what it does between lunges, and Going turns it on the spot. Lunge plays the game's lunge: the crouch through the 3.6 u Ember lane, the lunge through the hero stand-in 2.5 u away, the skid and the rest at the lane's end. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="newt-views.png" alt="The Tripo Ember Newt from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a low lizard standing on four splayed legs, a broad flat head with a wide smile and yellow eyes, dark sooty hide cracked with glowing orange lines and spots, a row of flame-coloured spines from the crown down its back, and a long tapering tail with a glowing ridge.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>26 <small>a root, hips, spine, chest, neck and head; four in the tail; upper arm, forearm, foot and toes for each front leg; thigh, shin, foot and toes for each hind leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.06 u long <small>0.3 u tall at the head; small and low beside the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Ember Newt <small>16 health; it dies to one good hit, so the danger is three lunging together. It skitters at 2.6 u/s to 2 to 3 u of its target, weaving. Within 3.2 u it crouches and marks a lunge: an Ember lane 0.7 u wide through the target, up to 3.6 u long, for 42 ticks. Then it shoots down the lane at 13 u/s, biting every hero it crosses once for 7, skids to a stop at the lane's end and rests there 40 ticks. Cooldown 190 ticks from the stop. The Ember Kiln.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>It waits low, its flanks breathing, the head turning to look, the tail tip twitching.</td><td>Mine: a 3 s loop. The game's newt keeps skittering and weaving.</td></tr>
      <tr><td>Skitter</td><td>A lizard's quick diagonal trot, low to the floor, with the S through its spine and the tail swinging behind.</td><td>Game: 2.6 u/s. The step is mine, 0.11 s a cycle, short and quick for its short legs.</td></tr>
      <tr><td>Turn left, turn right</td><td>Scuttles round on the spot, the body curved into the turn.</td><td>180° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Lunge</td><td>The game's lunge. Through the lane telegraph it crouches, front low, its heat building, the tail raised and whipping faster and the haunches wiggling over the last half. Then it shoots down the lane, a stretched dart with its legs swept back and its tail straight, a gold streak behind it, biting the hero as it passes. It skids to a stop at the lane's end and rests low, its flanks heaving fast and deep, smoke puffing from its nostrils. Then it gets up.</td><td>Game: the lane 42 ticks; 13 u/s down 3.6 u (0.28 s); the bite on the hero (7); rest 40 ticks. Getting up is mine, 0.35 s.</td></tr>
      <tr><td>Hurt</td><td>The head and tail jerk up. Plays on top of any move.</td><td>0.35 s</td></tr>
      <tr><td>Spawn</td><td>Grows in and shakes itself.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears its head, then sags flat onto its belly, legs splaying out, the head down and the tail curling to one side, its heat going out.</td><td>Mine: 1.8 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet sliding while planted (skitter, both turns, the lunge)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, skitter, both turns)</td><td>0</td></tr>
      <tr><td>Anything into the floor</td><td>Up to LUNGE_MM mm as it crouches and turns (the tail tip and the belly brushing the floor); up to DEAD_MM mm in the death as its legs splay.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the skitter and the lunge are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Its heat is in your cracks.</strong> The game's newt has a coal-bright belly, coals down its spine and a glowing tail tip. Yours glows in its cracks, spots and spines, so those carry the heat: steady, building through the crouch, brightest on the lunge, pulsing as it pants.</li>
        <li><strong>No indigo crown scale.</strong> The game's newt has a small indigo scale on its crown as its tell; your model has none. Say if you want one added on the page.</li>
        <li><strong>It idles in place.</strong> The game's newt never stands still; the idle is mine so you can see it.</li>
        <li><strong>Mine.</strong> The idle, the step, the turn rate, getting up after the rest, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The jaw is part of the head, so it does not open for the bite or pant at rest; the head nods instead.</li>
        <li>The legs are short and nearly straight in your model, so the skitter stays low and quick with short steps.</li>
        <li>The spines are fixed on the back; they do not flex on their own.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the heat in its cracks, the belly's glow on the floor, the Ember lane, the sparks lifting off it in the crouch, the gold streak behind the lunge, the bite on the hero, the skid's scuff, and the smoke as it pants. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''

cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="newt-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.0;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Skitter',turnL:'Turn left',turnR:'Turn right',lunge:'Lunge',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['lunge'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.5, FAR=1.6; let HOME=FAR; // where the hero stands, in u, in front of it: and for the lunge 2.5 u off, inside its 2 to 3 u stand-off\n  const WALK=2.6, RAGEWALK=2.6, TURN=Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.22,0.5,1); blob.position.set(0,0.004,0.02);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=0.8;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[5.4,2.4,0.7],t:[0,0.15,1.0]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.2,1.3]},Side:{p:[5.6,0.8,1.3],t:[0,0.2,1.3]},Front:{p:[0.3,0.7,3.2],t:[0,0.15,0]},Back:{p:[-1.5,1.3,-3.0],t:[0,0.15,0.3]},Top:{p:[0,7,1.3],t:[0,0.1,1.3]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(chest|neck|head|tail1|tail2|tail3|tail4)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,heat:+heat.toFixed(2),streak:+sk.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(1.0,0.66,0.3)*uGlow.x*vMask.x")
rep("vec3(0.55,0.22,0.9)*uGlow.y*vMask.y", "vec3(1.0,0.85,0.4)*uGlow.y*vMask.y")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0,0.08]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1000))).replace('LUNGE_MM', str(round(max(0, -lw) * 1000)))
for bad in ('coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'cone', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'disc', 'rage', 'spear', 'lane', 'veins', 'eyes', 'sack', 'stone', 'paste', 'mound', 'mAmt', 'clods', 'ringT', 'tell', 'SCALE'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd, 'lunge', lw)
