# Builds the Gloam Moth's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/moth'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/moth.audit.json'))
glb = open(S + '/moth.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/moth.glb') / 1e6
dd = au["death"]["lowest"]; sw = au["swoops"]["lowest"]

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Gloam Moth Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Gloam Moth from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Ashen Barrow's one flier: your export, with a skeleton and eight moves added by hand. A plump dusky moth with a pale fur collar, a dark head with glowing yellow eyes, two feathered antennae, a broad swept wing on each side with a big eyespot, a banded abdomen and six thin legs hanging under it. It hovers on a wide orbit round you, then rises with its wings held high while an Ember lane marks its line, and dives down the lane straight through you. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Hover or Fly sets what it does between swoops, and Going turns it on the spot. Swoop plays the game's three swoops in turn (banked in from its left, from its right, then the plunge), each down its own 5.5 u Ember lane through the hero stand-in 3.5 u away; between them it climbs on past the hero and wheels round to face it again. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="moth-views.png" alt="The Tripo Gloam Moth from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece, wings spread flat: a round furry body with a pale collar of tufts, a small dark head with two glowing yellow eyes and two feathered antennae, one broad swept wing a side (the fore and hind wings drawn as one pane) in dusky mauve with a pale pattern and a big amber eyespot, a banded abdomen under the wings at the back, and six thin dark legs.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>12 <small>a root, hips, the body, head and abdomen; an antenna, a wing and the legs each side</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.1 u across the wings <small>the body 0.5 u long, hovering with its middle 0.95 u up, the game's hover</small></dd></div>
    <div><dt>In the game</dt><dd>Gloam Moth <small>16 health; the only flier, so it crosses Bramble, water and ground blockers. It hovers at 2.4 u/s on a 3.5 u orbit round its target. Within 4.6 u, every 180 ticks, it telegraphs a swoop lane 0.8 u wide and 5.5 u long through the target for 45 ticks, then dives down it at 8 u/s, 9 to every hero it crosses (once each). Level III, the Ashen Barrow.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Hover</td><td>It hangs in the air bobbing, the wings beating between a shallow and a steep V, the abdomen swaying, the legs hanging, and looks round.</td><td>Game: 0.95 u up, a 0.06 u bob at 2.3 rad/s; the beat 17 rad/s (16.1 here, so 7 beats fit the loop).</td></tr>
      <tr><td>Fly</td><td>The hover carried forward, leaning into it, the legs and antennae trailing.</td><td>Game: 2.4 u/s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Banks round on the spot.</td><td>270° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Swoop</td><td>The game's three swoops, on its own key poses. Through the lane telegraph it rises, nose up, wings held high and beating hard, the abdomen cocked; then it drops into the dive: low, nose down, wings swept back flat and fluttering, the abdomen curled under, and runs the lane straight through the hero. It pulls up and settles, climbs on and wheels round to face the hero again. The first comes in banked from its left, the second from its right, the third is the plunge: reared furthest back, then steepest and lowest.</td><td>Game: the lane 45 ticks; the drop in its last 2.5 frames; the dive held 0.69 s down the 5.5 u lane at 8 u/s; snap 4 frames, settle 9 (at 30 a second). The climb and wheel between swoops is mine, 1.1 s (the game waits 180 ticks and orbits).</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the wings flick up and the antennae fold. Plays on top of any move.</td><td>0.35 s</td></tr>
      <tr><td>Spawn</td><td>Grows in low and climbs to its hover on hard beats.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, the beat stops; it tumbles down, lands on its belly with a bounce, the wings flopping out flat either side and the legs and antennae going limp.</td><td>Mine: 2.0 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (hover, fly, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point in the plunge</td><td>Its legs SWOOP_CM cm off the floor.</td></tr>
      <tr><td>Anything into the floor in the death</td><td>DEAD_MM mm: it lies on the floor.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the beat and the dives are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The eyespots glow indigo.</strong> The game's tell is an indigo eyespot on each forewing; yours are amber. I light them indigo, brighter through the telegraph and the dive. Say if you want them to keep their amber and glow that colour instead.</li>
        <li><strong>One wing a side.</strong> Your fore and hind wings are one pane, so they beat as one, as the game's coupled wings do.</li>
        <li><strong>It wheels round between swoops.</strong> The game waits 180 ticks and goes back to its orbit; here it climbs on past the hero and turns to face it again, so the three swoops come round quickly and from both sides.</li>
        <li><strong>Swoop plays all three in a row.</strong> The game uses them in turn on repeat swoops.</li>
        <li><strong>Mine.</strong> The look round in the hover, the turn rate, the climb and wheel, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Each wing is one rigid plate on one bone: it does not bend along its length as it beats.</li>
        <li>The six legs move as two groups of three; they do not paddle one by one.</li>
        <li>The feathered antennae are stiff on one bone each.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember lane, the indigo tell on the eyespots, dust raised off the floor by the dive, pale scales shed off its wings, the hit on the hero, and a puff of dust where it falls. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''

cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="moth-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.1;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Hover',walk:'Fly',turnL:'Turn left',turnR:'Turn right',swoops:'Swoop',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['swoops'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.5, FAR=2.0; let HOME=FAR; // where the hero stands, in u, in front of it: and for the swoops on its 3.5 u orbit\n  const WALK=2.4, RAGEWALK=2.4, TURN=Math.PI*1.5;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.32,0.3,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[7.2,3.0,1.75],t:[0,0.6,1.75]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.5]},Side:{p:[8.5,1.3,1.6],t:[0,0.8,1.6]},Front:{p:[0.5,1.4,7],t:[0,0.9,0]},Back:{p:[-2.6,2.4,-5.4],t:[0,0.9,0.5]},Top:{p:[0,11,1.4],t:[0,0.3,1.4]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|head|abd|antL|antR|wL|wR|legL|legR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,tell:+tell.toFixed(2),eyes:+eyes.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(0.36,0.45,0.95)*uGlow.x*vMask.x")
rep("vec3(0.55,0.22,0.9)*uGlow.y*vMask.y", "vec3(1.0,0.85,0.4)*uGlow.y*vMask.y")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,0,0.05]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.1 * 1000))).replace('SWOOP_CM', str(round(max(0, sw) * 1.1 * 100)))
for bad in ('coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'cone', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'disc', 'rage', 'spear', 'lane', 'veins', 'eyes', 'sack', 'stone', 'paste', 'mound', 'mAmt', 'clods', 'ringT'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd, 'swoop', sw)
