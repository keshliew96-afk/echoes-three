rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Quill Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Quill, the Chronicler, from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The camp's chronicler: your export, with a skeleton and the game's idle and talk added by hand. A magpie standing tall on thin dark legs, black head and back, a white belly and white shoulder patches, blue-green folded wings and a long green tail, with a brown satchel on a strap holding a scroll and a quill, and a little ink bottle. Quill never walks or fights; she breathes, snaps her head from tilt to tilt, flicks her tail, hops in place, and talks when you walk up. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle is what it does while nobody talks to it. Talk plays one line of the game's talking, eased in and out, and repeats until you press it again, with a short pause between lines. The hero stand-in waits 1.3 u in front, where a player stands to talk.</p>
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
      <img src="quill-views.png" alt="The Tripo Quill from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a magpie with a black head, a straight grey beak and brown eyes, a black throat and back, a white belly and white shoulder patches, blue-green folded wings, a long green tail reaching down behind her to the floor, feathered thighs on thin dark scaled legs and clawed feet, a brown leather satchel on her right hip on a strap over her left shoulder with a rolled scroll and a white quill in it, and a small ink bottle hanging off the strap. Tripo also gave her a second small pouch with a quill on her left hip, which the sheet did not have; it rides the body as it is.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>about the hero budget (15,000); the game sets no NPC budget yet</small></dd></div>
    <div><dt>Bones</dt><dd>19 <small>a root, the hips, the body (the page squashes it for the hop and the breath, so the legs are not squashed with it), chest, neck and head, the lower beak, the tail on two bones, a wing each side, and each leg as thigh, shin, foot and toes so the feet stay planted when she crouches</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with both moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>0.55 u tall <small>the game's Quill, to the top of her head; about half the 1 u hero's height</small></dd></div>
    <div><dt>In the game</dt><dd>Quill, the Chronicler <small>A magpie on the camp's map table who inks each land you clear onto the map and keeps the Journal. Her bubble shows when a player walks up. She never leaves the table.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's idle: a quick breath the body swells with; head tilts that snap to a new tilt and turn and hold, as birds cut between poses rather than drift; a tail flick, a quick up-pump; and a hop in place: a crouch, a little arc with the wings flaring, and a landing squash. The game rolls when each comes; the page fixes twelve tilts, six flicks and three hops in one loop.</td><td>Game: breath 2.2 rad a second; a tilt every 0.9 to 2.6 s, snapping at 28 a second, up to 0.45 rad of tilt and 0.5 rad of turn; a flick every 2 to 4.5 s, 0.28 s; a hop every 5 to 10 s: 0.12 s crouch, 0.3 s arc 0.07 u high, 0.12 s landing. The loop is 20 s, seven breaths, the breath rounded to fit.</td></tr>
      <tr><td>Talk</td><td>The game's talking: the beak chatters and the head nods, eased in and out; the tilts, the breath and a tail flick carry on under it.</td><td>Game: eased at 8 a second; the beak 0.5 rad on a 16 rad/s beat; the nod 0.12 rad on 10 rad/s. One line is 6.3 s (mine).</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>None: the feet stay where they stand.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the tilts, the hop and the talking are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>She stands on the floor here.</strong> The game stands Quill on the map table. The page puts her on the floor so you can see her feet; in the game she stays on the table as now.</li>
        <li><strong>Her height.</strong> I kept the game's 0.55 u. Yours is a tall long-legged bird where the game's is a small round one, so at that height her head sits lower than the game's. Say if she should be taller.</li>
        <li><strong>No blinks.</strong> The game's magpie does not blink, so yours does not either. Say if you want blinks.</li>
        <li><strong>The game tips her chin up a little at rest.</strong> Yours holds your pose. Say if you want the tilt.</li>
        <li><strong>The second pouch.</strong> Tripo added a small pouch with a quill on her left hip. I left it on. Say if it should go.</li>
        <li><strong>Mine.</strong> The length of one line of talk, and where the tilts, flicks and hops fall in the loop.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The beak is thin and has few points, so the lower half opens as a small wedge rather than a clean bill.</li>
        <li>The satchel, scroll and ink bottle ride the body rigidly; they do not swing on the hop.</li>
        <li>Her tail tip rests on the floor as in your export; it lifts with the flick and the hop.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
      </ul>
    </div>
  </div>
</div>

'''
