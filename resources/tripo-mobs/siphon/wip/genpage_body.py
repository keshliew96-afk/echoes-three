rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Vein Siphon Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Vein Siphon from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Kiln's leech: your export, with a skeleton and nine moves added by hand. A violet sac veined with brighter violet, warts on its crown, standing on six thin tendrils with soft pads. It hangs back from the hero, coils, and whips a tendril down an Ember lane. If it hits, it latches on and drinks: 2 from the hero every half second, healing itself as much, until it is full, the hero breaks away, or it is stunned. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle or Walk sets what it does between actions, and Going turns it on the spot. Tendril lash plays three lashes from the game's three coils: the hero stand-in takes the first and third and steps out of the lane for the second, which misses. Drink plays a lash that lands and latches, six drinks, and the let go. An action repeats until you press it again. Hurt plays on top of anything. Death drops it: press it again and it spawns back. The bar names the part of the move that is playing, in the game's own words where it has them.</p>
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
      <img src="siphon-views.png" alt="The Tripo Vein Siphon from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a round violet sac with paler violet veins painted over it, a cluster of warts on its crown, two small dents for eyes low on its front, and six thin tendrils under it, one in front, two at each side and one behind, each ending in a soft pink pad on the floor. It has no mouth.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>foe budget 4,000</small></dd></div>
    <div><dt>Bones</dt><dd>28 <small>a root, the hips under the sac, the sac (it swells and squeezes), the crown with its warts, and four bones down each of the six tendrils</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with all the moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.6 u tall <small>a head and a half over the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Vein Siphon <small>20 health, 1.9 u/s, a flier. It keeps 2.8 to 4.4 u from its target and lashes from within 4.8 u: an Ember lane 0.7 wide and up to 5.4 u long (through the hero and 1 u past) for 54 ticks, then the whip, 5 damage to the first hero in it. A hit latches: it drinks 2 every 30 ticks for 180 ticks and heals as much. It lets go past 5.6 u, when it is stunned, or when the hero falls. Cooldown 300 ticks. The Kiln.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's hover: the sac bobs slowly and breathes, swelling and squeezing, and the tendrils sway and curl under it, the pads just off the floor. The veins pulse dimly.</td><td>Game: the bob and the breath. A 6.6 s loop, two bobs.</td></tr>
      <tr><td>Walk</td><td>Glides along leaning into the way it goes, the tendrils trailing behind and paddling.</td><td>Game: 1.9 u/s and the lean. The paddle is mine.</td></tr>
      <tr><td>Turn left, turn right</td><td>Swings round on the spot, banking, the tendrils swinging wide.</td><td>Mine: 270° a second (the game turns it at once).</td></tr>
      <tr><td>Tendril lash</td><td>The game's lash, its three coils one after another. Through the Ember lane it draws back and up, the sac swelling, the tendrils coiled under it and the veins brightening. At the lane's end it lunges down the lane and whips the front tendrils out, holds, snaps them back and settles. The first coils from its left, the second from its right, the third rears straight up and plunges.</td><td>Game: the lane 54 ticks; the whip over 2.5 frames, held 3, snapped back 3, settled 9.</td></tr>
      <tr><td>Drink</td><td>A plunge that lands and latches: it leans in toward the hero with its front tendrils reaching out, and the sac gulps, squeezing on every drink as a violet bead runs up the tether. Full, it lets go and floats back into its hover.</td><td>Game: a drink every 30 ticks, six of them over 180 ticks; the let go 0.4 s.</td></tr>
      <tr><td>Hurt</td><td>The sac squashes and jolts back, the tendrils flinching. Plays on top of any move.</td><td>0.4 s</td></tr>
      <tr><td>Spawn</td><td>Grows in balled up, then the tendrils unfurl to the floor as the veins light, and it rises into the hover.</td><td>Game: grow in 7 frames, about 10% over. The rest is mine.</td></tr>
      <tr><td>Death</td><td>Struck, it shudders and the veins flare, then it sags, the tendrils going limp, drops, and slaps flat on the floor with the tendrils splayed round it.</td><td>Mine: 2.2 s, then it stays down. The game bursts the sac in violet drops and leaves a splash mark.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle, walk, both turns)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>None. The pads stay at least WALK_CM cm up through the hover, walk, turns, lash and drink, and in the death it lies flat on the floor without sinking into it.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the hover, the lash and the gulps are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>Six tendrils, not four.</strong> The game's siphon hangs on four tendrils. Yours has six, so all six are rigged and move; the front pair does the whipping.</li>
        <li><strong>It hovers on its pads.</strong> The game's siphon is a flier with its tendrils dangling. Yours stands on pads, so I hold the pads a few centimetres off the floor and let them curl and paddle, which reads as floating rather than walking.</li>
        <li><strong>No mouth.</strong> The game's sac opens a mouth to drink. Yours has none, so the drink shows as the sac gulping and squeezing and the bead running up the tether.</li>
        <li><strong>The eyes are lit by the page.</strong> Your eyes are two dents, not painted; I light them a dim pale violet so it has a face to read, and they go out when it dies.</li>
        <li><strong>Mine.</strong> The paddle in the walk, the turn rate, the hurt, the spawn after the grow-in, and the death.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The tendrils are thin and bend on four bones each, so a tight curl shows corners.</li>
        <li>The warts move with the crown as one piece; they do not jiggle on their own.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
        <li>The effects are stand-ins drawn for this page, after the game's own: the Ember lane, the violet whip, the latch burst and tether, the violet beads and rings of each drink with the Ember flash on the hero, the let go's violet sparks, the veins brightening as its tell, and the death's violet drops and dark stain. The heal is violet, as in the game, not green. They are kept dim on purpose.</li>
      </ul>
    </div>
  </div>
</div>

'''
