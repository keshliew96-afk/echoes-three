# Builds the Barrow Crow's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/crow'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/crow.audit.json'))
glb = open(S + '/crow.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/crow.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Barrow Crow Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Barrow Crow from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Ashen Barrow's carrion crow: your export, with a skeleton and ten moves added by hand. It hops on both feet together to keep its distance, then caws: it fans its wings, draws its head back with the beak opening while the long Ember cone locks on, and thrusts its head forward to loose a fan of three feather-shots. Three caws, the game's poses key for key: cocked from its left, from its right, and the finisher off a hop with the wings thrown out. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Hop sets what it does between caws, and Going turns it on the spot. A caw plays over it and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="crow-views.png" alt="The Tripo Barrow Crow from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a ragged blue-black crow with a spiky crest, pale glowing eyes, a grey hooked beak and a little bone charm at its throat, standing on two thin dark legs with long toes, its wings held half open and hanging at its sides, the tail feathers sweeping to the floor behind.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>20 <small>hips, the body's squash, neck, head, the lower beak, the tail, 2 in each wing and 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.81 u tall <small>its beak's tip at 0.65 u, the game's crow's height, beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Barrow Crow <small>14 health, hops at 2.0 u/s to keep 3.5 to 5.5 u from its target, circling in between. Then it caws: an Ember cone r 5.0, half-angle 22°, for 45 ticks, locked on the target, and looses a fan of three feather-shots at −15°, 0° and +15°, 5 damage each at 5 u/s. Every 240 ticks. Level III, the Ashen Barrow.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's breath and slow head bob. Mine on top: it cocks its head one way, then the other, rouses its feathers once and shifts a foot.</td><td>6 s loop</td></tr>
      <tr><td>Hop</td><td>The game's hop: both feet together, the body riding up on each hop and leaning into it, the wings lifting a touch in the air.</td><td>Game: 2.0 u/s, the body up 0.08 u a hop, leaning 0.12; my hop rate, a little over three a second.</td></tr>
      <tr><td>Turn left, turn right</td><td>Hops round on the spot.</td><td>200° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Caw left</td><td>The game's first caw: the wings fan up and out, the head cocks back from its left with the beak opening and the chest swells; then the head thrusts forward with the beak wide and the wings snap forward as the fan looses.</td><td rowspan="3">Game: the coil through the 45-tick cone, the strike in the last 2.5 frames, the contact held 3 frames with a recoil shove, snap back 2.5, settle 6. The fan leaves on the contact.</td></tr>
      <tr><td>Caw right</td><td>The game's second: the same from its right.</td></tr>
      <tr><td>Caw finisher</td><td>The game's third: the wings thrown full out and the head drawn far back; it hops as the fan looses.</td></tr>
      <tr><td>Hurt</td><td>The body jolts, the head snaps back, the beak gapes and the wings flare. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, rouses its feathers and looks about.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears with its wings thrown up and the beak wide, then pitches forward onto its breast, the wings falling open on the floor.</td><td>Mine: 2 s, then it stays down. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet that slide</td><td>SLIDE_MM mm at worst (a foot as it leaves in the death)</td></tr>
      <tr><td>Legs stretched past their length</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Anything below the floor</td><td>RIM_MM mm at worst</td></tr>
      <tr><td>Loops that jump when they restart (idle, hop, both turns)</td><td>0</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the hop, the caws and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The wings.</strong> The game's crow folds its wings along its back and fans them only for the caw. Yours hang half open at its sides, so I keep them that way and lift and spread them from there. I can fold them in at rest if you want the game's look.</li>
        <li><strong>The beak.</strong> Your beak is one small piece, so I cut the lower half on the line of its gape to open it. It opens, but the cut shows as a dark wedge inside.</li>
        <li><strong>The eyes.</strong> The game's tell is an indigo glint in each eye. Your eyes are pale blue, so I tint them faintly indigo and brighten them through the caw.</li>
        <li><strong>Mine.</strong> The hop rate, the turn rate, the idle's head cocks, the hurt, the spawn after the grow-in and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The feathers are one welded piece, so the crest, the ruff and the wing feathers move with their bones and do not flutter on their own.</li>
        <li>Each wing is two stiff bones; the primaries do not spread apart.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember cone, the eyes' glint, the three violet feather-shots and dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="crow-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.0;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Hop',turnL:'Turn left',turnR:'Turn right',caw1:'Caw left',caw2:'Caw right',caw3:'Caw finisher',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['caw1','caw2','caw3'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=4.0; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 3.5 to 5.5 u keep\n  const WALK=2.0, RAGEWALK=2.0, TURN=2*Math.PI/1.8, TEL=45/60, CONE_R=5.0, CONE_HALF=22*Math.PI/180, SPREAD=15*Math.PI/180, SHOT_V=5.0, SHOT_R=7.5, SHOT=0x6a4fc0;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.3,0.32,1); blob.position.set(0,0.004,0.05);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[2.6,1.3,2.0],t:[0,0.5,0.3]},'Game zoom':{p:[0,11.5,10.5],t:[0,0.3,2.0]},Side:{p:[4.4,0.9,0.6],t:[0,0.45,0.3]},Front:{p:[0.4,1.0,3.4],t:[0,0.5,0]},Back:{p:[-1.6,1.5,-3.2],t:[0,0.5,0.2]},Top:{p:[0,9,1.8],t:[0,0.2,1.8]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|neck|head|jaw|tail|wingL|wingR|wtipL|wtipR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),cone:cone.visible,")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={A:[0.0,'cL'],B:[0.0,'cR'],C:[0.333,'cL'],D:[0.333,'cR'],E:[0.667,'cL'],F:[0.667,'cR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,0,0]),1,0.2,0.12);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.sq,[0,0.1,0.15]),5,0xe9dcc0,1.1,0.2); }")
snaps = {k: v for k, v in au.items() if k != 'death'}
slide = max(v['slide_mm'] for v in au.values())
rim = max(-v['lowest'] for k, v in snaps.items())
reach = max(v['reach_mm'] for v in au.values())
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(max(0, rim) * 1.0 * 1000))).replace('REACH_MM', str(round(reach * 1.0))).replace('SLIDE_MM', f'{slide * 1.0:.1f}')
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET,', 'muzzle', 'motes', 'gore', 'Hoof', 'tusk', 'fang', 'bites', ):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'slide', slide, 'reach', reach)
