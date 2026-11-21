# Builds the Bog Lamprey's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/lamprey'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/lamprey.audit.json'))
glb = open(S + '/lamprey.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/lamprey.glb') / 1e6
rim = 0
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Bog Lamprey Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Bog Lamprey from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Sunken Mill's ambusher: your export, with a skeleton and eight moves added by hand. A spotted bog eel with a weed-hung reared neck, a round mouth ringed with teeth and a row of gill pores. It lurks under the floor where only a ripple shows, then breaks the surface and coils while an Ember lane marks the floor, and lunges down it at 10 u/s: every hero it crosses is bitten for 12. The lunge beaches it, thrashing on its side for 110 ticks, before it slides back under. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Surface or Swim sets what it does between lunges, and Going turns it on the spot. Lunge plays the game's whole attack from under the floor, on the full 5 u lane with the hero stand-in 3 u ahead on it, and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="lamprey-views.png" alt="The Tripo Bog Lamprey from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a long spotted olive eel lying along the floor with its neck reared in a tall curve, a round sucker mouth ringed with pale teeth facing forward, glowing yellow-green eyes, six gill pores a side, a ragged dorsal fin to the tail fin and strands of pond weed hanging off the neck and body.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>12 <small>a root, hips mid-body, the body, two up the neck, the head and the mouth (it gapes); four down the tail to the fin</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.4 u long <small>the game's eel is about 1.4 u nose to tail; the reared head stands 0.66 u beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Bog Lamprey <small>28 health. It lurks submerged and untargetable, gliding at 1.6 u/s to 3.0 u of its target. At 2.0 to 4.6 u it breaks the surface and marks an Ember lane 0.9 wide and up to 5.0 long for 48 ticks, then lunges down it at 10 u/s, biting each hero it crosses for 12. The lunge beaches it for 110 ticks, hittable, before it slides back under. Level II, the Sunken Mill.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Surface</td><td>On the surface, breathing. Mine on top: a slow wave down the body, the head swaying to look each way, the mouth breathing open.</td><td>Game: breath at 1.9 rad/s. A 6.61 s loop of whole cycles.</td></tr>
      <tr><td>Swim</td><td>The game's S-wave running down the body as fast as it travels.</td><td>Game: 1.6 u/s, the wave at 9 times the speed (14.4 rad/s, rounded to whole cycles).</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot, the body bending into the turn and the head leading.</td><td>180° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Lunge</td><td>The game's attack, its own key poses. It lurks under the floor with only the ripple showing. It breaks the surface and coils to its left, the head reared and cocked back, the mouth opening, while the Ember lane fills. It lunges: thrown out straight and stretched, the head low and leading, the mouth wide, the tail beating, down the whole lane and through the hero. It beaches: snaps back, rolls onto its side and thrashes, lifting its head to gasp, the mouth working. Then it slides back under, and surfaces again so the page can go on.</td><td>Game: the rise and the lane 48 ticks (surfacing in 8 frames), the strike the last 2.5 frames, the lunge 0.5 s (5 u at 10 u/s), beached 110 ticks, under again at the game's rate.</td></tr>
      <tr><td>Hurt</td><td>The neck flinches back, the mouth gapes and the tail whips. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, rears with the mouth wide and settles.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears with the mouth wide; the neck gives out and it rolls onto its side as the head drops to the floor, a last thrash runs down the tail, and it lies still.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (surface, swim, both turns)</td><td>0</td></tr>
      <tr><td>Beached and rolled on its side</td><td>On the floor, not in it: its lowest point measured on every frame of the beach and lifted to the floor (within 1 mm).</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
      <tr><td>Under the floor</td><td>Only while it lurks, 0.45 u down as in the game, with the neck laid flat so nothing shows but the ripple.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the lunge and the thrash are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The neck stays reared.</strong> Your eel holds its head up on a tall neck; the game's lies low along the floor. I kept your pose, so the head stands 0.66 u up. If you want it low like the game's, I can lower the rest pose.</li>
        <li><strong>The neck lies flat while it lurks.</strong> Reared, the head would poke out of the floor at the game's 0.45 u depth, so the neck lays down as it sinks and rears as it breaks the surface.</li>
        <li><strong>It swims on the surface here.</strong> The game glides under the floor; Swim shows it above so you can see the wave.</li>
        <li><strong>One lunge, coiled to its left.</strong> The game's lunge has three variants (to its left, to its right, and from on high) for repeats; each lunge beaches it, so the page plays the first. I can add the other two.</li>
        <li><strong>It sits on the floor while beached.</strong> The game lifts its own eel 0.05 u as it rolls; this one rests on its side on the floor instead.</li>
        <li><strong>Mine.</strong> The turn rate, the surface's wave and looks, the hurt, the spawn after the grow-in, the death, and the lurk before and the surfacing after the lunge.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The weed strands move with the body; they do not hang or sway on their own.</li>
        <li>The mouth opens by widening its rim; the teeth do not move on their own.</li>
        <li>The gill pores glow indigo, the game's tell, drawn by the page; the eyes are painted.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the ripple, the Ember lane, the breach and slide-under splashes, spray off the lunge, the bite, the beaching splat with its wet patch, and drops flicked off as it thrashes. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="lamprey-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.4;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Surface',walk:'Swim',turnL:'Turn left',turnR:'Turn right',lunge:'Lunge',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['lunge'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.0; let HOME=NEAR; // where the hero stands, in u, in front of it: its 3.0 u lurk distance, on its lane\n  const WALK=1.6, RAGEWALK=1.6, TURN=Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.24,0.8,1); blob.position.set(0,0.004,-0.05);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.2;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[5.2,2.6,4.6],t:[0,0.35,1.3]},'Game zoom':{p:[0,10.5,9.6],t:[0,0.3,1.4]},Side:{p:[7.8,1.0,1.4],t:[0,0.4,1.4]},Front:{p:[0.4,1.2,5.6],t:[0,0.4,0]},Back:{p:[-2.2,2.2,-4.8],t:[0,0.4,0.2]},Top:{p:[0,9,1.5],t:[0,0.1,1.5]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(neck1|neck2|head|disc|tail1|tail2|tail3|tail4)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,ripple:ripple.visible,gills:+gills.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "totalEmissiveRadiance+=vec3(0.36,0.45,0.95)*uGlow.x*vMask.x")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.neck2,[0,0,0.05]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1.4 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'cone', 'bridle', 'kite'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd)
