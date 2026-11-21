# Builds the Coal Hurler's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/hurler'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/hurler.audit.json'))
glb = open(S + '/hurler.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/hurler.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Coal Hurler Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Coal Hurler from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Kiln's mortar: your export, with a skeleton and nine moves added by hand. A squat soot-grey imp with a sack of live coals over its shoulder. It sidles, keeping 3.6 to 5.2 u from you; then it plants, heaves the sack back while an Ember ring marks your spot, and hurls: a coal leaves the sack mouth on a high arc, lands in the ring for 9 and leaves a bed of cinders that slows. Stunned mid-heave, it fumbles the sack instead. The ring, the coal's flight and the bed use the game's numbers frame for frame. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Sidle sets what it does between throws, and Going turns it on the spot. Coal plays the game's whole attack against the hero stand-in 4.4 u ahead (the heave while the ring fills, the hurl, the coal's flight, the landing and the bed) and repeats until you press it again. Fumble plays the stun mid-heave. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="hurler-views.png" alt="The Tripo Coal Hurler from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a big-nosed grey imp in a head rag, a leather vest and patched breeches, a coal sack over its right shoulder with glowing coals in the mouth, its right fist gripping the sack's fold at its chest, and a small shovel at its right hip. The right fist and forearm are fused to the chest and the sack's drape, so that arm cannot move without tearing; see the open choices.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 (3,860 as sent; the rest closes the shoulder under the sack)</small></dd></div>
    <div><dt>Bones</dt><dd>23 <small>hips, spine, chest, neck, head; per leg the thigh, shin, foot and toe; per arm the collar, upper arm, forearm and hand, and the right hand's fingers; and the sack, which swings from the right fist</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.2 u tall <small>the game's squat height (its rig stands about 1.2 u), a little over the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Coal Hurler <small>22 health. It sidles at 1.6 u/s keeping 3.6 to 5.2 u from its target, and scurries back up close. With a hero 2.4 to 6.8 u off it plants and marks an Ember ring r 1.3 on the hero's spot for 66 ticks; the coal is in the air for the last 0.42 s of it, lands for 9 and leaves a cinder bed r 1.0 that slows by 30% for 150 ticks. A stun mid-heave makes it fumble (no throw, cooldown 110 ticks). Cooldown 240 ticks from the throw. Level V, the Kiln.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>Stands squat with the sack on its shoulder, breathing, hitching the sack, the free left arm loose. The coals breathe a dim Kiln Gold.</td><td>Mine: a 4 s loop.</td></tr>
      <tr><td>Sidle</td><td>A short bow-legged trot, the sack bouncing, the left arm swinging.</td><td>Game: 1.6 u/s. The stride is mine: a step every 0.3 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot.</td><td>180° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Coal</td><td>The game's attack, whole. It braces, the left foot forward, and heaves the sack back over its shoulder, leaning back with the left arm raised, while the Ember ring fills on you; the coals brighten. At 0.68 s it hurls: the body snaps forward, the sack swings up and over from the fist, the left arm throws forward, and a coal leaves the sack mouth on a high arc, smoking. It lands in the ring at 1.1 s for 9: an Ember shock ring, a flash, sparks, coal chunks, smoke, and a scorch with a bed of cinders that lasts 2.5 s. The sack hangs slack as it steps back into its stance.</td><td>Game: the ring 66 ticks, the coal in the air its last 0.42 s, peaking 1.5 u up; the bed 150 ticks. The heave and the hurl's poses are mine.</td></tr>
      <tr><td>Fumble</td><td>Starts the heave, is stunned at 0.4 s: it jolts, the sack slips off the shoulder and coals spill in a puff of sack smoke; it hauls the sack back up.</td><td>Game: a stun mid-heave cancels the coal. The poses and the 1.6 s are mine.</td></tr>
      <tr><td>Hurt</td><td>The upper body jolts back with the sack. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, hitches the sack up, and settles into its stance.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it jolts back and the sack slips; the knees give, it topples forward onto the sack, and the coals spill out of the mouth and smoulder as the glow dies.</td><td>Mine: 2 s, then it stays down. The game pops every foe where it is; the split sack and spilled coals are the game's death effect.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet that slide (idle, sidle, both turns, the brace, the fumble)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, sidle, both turns)</td><td>0</td></tr>
      <tr><td>Feet sinking into the floor</td><td>RIM_MM mm at worst</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the heave, the hurl and the coal's arc are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The right arm stays put.</strong> Its right fist is fused to its chest and to the sack's drape, so moving that arm tore it. The fist stays where it grips, and the sack swings from it: back on the heave, up and over on the hurl. The free left arm does the throwing. If you want both hands on the sack, the model needs the right arm free of the body (a fresh Tripo pass), and I can redo it.</li>
        <li><strong>The sack is on its right shoulder.</strong> That is where your model carries it; the game's own figure carries it on the left. I kept your model's side.</li>
        <li><strong>When it hurls.</strong> Here the hurl plays as the coal leaves the sack, 0.42 s before it lands; the game's current figure swings at the landing. Playing it at the release lets you see the coal leave the sack.</li>
        <li><strong>Mine.</strong> The turn rate, the stride, the idle, the heave and hurl poses, the fumble, the hurt, the spawn after the grow-in and the death's fall.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The shoulder under the sack had no surface in your model, so when the sack lifts there is a patch of vest leather there; from behind a few jagged edges of it show, and small slivers at the fist.</li>
        <li>The eyes are painted orange in your texture, so they do not light.</li>
        <li>The vest and breeches bend with the body like skin; the rag tails do not flap.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember ring and its fill, the coal and its smoke trail, the landing's shock, flash, sparks, chunks and smoke, the scorch and cinder bed, the coals' Kiln Gold glow, the fumble's spill and the death's spill. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="hurler-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.2;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Sidle',turnL:'Turn left',turnR:'Turn right',throw:'Coal',fumble:'Fumble',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['throw','fumble'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=4.4; let HOME=NEAR; // where the hero stands, in u, in front of it: inside the 3.6 to 5.2 u it keeps\n  const WALK=1.6, RAGEWALK=1.6, TURN=Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.5,0.42,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[8.0,3.2,4.2],t:[0,0.5,2.2]},'Game zoom':{p:[0,12,11],t:[0,0.5,2.6]},Side:{p:[10.5,1.6,2.4],t:[0,0.8,2.4]},Front:{p:[0.6,1.3,4.8],t:[0,0.62,0]},Back:{p:[-2.4,2.2,-4.2],t:[0,0.7,1.0]},Top:{p:[0,15,3.0],t:[0,0.4,3.0]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|neck|head|clvL|clvR|armL|armR|foreL|foreR|handL|handR|fingR|sack)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ringT.visible,coal:coal.visible,bed:bedT>=0,heat:+heat.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(1.0,0.76,0.29)*uGlow.x*vMask.x")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={A:[0.05,'toeL'],B:[0.55,'toeR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,0,0]),1,0.25,0.1);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.sack,MOUTH),4,KSPARK,1.0,0.25); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 1.2 * 1000))).replace('DEAD_MM', str(round(max(0, -dd) * 1.2 * 1000)))
for bad in ('coneT', 'kindle', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'paws', 'rage', 'rope', 'lane'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
