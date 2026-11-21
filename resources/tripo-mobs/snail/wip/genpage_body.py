rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Lantern Snail Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Lantern Snail from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Sunken Mill's mender: your export, with a skeleton and eight moves added by hand. A pale green snail with dark spots, a striped shell on its back tied round with rope, an iron lantern lashed on top, a calm face and two eye stalks with yellow eyes. It never attacks. It creeps behind its pack and every 4 s its lantern swells and mends every other foe near it. Kill it first or the wave will not die. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between actions, and Going turns it on the spot. Mend plays the game's three mends one after another with two foe stand-ins inside its reach; the hero stand-in waits outside, 3.5 u off, where the snail likes to keep it. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="snail-views.png" alt="The Tripo Lantern Snail from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a long pale green foot with dark spots and a wavy rim, a striped brown and cream shell coiled on its back with moss on top and a rope tied round it, an iron lantern with a glowing yellow glass lashed upright on the shell, a calm smiling face, and two eye stalks with yellow eyes.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>12 <small>a root, the hips (the foot, stretched for the creep), two bones down the tail end, the neck and head, two bones up each eye stalk, the shell, and the lantern on the shell</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.1 u tall <small>the lantern's ring just over the 1 u hero, the shell to its chest</small></dd></div>
    <div><dt>In the game</dt><dd>Lantern Snail <small>48 health, very slow (0.6 u/s). No attack of its own: it keeps 3.5 u back from the party and creeps to the middle of its pack. Every 240 ticks its lantern mends every other foe within 3.2 u (not bosses) for 12; the lantern swells for the 30 ticks before. The mend is not an attack, so it has no Ember warning. The Sunken Mill.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's slow breath. On top: the eye stalks wave, each its own way, the lantern rocks a little on its lashings and flickers, and once it turns its head to look along its pack.</td><td>A 4 s loop. The breath is the game's; the rest is mine.</td></tr>
      <tr><td>Walk</td><td>The game's creep: the foot stretches out along the way it goes and draws up after it, a ripple the length of the sole, the head end leading and the shell rocking against it. The eye stalks lean forward.</td><td>Game: 0.6 u/s, one stretch of the foot per 0.3 u (every 0.5 s), stretching 9%.</td></tr>
      <tr><td>Turn left, turn right</td><td>Ripples round on the spot, the head and eye stalks leading.</td><td>Mine: 90° a second (the game turns it at once).</td></tr>
      <tr><td>Mend</td><td>The game's three mends. Through the 30-tick swell it draws back and rears, the shell rocking back, the lantern tipping up and its light swelling, the eye stalks drawn up. On the mend tick it casts: the body squashed down on its sole, the lantern thrown forward and flaring, and the mend leaves it as an indigo ring out to 3.2 u, an indigo streak to each foe it mends and motes rising off them. Then it settles. The first casts with the lantern leaned to its left, the second to its right, the third is a rear-up.</td><td>Game: the swell 30 ticks; the cast in the last 2.5 frames; held 3, snap 3, settle 9, rest 0.4 s.</td></tr>
      <tr><td>Hurt</td><td>A snail's flinch: the eye stalks snap in, the head ducks and the body squeezes down. Plays on top of any move.</td><td>0.5 s</td></tr>
      <tr><td>Spawn</td><td>Grows in drawn into its shell, then the head comes out, the eye stalks unroll and the lantern lights.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, the eye stalks snap in and the head draws back under the shell, the foot sags flat, the shell tips, and the lantern topples off its top with a clank and goes out.</td><td>Mine: 2.2 s, then it stays down. The game pops it where it creeps.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>Up to WALK_MM mm on the walk and turns; up to SLAM_MM mm in the mends (the rear-up); up to DEAD_MM mm in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the creep, the mends and the topple are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Your lantern burns yellow; the game's is indigo.</strong> The game's lantern bulb is indigo, its one tell. Yours is a warm yellow lantern, so I kept its yellow and swell that, and drew the mend itself in the game's indigo. Say if you want the glass turned indigo.</li>
        <li><strong>The lantern is lashed to the shell, not on a stalk.</strong> The game's lantern hangs on a stalk that lifts and thrusts out. Yours is tied on top of the shell, so it tips back and forward on its lashings instead.</li>
        <li><strong>The head draws into the shell.</strong> Your snail can pull its head in, so it does when it is hurt, when it spawns and when it dies.</li>
        <li><strong>Mine.</strong> The look and the eye stalks in the idle, the turn rate, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The head draws in by shrinking toward the foot, as the model has no room inside the shell; the front of the shell stretches a little when it does.</li>
        <li>The rope and moss are fixed to the shell; the rope does not swing.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the lantern's swell and flare, the indigo ring and sigil, the indigo streaks and motes on the foes it mends, and the lantern going out. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
