rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Corrupted Altar Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>The Corrupted Altar, from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Hollow Voice's altar: your export, with the crystal cut free and the game's floating shard and its curse added by hand. A grey stone altar, a thick carved slab with an eye in its front on two carved legs, cracked and wound with violet veins, violet shards at its feet, two melted candles and a cracked bowl on top, and a violet crystal cluster. The altar never moves; the crystal floats above it, turning and glowing, and when the party takes the curse it cracks and shrinks. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle is what the altar does while the party walks up. The curse plays what happens when the party takes the curse: the shard cracks and the violet burst goes up. It repeats until you press it again, with a short pause between. The hero stand-in waits 1.8 u in front, where the party stands at the altar.</p>
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
      <img src="altar-views.png" alt="The Tripo Corrupted Altar from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a grey stone slab with bevelled ends, an eye and scrollwork carved in its front, on two carved legs with rubble at their feet; cracks across the top; violet veins running from the crystal over the slab and down the legs, with small violet shards at the feet; two melted white candles and a cracked stone bowl on top; and in the middle a violet crystal cluster, one tall shard with smaller ones round it. I cut the crystal free of the slab and closed the small hole under it in stone grey.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>well under the foe budget (4,000); the game sets no budget for room events yet</small></dd></div>
    <div><dt>Bones</dt><dd>5 <small>a root on the floor, the hips (the stone, which stays still), the crystal (it floats, turns and shrinks from its middle), and two spare candle bones that do nothing yet (the kit needs five bones)</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with both moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.25 u wide <small>the game's altar, with its slab top at 0.63 u, near the 1 u hero's waist; the crystal floats with its middle at 1.35 u as the game's shard does</small></dd></div>
    <div><dt>In the game</dt><dd>Corrupted Altar <small>A room event where the Hollow Voice speaks: violet light pulses in the stone and it offers power for a price. Take a major curse for the rest of the run and choose one of three legendary relics.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's idle: the crystal floats above the altar, bobbing and turning steadily, its violet glow pulsing with a halo round it; the veins on the stone glow steady.</td><td>Game: the shard's middle at 1.35 u, the bob 0.1 u on 1.4 rad a second, the turn 0.9 rad a second; the glow 0.45 + 0.3 &times; max(0, sin 3.2t). The loop is 14 s, two turns and three bobs, the bob rounded to fit.</td></tr>
      <tr><td>The curse</td><td>The game's crack when the party takes the curse: the crystal shrinks to 40% and its glow falls away, and a violet burst goes up, embers rising from the floor round the altar and a spray of sparks. It floats on, cracked and dim.</td><td>Game: the shrink and the dimming over 0.5 s (the glow by 70%, the halo by 60%); 22 embers from 0.1 to 0.7 u round it, rising 1.3 to 2.9 u a second for 0.6 to 1.1 s; 12 sparks at 1 to 2.2 u a second for 0.2 to 0.3 s. The clip is 2.5 s.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>None: the altar stands on the floor and the crystal floats well above it.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the float, the crack and the glow are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The crystal floats, as the game's shard does.</strong> On yours the veins run into the crystal's foot, so lifting it leaves them meeting at nothing. If it should stay seated on the slab, pulsing and glowing but not floating or turning, say so; that is a small change.</li>
        <li><strong>The crack is a shrink,</strong> as in the game. The crystal does not break into pieces.</li>
        <li><strong>The candles are not lit.</strong> The game's altar has no candles; yours are left as they are, unlit.</li>
        <li><strong>The event's frame and its burst</strong> (the ring the game draws round every room event) are not on this page; only the altar's own violet burst is.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The cap under the crystal is flat and plain violet; it shows only from below.</li>
        <li>The model is light, 3,745 triangles after the cut, so the crystal's facets are big.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
      </ul>
    </div>
  </div>
</div>

'''
