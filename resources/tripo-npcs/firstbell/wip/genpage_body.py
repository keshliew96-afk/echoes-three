rep('<title>Tripo Gloam Wolf Review</title>', '<title>Tripo First Bell Review</title>')
BODY = r'''<div class="wrap">
  <div>
    <h1>The First Bell, the Wandering Spirit, from Tripo, rigged <span style="font-weight:400;opacity:.6">· version 1</span></h1>
    <p class="lede">The Wandering Spirit: your export, with a skeleton and the game's float and swirl added by hand. A ghost mouse in pale blue with big round ears and a kind face, a hooded cape with a vine border over a robe, both hands clasped round a small bell, a satchel with a cross at the hip, a long curling tail, and the robe fading into a wisp instead of feet. The First Bell never walks, fights or talks; the spirit floats, bobs and turns, see-through, and when the party gives up its newest relic it swirls up and fades. Press a move to watch it; the numbers under the page come from the model file.</p>
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
        <p class="rule">Idle is what the spirit does while the party walks up. The trade plays what happens when the party gives up its newest relic: the swirl, the fade and the embers. It repeats until you press it again, with a short pause between. The hero stand-in waits 1.6 u in front, where the party stands to trade.</p>
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
      <img src="firstbell-views.png" alt="The Tripo First Bell from the front, its left side, the back and from above, before rigging" width="800" height="800">
      <p class="note" style="padding-top:12px">It came through as one piece, all in one pale blue: a mouse with big round ears, large soft eyes, whiskers and a tuft of hair, a hooded cape with a vine pattern round its edge over a long robe with a sash and a bow at the back, both hands clasped at the chest round a small bell, a satchel with a cross on it at the right hip, a long thin tail curling up behind, and below the robe a ghostly wisp that ends in a point.</p>
    </section>
  </div>

  <dl class="facts">
    <div><dt>Triangles</dt><dd>NTRI <small>about the hero budget (15,000); the game sets no NPC budget yet</small></dd></div>
    <div><dt>Bones</dt><dd>5 <small>a root on the floor, the hips (the whole spirit rides it, as the game moves it as one shape), the head, and two spare ear bones that do nothing yet (the kit needs five bones)</small></dd></div>
    <div><dt>Texture</dt><dd>1 × 2K <small>colour only</small></dd></div>
    <div><dt>File</dt><dd>NMB MB <small>one GLB with both moves at 60 frames a second</small></dd></div>
    <div><dt>Size on this page</dt><dd>1.1 u tall <small>the game's spirit, to the tips of the ears, floating 0.25 u off the floor; its head level with the 1 u hero's</small></dd></div>
    <div><dt>In the game</dt><dd>The First Bell <small>A room event, the Wandering Spirit: the Healer who carried the bell before you, a pale shape that trades in old things. Give up your newest relic and choose one of three rare or legendary relics.</small></dd></div>
  </dl>

  <h2>The moves, and where their timing comes from</h2>
  <div class="audit"><table>
    <thead><tr><th>Move</th><th>What it does</th><th>Timing</th></tr></thead>
    <tbody>
      <tr><td>Idle</td><td>The game's idle: the spirit floats off the floor, bobbing up and down and turning a little side to side; its skin is see-through and breathes, and a pale glow sits at its heart.</td><td>Game: floating 0.25 u up, the bob 0.12 u on 1.6 rad a second, the turn 0.2 rad on 0.7 rad a second; the skin's opacity 0.5 + 0.08 on 2.3 rad a second. The loop is 27 s, seven bobs and three turns, both rounded to fit.</td></tr>
      <tr><td>The trade</td><td>The game's swirl when the party gives up its newest relic: the spirit rises, spinning, and fades to a quarter; twenty pale embers rise from the floor round it. It stays up there, faded, the bob and turn carrying on.</td><td>Game: over 0.9 s it rises 0.6 u, spins 9 rad (about one and a half turns) at an even rate and fades to 25%; the embers from 0.1 to 0.6 u round it, rising 1.2 to 2.6 u a second for 0.6 to 1.1 s. The clip is 2.5 s.</td></tr>
    </tbody></table></div>

  <h2>Measured before sending</h2>
  <div class="audit"><table>
    <thead><tr><th>What was measured, on every frame of every move</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Loops that jump when they restart (idle)</td><td>POP_DEG</td></tr>
      <tr><td>Anything into the floor</td><td>None: the lowest point, the tip of the wisp, stays 0.13 u or more off the floor.</td></tr>
    </tbody></table></div>
  <p class="note">These numbers come from the model file. I checked the poses as still frames only: the cloud machine cannot play the page at full speed, so the float, the swirl and the fade are yours to judge.</p>

  <div class="cols">
    <div>
      <h2>Open choices</h2>
      <ul>
        <li><strong>It moves as one shape, as in the game.</strong> The ears, the tail, the bell and the wisp do not move on their own. If you want the wisp to trail, the tail to curl or the bell to ring on the swirl, say so; that would be new motion.</li>
        <li><strong>See-through.</strong> I kept the game's opacity, so on this light page floor the spirit reads faint; on the game's darker floors it reads stronger.</li>
        <li><strong>The colour.</strong> The game tints its spirit Spirit Pale #A8D2DC; yours is your own pale blue texture, close to it, and I left it as you made it.</li>
        <li><strong>The event's frame and its burst</strong> (the ring the game draws round every room event) are not on this page; only the spirit's own embers are.</li>
      </ul>
    </div>
    <div>
      <h2 class="rough">What is rough</h2>
      <ul>
        <li>Where the arms, the bell and the satchel cross in front of the body, the see-through skin shows only the front-most surface, so the overlaps read as one pale shape.</li>
        <li>The spin at 1.4 turns a second is fast; on a slow machine it can look like it jumps.</li>
        <li>No ink outline and no flat game colours yet, the same as the hero models.</li>
      </ul>
    </div>
  </div>
</div>

'''
