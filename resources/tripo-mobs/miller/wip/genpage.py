# Builds the Drowned Miller's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/miller'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/miller.audit.json'))
glb = open(S + '/miller.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/miller.glb') / 1e6
rim = 0
dd = au["death"]["lowest"]

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Drowned Miller Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Drowned Miller from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Sunken Mill's bruiser: your export, with a skeleton and nine moves added by hand. A stout, grey-green drowned miller in a flour-stained shirt, a torn leather apron and a cap, weed in his beard, a flour sack tied at his hip and a millstone hanging on a chain from both hands. He plods straight at you; up close he plants his feet, pays out the chain and whirls the stone round him inside an Ember ring, and from further off he lobs a sodden flour sack onto you. Press a move to watch him; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what he does between attacks, and Going turns him on the spot. Flail sweep plays the game's three sweeps in turn (the flat whirl, the reverse low, then the overhead slam), each in its own 2.2 u Ember ring with the hero stand-in 1.6 u away inside it. Sack toss plays the game's three throws in turn (overarm, side-arm, the heave), each lobbed onto the stand-in 4.5 u away. An action repeats until you press it again. Hurt plays on top of anything. Death drops him: press it again and he spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="miller-views.png" alt="The Tripo Drowned Miller from the front, his left side, the back and his right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a heavy, round-bellied miller standing square on bare feet, both hands on his belly gripping a short chain with a grooved millstone hanging from it in front of his apron. A baker's cap, a long grey beard with weed in it, a stained cream shirt with rolled sleeves, a leather apron torn at the hem with crossed straps at the back, a rope belt with a small flour sack at his left hip, and dark ragged trousers.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · 104 added to close the stone's back and the apron behind it</small></dd></div>
    <div><dt>Bones</dt><dd>22 <small>a root, hips, spine, chest, neck and head; upper arm, forearm and hand each side; thigh, shin, foot and toe each side; the chain on the right hand, and the stone on the chain</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.6 u tall <small>the millstone 0.4 u across; a big man beside the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Drowned Miller <small>48 health. He plods at 1.1 u/s straight at his target. Within 1.9 u, the Flail Sweep: he plants and whirls the stone inside an Ember ring of 2.2 u for 60 ticks, then every hero in it takes 13. At 3 to 6.5 u, at most every 300 ticks, the Sack Toss: unwarned, a sodden sack lobbed 60 ticks onto where the hero stands, an Ember ring of 1.1 u there; it hits for 10 and leaves a paste of wet flour (1.2 u) that slows by 40% for 5 s. Cooldown 200 ticks after either. Level II, the Sunken Mill.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>He breathes heavily, the stone swinging a little on its chain, and looks one way, then the other.</td><td>Mine: a 4.8 s loop.</td></tr>
      <tr><td>Walk</td><td>A heavy plod on his short legs: feet set wide and straight, the hips rolling on each step, leaning into the travel, the stone swinging forward and back.</td><td>Game: 1.1 u/s. The step is mine: short and quick for his short legs, 0.46 s a cycle.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot, the stone swinging out with the turn.</td><td>144° a second (mine: the game turns him at once).</td></tr>
      <tr><td>Flail sweep</td><td>The game's three sweeps, on its own key poses and its stone track. Through the ring telegraph he plants, pays out the chain and spins the stone up round him through whole turns, faster and faster, the body wound against the spin. The flat whirl sweeps level across the front to his right; the reverse spins the other way, low, and sweeps to his left; the slam hauls the stone up behind him once and brings it over the top into the floor in front. The sweep takes the last 2.5 frames and lands on the resolve (13 to every hero in the ring); the stone swings on round and comes back to hang as he hauls the chain in.</td><td>Game: the 60-tick ring (1 s) each sweep; strike 2.5 frames, hold 3, snap 3, settle 9 (at 30 a second); two turns over the coil for the first two, one for the slam. The 0.25 s rest between sweeps is the game's lab rest (the game waits 200 ticks).</td></tr>
      <tr><td>Sack toss</td><td>He reaches to his hip for a sack, then the game's throw: a 1.5-frame gather, the throw with the torso turned into it and the sack away on the contact, held, then the follow-through. Overarm, side-arm, then a heave over the head. The sack flies 60 ticks onto the hero, an Ember ring marking where it lands, and bursts into a paste of wet flour.</td><td>Game: unwarned; gather 1.5 frames, strike 2.5, hold 3, snap 3, settle 9; the flight 60 ticks. The 0.35 s reach to the hip is mine, so the throw can be seen.</td></tr>
      <tr><td>Hurt</td><td>He rocks back, the head snapping up and the stone jolting on its chain. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in and straightens with a heave, the stone swinging.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, he rocks back and the stone drops from his hands to the floor; his knees give and he sits down hard, then falls back flat and lies still.</td><td>Mine: 2.2 s, then he stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet sliding while planted (walk, both turns, the sweeps and tosses)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
      <tr><td>The stone and the floor</td><td>Kept a stone's radius up on every frame: the chain lifts it rather than burying it, the slam included.</td></tr>
      <tr><td>Anything else into the floor</td><td>A foot dips up to SWEEP_MM mm in the deepest crouch of the slam; a shin up to DEAD_MM mm as he sits down in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the whirl and the throws are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>His hands stay near his belly.</strong> Your miller's forearms are modelled onto his belly, so moving them far tears the shirt. The hands go 40% of the game's moves (at most 0.14 u), and the game's twist, lean and sink of the body drive the swings. The game's miller raises the stone hand over his head for the whirl; this one whirls it from the belly.</li>
        <li><strong>The chain pays out for the whirl.</strong> Your chain is short, so the stone would orbit close to his hands; it lengthens to the game's reach (the stone 0.72 u from the grip) as he spins it up, and shortens again as it comes to hang.</li>
        <li><strong>The stone is cut free of the apron.</strong> Tripo fused the two; I separated them and closed the stone's back and the apron behind it with plain stone and apron colour, so the patch shows only while the stone is away.</li>
        <li><strong>He reaches for each sack.</strong> The game's toss is unwarned (1.5 frames); the reach to his hip before it is mine. Say if you want it straight from the hand.</li>
        <li><strong>Both actions play all three of their variants in a row.</strong> The game picks one each time; here they follow each other so you can compare them.</li>
        <li><strong>Mine.</strong> The idle, the step, the turn rate, the hurt, the spawn after the grow-in, the death, and the reach for the sack.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The chain is one link stretched as it pays out; it reads as a twisted bar, not separate links.</li>
        <li>The stone is a thin shell, so edge-on it looks like a flat grey slab, and it does not roll on its axle as the game's does.</li>
        <li>The sack on his hip stays where it is; the thrown sack is drawn by the page.</li>
        <li>The apron, shirt and beard move with the body; they do not swing on their own.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models. The game's indigo eyes are not on your model, so there is no glow.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember rings, water flung off the stone as it whirls, the ring flashing as the sweep lands with dust round it, the slam's thump, the sack's lob, its burst of wet flour and the paste it leaves for 5 s, and the hits on the hero. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="miller-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.6;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',sweeps:'Flail sweep',tosses:'Sack toss',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['sweeps','tosses'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.6, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: inside his 1.9 u sweep range, and out in his 3 to 6.5 u toss range\n  const WALK=1.1, RAGEWALK=1.1, TURN=Math.PI*0.8;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.5,0.42,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.6;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.4,2.6,5.4],t:[0,0.8,0.6]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.4]},Side:{p:[9,1.4,1.6],t:[0,0.8,1.6]},Front:{p:[0.6,1.5,7.6],t:[0,0.8,0]},Back:{p:[-3.0,2.8,-6.4],t:[0,0.8,0.6]},Top:{p:[0,13,1.4],t:[0,0.4,1.4]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|neck|head|armL|armR|foreL|foreR|handL|handR|chain|stone)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ring.visible,sack:sack.visible,sackRing:sackRing.visible,paste:paste.visible,stoneY:+bones.stone.getWorldPosition(new THREE.Vector3()).y.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={HL:[0.1,'toeL'],HR:[0.6,'toeR']};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0.04,0.12]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.6 * 1000))).replace('SWEEP_MM', str(round(max(0, -au['sweeps']['lowest']) * 1.6 * 1000)))
for bad in ('coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'cone', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'disc', 'rage', 'spear', 'lane', 'veins', 'eyes'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd)
