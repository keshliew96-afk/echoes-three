rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Bramble Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Bramble, the Peddler, from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The camp's shop: your export, with a skeleton and the game's idle and talk added by hand. An old sage-green tortoise on four stubby legs with a red scarf knotted at her neck, carrying her whole shop on her shell: a wooden frame under a striped cream and slate awning, shelves of jars, sacks and a basket, bunches of herbs and an iron lantern hanging off the awning's front corner. Bramble never walks or fights; she breathes, reaches her neck out and peeks about, blinks, her lantern and herbs sway, and she talks when you walk up. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle is what it does while nobody talks to it. Talk plays one line of the game's talking, eased in and out, and repeats until you press it again, with a short pause between lines. The hero stand-in waits 1.9 u in front, where a player stands to shop.</p>
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
      <img src="bramble-views.png" alt="The Tripo Bramble from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a sage-green tortoise with a calm old face, a domed brown shell with buckled straps, a red scarf knotted at the neck, four thick legs, and on the shell a wooden stall: a striped cream and slate awning on four posts, shelves of jars and pots, sacks and a wicker basket, two hanging bunches of herbs and a little iron lantern with a warm glass hung off the front corner.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>about the hero budget (15,000); the game sets no NPC budget yet</small></dd></div>
    <div><dt>Bones</dt><dd>10 <small>a root (the feet), the hips (the shell and the whole shop), the neck and head, the jaw, an eye each side (squashed shut for a blink), the lantern, and the two herb bunches</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with both moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.25 u tall <small>the game's Bramble, to the top of her awning; her head at the 1 u hero's knee</small></dd></div>
    <div><dt>In the game</dt><dd>Bramble, the Peddler <small>An old tortoise who keeps the camp's shop on her back. Her bubble shows when a player walks up, and she is solid: players walk round her. She never moves from her spot.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's idle: a slow breath the shell swells with; the neck slowly reaching out and drawing back in, and now and then a peek further out, the head turning to one side and tipping its chin up; blinks; the lantern and the herb bunches swaying. The game rolls its peeks and blinks; the page fixes four peeks (two to each side) and eight blinks in one loop.</td><td>Game: breath 1 rad a second; the neck 0.8 rad a second; a peek every 5 to 9 s, eased over 0.5 s and held 2.8 s, 0.3 rad to the side; a blink every 3 to 6 s, 0.2 s; the lantern swaying 0.16 rad. The loop is 31 s so every wave closes; the lantern's sway is rounded to fit.</td></tr>
      <tr><td>Talk</td><td>The game's talking: the jaw works and the head nods, eased in and out, the breath and the neck carrying on under it.</td><td>Game: eased at 8 a second; the jaw 0.4 rad on an 11 rad/s beat; the nod on 6 rad/s. One line is 6.3 s (mine).</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>None: the feet stay where they stand.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the breathing, the peeks and the talking are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The blink squashes the eye.</strong> The game hides a painted face for a blink; yours has painted eyes, so a blink squashes each eye shut.</li>
        <li><strong>The game tips her chin up at rest</strong> to show her face to the camera. Yours holds your pose. Say if you want the tilt.</li>
        <li><strong>The jars and pots stay still.</strong> The game swings its hanging pots; on yours the wares sit on shelves, so only the herb bunches and the lantern swing.</li>
        <li><strong>Mine.</strong> The length of one line of talk, and where the peeks and blinks fall in the loop.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The neck slides out of the shell by stretching the skin between the head and the shell; the scarf stretches with it.</li>
        <li>The jaw opens only a little, as the mouth is one surface with the face.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
      </ul>
    </div>
  </div>
</div>

'''
