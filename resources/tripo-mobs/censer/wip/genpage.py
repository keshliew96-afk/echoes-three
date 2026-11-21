# Builds the Heart Censer's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/censer'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/censer.audit.json'))
glb = open(S + '/censer.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/censer.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Heart Censer Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Heart Censer from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The mender of the Hollow Heart: your export of the bone censer, hung on its chain with a skeleton and nine moves added by hand. It swings from the chain's top, trails behind as it drifts, and on its gather the coals flare and the chain swings wild before it mends its kin. Its swing, its gather and its spill use the game's numbers frame for frame. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Hover or Drift sets what it does between gathers, and Going turns it on the spot. Gather and mend and Spill play over it and repeat until you press them again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="censer-views.png" alt="The Tripo Heart Censer from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a ring and a chain of bone links, a violet heart on a spiked crown, the pot with violet coal windows, a skull and crossbones on its front, and a spike below. Each chain link rides one bone so a link never bends.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>7 <small>root, the chain's top, three down the chain, the pot (it spins) and the bowl (it squashes)</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.47 u tall <small>hung as the game hangs it: the chain's top at 2.35 u, the pot's middle at 1.25 u, the pot 0.54 u across (the game's 0.57). Beside a 1 u hero.</small></dd></div>
    <div><dt>In the game</dt><dd>Heart Censer <small>14 health, no attack. It drifts at 2.0 u/s, hanging 3.2 u behind its kin and fleeing a hero inside 2.4 u. Every 5 s it gathers for 48 ticks, then mends every other foe within 4.2 u for 15% of its health. A stun in the gather spills it. Level IV.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Hover</td><td>The game's rest: it swings slowly from the chain's top on two axes, the links trailing the swing a little, and bobs; the pot spins slowly and the coals breathe.</td><td>Game: 0.12 rad at 2.2 rad/s, the cross swing smaller and slower; the bob 0.06 u at 1.8 rad/s; the spin 0.5 rad/s. 11.5 s loop.</td></tr>
      <tr><td>Drift</td><td>The pot trails behind the travel on top of its swing.</td><td>Game: 2.0 u/s, trailing 0.28 rad. 5.8 s loop.</td></tr>
      <tr><td>Turn left, turn right</td><td>The pot swings out from the turn.</td><td>180° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Gather and mend</td><td>The game's gather key for key: through the coil the coals flare, the halo widens and brightens, the pot spins up and rises a touch, narrow and tall, and the chain swings wild and fast while a rose ring closes in from the mend's reach. On the mend the pot dips and squashes wide, held 3 frames, a rose pulse runs out 4.2 u and the kin in reach light up; the snap: the halo blinks dark; then it settles back.</td><td>Game: coil 48 ticks less the 2.5-frame strike, hold 3 frames, snap 3, settle 10, rest 0.35 s. 1.7 s in all.</td></tr>
      <tr><td>Spill</td><td>A stun 0.4 s into the gather: the coals gutter, the pot drops and swings hard, crystal bits fall, and it eases back.</td><td>Game: 4 frames to the spill, 0.45 s back.</td></tr>
      <tr><td>Hurt</td><td>The pot kicks back and squashes, the chain whips after it. Plays on top of any move.</td><td>0.5 s</td></tr>
      <tr><td>Spawn</td><td>Grows in hanging from the chain's top, then starts to swing.</td><td>Game: grow in 7 frames, about 10% over, from the chain's top.</td></tr>
      <tr><td>Death</td><td>Struck, it swings hard and the coals die; the chain lets go and it drops, the spike strikes the floor, the pot topples onto its side and the chain falls over after it.</td><td>Mine: the drop 0.42 s (a free fall from its height), the topple 0.5 s. The game swells it and throws it.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (hover, drift, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point while it hangs</td><td>LOW_U u above the floor, the spike at the end of a swing.</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: the fall and the topple are kept on the floor frame by frame (DEAD_MM mm at worst).</td></tr>
      <tr><td>The pot's spin</td><td>The page adds it as the game does, at the game's rate for each moment of each move, so the moves never jump from one spin to another.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the swing, the gather and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The heart.</strong> The violet heart on the crown rides the pot and spins with it. It could stay still and face the camera instead, like a lantern's flame.</li>
        <li><strong>The death.</strong> The fall and topple are mine. The game swells it and throws it; I can match that instead.</li>
        <li><strong>Mine.</strong> The turn rate, the links trailing the swing, and the hurt.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The chain is one welded piece with the pot, so the links bend at their joins a little when the chain whips.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the coal and heart glow, the rose halo, the gather's closing ring and motes, the mend's pulse, two grey stand-ins for its kin, crystal bits on the spill, and dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="censer-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.47;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const DUST=0x8d8478, ROSE=0xD58FCB, HV=0xb070e8, CRYSTAL=0xEE8FC6;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Hover',walk:'Drift',turnL:'Turn left',turnR:'Turn right',gather:'Gather and mend',spill:'Spill',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['gather','spill'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=2.6; let HOME=NEAR; // where the hero stands, in u, in front of it: just outside the 2.4 u it flees from\n  const WALK=2.0, RAGEWALK=2.0, TURN=Math.PI, RAD=4.2;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.3,0.3,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[3.6,3.0,5.8],t:[0,1.0,0.8]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[6.2,1.7,0.8],t:[0,1.3,0.8]},Front:{p:[0.5,1.9,6.2],t:[0,1.3,0]},Back:{p:[-2.4,2.6,-5.2],t:[0,1.3,0.4]},Top:{p:[0,9.5,0.6],t:[0,0.8,0.6]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(hips|c1|c2|c3|pot|sq)\\.(quaternion|scale)/;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),spin:+spinA.toFixed(2),halo:halo?+halo.material.opacity.toFixed(2):0,")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("    mixer.update(md);\n", "    mixer.update(md); spinPot(md);\n")
rep("model.scale.set(U*(1+0.11*sq),U*(1-0.05*sq),U*(1+0.11*sq));", "model.scale.set(U*(1+0.11*sq),U*(1-0.05*sq),U*(1+0.11*sq)); model.position.y=1.25*0.05*sq; // the squash about the pot, as the game's midY")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(potPt([0,0,0.19]),5,0xe9dcc0,1.1,0.2); }")
lowfly = min(v['lowest'] for k, v in au.items() if k not in ('death', 'hurt', 'spawn'))
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly * 1.47:.2f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.47 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'BOLTS', 'fire(', 'wall', 'lane', 'bead', 'dart', 'ASH', 'RISE', 'jumped', 'EMBER', 'bones.head', 'bones.bud'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
