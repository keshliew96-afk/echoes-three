rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo Sedge Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>Sedge, the Lost Pilgrim, from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Lost Pilgrim: your export, with a skeleton and the game's idle and bow added by hand. A small hooded traveller in a ragged brown cloak and cape over a pale robe, the face lost in the hood's shadow, a rope belt with a gourd and a pouch, wrapped hands and shins and rope sandals, leaning on a tall crooked staff with a little lantern hanging off its hook. Sedge never walks, fights or talks; the pilgrim sways, the lantern flickers, and when the party gives 20 Glint the pilgrim bows. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle is what the pilgrim does while the party walks up. The gift plays what happens when the party gives the 20 Glint: the bow and the embers. It repeats until you press it again, with a short pause between. The hero stand-in waits 1.7 u in front, where the party stands to give.</p>
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
      <img src="sedge-views.png" alt="The Tripo Sedge from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece: a small figure in a deep pointed hood with no face showing, a ragged brown cape over a long torn cloak and a pale under-robe, a rope tied at the throat and a rope belt with tassels, a round gourd and a leather pouch, wrapped forearms and shins, rope sandals, the right hand on a tall crooked wooden staff whose hooked top holds a small iron lantern with an amber glass, the left hand hanging empty.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>about the hero budget (15,000); the game sets no NPC budget yet</small></dd></div>
    <div><dt>Bones</dt><dd>7 <small>a root (the feet and the hem), the hips, spine, chest and head (the hood), the staff (it turns about its foot on the floor, and the right hand rides it), and the lantern</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with both moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.5 u tall <small>the game's Sedge, to the top of the staff; the hood's peak at 1.36 u, a little over the 1 u hero</small></dd></div>
    <div><dt>In the game</dt><dd>Sedge, the Lost Pilgrim <small>A room event: a traveller with a lantern and a story, short of coin. Give the pilgrim 20 Glint and they teach the party a Skill draft for every hero. The pilgrim stands in one spot.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's idle: a slow sway side to side, the staff leaning with it and the lantern hanging true and swinging a touch behind; the lantern's glass flickering.</td><td>Game: the sway 0.03 rad on 1.1 rad a second (one loop, 5.7 s); the flicker on 5.3 and 13 rad a second.</td></tr>
      <tr><td>The gift</td><td>The game's thank-you when the party gives 20 Glint: a bow, down and back up, the staff leaning forward with the hand and the lantern trailing a little; fourteen Hearth Amber embers rise from the floor on the lantern side. Then the sway carries on.</td><td>Game: the bow 0.35 rad, sin(&pi; &times; bow) as bow runs down from 1 at 0.9 a second, so 1.1 s, deepest at 0.56 s; the embers from the floor 0.1 to 0.4 u round the lantern side, rising 0.9 to 2 u a second for 0.6 to 1.1 s. The clip is 2.5 s.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>None: the feet stay where they stand.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the sway, the bow and the embers are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>The bow bends at the waist.</strong> The game tips the whole figure from the floor, feet and all. On yours the feet stay planted and the bow is shared from the hips up to the hood, the same 0.35 rad at the top.</li>
        <li><strong>The staff leans with the hand</strong> and the lantern keeps hanging straight down. The game tips the staff and lantern rigidly with the body.</li>
        <li><strong>The event's frame and its burst</strong> (the ring the game draws round every room event) are not on this page; only the pilgrim's own embers are.</li>
        <li><strong>Mine.</strong> The lantern's small swing behind the sway, and its trail on the bow.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>The left hand and the cloak are one piece with the body, so they bend with the bow and do not swing.</li>
        <li>The right sleeve stretches a little between the shoulder and the hand on the staff.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
      </ul>
    </div>
  </div>
</div>

'''
