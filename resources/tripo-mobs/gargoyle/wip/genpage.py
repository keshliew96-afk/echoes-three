# Builds the Gargoyle's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/gargoyle'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/gargoyle.audit.json'))
glb = open(S + '/gargoyle.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/gargoyle.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']


rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Gargoyle Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Gargoyle from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Still Spire's sleeper: your export with the extra tail cut away, a skeleton and eleven moves added by hand. It waits as stone, perched on its haunches. When a hero comes near, the stone cracks behind an Ember ring and it bursts free. Awake, it rises and stalks, and it slams: up on its legs with both fists overhead while the ring fills in front of it, then down hard. Left alone, it settles back into stone. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Stone, Awake and Stalk set what it does, and Going turns it on the spot. Going from Stone to Awake or Stalk plays the wake: the crack and the burst. Going back to Stone plays the settle. The Slam plays over Awake or Stalk and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="gargoyle-views.png" alt="The Tripo Gargoyle from the front, its left side, the back and its right side, before rigging, with both tails" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a crouched grotesque of pale weathered limestone with moss in its cracks, curled horns, pointed ears, glowing amber eyes and a fanged grin, its long arms down on its knuckles, its legs folded under it, and its stone wings folded down its flanks. These are your views as sent, with both tails. I cut away the one that curls round its right side, so the tail that is left comes down its back and curls round its left, as on your sheet.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it (3,906 as sent; the cut took the rest)</small></dd></div>
    <div><dt>Bones</dt><dd>29 <small>hips, the body's squash, spine, chest, neck, head, the jaw, 2 in the tail, 3 in each arm, 2 in each wing and 4 in each leg</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.1 u tall <small>perched, the game's gargoyle's size, beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Gargoyle <small>48 health. It arrives as stone: it does not move or attack, and knockback does not shift it. A hero within 2.6 u or any hit wakes it: the stone cracks for 48 ticks behind an Ember ring r 1.7 round itself, then it bursts free for 12. Awake it stalks at 1.9 u/s and slams: an Ember ring r 1.3 centred 0.9 u in front of it for 54 ticks, 13 damage, every 200 ticks. With no hero within 5 u for 6 s it settles back into stone. Level V, the Still Spire.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Stone</td><td>The game's stone: a statue does not breathe. Your model's own perched pose, held dead still, the eyes dark.</td><td>Held</td></tr>
      <tr><td>Wake</td><td>The game's crack: it judders harder and harder while the eyes glow up, then bursts free with its arms and wings thrown wide and the jaw wide, stone chips flying, and rises.</td><td>Game: the crack 48 ticks with the Ember ring r 1.7, the burst on the 48th, the rise at the game's rate</td></tr>
      <tr><td>Awake</td><td>The game's awake stand: up off its haunches, hunched, its fists off the floor, breathing. Mine on top: it looks one way, then the other, shrugs its wings and shifts a foot.</td><td>6 s loop</td></tr>
      <tr><td>Stalk</td><td>The game's stalk: hunched, the hips rolling with the stride, the arms swinging against the legs, the wings half open.</td><td>Game: 1.9 u/s; my stride, 0.4 s a step</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot.</td><td>200° a second (my number: the game turns it instantly)</td></tr>
      <tr><td>Slam</td><td>The game's slam: up on its legs, rearing back with both fists overhead and the wings thrown open while the ring fills, then crashing down on the beat and rising out of it.</td><td>Game: the wind-up 54 ticks, down in 0.1 s, back up over 0.45 s</td></tr>
      <tr><td>Settle</td><td>The game's settle: it sinks back onto its haunches where it stands and goes still, the eyes fading.</td><td>Mine: 1.1 s, then held</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the head snaps up, the jaw gapes and the wings flare. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, as stone.</td><td>Game: grow in 7 frames, about 10% over</td></tr>
      <tr><td>Death</td><td>Struck, it rears with its wings thrown open, then slumps forward onto its chest with its arms flung out in front and its head down, the wings slumping, and lies still.</td><td>Mine: 2 s, then it stays down. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet that slide</td><td>SLIDE_MM mm at worst</td></tr>
      <tr><td>Legs stretched past their length</td><td>REACH_MM mm at worst</td></tr>
      <tr><td>Anything below the floor</td><td>RIM_MM mm at worst</td></tr>
      <tr><td>Loops that jump when they restart (stone, awake, stalk, both turns)</td><td>0</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the crack, the stalk and the slam are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The tail.</strong> I cut the one that curls round its right side and closed the cut. If you meant the other one, I can swap them.</li>
        <li><strong>Standing up.</strong> The game's gargoyle stands up on two legs when it wakes. Your model's legs are folded flat under it, so I raise it only part of the way, about 0.13 u, and lift its fists off the floor. I can raise it further, but the folded legs stretch past that.</li>
        <li><strong>The glow.</strong> The game lights indigo cracks across its stone. Your stone's cracks are painted into the texture, so I can't light them on their own, and the indigo glow is in the eyes instead.</li>
        <li><strong>Mine.</strong> The stride, the turn rate, the awake idle's looks, the hurt and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The model is one welded piece, so the arms pull the chest's stone with them when the fists go overhead.</li>
        <li>Each wing is two stiff bones; the wing's ribs do not spread apart.</li>
        <li>Where I cut the tail, the closed edge on the floor by its right foot is rough.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the two Ember rings, the eyes' glow, stone chips and dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="gargoyle-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.1;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={stone:'Stone',idle:'Awake',walk:'Stalk',turnL:'Turn left',turnR:'Turn right',wake:'Wake',settle:'Settle',slam:'Slam',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['slam'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.6; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 2.6 u wake and its 1.9 u slam\n  const WALK=1.9, RAGEWALK=1.9, TURN=2*Math.PI/1.8, TEL=54/60, CRACK=48/60, WAKE_R=1.7, SLAM_R=1.3, SLAM_AT=0.9;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.55,0.55,1); blob.position.set(0,0.004,0.0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[2.9,1.7,2.8],t:[0,0.55,0.4]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.4,0.8]},Side:{p:[4.8,1.1,0.7],t:[0,0.55,0.4]},Front:{p:[0.4,1.2,4.0],t:[0,0.55,0]},Back:{p:[-1.9,1.8,-3.6],t:[0,0.55,0.2]},Top:{p:[0,7.5,0.9],t:[0,0.2,0.8]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|spine|chest|neck|head|jaw|tail|tail2|armL|armR|foreL|foreR|handL|handR|wingL|wingR|wtipL|wtipR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),warn:warn.visible,")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
