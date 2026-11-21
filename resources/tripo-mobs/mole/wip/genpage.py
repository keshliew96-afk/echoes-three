# Builds the Grave Mole's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/mole'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/mole.audit.json'))
glb = open(S + '/mole.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/mole.glb') / 1e6
dd = au["death"]["lowest"]; tl = min(au["turnL"]["lowest"], au["turnR"]["lowest"])

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Grave Mole Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Grave Mole from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Ashen Barrow's burrower: your export, with a skeleton and eight moves added by hand. A fat, dark star-nosed mole with a pink star on its nose, yellow eyes, huge pale digging claws, short hind feet, a pink tail, and a grave candle and broken planks stuck in the earth on its back. It tunnels under the floor toward you, only its mound showing; close by, an Ember ring marks the spot, and it bursts up out of the earth inside it, stands blinking for a moment, then digs back in. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle stands it on the floor (the game's surfaced mole); Tunnel sends it under, with the mound riding over it, and Going turns it on the spot. Emerge plays the game's three bursts in turn (the left claw, the right claw, then both claws off a leap): each one under the floor through the 0.8 u Ember ring, the burst, a moment surfaced, then the dig back in. The hero stand-in waits inside the ring. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="mole-views.png" alt="The Tripo Grave Mole from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a round, low mole standing on its big front paws, each with five long pale claws, and short hind feet. A pink star nose with yellow whiskers and small yellow eyes, dark fur with a mantle of earth over its back, a stubby grave candle and two broken planks set in the earth there, and a short pink tail.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>24 <small>a root, hips, spine, chest, head and the star nose; two in the tail; upper arm, forearm, paw and claws each side; thigh, shin, foot and toe each side</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.8 u tall <small>1.4 u from nose to tail; a low, broad beast beside the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Grave Mole <small>24 health. It spawns burrowed and can't be hit while under: it tunnels at 2.2 u/s toward its target, under blockers, leaving a ripple of earth. Within 0.3 u of the target, or after 180 ticks under, it commits: an Ember ring of 0.8 u marks the spot for 60 ticks while it waits below, then it bursts out for 11 to every hero in the ring and stays surfaced and hittable for 120 ticks before it digs back in. Level III, the Ashen Barrow.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>It stands on its claws and breathes, the star nose wiggling and sniffing, the head turning to look, the tail twitching.</td><td>Mine: a 4 s loop. The game's surfaced mole stands and blinks.</td></tr>
      <tr><td>Tunnel</td><td>Under the floor, nose first, the claws raking in turn; only the tip of the grave candle shows, poking out of a churning mound of earth that leaves a furrow behind it.</td><td>Game: 2.2 u/s. The rake is mine, 0.5 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot, the claws stepping.</td><td>90° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Emerge</td><td>The game's three bursts in turn, on its own key poses. Through the ring telegraph it waits under the floor while the mound heaves and quakes; the burst throws it up out of the earth, the left claw raised high with the body turned to its right, then the right claw, then both claws off a leap, and earth and clods fly. It lands on its feet, settles, and stands surfaced, sniffing and looking round; then it digs back in: nose down, the claws raking earth back in turn, and it sinks under as the mound rises over it.</td><td>Game: the 60-tick ring (1 s); the burst in the last 2.5 frames, held 3, snap 3, settle 9 (at 30 a second); 11 to every hero in the ring on the burst. Surfaced 1 s here (the game: 2 s). The dig back in is mine, 1.1 s.</td></tr>
      <tr><td>Hurt</td><td>The head and nose snap back and the tail jerks. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in on the floor.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears with its claws up, rolls over onto its side, gives a last kick of the hind legs and lies still.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet sliding while planted (both turns and the emerges)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, tunnel, both turns)</td><td>0</td></tr>
      <tr><td>Under the floor on purpose</td><td>Tunnelling, and under through the ring and after the dig; the page's floor hides it there, as the game's does.</td></tr>
      <tr><td>Anything else into the floor</td><td>A paw dips up to TURN_MM mm as it turns; a shoulder up to DEAD_MM mm as it rolls onto its side in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the bursts and the dig are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The candle tip shows while it tunnels.</strong> The game's mole goes fully under with only the mound showing. Here it tunnels a little higher, so the top of the candle pokes out of the mound with its flame; through the ring it is fully under, as in the game. Say if you want it fully under while it tunnels too.</li>
        <li><strong>Surfaced for 1 s.</strong> The game keeps it up for 2 s; it is shortened here so the three bursts come round quickly.</li>
        <li><strong>The hero waits inside the ring.</strong> The game commits when the hero is within 0.3 u; the stand-in stands at the ring's edge so it does not sit inside the mole.</li>
        <li><strong>Emerge plays all three bursts in a row.</strong> The game picks one each time.</li>
        <li><strong>Spawn is on the floor.</strong> The game's mole spawns already burrowed; the page grows it in standing so you can see it.</li>
        <li><strong>Mine.</strong> The idle, the rake while tunnelling, the turn rate, the dig back in, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The planks and the candle are fixed to its back; they do not rock on their own.</li>
        <li>The five claws on each paw move as one; they spread and curl together.</li>
        <li>The mound is a plain earth hump with six clods, drawn by the page after the game's.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models. Your model has no glow of its own, so the indigo tell is lit on its claw tips.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the mound and its furrow, the Ember ring, the quake, earth and clods thrown by the burst, the hit on the hero, the earth raked back by the dig, and a small candle flame. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''

cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="mole-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.4;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Tunnel',turnL:'Turn left',turnR:'Turn right',emerges:'Emerge',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['emerges'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=0.55, FAR=1.5; let HOME=FAR; // where the hero stands, in u: out in front, and for the emerges inside the 0.8 u ring, a little to one side\n  const WALK=2.2, RAGEWALK=2.2, TURN=Math.PI*0.5;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.45,0.72,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[2.7,1.7,3.3],t:[0.15,0.3,0.3]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.3,0.6]},Side:{p:[5.2,0.9,0.6],t:[0,0.35,0.4]},Front:{p:[0.4,0.9,4.6],t:[0,0.35,0]},Back:{p:[-1.9,1.7,-3.9],t:[0,0.35,0.2]},Top:{p:[0,8,0.6],t:[0,0.2,0.4]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|head|snout|tail1|tail2)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ring.visible,mound:[mound.visible,+mAmt.toFixed(2)],tell:+tell.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(0.36,0.45,0.95)*uGlow.x*vMask.x")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={HL:[0.1,'toeL'],HR:[0.6,'toeR']};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.snout,[0,0,0.04]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.4 * 1000))).replace('TURN_MM', str(round(max(0, -tl) * 1.4 * 1000)))
for bad in ('coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'cone', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'disc', 'rage', 'spear', 'lane', 'veins', 'eyes', 'sack', 'stone', 'paste'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd, 'turn', tl)
