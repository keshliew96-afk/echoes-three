rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Slag Golem Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Slag Golem from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Kiln's furnace brute: your export, with a skeleton and eight moves added by hand. A hulk of cooled slag boulders with molten seams through the cracks, a small head sunk between huge shoulders, boulder fists hanging to its knees, and a rake and bricks stuck in its back. Its crust turns blows. Close in, it rears with both fists up and slams the ground in front of it, splashing a pool of slag; the blow cracks its crust and for 2 s its core shows and it takes more damage. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between actions, and Going turns it on the spot. Slam plays the game's slam on the hero stand-in inside the Ember ring, the slag pool it leaves, and the 2 s with its core open until the crust knits shut. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="slag-views.png" alt="The Tripo Slag Golem from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a broad golem built of rounded grey-black slag boulders with glowing orange seams in the cracks, brightest in a burst across its chest. A small head with two glowing eyes sits low between massive boulder shoulders; long thick arms end in boulder fists at knee height; short thick legs stand on wide feet. A wooden rake and a few red bricks are stuck in its back.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>21 <small>a root, hips, spine, chest (the shoulders, the rake and the bricks ride it) and head; thigh, shin, foot and toes for each leg; shoulder, upper arm, forearm and fist for each arm</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.7 u tall <small>well over the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Slag Golem <small>64 health, slow (1.25 u/s). Its crust takes 40% less damage and knockback barely moves it. Within 1.9 u of its target it rears and marks a slam: an Ember ring r 1.4 centred 1 u in front of it for 56 ticks, then 14 damage and a slag pool r 1.3 that slows by 30% for 240 ticks. The slam cracks its crust: for 120 ticks its core shows and it takes 40% more. Cooldown 210 ticks. The Kiln.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's slow heavy breath, the fists hanging, the seams glowing faintly. On top: once it rolls its shoulders, the fists lifting a little, and settles.</td><td>A 5.7 s loop, one breath at the game's 1.1 rad/s. The shoulder roll is mine.</td></tr>
      <tr><td>Walk</td><td>The game's plod: a slow heavy sway side to side with each step, the feet barely lifting, the arms swinging out of step, a little dust at every footfall.</td><td>Game: 1.25 u/s and the sway. The stride is mine, 0.7 s.</td></tr>
      <tr><td>Turn left, turn right</td><td>Stomps round on the spot, the head leading.</td><td>Mine: 135° a second (the game turns it at once).</td></tr>
      <tr><td>Slam</td><td>The game's slam. Through the Ember ring it rears, leaning back with both fists rising beside its head, the seams straining brighter, and holds there trembling. On the ring's last tick it brings both fists down hard, bent in, and the floor bursts: 14, a gold splash of molten slag, dark chunks and the slag pool. The crust cracks: its chest flares white-gold and stays open for 2 s, cooling back over the last half second, and it straightens slowly.</td><td>Game: the ring 56 ticks; the fists down in 0.1 s; the straighten 0.6 s; the core open 120 ticks, knitting over the last 30.</td></tr>
      <tr><td>Hurt</td><td>A short stiff jolt of the shoulders and head; the crust shrugs it off. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in hunched low, heaves itself up and sets its fists down, the seams lighting.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it rocks back with its seams flaring; its knees give, it sinks, and it topples forward onto its face, the seams going dark, raising dust and chunks where it lands.</td><td>Mine: 2.3 s, then it stays down. The game crumbles it where it stands.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Feet sliding while planted</td><td>SLIDE_MM</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>Up to WALK_MM mm on the walk and turns (a toe tip); up to SLAM_MM mm in the slam; up to DEAD_MM mm in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the plod, the slam and the topple are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The core shows in its chest.</strong> The game's golem keeps its core in a crater in its back under five crust plates that are thrown back by the slam. Yours has its brightest seams across its chest and no plates, so the open core is the chest seams flaring white-gold for the 2 s, then cooling.</li>
        <li><strong>The fists rise beside its head, not overhead.</strong> The game rears with both fists overhead. Your arms are carved into huge shoulder boulders, and lifting them higher tears the shoulders, so the fists come up beside its head.</li>
        <li><strong>Upright, not a hunched heap.</strong> The game's golem is a low hunched heap on stubby legs. Yours stands tall, so I keep only a slight hunch.</li>
        <li><strong>No indigo shard.</strong> The game's golem has an indigo shard in its back as its tell; yours has a rake and bricks there instead. Say if you want a shard added on the page.</li>
        <li><strong>Mine.</strong> The shoulder roll in the idle, the stride, the turn rate, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The armpits and the undersides of the arms stretch when the fists go up, because the arms are carved into the shoulders.</li>
        <li>The rake and bricks are fixed to its back; the rake does not rattle.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember ring, the gold streaks of the fists coming down, the splash of molten slag, the chunks and smoke, the slag pool cooling from gold to dark, the slow on the hero, the core's flare and the heat drawn in with a puff of steam as the crust knits, the step dust, and the death's dust and chunks. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
