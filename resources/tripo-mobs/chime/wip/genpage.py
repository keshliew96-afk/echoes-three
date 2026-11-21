# Builds the Chime Wraith's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/chime'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/chime.audit.json'))
glb = open(S + '/chime.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/chime.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Chime Wraith Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Chime Wraith from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The toller of the Still Spire: your export, with a skeleton and eight moves added by hand. It drifts a hand above the floor, and when a hero comes close it stops, marks the Ember ring round itself, lifts its arms and swings the bell in its chest harder and harder until the toll rings out. The hover, the wind-up and the toll use the game's numbers frame for frame. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Hover or Drift sets what it does between tolls, and Going turns it on the spot. Toll plays over it and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="chime-views.png" alt="The Tripo Chime Wraith from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a ragged grey shroud and hood with two pale eyes in the dark, a small cracked bronze bell hanging in the opening at its chest, a rope belt with its end hanging down the front, and two bandaged arms with long claws. The bell, the rope and the arms are picked out by their warm colour against the grey.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>21 <small>as the Ash Wraith (hips, the body's squash, spine, chest, hood, 3 down the shroud, 3 in each arm) plus the bell and 2 in the rope's end</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.5 u tall <small>its hem hangs the game's 0.16 u off the floor and its hood reaches 1.66 u, beside a 1 u hero. The game's wraith is taller: its bell hangs below the shroud, its hood near 1.95 u.</small></dd></div>
    <div><dt>In the game</dt><dd>Chime Wraith <small>22 health, drifts at 1.6 u/s to 1.4 to 2.4 u of a hero. With a hero inside 2.8 u it marks the toll, an Ember ring r 2.8 round itself, for 60 ticks; the toll rings for 6 and slows 40% for 2 s everyone inside. A stun mid-swing chokes it. Every 5 s at most. Level V, the Spire.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Hover</td><td>The game's hover: the bob, the shroud's slow sway, the hem rippling, the bell swinging lazily, the rope's end swaying. Mine on top: it turns its hood one way then the other and flexes its claws.</td><td>Game: bob 0.05 u at 1.6 rad/s, sway 0.04 rad at 0.9 rad/s, the bell at 2.2 rad/s; rounded to whole cycles of a 7.85 s loop.</td></tr>
      <tr><td>Drift</td><td>Leans into the travel, the hem and the rope trailing.</td><td>Game: 1.6 u/s, leaning 0.1 rad.</td></tr>
      <tr><td>Turn left, turn right</td><td>The shroud and the bell swing out from the turn.</td><td>180° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Toll</td><td>The game's toll. Through the mark it rises 0.2 u, leans back, throws its hood back, lifts and spreads its arms, and the bell lifts and swings harder and harder. On the toll the shroud flares, the hem kicks out, the hood snaps forward, and the bell shudders and swells; a hero inside the ring is hit and slowed. It all dies away over 0.7 s.</td><td>Game: the mark 60 ticks; the bell's rate 2.2 to 7.2 rad/s and its swing 0.1 to 0.65 rad; the strike fades as e^(−6t) for 0.7 s.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the hood snaps up, the arms fling out, the shroud whips and the bell knocks. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, rises into the hover, opens its arms and the bell swings once.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears back and the bell gives a last swing; the hover gives out, the shroud crumples and it topples forward onto its face, arms splayed.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (hover, drift, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point while it floats</td><td>LOW_U u above the floor, the hem's tip at the bottom of the bob.</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the swing, the toll and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The bell.</strong> The game's bell is the wraith's body: big, hung below the shroud, with an indigo clapper as the tell. Your bell is small, in the chest. I swing it on the game's numbers and light it faintly on the wind-up as the tell. A bigger bell would read the toll better at game zoom.</li>
        <li><strong>The arms.</strong> The game's sleeves hold a yoke the bell hangs from. Yours hang free, so on the wind-up they lift and spread as the game's do, with nothing in their hands.</li>
        <li><strong>The choke.</strong> A stun mid-swing chokes the toll in the game; the game shows it only by the ring going away. I can add a muffled stop if you want one.</li>
        <li><strong>Mine.</strong> The turn rate, the idle's look round, the hurt, the spawn after the grow-in and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The shroud is one welded piece with the arms, so it bends by height down three bones; its torn strips do not flutter on their own.</li>
        <li>The bell's clapper is part of the bell, so it swings with it rather than striking the inside.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember ring, the bell's faint glow, the toll's sound rings, a pale tint on the hero while slowed, and dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="chime-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.5;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478, TONE=0xd8d2c4, TELL=0x8F63EE;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Hover',walk:'Drift',turnL:'Turn left',turnR:'Turn right',toll:'Toll',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['toll'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.9; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 1.4 to 2.4 u keep, inside the 2.8 u ring\n  const WALK=1.6, RAGEWALK=1.6, TURN=Math.PI, RAD=2.8, TEL=60/60;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.34,0.3,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.2,2.4,4.6],t:[0,0.85,0.8]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[6.6,1.4,0.9],t:[0,0.85,0.9]},Front:{p:[0.5,1.6,6.6],t:[0,0.85,0]},Back:{p:[-2.6,2.3,-5.0],t:[0,0.85,0.4]},Top:{p:[0,9.5,0.9],t:[0,0.3,0.9]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|head|sk1|sk2|sk3|armL|foreL|handL|armR|foreR|handR|bell|rope1|rope2)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ring.visible,")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0,0.1]),5,0xe9dcc0,1.1,0.2); }")
lowfly = min(v['lowest'] for k, v in au.items() if k not in ('death', 'spawn'))
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly * 1.5:.2f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.5 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'BOLTS', 'fire(', 'wall', 'lane', 'bead', 'dart', 'ASH', 'RISE', 'jumped', 'bones.bud', 'heart(', 'pulse'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
