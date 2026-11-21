# Builds the Gust Kite's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/kite'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/kite.audit.json'))
glb = open(S + '/kite.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/kite.glb') / 1e6
rim = -au['dive']['lowest']
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Gust Kite Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Gust Kite from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Spire's kite: your export, with a skeleton and eight moves added by hand. A torn paper kite with a folded-cloth head and a tail of rag bows, flying flat 1.6 u up like the game's, its face up to the camera. It circles out of reach, then hangs over you with its sails folded while an Ember lane marks the floor, and dives down it at 12 u/s: every hero it crosses takes 9. Then it lies on the floor, struggling and taking 50% more, and climbs back up. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Soar or Fly sets what it does between dives, and Going turns it on the spot. Dive plays the game's whole attack on the full 6.2 u lane, with the hero stand-in 3.1 u ahead on it, and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="kite-views.png" alt="The Tripo Gust Kite from the front, its left side, the back and its right side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece, standing upright like a kite pinned to a wall: a folded-cloth head with a small beak and two glowing eyes, a cane cross with two swept-back spars, torn sails patched in cream, slate and rust, and a long tail of rag bows hanging below.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · not trimmed</small></dd></div>
    <div><dt>Bones</dt><dd>12 <small>a root, hips, chest and head; two per sail (the spar and the outer sail, so it billows); four down the tail</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.6 u across <small>the game's kite spans about 1.65 u; it flies 1.6 u up beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Gust Kite <small>14 health. It flies at 2.8 u/s, circling 3.6 to 5.6 u out. Within 5.2 u it hangs and marks an Ember lane 0.8 wide and up to 6.2 long for 50 ticks, then dives down it at 12 u/s: 9 to each hero it crosses. It lands grounded for 80 ticks, taking 50% more, then climbs back. Cooldown 250 ticks. Level V, the Spire.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Soar</td><td>The game's soar in place: it bobs, rolls lazily, its sails beat and billow and the tail's rags flutter. Mine on top: it turns its head one way, then the other.</td><td>Game: 0.08 u bob at 1.7 rad/s, 0.12 roll at 1.1, sails at 3.6, tail at 5.5, a 7.39 s loop of whole cycles.</td></tr>
      <tr><td>Fly</td><td>The same, nose a little further down into the travel.</td><td>Game: 2.8 u/s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Turns on the spot, banking into the turn.</td><td>180° a second (mine: the game turns it at once).</td></tr>
      <tr><td>Dive</td><td>The game's attack, its own numbers. It hangs 0.18 u higher, tips its nose 0.45 down to aim, shivers and folds its sails up and back while the Ember lane fills; its eyes glow brighter. It drops down the lane nose down and stretched, from 1.78 u to the floor, crossing the hero; it thumps flat onto the floor, tilted, the sails splayed, and struggles with feeble lifts. Then it climbs back up nose high, beating hard, and settles into the soar.</td><td>Game: hang 50 ticks, the drop 31 ticks (6.2 u at 12 u/s), grounded 80 ticks, the climb easing up at the game's rate.</td></tr>
      <tr><td>Hurt</td><td>The sails flinch up, the head snaps back and the tail whips. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in at its flying height with the sails folded, snaps them open and beats twice to catch the wind.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, the sails jerk up and go slack; it slips sideways, nose down, turning half round as it falls, slaps flat onto the floor, bounces once and lies with the tail settling last.</td><td>Mine: 2.4 s, then it stays down. The game pops every foe where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (soar, fly, both turns)</td><td>0</td></tr>
      <tr><td>Grounded after the dive</td><td>On the floor, not in it: RIM_MM mm at worst (a tail rag while it struggles)</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the dive and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>It flies flat, face up, like the game's kite.</strong> Your model is sculpted standing up, so I laid it flat with the head forward and the face up, which shows the face to the top-down camera. If you would rather it fly upright, tipped back like a real kite in the wind, it reads face-on from the side but thin from above; I can do that instead.</li>
        <li><strong>The eye glow sits on its face.</strong> The game's kite has an indigo eye painted on its back as its tell. Yours has its eyes on the face, so the indigo glow is on them.</li>
        <li><strong>The tail trails level.</strong> The game lifts each tail joint 0.16, which on this longer tail curls it up over the back, so it trails level with a slight droop.</li>
        <li><strong>The floor stops the sails.</strong> The game slaps the sails 0.2 down on the thump and lays them 0.12 under level, which would sink these into the floor, so they lie flat on it. It lies 0.1 u up instead of 0.07 for this model's back, and the low sail lifts by the game's tilt.</li>
        <li><strong>It flares flat at the bottom of the dive</strong> over the last third of the drop, so the beak does not hit the floor before the body.</li>
        <li><strong>Mine.</strong> The turn rate and bank, the soar's head turns, the hurt, the spawn after the grow-in and the death's fall.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Each sail bends on two bones; single torn rags do not flutter on their own.</li>
        <li>The tail has four bones for the game's six, so the flutter runs down it in longer waves.</li>
        <li>The eyes are painted; the indigo glow is drawn by the page.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember lane, the eye glow, the snapped bridle string, wind streaks in the dive, the hit, the thump's dust, the climb's downdraught and the shadow. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="kite-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.6;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Soar',walk:'Fly',turnL:'Turn left',turnR:'Turn right',dive:'Dive',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['dive'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=3.1; let HOME=NEAR; // where the hero stands, in u, in front of it: on its lane, inside its 5.2 u reach\n  const WALK=2.8, RAGEWALK=2.8, TURN=Math.PI;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.55,0.45,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.5;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[6.0,3.8,5.6],t:[0,1.0,1.6]},'Game zoom':{p:[0,12.5,11.5],t:[0,0.6,1.6]},Side:{p:[9.5,1.8,1.6],t:[0,1.0,1.6]},Front:{p:[0.5,2.6,7.8],t:[0,1.3,0]},Back:{p:[-2.6,3.4,-5.4],t:[0,1.3,0.4]},Top:{p:[0,11,1.7],t:[0,0.3,1.7]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(head|wing1L|wing2L|wing1R|wing2R|tail1|tail2|tail3|tail4)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),lane:lane.visible,bridle:bridle.visible,glow:+glowK.toFixed(2),hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0,0.05]),5,0xe9dcc0,1.1,0.2); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('RIM_MM', str(round(max(0, rim) * 1.6 * 1000))).replace('DEAD_MM', str(round(max(0, -dd) * 1.6 * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'bell', 'rope', 'toll', 'mouth', 'cone'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'rim', rim, 'death', dd)
