# Builds the Gravewisp's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/gravewisp'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/gravewisp.audit.json'))
glb = open(S + '/gravewisp.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/gravewisp.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Gravewisp Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Gravewisp from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Ashen Barrow's warder: your export, with a skeleton and eight moves added by hand. It has no attack of its own. It hangs back behind another foe, gathers, and casts an indigo tether from its lantern; while the tether holds, that foe takes no damage. When the tether fades it snaps back and drifts until it can gather again. The hover, the lean, the tail's swish and the ward and snap poses use the game's numbers frame for frame. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Hover or Drift sets what it does between wards, and Going turns it on the spot. Ward plays the game's whole cycle over it (gather, cast, the 4 s tether on the grey stand-in foe, the snap) and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="gravewisp-views.png" alt="The Tripo Gravewisp from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a pale blue ghost with a flame-tipped head, two hollow white eyes, stubby arms, an iron collar with a lantern hanging on a short chain, and a tail that tapers in waves. The lantern was fused to the chest, so I cut it free and closed the chest behind it; it now swings on its own bone.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>small-mob budget 1,500 · over it, see below</small></dd></div>
    <div><dt>Bones</dt><dd>12 <small>hips (the hover, the lean and the push), the body's squash, chest, head, the flame tip, 2 arms, the lantern and 3 down the tail</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.05 u tall <small>its tail tip floats at 0.35 u and its head at the game's 1.0 u hover, beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Gravewisp <small>12 health, no attack. It tethers the nearest other foe within 5.5 u (never a boss, a broodling or another wisp); while the tether holds, that foe takes no damage. The tether lasts 240 ticks and snaps if the two drift 6.5 u apart; then it needs 150 ticks to gather a new one. It drifts at 2.3 u/s, 1.6 u behind its ward on the side away from the party, and flees a hero inside 2.2 u. Level III, the Ashen Barrow.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Hover</td><td>The game's hover: the slow bob, the tail swishing, the arms swaying. Mine on top: a look one way then the other, the flame tip flickering, the lantern rocking.</td><td>Game: bob 0.08 u at 2.2 rad/s (a 2.87 s loop, two bobs a cycle); the tail at 3.1 and the arms at 2.7 rad/s, rounded to whole cycles.</td></tr>
      <tr><td>Drift</td><td>Leans into its travel, the tail streaming back and the lantern trailing.</td><td>Game: 2.3 u/s, leaning 0.14 rad, the tail back 0.5.</td></tr>
      <tr><td>Turn left, turn right</td><td>Banks into the turn, the tail swinging wide.</td><td>270° a second (my number: the game turns it to face its ward at once). The bank is the game's 0.2.</td></tr>
      <tr><td>Ward</td><td>The game's cycle, whole. It draws in and up (the gather), then lunges, flattens and swells as it casts; the tether lands on the cast's first frame and its ward stops taking damage. It settles into the ward pose, leaning toward its ward, arms open, and holds it while the tether lasts. Then the tether snaps: it jerks back, tall and thin, and eases back to its hover. Mine on top: the lantern swings up toward the ward on the cast and flies forward as it jerks back on the snap.</td><td>Game: gather 1 frame, cast 2.5 frames, the hold 240 ticks, the snap 3 frames and the recoil 0.25 s; the poses are the game's key poses.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the head snaps up, the lantern swings and the tail whips. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in low and rises into its hover, unfurling its tail.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it shudders and its flame gutters; the hover gives out and it sinks, toppling onto its side on the floor, the lantern clunking down beside it, the tail curling.</td><td>Mine: 2 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (hover, drift, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point while it hovers</td><td>LOW_U u above the floor, the tail tip at the bottom of the bob.</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the bob, the cast's snap and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Over budget.</strong> It has NTRI triangles (3,936 as you sent it, plus the caps where I cut the lantern free) against the 1,500 small-mob budget (the game counts it as a small flier). It could be decimated in Tripo to about 1,500, or kept, since it is a single foe and well under the 4,000 foe budget. Your call.</li>
        <li><strong>The lantern is the core.</strong> The game's wisp glows from an indigo core in its chest. Yours carries a lantern, so I light the lantern's glass in the game's indigo and drive it with the game's core numbers, about half as bright.</li>
        <li><strong>Mine.</strong> The turn rate, the idle's look, the lantern's swing, the hurt, the spawn after the grow-in and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The arms are one bone each; the tail bends on three.</li>
        <li>Where the lantern was cut free there is a faint mark on the chest, from the texture painted under it; you can see it when the lantern swings out.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the lantern's glow, its halo and floor light, the take's flare and closing ring on the ward, the thread with motes running down it, the ward's shimmer, and the snap's flash and sparks. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="gravewisp-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.05;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const INDIGO=0x506de2, GLOW=0x1d46ed, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Hover',walk:'Drift',turnL:'Turn left',turnR:'Turn right',ward:'Ward',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['ward'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.8; let HOME=NEAR; // where the hero stands, in u, in front of it: past its ward (1.6 u off), outside the 2.2 u it flees\n  const WALK=2.3, RAGEWALK=2.3, TURN=1.5*Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.2,0.2,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.4,1.9,0.0],t:[0,0.75,0.9]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.6]},Side:{p:[6.0,1.4,1.2],t:[0,0.8,1.2]},Front:{p:[0.6,1.5,6.5],t:[0,0.8,0.8]},Back:{p:[-2.0,2.0,-3.6],t:[0,0.8,0.6]},Top:{p:[0,8.5,1.2],t:[0,0.5,1.2]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|chest|head|flame|lamp|t1|t2|t3|armL|armR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),beam:beam.visible,mode,core:+coreK.toFixed(2),")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
# the fire lights Kiln Gold, the eyes warm yellow; uGlow.w greys it while spent
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x+vec3(0.55,0.22,0.9)*uGlow.y*vMask.y+vec3(0.55)*uGlow.z+vec3(0.8,0.75,1.0)*uGlow.w*vMask.z;",
    "totalEmissiveRadiance+=vec3(0.31,0.43,0.89)*uGlow.x*vMask.x+vec3(0.75,0.82,1.0)*uGlow.y*vMask.y+vec3(0.55)*uGlow.z;")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0,0.08]),5,0xdfe8ff,1.0,0.2); }")
fly = {k: v for k, v in au.items() if k not in ('death', 'spawn', 'ward', 'hurt')}
lowfly = min(v['lowest'] for v in fly.values())
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly:.2f}').replace('DEAD_MM', str(round(max(0, -dd) * 1000)))
for bad in ('ringT', 'coneT', 'kindle', 'litK', 'GOLD', 'EMBER', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'BOLTS', 'fire(', 'wall', 'lane', 'bead', 'dart', 'ASH', 'RISE', 'jumped', 'bones.bud', 'heart(', 'bell', 'TONE', 'slowT'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
