# Builds the Bell Sacristan's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/sac'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/sac.audit.json'))
glb = open(S + '/sac.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/sac.glb') / 1e6
U = 1.25
dd = au["death"]["lowest"] * U; lw = min(au["walk"]["lowest"], au["turnL"]["lowest"], au["turnR"]["lowest"]) * U; sw = min(au["hush"]["lowest"], au["rap"]["lowest"]) * U
slide = max(au[k]["slide_mm"] for k in au); pop = max(au[k]["loopPopDeg"] for k in ("idle", "walk", "turnL", "turnR"))
print("slide", slide, "pop", pop)

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Bell Sacristan Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Bell Sacristan from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The belfry's warder: your export, with a skeleton and nine moves added by hand. A small stooped stone acolyte in a hooded robe, clasping a bronze hand bell before its chest. It hangs back behind other foes and rings the Vesper Hush: a pale ring marks the ground round it, it lifts the bell and rings it, and every other foe inside takes less damage for 5 s. Alone, it walks in and raps a hero with the bell. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between actions, and Going turns it on the spot. Vesper Hush plays the game's hush with two foe stand-ins inside the ring and the hero stand-in outside it; the two wear the pale veil for 5 s after it rings. Rap plays the bell rap on the hero stand-in inside its cone. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="sac-views.png" alt="The Tripo Bell Sacristan from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a small figure carved in pale cracked stone with moss at the hem and on the hood, a deep hood over a calm young face with faint gold eyes, a short shoulder cape, wide sleeves, a rope cord at the waist hanging to the knee, and both hands clasped on the wooden grip of a green-bronze hand bell. The robe reaches the floor, so no feet show.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>16 <small>a root, hips, spine, chest, neck and head (the hood with it); two halves of the robe's skirt; upper sleeve, forearm, hand and fingers for each arm; the bell rides the right hand</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.25 u tall <small>a little taller than the 1 u hero, stooped</small></dd></div>
    <div><dt>In the game</dt><dd>Bell Sacristan <small>34 health, slow (1.05 u/s). With two or more other foes within 3.6 u it keeps 3 to 5 u from its target and rings the Vesper Hush: a pale ring r 3.6 round itself for 54 ticks, then every other foe inside (not a boss) is hushed for 5 s and takes 40% less damage. Kill it first, or stun it mid-ring to choke the hush. Alone it walks in and raps: an Ember cone r 1.6 at a half-angle of 60° for 36 ticks, 7 damage. Cooldowns: hush 380 ticks, rap 150. The Spire.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's tend: a stoop (bent 0.42 at the waist, the head bowed), a slow sway, the head nodding, the bell held low and tinkling in its hands. On top: it lifts its head to look about once.</td><td>A 4.2 s loop. The stoop, sway and tinkle are the game's; the look is mine.</td></tr>
      <tr><td>Walk</td><td>The game's shuffle: stooped, swaying side to side with each step, a small bob. The robe's hem swings over the hidden feet and the bell sways with the step.</td><td>Game: 1.05 u/s, the sway and bob. The stride is mine, 0.8 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot, the head leading.</td><td>Mine: 180° a second (the game turns it at once).</td></tr>
      <tr><td>Vesper Hush</td><td>The game's hush. Through the pale ring it draws itself up straight, tips its head back and lifts the bell before its face, ringing it in slow wide arcs that speed up. It rings at the ring's end: a shudder through the bell and its body that ebbs away, the bell brought down a little, the note falling pale as rings in the air and on the floor and a pale thread to each foe it hushes, who wear the veil for 5 s. Then it sinks back into its stoop.</td><td>Game: the ring 54 ticks; the swing 0.18 to 0.78, the ring speed 3 to 7.5 rad/s; the shudder ebbs over 0.9 s; the hush 5 s.</td></tr>
      <tr><td>Rap</td><td>The game's rap. Through the Ember cone it draws the bell back up to its right shoulder with its waist turned and bent in, then swings it down hard on you, leaning in, and brings it back.</td><td>Game: the cone 36 ticks; the swing down 0.08 s (7), back over 0.37 s.</td></tr>
      <tr><td>Hurt</td><td>The head and shoulders jolt back; the hands stay on the bell. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in bowed low, straightens into its stoop and gives the bell one small ring.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it straightens with a jolt, folds forward at the waist and topples onto its face, the bell hugged to its chest ringing once on the floor under it.</td><td>Mine: 2 s, then it stays down. The game crumbles it where it stoops and lets the bell ring once.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Hands coming apart on the bell (both hands reach for one grip)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>Up to WALK_MM mm on the walk and turns; up to SLAM_MM mm in the hush and the rap; up to DEAD_MM mm in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the shuffle, the ringing and the rap are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Both hands ring the bell.</strong> The game's acolyte rings with its right hand and hushes with a finger to its mouth with the left. Yours holds the bell in both hands, so both arms lift it and ring it, and there is no finger to the mouth.</li>
        <li><strong>The bell rises to its face, not over its head.</strong> The game lifts the bell overhead for the hush. Your sleeves are part of the robe, so lifting the hands higher tears the robe's shape; I lift it before its face.</li>
        <li><strong>The bell is cut free.</strong> In your model the bell was joined to the robe's front. I cut it free so it can swing out; the seam it leaves is behind the bell and only shows when the bell is lifted.</li>
        <li><strong>No indigo clasp.</strong> The game's sacristan has an indigo clasp on its breast as its tell; your model has none. Say if you want one added on the page.</li>
        <li><strong>Mine.</strong> The look in the idle, the stride, the turn rate, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The sleeves stretch when the hands lift (the rap's wind-up most), because the arms are carved into the robe.</li>
        <li>No feet: the hem swings and the body sways, but the robe glides over the floor.</li>
        <li>The eyes are painted in your texture, so they do not dim when it dies; the rope cord is fixed to the robe.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the pale ring, the bell's pale shimmer, the note's rings, the threads and veils on the hushed, the Ember cone, the rap's bronze burst and stone chips, and the death's dust and last ring. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''

cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="sac-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.25;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',hush:'Vesper Hush',rap:'Rap',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['hush','rap'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.0, FAR=4.0; let HOME=FAR; // where the hero stands, in u, in front of it: inside its 1.6 u cone for the rap, outside its 3.6 u ring otherwise\n  const WALK=1.05, RAGEWALK=1.05, TURN=Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.26,0.26,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[3.4,1.6,2.6],t:[0,0.65,0.6]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.0]},Side:{p:[6.2,1.3,1.0],t:[0,0.6,1.0]},Front:{p:[0.5,1.3,5.6],t:[0,0.6,0]},Back:{p:[-2.0,2.0,-4.2],t:[0,0.6,0.2]},Top:{p:[0,6.5,0.6],t:[0,0.2,0.6]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(chest|neck|head|arm[LR]|fore[LR]|hand[LR]|fing[LR])\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ring.visible,cone:cone.visible,veil:+veilT.toFixed(2),shimmer:+shimmer.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(0.76,0.8,0.88)*uGlow.x*vMask.x")
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0.05,0.1]),6,0xc8c2b6,1.1,0.25); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1000))).replace('WALK_MM', str(round(max(0, -lw) * 1000))).replace('SLAM_MM', str(round(max(0, -sw) * 1000))).replace('POP_DEG', '0' if pop < 0.05 else f'up to {pop:.1f}°')
for bad in ('CLAWS', 'rune', 'summon', 'buds', 'throat', 'LEAP', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'disc', 'rage', 'spear', 'lane', 'veins', 'sack', 'stone', 'paste', 'mound', 'mAmt', 'clods', 'ringT', 'tell', 'SCALE'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd, 'lunge', lw)
