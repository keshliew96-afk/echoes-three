# Builds the Barrow Ram's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/ram'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/ram.audit.json'))
glb = open(S + '/ram.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/ram.glb') / 1e6
U = 1.3
dd = au["death"]["lowest"] * U; lw = min(au["walk"]["lowest"], au["turnL"]["lowest"], au["turnR"]["lowest"]) * U; sw = au["slams"]["lowest"] * U
slide = max(au[k]["slide_mm"] for k in au); pop = max(au[k]["loopPopDeg"] for k in ("idle", "walk", "turnL", "turnR"))
print("slide", slide, "pop", pop)

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Barrow Ram Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Barrow Ram from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">Level III's heavy: your export, with a skeleton and nine moves added by hand. A big mossy ram, its pale bone skull under two huge curled horns hung with iron rings, thick fleece patched with moss, short stout legs on dark hooves and pale glowing eyes. It walks slowly where its horns point and turns slowly, so you beat it by going round it; shots that hit its horns are blocked. Close in, it winds back while an Ember cone marks the ground in front of it, then slams its horns through the cone. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between slams, and Going turns it on the spot. Horn slams plays the game's three slams back to back, each on its own 1 s Ember cone, with the hero stand-in inside the cone. Block fires a shot from the hero stand-in into its horns. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="ram-views.png" alt="The Tripo Barrow Ram from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a heavy ram with a long pale skull, glowing pale blue eyes, two big dark horns curling forward round its face with an iron ring hanging from each, a deep coat of cream fleece patched with green moss, a short tail tuft, and four short dark legs on cloven hooves.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>23 <small>a root, hips, spine, chest, neck and head (the head carries both horns); a tail; upper leg, forearm, cannon and hoof for each front leg; thigh, shin, cannon and hoof for each hind leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.26 u long <small>1.3 u tall at the horns; as tall as the 1 u hero and much heavier</small></dd></div>
    <div><dt>In the game</dt><dd>Barrow Ram <small>90 health. It walks at 1.1 u/s and turns at only 90° a second, walking where its horns point, so the party wins by flanking it. Its horn guard blocks every shot that arrives within 55° either side of its facing (arcs, novas, zones and heals still land). Horn Slam: a cone 1.8 u long at a half-angle of 50°, marked by a 60-tick Ember cone, 18 damage, cooldown 270 ticks. It takes only 0.3 of any knockback. Level III.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's rest: a slow breath and a small nod of the head. On top: it looks left and right, lowers its head and shakes its horns, then scrapes the floor twice with a front hoof, the tail flicking now and then.</td><td>A 6 s loop. The breath and nod are the game's; the rest is mine.</td></tr>
      <tr><td>Walk</td><td>A heavy trot in diagonal pairs, as the game's legs step, leaning into the travel with its head carried low.</td><td>Game: 1.1 u/s, diagonal pairs, the lean. The step is mine, 0.4 s a cycle, short for its short legs.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot, the head leading into the turn.</td><td>Game: 90° a second.</td></tr>
      <tr><td>Horn slams</td><td>The game's three slams in Kesh's 3-hit flow, each on its own Ember cone. The hook from its right: through the cone it winds back to its right with the hips sunk and the head cocked up and away, then rips the horns across to its left. The reverse hook: the mirror. The heave: gathered low, then heaved up and forward with its whole weight. On each slam the front hooves step in to land with the horns, it holds the contact, snaps back and settles with one overshoot. The heave also walks the hind hooves in a short step.</td><td>Game: the cone 60 ticks; the slam is its last 2.5 frames so the horns land as the cone resolves (18); held 3 frames, snap 2.5, settle 6, rest 0.25 s. The hind step on the heave is mine.</td></tr>
      <tr><td>Block</td><td>A shot from the hero hits its horns and is blocked: the horn glow flares indigo, and the head braces down into the blow and shoves back up.</td><td>Game: the flare on every blocked shot. The brace is mine, 0.5 s.</td></tr>
      <tr><td>Hurt</td><td>The head snaps away and the tail tucks. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in low with its head down, shakes its horns and stamps a front hoof.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, its head jerks up; its forelegs buckle, then it rolls heavily onto its right side, the legs kick once and it lies still.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Hooves sliding while planted (walk, both turns, the slams)</td><td>SLIDE_MM mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>Up to WALK_MM mm on the walk and turns (a hoof's edge as it rolls off the floor); up to SLAM_MM mm in the slams; up to DEAD_MM mm in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the walk and the slams are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The guard glow is on your horns.</strong> The game's ram carries its indigo tell on a bone shield disc where its horns meet. Yours has no disc, so the horns carry a faint indigo glow that flares on every blocked shot, with the game's soft indigo glow in front of them.</li>
        <li><strong>The body squash is softened.</strong> The game squashes its ram's body hard on each slam (19% wider). Here the legs hang from the body, so a full squash would push the hooves through the floor; I widen it by 40% of the game's amount and leave its height alone.</li>
        <li><strong>Mine.</strong> The idle on top of the breath, the step length, the hind step on the heave, the block's brace, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The jaw is part of the skull, so its mouth does not open.</li>
        <li>The iron rings are fixed to the horns; they do not swing.</li>
        <li>The eyes are painted in your texture, so they keep their glow and do not dim when it dies.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the guard's indigo glow and its flare, the Ember cone, the hero's shot, the slam on the hero, the dust and bone chips off the horns, and hoof dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''

cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="ram-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.3;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',slams:'Horn slams',block:'Block',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['slams','block'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.15, FAR=2.4; let HOME=FAR; // where the hero stands, in u, in front of it: inside its 1.8 u cone for the slams\n  const WALK=1.1, RAGEWALK=1.1, TURN=Math.PI/2;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.42,0.72,1); blob.position.set(0,0.004,-0.03);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.6,1.9,1.4],t:[0,0.6,1.0]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.0]},Side:{p:[6.8,1.3,0.9],t:[0,0.6,0.9]},Front:{p:[0.5,1.4,6.6],t:[0,0.6,0]},Back:{p:[-2.4,2.2,-5.2],t:[0,0.6,0.3]},Top:{p:[0,9,0.9],t:[0,0.2,0.9]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(chest|neck1|head|tail1)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),cone:cone.visible,guard:+guard.toFixed(2),flare:+flare.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={FL:[0,'fHoofL'],HR:[0.02,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.52,'hHoofL']};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,-0.06,0.2]),6,0xe9dcc0,1.4,0.25); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1000))).replace('WALK_MM', str(round(max(0, -lw) * 1000))).replace('SLAM_MM', str(round(max(0, -sw) * 1000))).replace('SLIDE_MM', f'{slide:g}').replace('POP_DEG', '0' if pop < 0.05 else f'up to {pop:.1f}°')
for bad in ('CLAWS', 'rune', 'summon', 'buds', 'throat', 'LEAP', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'disc', 'rage', 'spear', 'lane', 'veins', 'sack', 'stone', 'paste', 'mound', 'mAmt', 'clods', 'ringT', 'tell', 'SCALE'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd, 'lunge', lw)
