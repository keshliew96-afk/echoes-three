# Builds the Brood Spider's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/brood'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/brood.audit.json'))
glb = open(S + '/brood.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/brood.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Brood Spider Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Brood Spider from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The bloated grave spider of the Ashen Barrow: your export, with an eight-legged skeleton and eight moves added by hand. It skitters on two alternating sets of four legs and bites three ways in a row, the game's poses key for key: the right fang, the left fang, then a pounce reared up on its back legs. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Skitter sets what it does between attacks, and Going turns it on the spot. Bite plays over it and repeats until you press it again. Hurt plays on top of anything. Death holds it down: press it again and it spawns back in. The bar names the part of the move that is playing.</p>
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
      <img src="brood-views.png" alt="The Tripo Brood Spider from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole: a big pink abdomen wrapped in pale webbing, a dark body and head with yellow eyes and two fangs, and eight jointed legs. One small yellow piece floats on its own above the body, not joined to it; it rides the body here.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>small-mob budget 1,500 · over it, not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>39 <small>root, hips, the body, head, abdomen, two fangs, 4 in each of the 8 legs</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.9 u long <small>0.85 u across the legs and 0.9 u tall beside a 1 u hero. The game's spider stands about 1 u across its feet, so this is near the game's size.</small></dd></div>
    <div><dt>In the game</dt><dd>Brood Spider <small>30 health, skitters at 1.7 u/s and bites for 8 on contact, at most once a second on each hero. Dying, it bursts into two Broodlings. Levels III and IV.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The abdomen breathes, the fangs work twice, it sways a little, the head looks round to its left, and a front leg taps the floor.</td><td>6 s loop (mine; the game's idle only breathes)</td></tr>
      <tr><td>Skitter</td><td>The game's gait: legs 1 and 3 of one side step with legs 2 and 4 of the other, the body low and pitched a little forward, rocking side to side, the abdomen bobbing behind.</td><td>Game: 1.7 u/s. Here a step every 0.1 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>The same two sets of legs, stepping round on the spot, the head leading.</td><td>225° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Bite</td><td>Three bites on a hero who stays in reach, the game's poses key for key. The right fang lunges with no wind-up, twisting the body across; then the left fang the other way; then the pounce: it rears onto its back legs with both front legs raised and the fangs spread wide, and drives down onto the hero, the abdomen kicking up behind. On each bite the front legs step in, the body stretches long and low on the contact, holds two frames and snaps back, and it holds the next wind-up until the bite is ready again.</td><td>Game: a bite every second on each hero. Contacts at 2.5 frames, 1.0 s and 2.0 s; strike 2.5 frames, contact 2, snap 2.5, settle 5; the wind-up pulls back 4 frames before a strike. Recover 0.35 s. 3.5 s in all.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back and squashes, the abdomen bounces and the fangs flare. Plays on top of any move, so planted feet stay planted.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in low, rises on its legs, flares its fangs and tests the floor with both front legs.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears and shudders; the legs splay and give, it drops onto its belly and the legs curl in under it. The abdomen sags once.</td><td>2 s, then it stays down (mine; the game bursts it into two Broodlings)</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A planted foot moving on the floor (locked feet)</td><td>SLIDE_MM mm at worst</td></tr>
      <tr><td>A planted foot its leg could not reach</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Loops that jump when they restart (idle, skitter, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point of the body under the floor</td><td>RIM_MM mm. Lying dead the belly rests on the floor, not in it.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the skitter, the timing and the bites are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Triangles.</strong> It has NTRI, over the 1,500 small-mob budget (it is under the 4,000 foe budget). I did not trim it; say if you want it cut down or re-exported at a lower face limit.</li>
        <li><strong>The floating yellow piece.</strong> It hangs in the air above the body, not joined to anything. The game's spider carries an indigo hourglass on its back as its tell. I can keep it riding the body as it is, move it onto the abdomen as the mark, or remove it. On this page it glows faintly violet while a bite is wound up.</li>
        <li><strong>Death.</strong> The game bursts it into two Broodlings. Here it drops and curls up. When the Broodlings come in, the death could end in a burst instead.</li>
        <li><strong>Mine.</strong> The turn rate, the idle's extras, the spawn after the grow-in, the hurt and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The webbing on the abdomen is painted on and moves with it as one piece.</li>
        <li>The mouth is closed; each bite is the fangs spreading and the body lunging.</li>
        <li>Switching from Skitter into the Bite blends in 0.18 s, so a foot can slide a little at that instant.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: pale sparks at the fangs on each bite, dust under the feet, and the violet glow on the yellow piece. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="brood-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=0.9;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Skitter',turnL:'Turn left',turnR:'Turn right',bites:'Bite',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['bites'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=0.75; let HOME=NEAR; // where the hero stands, in u, in front of it: in reach of the fangs\n  const WALK=1.7, RAGEWALK=1.7, TURN=2*Math.PI/1.6;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.34,0.42,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[2.9,1.2,1.6],t:[0,0.4,0.3]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.3,0.4]},Side:{p:[4.8,0.8,0.35],t:[0,0.45,0.35]},Front:{p:[0.4,0.9,4.8],t:[0,0.42,0]},Back:{p:[-1.7,1.5,-3.8],t:[0,0.45,0.2]},Top:{p:[0,6.4,0.2],t:[0,0.2,0.35]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|head|abd|fangL|fangR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={A:[0.02,'c1L'],B:[0.14,'c3R'],C:[0.27,'c1R'],D:[0.39,'c3L'],E:[0.52,'c1L'],F:[0.64,'c3R'],G:[0.77,'c1R'],H:[0.89,'c3L']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,0,0]),1,0.25,0.15);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.head,[0,-0.05,0.18]),5,0xe9dcc0,1.1,0.2); }")
slide = max(v['slide_mm'] for v in au.values())
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 0.9 * 1000))).replace('REACH_MM', str(round(max(v['reach_mm'] for v in au.values())))).replace('SLIDE_MM', f'{slide:.1f}')
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET,', 'muzzle', 'motes', 'gore', 'Hoof', 'tusk'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
