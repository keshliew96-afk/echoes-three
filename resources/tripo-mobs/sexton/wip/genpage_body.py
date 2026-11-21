rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Barrow Sexton Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Barrow Sexton from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Ashen Barrow's trapper: your export, with a skeleton and nine moves added by hand. A hunched old gravedigger in a long torn coat and a wide hat, a pack of rope and iron traps on his back, leaning on a spade. It never strikes in person: it keeps its distance, drops to a knee and digs, and a bone snare goes into the floor between you. Step on it once it is armed and the jaws close on you. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between actions, and Going turns it on the spot. Dig a snare plays the game's dig with the hero stand-in 3.4 u away: the snare goes in 1.8 u toward the hero and arms. The snare springs starts with an armed snare and walks the hero stand-in onto it. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="sexton-views.png" alt="The Tripo Barrow Sexton from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a gaunt grey old man with long white hair, a sour face and glowing cyan eyes under a battered wide-brimmed hat; a long brown coat, torn and patched, over a stained apron with a ring of iron keys at the belt; a sack pack with rope and two iron traps on his back; heavy strapped boots. His right hand grips a spade standing upright on its blade before him; his left arm hangs bare from the elbow.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>23 <small>a root, hips, spine, chest (the pack with it), neck and head (the hat with it); thigh, shin, foot and toe for each leg; a collar, upper arm, forearm and hand for each arm; the spade, with the fist round its grip</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.25 u tall <small>to the hat's crown: a little taller than the 1 u hero, hunched</small></dd></div>
    <div><dt>In the game</dt><dd>Barrow Sexton <small>28 health, shuffles at 1.4 u/s keeping 3 to 4.6 u from its target and circling. Every 5 s it kneels for 36 ticks, rooted, and buries a bone snare 1.8 u toward its target: a ring r 0.55 that arms 45 ticks later and lies for 20 s, at most three at once. A hero who steps on an armed snare springs it: an Ember ring r 0.95 rises for 42 ticks (step off and you escape), then the jaws snap: 11 damage and a 60% slow for 75 ticks. Stun it mid-dig and the grave is spoiled; kill it and its snares crumble. Level III, the Ashen Barrow.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>It leans on its spade and breathes, peers one way and then the other under its hat, the fingers of its free hand working; once it lifts the spade a hair and sets it down again.</td><td>Mine: a 4.4 s loop. The game's sexton is rarely still.</td></tr>
      <tr><td>Walk</td><td>The game's quick shuffle on short legs, leaning into the travel. The spade is carried tipped forward with its blade off the floor, swinging a little with the step; the free arm swings.</td><td>Game: 1.4 u/s. The stride is mine, 0.25 s a step.</td></tr>
      <tr><td>Turn left, turn right</td><td>Shuffles round on the spot, the head leading.</td><td>Mine: 180° a second (the game turns it at once).</td></tr>
      <tr><td>Dig a snare</td><td>The game's dig. It drops onto its right knee and the spade comes up; the chop driven in from its right, the chop from its left, then both hands on the shaft for the stamp straight down, the biggest, each throwing grave dirt; on the dig tick the spade's flat pats the earth twice and the snare goes in 1.8 u toward the hero, with a pat of earth and a bone glint. Its eyes brighten through the dig. Then up, and the spade is set back on its blade. The snare's teeth break the ash as it arms and glint indigo once armed.</td><td>Game: 36 ticks from the knee to the pat (down 0.12 s, each chop 0.16 s), the pat 0.14 s, up 0.3 s; the snare arms 45 ticks after.</td></tr>
      <tr><td>The snare springs</td><td>The game's spring, with an armed snare already in. The hero stand-in walks onto it: an Ember ring r 0.95 rises round it while the bone teeth climb and lean in, then the jaws snap with an Ember star and bone splinters, and the hero is held with a pale ring at its feet. The sexton leans on its spade and watches, its head coming up as the ring rises, and laughs a hunched laugh at the snap.</td><td>Game: the ring 42 ticks, the snap 11 damage, the slow 75 ticks. The walk on and the sexton's watching are mine.</td></tr>
      <tr><td>Hurt</td><td>The head and shoulders jolt back and the free arm flinches; the spade stays planted. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in bowed, straightens and sets the spade down on its blade with a puff of dust.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rocks back; its knees give and it sags onto its spade, then topples forward onto its face, the spade going down flat ahead of it with a clank.</td><td>Mine: 2.2 s, then it stays down. The game pops every foe where it stands.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet sliding on the floor</td><td>SLIDE_MM</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor (the spade's blade is held on it)</td><td>Up to WALK_MM mm on the walk and turns; up to SLAM_MM mm in the dig and the spring; up to DEAD_MM mm in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the shuffle, the chops and the snap are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The spade stands, not shouldered.</strong> The game's sexton carries its spade on its right shoulder. Yours leans on it, blade on the floor, so it stands on it at rest and carries it tipped forward on the walk.</li>
        <li><strong>No lantern; the eyes are the tell.</strong> The game's sexton swings a lantern from its left hand, its indigo flame the tell that flares through the dig. Yours has no lantern, so I brighten its own cyan eyes through the dig instead. Say if you want a lantern added on the page.</li>
        <li><strong>The snare is drawn by the page.</strong> The bone snare, its teeth, the Ember ring and the jaws are stand-ins after the game's own. The iron traps on its pack stay on the pack.</li>
        <li><strong>Mine.</strong> The idle, the stride, the turn rate, the watching and laugh in the spring, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The coat's hem follows the thighs only partly, so it stiffens when it kneels; the right knee does not quite reach the floor.</li>
        <li>The arms are short and part of the coat: the sleeves stretch a little in the chops, and in the stamp the left hand may not close fully on the shaft.</li>
        <li>The eyes are painted in your texture; the page lights them where they are cyan.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the grave dirt, the bury's earth and bone glint, the snare's disc and teeth with their indigo glint, the Ember ring and the jaws' star and splinters, the hero's slow ring, and the death's dust. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
