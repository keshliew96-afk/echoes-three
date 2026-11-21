rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Wick Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Wick, the Hearth-Keeper, from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The camp's keeper: your export, with a skeleton and the game's idle and talk added by hand. An old round owl in brown feathers with a cream face and belly, big dark eyes behind round brass spectacles, ear tufts, a teal knitted shawl with a brass hearth brooch and two tassels, folded wings and small grey feet. Wick never walks or fights; it breathes, looks about, blinks, ruffles its wings, and talks when you walk up. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle is what it does while nobody talks to it. Talk plays one line of the game's talking, eased in and out, and repeats until you press it again, with a short pause between lines. The hero stand-in waits 1.6 u in front, where a player stands to talk.</p>
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
      <img src="wick-views.png" alt="The Tripo Wick from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a round owl with layered brown feathers, a cream heart-shaped face and a cream belly, big dark eyes behind thin round brass spectacles, a small hooked beak, two ear tufts, a teal cable-knit shawl round its shoulders with a brass brooch and two teal tassels, folded wings at its sides and small grey clawed feet.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>about the hero budget (15,000); the game sets no NPC budget yet</small></dd></div>
    <div><dt>Bones</dt><dd>12 <small>a root (the feet), the hips, chest (the shawl rides it), neck and head, the beak, an eye each side (squashed shut for a blink, inside the spectacle rims), an ear tuft and a wing each side</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with both moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.25 u tall <small>the game's Wick, to the tips of its tufts; a head taller than the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Wick, the Hearth-Keeper <small>An old owl perched on the camp's woodpile. It speaks the Hearth Song's story pages and its bubble shows when a player walks up. It never moves from its perch.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's idle: a slow breath the body swells with; looks to the side, the neck turning and the head tilting against it, every third one the owl's big swivel; slow blinks, sometimes doubled; and a wing ruffle, the wings shrugging out in a flutter, the tufts flattening. The game rolls when each comes; the page fixes them in one loop: a small look to its left, the big swivel to its right, three blinks (one doubled), one ruffle.</td><td>Game: breath 1.25 rad a second; a look every 4.5 to 8.5 s, eased over 0.45 s and held 2.6 s, 0.45 rad (the swivel 0.95); a blink every 2.8 to 5.5 s, 0.32 s; a ruffle every 9 to 15 s, 0.9 s. The loop is two breaths, 10 s.</td></tr>
      <tr><td>Talk</td><td>The game's talking: the beak chatters and the head bobs, eased in and out, the breath carrying on under it.</td><td>Game: eased at 8 a second; the beak 0.45 rad on a 13 rad/s beat; the head bobbing on 7 and 9 rad/s. One line is 6.3 s (mine).</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>None: the feet stay where they stand.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the breathing, the looks and the talking are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>It stands on the floor here.</strong> The game perches Wick on the camp's woodpile. The page stands it on the floor so you can see its feet; in the game it sits on the logs as now.</li>
        <li><strong>The blink squashes the eye.</strong> The game's owl has eyelids; yours has painted eyes, so a blink squashes each eye shut inside its spectacle rim.</li>
        <li><strong>The game tips its head up a little at rest</strong>, as it looks down from the woodpile. Yours holds your pose. Say if you want the tilt.</li>
        <li><strong>Mine.</strong> The length of one line of talk, and where the looks, blinks and ruffle fall in the loop.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The beak is one piece, so the chatter swings the whole beak down a little rather than opening it.</li>
        <li>The spectacles turn with the head; at the big swivel the bridge crosses one eye from the front, as real spectacles would.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
      </ul>
    </div>
  </div>
</div>

'''