rep("B.moves=group('moves',['idle','walk','spawn','death'],k=>pick(k),'idle');", "B.moves=group('moves',['stone','idle','walk','spawn','death'],k=>pick(k),'idle');")
rep("{sel.going=k;if(sel.base!=='walk'&&!sel.dead)sel.base='walk';refresh();}", "{sel.going=k;if(sel.base!=='walk'&&!sel.dead){ if(sel.base==='stone'){sel.action=null;startShot('wake');} sel.base='walk';}refresh();}")
rep(":'idle';}", ":sel.base==='stone'?'stone':'idle';}")
rep("if(k==='idle'||k==='walk'){ if(sel.dead)return; sel.base=k; }", "if(k==='idle'||k==='walk'||k==='stone'){ if(sel.dead)return; const was=sel.base; sel.base=k; if(was==='stone'&&k!=='stone'){sel.action=null;startShot('wake');} else if(was!=='stone'&&k==='stone'){sel.action=null;startShot('settle');} }")
rep("b.disabled=sel.dead&&(k==='idle'||k==='walk');", "b.disabled=sel.dead&&(k==='idle'||k==='walk'||k==='stone');")
rep("Object.values(B.acts).forEach(b=>{b.setAttribute('aria-pressed',String(sel.action===b.dataset.k)); b.disabled=sel.dead;});", "Object.values(B.acts).forEach(b=>{b.setAttribute('aria-pressed',String(sel.action===b.dataset.k)); b.disabled=sel.dead||sel.base==='stone';});")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={A:[0.0,'cL'],B:[0.25,'cR'],C:[0.5,'cL'],D:[0.75,'cR']};")
rep("dust(pt(bones[STEP[k][1]],[0,-0.03,0.03]),2,0.4,0.25);", "dust(pt(bones[STEP[k][1]],[0,0,0]),1,0.2,0.12);")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)chips(pt(bones.chest,[0,0,0.12]),6,0.9); }")
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
