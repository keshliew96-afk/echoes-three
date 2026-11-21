rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Vane Cock Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Vane Cock from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Bell Spire's volley: your export, with a skeleton and eight moves added by hand. A rooster of riveted brass plates gone green with verdigris: a red copper comb and wattles, glowing yellow eyes, a tall fan of tail plates, plate wings, thin jointed brass legs with clawed feet, and a stub of its rusted iron spindle under its belly. It hops about at a distance, swings round into the wind, marks a lane through you and fires three gust darts down it. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between actions, and Going turns it on the spot. Volley plays the game's volley at the hero stand-in 5.5 u in front, inside the band it keeps. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="vane-views.png" alt="The Tripo Vane Cock from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a rooster built of riveted brass plates with green verdigris on them, a red copper comb and wattles, glowing yellow eyes, a tall fan of tail plates, plate wings at its sides, thin jointed brass legs with four clawed toes, and a short stub of rusted iron spindle under its belly that stops above the floor.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>18 <small>a root, the hips, chest, neck and head, two bones up the tail fan, a wing each side, the spindle stub, and four bones down each leg (the thigh inside the body, the shin, the foot and the toes) so the feet stay planted</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.0 u tall <small>its comb level with the 1 u hero's head</small></dd></div>
    <div><dt>In the game</dt><dd>Vane Cock <small>24 health, 1.5 u/s. It keeps 4.0 to 7.0 u from its target, sidestepping inside that band. With a clear line it swings round into the wind and marks the Ember lane, 0.9 u wide, from itself through the target and up to 8 u long, for 48 ticks; then three gust darts fly down that locked line one every 9 ticks, 7 each, at 6.2 u/s out to 8.5 u. Step out of the lane and all three miss. A stun in the wind-up cancels the volley. Cooldown 230 ticks from the last dart. The Bell Spire.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's restless hop at rest, a small one. On top: it looks about, the tail fan shifting, a ruffle of the wing plates.</td><td>Game: one small hop every 2.85 s (1/0.35 s), 0.06 u. The look and the ruffle are mine.</td></tr>
      <tr><td>Walk</td><td>The game's travel is a hop: both feet push off together and land together, in the air for 55% of each hop, a squash on landing, the wings lifting and the tail dipping in the air, rocking side to side from hop to hop.</td><td>Game: 1.5 u/s, a hop every 0.42 s (2.4 a second), 0.26 u up on the game's taller model, 0.16 on yours.</td></tr>
      <tr><td>Turn left, turn right</td><td>Small hops round on the spot.</td><td>Mine: 90° a second (the game turns it at once).</td></tr>
      <tr><td>Volley</td><td>The game's aim: it swings a full turn round into the wind in 0.5 s, overshoots and settles shivering on the line, leaned back, stretched up, the eyes swelling, while the Ember lane fills out to the hero and beyond. On your bird the turn is a hop-spin that lands on the line, wings half open and the tail fanned. Then three darts down the locked line, one every 9 ticks: each jerks it back, the head thrusting out with the dart, a gust flash at the beak. Each dart reaches the hero 0.81 s after it leaves. Then it settles.</td><td>Game: the lane 48 ticks; the turn 0.5 s; the darts 9 ticks apart at 6.2 u/s; each jerk 0.3 rad back and 0.08 u. The settle is mine.</td></tr>
      <tr><td>Hurt</td><td>A flinch: the head snaps back, the wings flare, the tail flicks. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in, then shakes its plates down and stretches up.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it jerks back with its wings flung open, then topples over onto its right side with a clank, the legs sticking out stiff.</td><td>Mine: 1.8 s, then it stays down. The game pops it where it stands.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Planted feet that slide</td><td>SLIDE_MM</td></tr>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>Up to WALK_MM mm on the walk and turns (the bottom of the thighs as it lands); up to SLAM_MM mm in the volley (a toe as it lands from the spin); up to DEAD_MM mm in the death.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the hops, the spin and the fall are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>It hops on its own feet.</strong> The game's Vane Cock is a weathercock on its spindle with a compass, and the whole thing hops on the spindle. Yours stands on two legs with a short spindle stub under it, so it hops on its feet at the game's beat, and the stub swings under it. Say if you want it standing on a full spindle instead.</li>
        <li><strong>The eyes stay yellow.</strong> The game's tell is an indigo eye. Yours glow yellow, so I kept that and swell it through the aim. Say if you want them indigo.</li>
        <li><strong>The turn into the wind is a hop-spin.</strong> The game spins the bird on its pivot; yours has feet, so it hops and spins in the air.</li>
        <li><strong>Mine.</strong> The look and the ruffle in the idle, the turn rate, the settle after the volley, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The plates are fixed to the bones; they do not slide over each other when it ruffles.</li>
        <li>In the air during a hop the feet hang a little short of where they should tuck.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember lane, the gust flash at the beak, the darts and the wind streaks beside them. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
