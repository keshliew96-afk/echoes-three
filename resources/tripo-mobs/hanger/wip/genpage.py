# Builds the Rope Hanger's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/hanger'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/hanger.audit.json'))
glb = open(S + '/hanger.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/hanger.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Rope Hanger Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Rope Hanger from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Still Spire's battering ram: your export, with a skeleton and eight moves added by hand. A dead bell-ringer still tangled in its belfry rope. It creeps hunched, keeping 3 to 6 u from you; then it grips the rope and leans back while an Ember lane fills from it through you, swings down that lane on the rope, strikes you once in passing and throws you aside, dangles at the far end, lets go and creeps again. The hunch, the lean back, the swing's arc and the dangle use the game's numbers frame for frame. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Idle or Creep sets what it does between swings, and Going turns it on the spot. Swing plays the game's whole attack against the hero stand-in 4 u ahead (the grip while the lane fills, the swing, the dangle, the let-go) and repeats until you press it again; the floor slides under it as it swings, so it stays in the middle of the stage. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="hanger-views.png" alt="The Tripo Rope Hanger from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a gaunt grey bell-ringer in a long ragged coat, a flat cap and a red scarf, a rope slung from the right shoulder across the chest, and the rope's striped sally hanging from the left hand. The arms are fused to the coat down their length, so they cannot lift clear of it without tearing the sleeves; see the open choices.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>24 <small>hips (the pivot it swings on), spine, chest, neck, head; per leg the thigh, shin, foot and toe; per arm the collar, upper arm, forearm, hand and fingers; and the striped sally, which hangs plumb</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>2.0 u tall <small>the game's lanky height (its rig stands about 2.07 u), a head over the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Rope Hanger <small>30 health. It creeps at 1.25 u/s keeping 3 to 6 u from its target. Its swing marks an Ember lane 1.1 u wide from itself through the target, up to 8.5 u long, for 66 ticks; then it swings down the lane at 10 u/s, over barricades and hazards, and every hero it passes takes 8 and is thrown 2 u to the side. It dangles 45 ticks at the far end; cooldown 280 ticks from the landing. Level V, the Still Spire.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's creep pose standing: hunched, the head hanging, swaying on its feet, the arms swinging loose. Mine on top: the head lolls one way, then the other.</td><td>Game: hunch 0.42, neck 0.55, sway 0.08 at 1.2 rad/s (a 5.23 s loop).</td></tr>
      <tr><td>Creep</td><td>A slow hunched shuffle, the arms swinging, the rope swaying slack above it.</td><td>Game: 1.25 u/s. The stride is mine: a step every 0.25 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot, the head leading.</td><td>90° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Swing</td><td>The game's attack, whole. It grips and leans back on the rope, braced, the left foot stepping forward and the right back, while the lane fills toward you; the rope leans ahead and goes taut. Then it swings down the lane on the rope, its body pendulum-swinging about the hips from leaning forward to leaning back, lifted off the floor, the legs trailing; it strikes you as it passes and you are thrown 2 u aside. At the far end it dangles, slack, turning on the rope with its head hanging, then lets go, its feet come down, and it creeps again.</td><td>Game: the grip and lane 66 ticks; the swing at 10 u/s down 8.5 u (0.85 s), the strike as it reaches you; the dangle 45 ticks; the let-go 0.45 s. The poses are the game's: lean back 0.4, the pendulum 0.75 to −0.4, lift 0.12 + 0.38 sin, legs trailing 0.55 + 0.25 sin, the dangle's turn 0.9 sin.</td></tr>
      <tr><td>Hurt</td><td>The upper body jolts back and the head snaps up. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in bent low, then straightens into its hunch on the rope.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it jolts back; the rope lets go above it and drops in a heap. Its knees give, it sags, the head drops, and it topples forward onto its face and lies flat, arms at its sides.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it is; the falling rope is the game's death effect.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet that slide (idle, creep, both turns, the grip and the let-go)</td><td>0 mm</td></tr>
      <tr><td>Loops that jump when they restart (idle, creep, both turns)</td><td>0</td></tr>
      <tr><td>Feet sinking into the floor</td><td>RIM_MM mm at worst</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the swing's arc, the dangle and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The arms stay down.</strong> The game's hanger holds the rope with both hands up above its head. Your model's sleeves are fused to the coat from shoulder to cuff, and lifting the arms tore the coat into sheets, so the arms stay down and swing a little. The rope instead rises from the knot on its right shoulder, where the rope across its chest is tied. If you want the hands up on the rope, the model needs the arms free of the coat (a fresh Tripo pass with the arms held out), and I can redo it.</li>
        <li><strong>The rope is drawn by the page.</strong> The belfry rope up out of frame is a stand-in the same as the game's (twelve half-unit joints, the game's rope colour), slack and swaying while it creeps and taut on the grip; it is not part of your model.</li>
        <li><strong>Mine.</strong> The turn rate, the stride, the idle's head roll, the hurt, the spawn after the grow-in and the death's fall.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The eyes are painted, so the game's indigo eye tell is two small glow points drawn by the page.</li>
        <li>Off the floor the legs hang from the hips at their full length, so they look straight through the swing and the fall.</li>
        <li>The coat bends with the body like skin; its ragged hem does not flap.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember lane and its edge, the hemp arc behind the body, the push-off dust, fibres shaken from the rope, the landing puff, the eye tell, and on death the rope falling in a heap. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="hanger-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=2.0;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Creep',turnL:'Turn left',turnR:'Turn right',swing:'Swing',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['swing'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=4.0; let HOME=NEAR; // where the hero stands, in u, in front of it: inside the 3 to 6 u it keeps\n  const WALK=1.25, RAGEWALK=1.25, TURN=Math.PI/2;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.34,0.3,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[6.6,2.9,4.4],t:[0,0.9,2.0]},'Game zoom':{p:[0,12.5,11.5],t:[0,0.6,2.8]},Side:{p:[11.5,1.8,2.6],t:[0,1.0,2.6]},Front:{p:[0.8,2.0,7.5],t:[0,1.0,0]},Back:{p:[-3.2,3.0,-6.0],t:[0,1.0,1.2]},Top:{p:[0,17,3.2],t:[0,0.4,3.2]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(spine|chest|neck|head|clvL|clvR|armL|armR|foreL|foreR|handL|handR|fingL|fingR|tas)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,rope:ropeSegs[0].visible,hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],eyes:+eyes.toFixed(2),")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={A:[0,'toeL'],B:[0.25,'toeR'],C:[0.5,'toeL'],D:[0.75,'toeR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,0,0]),1,0.25,0.1);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0.1,0.08]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(rim * 2.0 * 1000))).replace('DEAD_MM', str(round(max(0, -dd) * 2.0 * 1000)))
for bad in ('ringT', 'coneT', 'kindle', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'paws', 'rage'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
