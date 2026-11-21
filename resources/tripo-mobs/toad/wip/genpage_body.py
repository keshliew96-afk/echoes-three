rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Mire Toad Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Mire Toad from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Sunken Mill's lobber: your export, with a skeleton and eight moves added by hand. A squat, warty, mud-green toad with a huge pale throat and belly, orange eyes with a cross-shaped slit, a cap of mud down its back with duckweed and a tuft of reeds, short front legs and big folded hind legs. It keeps its distance and every few seconds heaves a glob of mire onto where you stand. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between actions, and Going turns it on the spot. Lob plays the game's three lobs one after another at the hero stand-in 4.2 u in front, inside the band it keeps. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="toad-views.png" alt="The Tripo Mire Toad from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a wide warty body in mud green and brown, the pale throat and belly bulging out in front, a cap of mud down the back with duckweed and a tuft of reeds, orange eyes with cross-shaped slits on top of the head, short front legs with splayed webbed fingers, and the big hind legs folded at its sides with long webbed toes.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>22 <small>a root, the hips (the rump) and chest, the head above the mouth, the jaw below it and the throat sac hung on the jaw, four bones down each front leg and four down each folded hind leg, so the feet stay planted</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.7 u tall <small>its eyes at the 1 u hero's chest, 1 u nose to rump</small></dd></div>
    <div><dt>In the game</dt><dd>Mire Toad <small>34 health, 1.0 u/s. It keeps 3.0 to 5.5 u from its target, sidestepping slowly inside that band. Every 204 ticks it lobs a glob at where the target stands, aimed when it throws: the glob flies 60 ticks with the Ember ring r 0.9 marking where it lands, hits for 12 in r 0.9 and leaves a slick r 0.9 for 180 ticks that slows heroes by 30%. The glob flies over barricades and still lands if the toad dies. The Sunken Mill.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's slow throat breath. On top: its throat flutters the way a toad's does, and once it turns its head to look to each side.</td><td>Two of the game's breaths, 5.7 s. The flutter and the look are mine.</td></tr>
      <tr><td>Walk</td><td>The game's walk: the webbed feet step in diagonal pairs (the left front with the right hind), each foot pinned to the floor while it carries weight, and the body bobs up in a squat hop on every step, leaning a little into its way.</td><td>Game: 1.0 u/s, a foot steps once it falls 0.08 u behind, so one step in each pair every 0.27 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Steps round on the spot in the same pairs, the head leading.</td><td>Mine: 90° a second (the game turns it at once).</td></tr>
      <tr><td>Lob</td><td>The game's three lobs, on its key poses. The game gives no wind-up, so over the last 30 ticks before a throw it gathers: crouched, chin tucked, throat filling. On the throw tick it rears up with its head thrown back and its jaw open, the throat emptying, held 3 frames with a recoil shove back, then snaps back and settles. The glob flies 60 ticks onto where the hero stood, the Ember ring filling under it, and lands in a splash of mire that leaves the slick. The first is flung from its left, the second from its right, the third is the heave, reared high on its hind legs with its front feet off the floor.</td><td>Game: gather 30 ticks; the throw in the last 2.5 frames; held 3, snap 3, settle 9, rest 0.3 s; the glob 60 ticks; the slick 180 ticks.</td></tr>
      <tr><td>Hurt</td><td>A flinch: the head ducks, the throat squeezes in. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, then puffs its throat once and settles.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rears with its head thrown back and its mouth open, then sags flat onto its belly, the throat emptying and the legs splaying out, rolling a little onto its side.</td><td>Mine: 1.8 s, then it stays down. The game pops it where it sits.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet that slide</td><td>SLIDE_MM</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>Up to WALK_MM mm on the walk and turns (the webbed toes as they set down); up to SLAM_MM mm in the lobs (the hind heels in the heave); up to DEAD_MM mm in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the hop, the lobs and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The rear-ups are smaller than the game's.</strong> The game's toad rears on its hind legs; yours sits on its rump with a big belly, so I took the game's rear at 60% and let it rock back on its rump. On the heave its front feet still leave the floor.</li>
        <li><strong>No indigo glint in the eyes.</strong> The game's toad shows an indigo glint in its eyes as its one tell. Your eyes are orange with a cross slit, so I left them as painted. Say if you want the glint added.</li>
        <li><strong>The jaw opens to about half the game's gape.</strong> The lip is one surface with the throat, so a full gape tears it.</li>
        <li><strong>Mine.</strong> The throat flutter and the look in the idle, the turn rate, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The mouth opens only a little, and the corners of the mouth stretch when it does.</li>
        <li>On the heave the hind heels push a little way into the floor as the body rocks up.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the spatter off the mouth, the glob and its Ember ring, the splash, and the slick. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
