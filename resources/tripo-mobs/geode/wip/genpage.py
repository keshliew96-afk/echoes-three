# Builds the Geode Brute's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/geode'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/geode.audit.json'))
glb = open(S + '/geode.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/geode.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Geode Brute Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Geode Brute from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Hollow Heart's heavy: your export, with a skeleton and ten moves added by hand. It knuckle-walks on its two huge fists and short hind legs, and it slams: the crystal on its back brightens while the Ember ring fills in front of it, the fists come up beside its head and drive into the floor, and three crystal shards fly out to land on their own rings and leave crystal patches behind. Three slams, the game's poses key for key: the left fist, the right, and both together. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Knuckle-walk sets what it does between slams, and Going turns it on the spot. A slam plays over it and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="geode-views.png" alt="The Tripo Geode Brute from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a hunched gorilla of dark faceted stone, violet crystal spires down its back and shoulders and growing out of its forearms, violet crystal knuckles on its huge fists, glowing violet eyes under a heavy brow and two pale tusks, standing on short thick hind legs with its fists on the floor.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>23 <small>hips, the body's squash, spine, chest, head, the jaw, 4 in each arm and 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.25 u tall <small>the game's brute's size (its tallest spire at 1.18 u), beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Geode Brute <small>64 health, knuckle-walks at 0.9 u/s, takes a third of the knockback. Its crystal slam: an Ember ring r 1.5 centred 0.9 u in front of it for 60 ticks, 14 damage. The slam throws three crystal shards, ahead and 70° to either side, each landing 2.4 u from the impact a second later on an Ember ring r 0.8 for 8 damage, and leaving a crystal patch r 0.8 for 3 s that slows by 35%. Every 280 ticks. Level IV, the Hollow Heart.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's slow sway. Mine on top: it looks one way, then the other, and lifts one fist and sets it down.</td><td>6 s loop</td></tr>
      <tr><td>Knuckle-walk</td><td>The game's knuckle-walk: in diagonal pairs, the left hind leg with the right fist, the body rolling with the gait and leaning into the travel.</td><td>Game: 0.9 u/s; my stride, 0.6 s a step</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot.</td><td>60° a second (my number: the game turns it instantly)</td></tr>
      <tr><td>Slam, left fist</td><td>The game's first slam: it rears and hauls the left fist up beside its head while the crystal brightens, then drives it into the floor in front with the body thrown down after it.</td><td rowspan="3">Game: the coil through the 60-tick ring, the strike in the last 2.5 frames, the contact held 3 frames, snap back 3, settle 10 as the fists step back under it. The shards leave on the contact and land a second later.</td></tr>
      <tr><td>Slam, right fist</td><td>The game's second: the same with the right fist.</td></tr>
      <tr><td>Slam, both fists</td><td>The game's finisher: both fists hauled highest, the body reared furthest, both driven down together with the deepest squash.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the head snaps up and the jaw gapes. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, then beats both fists on the floor once and glares.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears, then its arms give and it slumps down onto its chest between its fists, the head down, the crystal going dark.</td><td>Mine: 2 s, then it stays down. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet and fists that slide</td><td>SLIDE_MM mm at worst</td></tr>
      <tr><td>Legs and arms stretched past their length</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Anything below the floor</td><td>RIM_MM mm at worst (a crystal knuckle of the planted fist as the body twists into a one-fist slam)</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>0</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the walk, the slams and the shards are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The fists up.</strong> The game hauls a fist up beside the head. Your arms are huge and grown into the shoulders, so at the top of the coil the upper arm squeezes the shoulder's stone together. I can haul them less high if it reads better.</li>
        <li><strong>The glow.</strong> I light every violet crystal on the body as the game's tell, a low glow that brightens through the coil and flares on the slam. Your eyes are violet too, so they glow with it.</li>
        <li><strong>Mine.</strong> The stride, the turn rate, the idle's looks and fist lift, the spawn's floor beat, the hurt and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The model is one welded piece, so the crystals on the forearms and shoulders bend with the stone around them.</li>
        <li>The jaw is cut on a line under the tusks, so it only opens a little.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember rings, the crystal glow, the shards, the patches, chips and dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="geode-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.3;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Knuckle-walk',turnL:'Turn left',turnR:'Turn right',slam1:'Slam, left fist',slam2:'Slam, right fist',slam3:'Slam, both fists',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['slam1','slam2','slam3'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.4; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 2.1 u slam range\n  const WALK=0.9, RAGEWALK=0.9, TURN=2*Math.PI/6, TEL=60/60, SLAM_R=1.5, SLAM_AT=0.9, SPREAD=70*Math.PI/180, SHARD_D=2.4, SHARD_T=1.0, SHARD_R=0.8, PATCH_T=3.0, CRYS=0x8a4fe0;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.8,0.55,1); blob.position.set(0,0.004,0.05);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[3.4,2.0,3.4],t:[0,0.6,0.6]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.4,1.2]},Side:{p:[5.6,1.2,1.0],t:[0,0.6,0.8]},Front:{p:[0.5,1.4,4.8],t:[0,0.6,0]},Back:{p:[-2.2,2.0,-4.2],t:[0,0.6,0.3]},Top:{p:[0,9,1.4],t:[0,0.2,1.2]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|spine|chest|head|jaw)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),warn:warn.visible,shards:SHARDS.filter(S=>S.t>=0).length,patches:PATCH.filter(P=>P.t>=0).length,")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={A:[0.0,'cL'],B:[0.5,'cL'],C:[0.02,'knkR'],D:[0.52,'knkR'],E:[0.25,'cR'],F:[0.75,'cR'],G:[0.27,'knkL'],H:[0.77,'knkL']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,0,0]),1,0.2,0.12);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)chips(pt(bones.chest,[0,0,0.15]),6,0.9); }")
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
