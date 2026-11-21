# Builds the Cinder Moth's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/mobs/cindermoth'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/cindermoth.audit.json'))
glb = open(S + '/cindermoth.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/cindermoth.glb') / 1e6
rim = max(-v['lowest'] for k, v in au.items() if k != 'death')
dd = au['death']['lowest']

rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Cinder Moth Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Cinder Moth from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Kiln's moth: your export, with a skeleton and eight moves added by hand. It flutters at head height straight at a hero, and once it is within reach it hangs still, spreads its wings flat and kindles under the Ember ring, then flares. Spent, it turns away and sinks into a grey husk on slow, sagging beats, drifting off, until its heat creeps back and it catches light again. The hover, the wingbeat, the kindle, the flare and the husk use the game's numbers frame for frame. Pick a move, drag to turn it, and judge it. Nothing in the game has changed.</p>
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
        <p class="rule">Flutter or Fly sets what it does between flares, and Going turns it on the spot. Kindle plays the game's whole cycle over it (kindle, flare, the spent husk, the relight) and repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words.</p>
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
      <img src="cindermoth-views.png" alt="The Tripo Cinder Moth from the front, its right side, the back and its left side, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through whole, as one piece: a round, furry ash-brown body with two yellow eyes, two feathered antennae tipped with flame, glowing bands round the abdomen, short dark legs underneath, and four broad wings of fire-veined ash with molten edges. Each side's two wings are one pane, so I split them by which wing's line a point is nearer and blend the seam.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000 · within it</small></dd></div>
    <div><dt>Bones</dt><dd>12 <small>hips (the hover and the lean), the body's squash, the head, 2 antennae, 4 wings and the legs on one bone a side</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.0 u across the wings <small>its body's middle hovers at the game's 1.25 u, beside a 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Cinder Moth <small>12 health, flutters at 2.4 u/s straight at a hero. Within 1.0 u it hangs still and kindles under an Ember ring r 1.2 for 48 ticks, then flares for 6 to every hero inside. Then it is spent for 150 ticks: a grey husk drifting away at 1.2 u/s that takes double damage, until it relights. Several come at once. Level V, the Kiln.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Flutter</td><td>The game's hover: the slow bob, the quick flutter, a slight rock, the fore and hind wings beating a little apart. Mine on top: a look to one side, the antennae and legs swaying with the beat.</td><td>Game: bob 0.12 u at 2.3 rad/s, flutter 0.025 u and wingbeat at 16 rad/s (7 beats a bob in a 2.73 s loop), the hind wings 0.6 rad behind.</td></tr>
      <tr><td>Fly</td><td>Leans into the flight, the legs trailing.</td><td>Game: 2.4 u/s, leaning 0.22 rad.</td></tr>
      <tr><td>Turn left, turn right</td><td>Banks into the turn.</td><td>270° a second (my number: the game turns it instantly).</td></tr>
      <tr><td>Kindle</td><td>The game's attack, whole. It climbs to 1.38 u, pitches back and holds its wings spread flat, trembling harder as the Ember ring fills, the heat in its veins rising. On the flare the wings snap wide and its heat bursts out over the ring; a hero inside is hit. Spent, it turns away, goes grey and sinks to 0.78 u on slow sagging beats, rocking, drifting off. Over the last 40 ticks the heat creeps back, then it catches light, turns back and climbs to its flutter.</td><td>Game: the kindle 48 ticks, the flare e^(−7t) for 0.5 s, spent 150 ticks, the creep the last 40; the height, the kindle and the heat ease at the game's rates.</td></tr>
      <tr><td>Hurt</td><td>The body jolts back, the head and antennae snap up and the wings flick. Plays on top of any move.</td><td>0.35 s</td></tr>
      <tr><td>Spawn</td><td>Grows in low and climbs to its flutter on hard beats.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, its heat goes out; the beat stops, it tumbles down and lands on its legs, the wings drooping to the floor.</td><td>Mine: 2 s, then it stays down. The game pops every foe flat where it is.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (flutter, fly, both turns)</td><td>0</td></tr>
      <tr><td>Lowest point while it flies</td><td>LOW_U u above the floor, the legs' tips at the bottom of the bob; the spent husk sinks to LOW_S u.</td></tr>
      <tr><td>Lying dead</td><td>On the floor, not in it: its lowest point measured on every frame of the fall (DEAD_MM mm at worst).</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the wingbeat, the flare and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The fire.</strong> The game's moth has separate fire panes and veins whose glow follows its heat. Your wings have the lava veins painted in, so I light the orange parts in Kiln Gold by the game's heat and grey the rest while it is spent. Never Ember: that stays for the ring.</li>
        <li><strong>Turning away.</strong> The game turns the spent husk instantly to drift off, and back on the relight. I turn it over a quarter second each way.</li>
        <li><strong>Mine.</strong> The turn rate, the idle's look, the hurt, the spawn after the grow-in and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The wings are stiff panes on one bone each; they do not bend along their length.</li>
        <li>The legs move together on one bone a side.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page: the Ember ring, the heat glow, its halo and floor light, cinders dripping, the flare's burst, and the grey while spent. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="cindermoth-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.0;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478, GOLD=0xFFC24A, HEAT=0xFFE6A8;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Flutter',walk:'Fly',turnL:'Turn left',turnR:'Turn right',kindle:'Kindle',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['kindle'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=0.9; let HOME=NEAR; // where the hero stands, in u, in front of it: inside its 1.0 u reach and the 1.2 u ring\n  const WALK=2.4, RAGEWALK=2.4, TURN=1.5*Math.PI, RAD=1.2, TEL=48/60, SPENT=150/60;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.3,0.28,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[2.7,2.1,3.2],t:[0,0.95,0.3]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[4.6,1.4,0.5],t:[0,0.95,0.4]},Front:{p:[0.4,1.5,4.4],t:[0,1.0,0]},Back:{p:[-1.9,2.0,-3.5],t:[0,0.95,0.2]},Top:{p:[0,7.5,0.7],t:[0,0.6,0.5]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(sq|head|antL|antR|wfL|wfR|whL|whR|legL|legR)\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),ring:ring.visible,mode,lit:+litK.toFixed(2),")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
# the fire lights Kiln Gold, the eyes warm yellow; uGlow.w greys it while spent
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x+vec3(0.55,0.22,0.9)*uGlow.y*vMask.y+vec3(0.55)*uGlow.z+vec3(0.8,0.75,1.0)*uGlow.w*vMask.z;",
    "totalEmissiveRadiance+=vec3(1.0,0.76,0.29)*uGlow.x*vMask.x+vec3(1.0,0.85,0.4)*uGlow.y*vMask.y+vec3(0.55)*uGlow.z;")
rep("'#include <common>\\nvarying vec3 vMask;\\nuniform vec4 uGlow;')", "'#include <common>\\nvarying vec3 vMask;\\nuniform vec4 uGlow;').replace('#include <map_fragment>','#include <map_fragment>\\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(0.3,0.59,0.11)))*vec3(0.78,0.78,0.82),0.85*uGlow.w);')")
FX = open(S + '/_fx.js').read()
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.sq,[0,0,0.05]),5,GOLD,1.0,0.2); }")
fly = {k: v for k, v in au.items() if k not in ('death', 'spawn', 'kindle', 'hurt')}
lowfly = min(v['lowest'] for v in fly.values())
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('LOW_U', f'{lowfly:.2f}').replace('LOW_S', f"{au['kindle']['lowest']:.2f}").replace('DEAD_MM', str(round(max(0, -dd) * 1000)))
for bad in ('ringT', 'coneT', 'CLAWS', 'rune', 'summon', 'buds', 'throat', 'tele', 'LEAP', 'FAR', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'BOLTS', 'fire(', 'wall', 'lane', 'bead', 'dart', 'ASH', 'RISE', 'jumped', 'bones.bud', 'heart(', 'bell', 'TONE', 'slowT'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'lowfly', lowfly, 'death', dd)
