# Boss review standard

The hero standard (`/mnt/project-files/tripo-pilot/CHARACTER_REVIEW_STANDARD.md`) adapted for bosses.
Written 2026-11-13 with the first boss, the Hollow Stag. Kesh passed the Stag at Version 2 on 2026-11-13
("the stag mark pass"), so this is the bar for the bosses after it; his later changes go back into this file.

Reference page (the Stag): https://claude.ai/artifact/3DH2KR687LVWWp3RGb21PN
Tools: `/mnt/project-files/tripo-bosses/boss-kit/`. The Stag's own files: `tripo-bosses/stag/wip/`.

The game on `gauntlet` stays untouched (feature freeze). A review page is not a game change. Putting a
reviewed boss into the game needs Kesh's go.

## 1. What Kesh sends

One GLB per boss from Tripo Studio with the hero settings, except the face limit: about 28,000
(boss budget 30,000 triangles / 120 meshes, repo `docs/MODEL_STANDARD.md` "Tiers and budgets").
The views are in `tripo-bosses/<boss>/`. A part that leaves the body in a move (the Mire King's tongue,
a thrown thing) is its own piece: Kesh sends it, or we build it.

## 2. Model checks before rigging

- Triangles within 30,000. Do not trim a model that is inside the budget.
- One texture, height 1, feet on y = 0, faces +z.
- Count the pieces (`rig.py` prints them). Floating pieces are fine when they are meant (the Stag's crown
  star) and get their own joint.
- The parts that make the boss read are whole: antlers and tines, tusks, beak, thin legs, tail. Legs separate.
- Render four views (`view.html`) and look. If a part is broken, say so and ask for a new export before rigging.
- The head faces straight ahead. Measure it (fit the head's mirror plane; the Stag's head came 13 degrees to
  his left) and turn it back in the rig's base pose (`CFG.base`). Kesh's ruling on the Stag, 2026-11-13.
- Note anything else the model does that the sheet does not, and leave it unless Kesh asks.

## 3. Rig

- Identity bind rotations. Joints are placed from side and front plots of the mesh (`rig.py` draws
  `rig_overlay.png`; look at it before going on).
- A four-legged boss: root, hips, spine, chest, neck (1 or 2), head, ears, tail (2 or more), and four bones
  in each leg. Front: shoulder, elbow, knee, fetlock. Hind: hip, stifle, hock, fetlock. Add a joint for each
  floating or swinging part. The Stag has 28.
- A boss on two legs, a wheel or a snake gets the joints its body needs. Say which in the reply.
- Weights by diffusion from each bone with region masks. Horns, antlers, tusks and the skull are rigid on the
  head. Hooves are rigid under the fetlock.
- A vertex attribute `_MASK` marks what glows (the Stag: antlers, crystals, star), so the page can light it.

## 4. Locked feet

The game's bosses walk on locked feet (`render/facet/gait.js`): a planted foot never slides. The models keep it.

- Every move is written as body channels plus a target for each foot. `quad.mjs` solves each leg so the foot
  lands on its target. A foot marked `lock` must not move.
- If a planted foot is out of reach the solver goes up on that toe, then lowers the body, before the foot gives.
- The build measures every frame and prints, per move: how far a planted foot moved, how far a foot was from
  its target, the lowest skinned point under the floor, and the loop pop. A page is not sent unless planted
  feet moved 0 mm, loops pop 0, and nothing but a hoof rim is under the floor.
- A walk loop plays in place. The page slides and turns the floor under the boss at the move's speed.
- A move that travels (a lunge, a knock back) carries its travel as a table; the page moves the floor by it.

## 5. Moves every boss must have

`docs/MODEL_STANDARD.md` asks a boss to show idle, its moves, a heavy hit and the spawn. The page adds
walk, turn, hurt and death.

| Group | Clips | Rule |
| --- | --- | --- |
| Stand | `idle` | loops, 6 s or so, with small events (a look, an ear flick, a paw at the floor) |
| Move | `walk`, `turnL`, `turnR` | loops; the gait and speed the boss has in the game (`src/sim/boss.js` or its kit in `src/sim/bosses/`) |
| Attacks | one clip per attack the boss has in the game | the game's phases and times, taken from the rig's timelines (`render/boss/<boss>facet.js`) and the sim |
| Calls | a pose for each thing the boss does that the game shows only with sound or an effect | new, so it is listed as an open choice |
| Hurt | `hurt` | head, neck, ears and tail only, played on top of anything, so planted feet stay planted |
| Heavy hit | `heavyHit` | whole body, a stagger with real steps |
| Spawn | `spawn` | the game's spawn (grow from the floor in 7 frames, then stand) with an entrance on top |
| Death | `death` | whole body, feet unlock, holds its last frame |

- Game timing is kept exactly: strike 2.5 frames, contact held 3 frames, an unwarned move gathers for 1.5
  frames at most (`render/facet/beats.js`), and each attack's own numbers from the sim.
- Where a move would read better with a different rule (a warning the game does not give), build the game's
  version first and add ours as a second button marked as an open choice.
- Every attack has its contact time and its phases written in the clip, so the page can name the phase.
- No dash, casts, downed or crawl unless the boss has them.
- **No splayed feet on a humanoid** (Kesh, 2026-11-13: "for all humanoid character, the walk and run move, the leg
  cannot be 外八 ... unless it is a tank-like / heavy character"). In a walk or run the knees and the toes point
  straight along the line of travel: knee pole on the body's forward axis, foot yaw 0 at every plant and through
  the swing, feet tracking under the hips (no wide straddle). Check it in the Front and Top views and measure the
  foot yaw at each plant; write the largest toe-out angle in the audit table (pass is under 5 degrees). Only a
  tank-like or heavy boss may toe out, and the page says so in its facts. In the queue this covers the Bellfounder
  and the Hush if she steps; the Geode Colossus (heavy, on his fists) may splay; the Cantor floats and the
  Hourwarden rolls. The same rule is for the heroes and champions threads.

## 6. Review page

The hero page's bench and rows, with these changes.

- **Move**: Idle, Walk, Spawn, Death. Death holds the boss down; pressing it again spawns it back in.
- **Going**: Forward, Turn left, Turn right.
- **Action**: each attack, each call, Heavy hit, Hurt. An action plays over Idle or Walk and repeats until it
  is pressed again. Hurt plays once per press, on top of anything.
- A phase bar under the status line names the part of the move that is playing, in the game's words.
- **Speed**, **View** (Close, Game zoom, Side, Front, Back, Top), **Show** (Hit feel, Effects, Hero for scale,
  Bones, Pause).
- The boss is drawn at its game size (the Stag 2.2 u) on a floor of 1 u squares, beside a 1 u hero stand-in
  that takes the hits.
- Hit feel: freeze, the game's boss contact squash (11% wider, 5% shorter), camera shake, a flash.
- Effects are stand-ins in the game's colours (`.claude/rules/visuals.md`): Ember `#FF5A36` only for floor
  warnings, Violet for a boss's power, dust in warm grey. Dim. No additive blending on the light stage. They
  switch off with Effects.
- Beside the model: the four views as sent. Under it: facts, a table of the moves with where each timing comes
  from, the measured table, open choices, what is rough.

## 7. Checks before sending

- `build.mjs` audit clean (section 4).
- A contact sheet looked at for every clip (`sheets.sh`).
- Every button pressed in a headless browser with no console errors (`pagetest.js`), stepping the page with
  `__review.step` because the cloud machine cannot play it at speed.
- One full-page look at desktop and phone width.
- The reply says the moves were checked as stills only. Timing and feel are Kesh's to judge.

## 8. The reply and rounds

One link, what is new, what was only checked as stills, the open choices, what is not done. Kesh asks for
changes and the page is republished at the same link. A boss is done when he says so. The rigged file is
`tripo-bosses/<boss>/<boss>-tripo-rigged.glb`.

## What the Thornmother added (2026-11-13)

- `thick.py` measures how thick the mesh is under every vertex. Thin parts (ears, blades, fins, tails) fall out of
  it, so a part that should swing by itself can be found and given its own joint without guessing boxes.
- `rigkit.py` holds the shared rigging steps; a boss's `rig.py` is its joints and its regions only.
- A part that leaves the body and grows back (her seed pods) gets a joint at its root and a scale track
  (`CFG.scales`). The page draws the flying copy.
- A move that travels far (her 5 u charge) writes its hoof plants one by one from the game's speed, so the
  hooves stay locked in a gallop too. `anim.html` follows the model unless `travel=1`.
- `sym.py` measures whether the head faces straight. `modeljs.py` packs the page's model file.
- A new boss's page is generated from the Stag's by a `genpage.py` (text and effects swapped, bench and loop kept).

## What the Gloam Wolf added (2026-11-13)

- A hanging tail lifts with negative pitch and wags with roll (yaw only twists it). A tail that nearly reaches the floor gets a
  guard in its clips (`tailGuard`): whenever the hips come down it swings back to lie on the floor instead of through it.
- A jaw can be cut out of a closed-lip head when the mouth line is modelled: its own joint, weights by region.
- A state that stays on over every move (Enraged) is an additive loop on the head, ears, jaw, tail and mane, made against the rest
  pose (`makeClipAdditive(clip, 0, hurt clip)`), with its own Show button on the page.
- A leap keeps the game's travel as a table and puts the arc in the hips. Take-off and landing paws are planted; in the air the
  paws follow the body (`B.loc`). The page shrinks the floor shadow while the boss is in the air.
- A foot target may carry `ku` to fold the elbow back for a leg that lies on the floor (the death).
- A paw-footed foreleg (short wrist-to-paw bone) folds at the elbow, not the wrist: its leg is `kind: 'hind', bend: -1, kcs: 0.55,
  kcf: -1.1` so the elbow points back and the wrist follows by rule. Kesh's note on Version 1 ("the wolf front paw is weird when
  walk"): the hoofed solver folded the short wrist bone like a broken wrist. Hoofed legs with a long cannon keep `kind: 'front'`.
- A crouch before a spring is a bow, not a squat (Kesh's photos, 13 Nov, `gloamwolf/reference/`): the forepaws step out one after
  the other, the forearms and chest lie on the floor, the rump stays high with the tail up, the head stays level on the target; then
  it rocks back onto the haunches and goes. A foot target may carry `ca` (and `cw`, its weight) to lay the wrist-to-paw bone at its
  own angle, which is what puts a forearm flat on the floor.
- The hero stand-in can stand at a different distance for one move (the Pounce's 4.5 u against the 2.05 u stand-off).
- Contact sheets: six frames across at W=3600 show a whole four-legged body (`sheets.sh`, cams joined by commas: `s,q`).

## What the Drowned Heron added (2026-11-13)

- A part fused to the body (folded wings, a closed bill) is cut free in `rig.py` with `rigkit.py`: `groove_cut` finds the cheapest cut
  along the groove between seed faces, `Editor.split` doubles the rim and closes both sides with a cap, `Editor.add` adds new pieces
  (the heron's 24 flight feathers). Each new piece gets a tag, and tags force weights. The triangle count stays inside 30,000.
- A wing is one joint at the shoulder posed by three angles (sweep, lift, twist) from its measured folded frame, mirrored for the other
  side. Each flight feather has its own joint: it turns about the wing's normal and scales from 0.1 to 1 as the wing opens (`CFG.scales`),
  so a folded wing shows none of them. A wing's twist is written against the floor, so a tipped body does not tip its wings (`wingsW`).
- `quad.mjs`: an extra can be a function of the pose (`(p) => Quaternion`); `CFG.hang` keeps a part hanging toward the floor whatever
  its parent does (weed, chains); a foot target may carry `under: true` to go below the floor. `build.mjs` prints `topMin` for a clip
  marked `sinks: true`: the highest point of the body at its lowest moment.
- A boss that goes under the floor: the page clips the model at y = 0 (`renderer.localClippingEnabled`, a plane on the material) and
  draws a dark pool that hides the cut. The pool is stage, not an effect, so it stays when Effects is off.
- A long neck is written as each segment's angle from upright in the world, not in the parent, so a pose reads the same when the body tips.
- A lunge at the hero is aimed at the hero: measure where the weapon's tip is in the page (`bones.head` and an offset) and fly the body
  so the tip meets the hero's chest (0.6 u). The game's heron rig skims 0.42 u higher, which carried the bill over the hero's head. The
  hit lands when the tip arrives; where the game counts it at body contact, say so as an open choice.
- The hero stand-in walks back round the boss after a move that passes it, and steps back from a death that falls forward.

Version 3 (Kesh, 13 Nov: "heron fly up and dive down flying; when it surfaces do not rise slowly, dash up into the air a bit, never ground level, then land softly"):
- A boss that leaves the floor for a move goes up with one visible downbeat, hangs, and comes down on braking beats with its legs reaching; one foot lands a step before the other and the knees take the weight. No slow rises out of the floor.
- Legs that hang under a body reared upright need a fixed knee direction (`pole`), or both knees flip in one frame as the body's pitch changes (the audit caught 165 degrees at the burst).
- A move that goes higher than the boss stands needs the Close view checked at its highest frame.
- A boss coming out of the floor or the water must be seen coming: about 0.2 s from the first part showing to clear (12 u/s for the heron). The game's 2.5-frame burst read as a blink (Kesh). Time it so the hit lands as it clears, at the end of the warning.
- The page's camera lifts with a boss that flies above 2.4 u, so it stays in the picture.

## What the Millwheel added (2026-11-13)

- A boss with no legs still has a locked foot. The Millwheel rolls on the corners of its twelve peg ends: the corner on the floor
  stays where it is while the wheel pivots over it, then the next corner takes the weight (`boss-kit/wheel.mjs`, used through
  `CFG.makeRig`; a clip gives `s, th, tilt, yaw, pre, hop, x, rest` and the bracket arms `aL, aR, bk, bL, bR`). Slide is 0 mm in
  idle, roll, turns, stop and Cog Shards.
- Make it round first: the export was 9% narrower than tall, and a wheel that is not round cannot roll. Peg tips are 1.29 to 1.30 u
  from the hub after rounding (`millwheel/wip/tips.json`).
- A leaning wheel stands on the edge of its peg, so the rig lifts it until its lowest point touches (the hull lift); `rest` lets a
  dead wheel down onto its axle end and rim.
- Hanging parts (the two iron brackets) are pendulums run in the bake: shaken by the hub, dragged a little by the turning axle.
- **The page carries the wheel's turn.** Every clip is written starting upright, so the turn about the axle is stripped from each
  clip at load and the page adds `base + roll(owner, time)` after the mixer. A move may only start when a peg is flat on the floor:
  out of a roll it waits for the next peg (0.28 s at most) and the walk's last step is cut exactly at the flat; Idle picked during a
  roll plays the `halt` clip (rocks on over the peg's front edge, falls back with a clunk). The roll loop at zero weight is kept in
  step with the wheel's place on its peg. Use the same for any boss whose travel has a phase (wheels, the Hourwarden's gears).
- A move that travels a set distance travels a whole number of pegs (Crosscut 8 pegs, 5.39 u; heavy hit back one peg, 0.67 u).
- An idle that wanders moves the floor on the page: mark the clip `pageTravel: true` so `build.mjs` writes its travel.
- No clipping plane and no pool: the spawn grows from the floor by scale, as the game does.
- A stand-in wall is drawn see-through and low, so it does not hide the slam.
- Glow on a baked texture: weight the mask by how violet the texel is, so the lights glow and the iron plate round them does not.
- Never put an apostrophe or a `//` comment inside a shader string in the page: it ends the JS string and the page never starts.

## What the Mire King added (2026-11-13)

- **A sealed mouth is cut open in the rig.** Find the lip line (a groove cut along the jaw, smoothed, lip points snapped to it),
  double the inner lip points on the jaw side, and build the inside: a roof strip and a floor strip that meet behind the mouth
  corners, and a tongue of 8 joints that telescopes (`slides` on one channel) and scales to nothing when home. Colours for built
  parts are painted as small ramps into unused texture space (`mireking/wip/rig.py`).
- **A fused crown is cut free** the same way (groove cut on its rim, split without caps), with a dish on the head and a lid under
  the crown so neither shows a hole. It is its own bone on a stiff spring, and a clip may throw it clear: its position goes
  through three slide channels and its rotation through a quaternion in the pose (`noSpring: ['crown']` on that clip).
- **Leg kind `'limb'` in `quad.mjs`** is for a sculpt that sits folded (toad, frog, anything squat): two long bones solved to
  the ankle with the pole taken from the bind pose, a foot that lifts its heel about the ball, toes that stay flat. At rest it
  gives the sculpted fold back exactly.
- A limb that leaves the floor blends everything at once: position, heel pitch, toe curl and the foot's own frame (`mixT` in
  `mireking/wip/clips.mjs`). Switching from a floor target to a body-held target in one frame snapped hands 39° and feet 62°.
- **Hanging parts cannot go through the floor.** `hang: [bone, weight, floor]` lays the bone along the floor, heading the way it
  leans in the bind pose, and a spring with `floor` keeps its mass above it. Use weight 1 with a floor: a part-follow weight makes
  the heading flip when the body rolls over.
- A body that rolls onto its back rests on its own outline: `floorOy(pitch)` solves the hips height from hull points saved in
  `skel.json`, every frame of the roll.
- Clip lengths are whole numbers of frames, and the page ends a move at the shorter of the meta length and the clip length. A
  1.67 s clip (100.2 frames) never ended on the page.
- The page's shadow follows the belly bone, so it stays under a body that goes over backward.
- A boss that pulls or drags the hero: the page moves the stand-in by the game's numbers (yank 2 u in 12 ticks, pull 1.6 u/s) and
  the clip aims at the same place, so the tongue stays on the hero.
- Fat one-piece sculpts keep overlaps the audit cannot clear (limb pressed into body, 0.09 u at rest). Say so in the audit table.

## What the Barrow Wyrm added (2026-11-13)

- **A coiled sculpt cannot slither, so only its head is kept (Kesh's pick A).** The skull, frill, horns and the neck down to
  the second collar band come from the GLB; the body is built in the rig: a tube of rings every 0.25 u (32 joints, 8.08 u,
  0.92 u across), slate tiles above, a taupe belly, pewter bands, pale spikes, violet cracks, coloured from ramps painted
  under the head's own sheet (`wyrm/wip/rig.py`). The sealed mouth is cut open as for the Mire King.
- **The snake's rule replaces locked feet:** every part lying on the floor moves only along its own line. The audit checks
  the sideways slide of the floor part (0 mm) instead of feet.
- **The bake lays the body straight behind the root** (`boss-kit/wyrm.mjs`). Only the free part (2.4 u of neck and the head,
  plus `adv`) is posed. The meta carries `lf` per frame (free length, negative when the head is under the floor) and `a0`
  (the climb at the anchor).
- **Low or coiled necks are given as a climb along their own length** (`pitch(s, Lf)`, `swing(s)`), not as a curve to a head
  target. A Hermite neck has more length than room when the head is low and near the anchor; it looped and flipped 176° in
  one frame (Heavy hit, Spawn), twisted a collar (Ash Breath settle) and rolled belly-up (Slither). Keep Hermite necks for
  high, far heads only.
- **The page lays the body on its trail.** It records where the anchor has been, places each ring on that path, and wraps it
  round a hole corner (radius 0.9 u) and straight down when the path enters a hole. The mesh is clipped at the floor. The
  slither wave is played from distance travelled, not from time, so every ring passes through the same spot.
- **The mixer only writes a bone when its baked value changes.** A page that overwrites bones after `mixer.update` must put
  the baked positions and rotations back before the next update, or its own placement piles up (the body drew as ribbons).
- A snake cannot turn on the spot: the page turns it round a circle of 0.9 u at 72° a second (the game turns it instantly;
  an open choice).
- Burrow Strike is one press for three parts with one phase bar: `burrow` (dive through a hole 2.76 u ahead), the tunnel
  (mesh hidden, a mound and cracks run to the hero at the game's 3.4 u/s), `emerge` (Ember ring r 1.9 for 54 ticks, the head
  clears the floor 0.2 s before the burst, slump, exposed 90 ticks, then the rest of the body leaves its hole as it moves off).
- An attack that sprays along the floor is aimed: the ash puffs fly to points picked inside the game's cone, and the strike
  is a coil with the mouth near the cone's apex. A long lunge put the mouth at the far end and the ash fell outside the cone.
- The Bones switch draws its own line down the spine. The skeleton helper drew a fan, because every ring is a child of the hips.
- Contact sheets: `dz` adds to the scene's z, so a negative `dz` (about -0.3) brings a long body's head into frame.

## What the Lich Ram added (2026-11-13)

- **A skeleton's jaw is fused to the skull along the teeth and at the hinge.** It is cut free with `groove_cut` between a
  seed under the tooth line (plus the two branches that rise to the hinge) and a seed for everything else, then both sides
  are closed with a flat dark colour picked from the sheet (`lichram/wip/rig.py`). Horns, skull and eyes stay rigid on the head.
- **Curled horns reach the floor before the nose only when the head is tipped right over** (over about 118° nose-down here).
  "Horns stuck in the floor" is therefore a crown-plant: trunk pitched about 1 rad down, both fore-knees on the floor, hips
  near standing height, hind hooves stopping short so the hind legs trail. A heap with the hips down reads as a collapse.
- **`kneelAt(k, B)`** (in `lichram/wip/clips.mjs`) places a fore hoof so the forearm goes down to a knee on the floor and the
  cannon folds back under it, measured from the body's pose. The knees are cached at the slam and locked until the wrench.
- **A rush at 11 u/s is bounds, not a gallop cycle:** three flights with each hoof down for two or three frames, hind hooves
  landing outside the fore ones. The hind hooves stop inside the folded fore hooves at the end.
- **A strike-beat wrench is split in two:** the horns tear out in the game's 2.5 frames, the forequarters heave up over the
  next 0.13 s. Moving the whole trunk in 2.5 frames snapped the kneeling forelegs 111° in a frame.
- **Legs of a body that rolls over are aimed in the body's own frame**, blended from the floor point they held, with the
  floor only pushing the hoof up (`under: true` and the clip's own clamp). Aiming them in world space turned the leg's plane
  over as the body rolled (163° flips). The fore hooves let go a few frames before the hind ones when the jolt lifts them.
- **A part with no tracks can be driven by the page.** The heart has a joint and only a rotation track, so the page sets its
  scale after `mixer.update`: a double beat at 1 Hz, faster when enraged or winding up, swelling in the Grave Call's gather,
  shrinking and going dark in the death.
- **Glow masks:** x horns (the game's runes: lit while the Horn Guard holds, dark while stuck; the model has no runes, so
  the whole horn takes a faint glow at 0.24), y heart, z eyes.
- **Page effects:** the Ember lane fills for 54 ticks and stays on the floor as he runs down it; cracks and rubble where the
  horns go in (and where he spawns) hold while he is stuck and fade after the wrench; Grave Call's three Ember rings and
  lobbed souls run on their own timers because they land after the clip ends; the hero stand-in is held in floor space
  through a rush so the boss runs past it.

## What the Ash Raven added (2026-11-13)

- **A bird walks in hops.** Both feet leave and land together (`GAIT` duty 0.46, the right foot 0.04 behind the left), one
  hop each 0.42 s at the game's 1.35 u/s; a turn is 45 degrees per hop about a pivot under the feet.
- **Wings are built from the trunk, with a chest-pitch channel.** The wing root follows the chest, but `wingQ` takes back
  the chest's own pitch (`qAx(XA,(bp+cp)*w?c)`) so a bowing body does not throw the folded wings into the floor. Each of the
  14 flight feathers is its own joint posed by `featherQ` (fold, spread, twist); raised wings twist their faces forward
  (tw -30 to -74) or they read edge-on from the front.
- **Seams are shared.** Tripo leaves coincident vertices on part seams with different weights, and they tear (0.24 u at the
  belly). `rig.py` now finds pairs closer than 0.0015 u (cKDTree, 3 passes), averages their weights, and copies a forced
  (pinned) side to its partner, so a forced foot or head never splits from its rim.
- **The patch under a wing blends hips to chest by height** (k = smooth((y-0.42)/0.2)) instead of taking the wing's or neck's
  weights; the belly centre goes to the hips, not the thighs; the hackle ramps to the chest below y 0.66.
- **A stretch probe** (`ashraven/wip/stretch.py <glb>`) prints the worst edge growth per clip and time. Run it with the audit;
  the first Raven build stretched an edge 137 times its length.
- **Dive:** crouch, a downbeat that leaves an ash ring, a hover at 1.5 u, a skim at 0.45 u along the game's lane, feet
  tucked (feet out of the belly), a landing swing that starts 0.085 s before contact and keeps the toes above the floor.
- **Page effects:** the Omen ring follows the hero at 2.4 u/s and locks, then seven crows (V-wing shapes, pointed along their
  path) drop on it; the Gust kicks the hero 2.6 u; the hero stand-in strafes in the Omen so the follow reads.

## What the Hollow Cantor added (2026-11-14)

- A floater with no feet: `quad.mjs` `makeRig` with `legs: {}`; the hover (0.32 u, the game's) is a hips offset in every clip, and only the Echo Step, the spawn and the death sink into the floor.
- A robe on columns: eight columns from the hips, each in two parts (`skA`, `skB`), weights blended by angle and height analytically in `rig.py`; the lower part runs as a spring (rate 0.2, or it snaps at strikes).
- Robe lining: inside the hem, weight goes to the hips in proportion to how far a point lies from the outer surface (max radius per 0.01 height bin). Blending by surface normal made the tear worse.
- Side keys are additive offsets (`dLap` etc.): `track()` fills a missing channel with 0, so a side key in a key that lacks it overrode the shared one.
- Crossing the hands needs an elbow yaw channel (`ey`); shoulder yaw alone throws the hands up and out.
- Built extras with a mask: halo, rune prisms, 7 notes, 6 motes; the z mask encodes each note as 0.01*(k+1) so the page lights notes one by one.
- A fused chin cut free with a groove (`groove_cut`) and split on the dark UV island for the mouth.
- The halo keeps upright: 0.6 of the trunk's pitch is taken back out of it.
- Page: undo the page's own overlay (halo rock, note pulse, heart beat) before `mixer.update`, or scales on bones a clip does not key pile up each frame. A shot ends at the shorter of the meta length and the clip length.

## What the Geode Colossus added (2026-11-14)

- A boss that walks on its fists: the arms are `limb` legs (shoulder, forearm, fist, knuckles) stepping in diagonal pairs
  with the legs. Give the fist and foot fronts their own bone (knuckles, toes), or the front sinks when the heel lifts.
- `noDrop` on a leg in `quad.mjs`: a locked fist out of reach lets go instead of pulling the body down. Use it on arms
  that rear up; without it the drop loop slid the body 14 m and sank the hips.
- Lock a fist only on a rest hold (`fistTrack` locks only on `restKey`), never on a strike target.
- Arm pole points back and out (`[0.5, -0.6, -0.6]`): a pole opposite a forward reach flips the arm 156 degrees.
- Turns on four planted limbs: no trunk yaw, a forward lean, duty about 0.5, or the fists run out of reach.
- Crystals on the shoulders weight to the arm, or they tear (stretch 60 times) when a fist goes high.
- A step back lands flat (`steps()` keeps the heel up only on a forward step), or the heel dips under the floor.
- Rearing moves: keep the hips no more than about 0.012 model units above rest, or the legs hit full reach and snap.
- Clip lengths whole frames everywhere (`wf()`); a stride of 0.64 s made the walk loop jump 4.5 degrees.
- The full audit takes about 25 s; pass clip names after the output path to check one move.

## What the Vein Weaver added (2026-11-14)

- Tripo sent 6 legs; the rig copies the rear pair and swings the copies back to make 8 (`veinweaver/wip/scripts/leg4.py`, `merge.py`). The
  pick (6 as sent, copy to 8, re-export) stays open on the page until Kesh answers.
- A spider's hips sit at ankle height, so the body-drop loop diverges (it sank the body 12 u). Put `noDrop: true` on
  every leg and keep each pose's feet inside reach instead; a raised foot may miss its target, a planted one may not.
- A tail part that points backward bends the other way: on the Weaver's abdomen a positive pitch tips it down, so a
  lift is negative. Check the sign on the first still before keying the rest.
- Keep the abdomen's side sway small (about half the first try), or the waist stretches 4 to 8 times.
- A pull drawn hand over hand is one continuous cycle with the two sides half a cycle apart; separate keyed grabs snapped.
- Eight legs in a turn clash on a long cycle; 18 frames was clean.
- Glows that mean she is alive (leg crystals, eyes) go to 0 on death.

## What the Skyhorn added (2026-11-14)

- A leg that stands at full stretch in the base pose goes up on its toe in 0.08 rad steps and pops (19 degrees in the
  idle). Give the base pose a little slack (`base: { oy: -0.008 }`) and recheck every move that lies down or lands.
- Slender legs leak into the belly: the lower leg bones pulled the belly and brisket 15 to 25 times. A hard cut tears the
  inner face of the leg; ramp the lower bones off over 5 cm along z and 1.2 cm from the middle line (`skyhorn/wip/rig.py`).
- Blend hoof to cannon over a 3 cm fetlock band, or the back of the fetlock tears when the hoof comes down.
- A hoof lifted off the floor while the body rises is set in the body's frame (`carry`, `lift` in `skyhorn/wip/clips.mjs`)
  and lets go fast; a target left on the floor misses by 0.3 u.
- A leap: the fall curve reaches 0 one strike before the hit and the feet touch then, with a short near window; the
  forelegs leave at the start of the spring, before the body jumps, or they pop as it springs.
- Spring compensation that follows the spine (the beard against the head's drop) is averaged over 5 frames, or it snaps
  on every strike.
- A narrow-legged animal turns round the middle of its body with a wide stance; a pivot behind the hips crosses the feet.
- A wall the boss stops against is low and see-through on the page, or it hides the dazed pose from the front.

## What the Hush added (2026-11-14)

- Tripo can weld a hand to the robe's hem or a forearm to the chest. Lifting a welded hand pulls the hem into a sheet (58 times).
  Either leave that arm down and weight its hand to the skirt columns (`armness` in `hush/wip/rig.py`), or ask for a re-export.
  A forearm welded to the chest tents the cloth when it lifts high (about 20 times). Report it as a choice.
- A stray extra hand is cut by a box on position and brightness, and the mesh is compacted (`extra` in `hush/wip/rig.py`).
- An arm hidden in the quarter and side views is not frozen; look at it in the front or the -x view before chasing a bug.
- Arm poses aimed in world directions are solved with Nelder-Mead over the arm channels (`hush/wip/scripts/armsolve.py`).
- To delete channels from clips, use a parser that balances brackets; a regex breaks the expressions.
- Small orbiting parts (the five bells) get their own bones, but the page moves them, the same way the game's code does.
  Strip their tracks on load. Their floor target in the death is in the orbit's frame (minus the orbit's height).
- A crumpled death heap sinks through the floor wherever the bow and the drop add up. Raise the whole heap
  (`DY` in `hush/wip/clips.mjs`), not only the key where it lands.
- Clamp any glow or fade driven by a timer to 1; a death timer past 1 overdrove the dead bells' grey.

## What the Bellfounder added (2026-11-14)

- The first true biped with a held prop. Legs are quad.mjs `limb` chains; the arms are `limb` chains too (`noDrop`), and
  `feet(t, W)` places each palm on a crucible handle from the solved chain (`hold` and `freeHand` in `bellfounder/wip/clips.mjs`).
- A prop added as a second Tripo file is scaled and placed in rig.py (`CS`, `CP`) and rides its own bone on the root. Its
  carried position is computed from the body's lean in `fin()`; a weight channel (`cw`) lerps it to a floor spot to set it down.
- Tip a held pot about its handles, not its foot, or the handles leave the hands (568 mm miss).
- An upper arm welded to the body side from the shoulder down cannot be fixed by weights (slivers). Cut each arm free with
  `Editor.split` and cap it. A bell welded to the thigh is cut the same way, picked by colour (`rg < 1.42` in rig.py).
- Zero a door's or prop's weights on every vertex that is not part of it; diffusion leaks them into the body (26 times stretch).
- A knee near full stretch flips in one frame (the audit's snap, up to 44 degrees): sit the body a little low in every move
  (`KNEE` in clips.mjs). Re-run the audit after every rebuild; a sheet that looks right can still hide a one-frame flip.
- A swing whose heel comes down first dips the heel under the floor; lift the target by the heel pitch (`steps` in clips.mjs).

## What the Cinderback added (2026-11-14)

- A sprawled four-legged lizard with a long tail. Legs are `limb` chains with `noDrop: true` on all four; without it the
  body-drop loop ran away in the Tail Lash (a 180 m reach) when the chest moved and the front feet could not follow.
- `cfg.floorBones: [[bone, minTipY]]` in quad.mjs keeps a hanging chain's tips on or above the floor (the tail), after the
  extra's pose is set. `cfg.smoothHeel: true` finds the least heel lift that reaches by bisection instead of 0.08 steps, so a
  locked foot near full stretch does not flip in one frame.
- A raised foot can only go where the leg reaches: `keepIn(B, k, F, f)` in `cinderback/wip/clips.mjs` pulls the target inside
  the leg's length. `B.legRoot(k)` is in root space; add `B.tz` for a world target.
- Feet that point sideways (the hind feet) get no heel pitch, or the toe edge rolls into the floor.
- A tail whip moves the shoulders sideways at the strike; counter it with the body's `ox` and let the hips follow later.
- A closed mouth is cut open along the lip line (`groove_cut` in rig.py) with roof and floor pockets painted a dark red ramp
  that the page heats for the spit.
- The page hides what is under the floor with a clipping plane at y = 0 (as on the Wyrm page) for the dive and the spawn.
- The game aims the Tail Lash cone at the nearest hero and lashes at a hero on its flank: the page puts the hero at its side.

## What the Hourwarden added (2026-11-14)

- A footless tower on a gear bed: a b, s, c, n, h chain with no legs. The bed rocks on its own edge through `P(k)` in
  `hourwarden/wip/clips.mjs`, which pivots the body pitch about a point on the bed's front or back edge, for the heavy hit
  and for tipping over in the death.
- Parts carved into the case as relief (the two pendulums, the clock hand) are cut free with `groove_cut` along their own
  groove, then `Editor.split` caps the hole behind each in the colour behind it (window dark, dial pale). The cut parts are
  welded back by position on reindex, so their weights must be zeroed by ownership or the case drags them.
- Fists that strike a mark use `solveFist(s, target, start)`, a coordinate-descent IK over shoulder, elbow and wrist with
  the elbow held to [-0.55, 2.4] radians so it never bends backward.
- Chains with weights are one bone each with `hang` (gravity) plus a spring (`k 70, c 5, max 0.75, rate 0.22, floor 0.02`).
  A floor below 0.02 lets the weights dip through when it lies dead.
- The clock hand is not keyed in the GLB: the page filters `hand.*` tracks and turns the bone itself (ticks, an hour per
  toll, spins, stops when run down, runs backward at death). Any part driven by game state belongs to the page this way.
- The audit counts a fist touching the dial's rim as "into"; check the fist's box against the offending verts before
  chasing it.

## Kesh's move changes of 13 Nov (pages only; each is a rule change that needs the freeze lifted to reach the game)

- **Hollow Stag, Antler Quake.** The ring is centred on the Stag himself, not on his target (the game: `src/sim/boss.js` puts the
  1.6 u ring on the current target). Page Version 3. Open choice offered: a 2.2 u ring.
- **Mire King, Venom Shake in place of the Swallow.** His words: charge with purple spots glowing on the back, shake, venom spat
  randomly round him from the spots, small pools that hurt whoever steps in them. Built: `mireking/wip/warts.py` finds the 11
  biggest warts on the back (skin against a smoothed copy, 0.29 u apart) and writes them into mask channel 0 as NEGATIVE values
  (the sac stays positive; the shader reads `max(m,0)` for the sac and `max(-m,0)` for the warts) and into `warts.json` (joint and
  offset). Clip `venom`: 78-tick charge with three pumps, a 0.62 s shake at 6.5 shakes a second, settle to 2.6 s. The crown's
  spring rattled from stop to stop in single frames under the shake, so the clip keys the crown and names it in `noSpring`.
  Page: one gob per wart on a 0.5 s arc to an Ember mark 1.8 to 4.6 u out, a 0.6 u violet pool for 5 s. My numbers, open choices.
- **Millwheel, Plank Spin in place of Cog Shards.** His words: the wheel lies down flat and spins, the planks on its body shoot out
  randomly, a plank that reaches its end point spins there, the planks disappear over time. Built: `millwheel/wip/rig.py` gives each
  of the twelve planks (what stands out of the rim, radius over 0.407) its own joint at the rim's face; `wheel.mjs` takes `pose.pg`
  (twelve sizes) and shrinks a plank into its socket, which closes the skin with no hole. Clip `planks`: hop and flip in the air
  (the wheel rig's air mode, `th: 0`, `rest` to lay it on its lowest point), flat at 0.5 s leaning on its rim, spin by `yaw` (two
  whole turns, so it stands up facing the same way and the page's carried roll is untouched), level as it speeds up, planks leave
  from 0.8 s every 0.078 s in a fixed shuffled order, new planks grow from 1.84 s, kick upright at 2.38 s, land 2.7 s, 3.3 s.
  The page cuts each plank out of the model (triangles wholly on the plank's joint, capped where it left the socket, drawn 1.8
  times longer) and flies it 0.42 s to an Ember mark 2.0 to 5.4 u out, where it spins 4 s in a 0.55 u Violet ring and fades.
  A spin faster than about 2 turns a second strobes against twelve planks at 60 frames a second; this one peaks at 1.6.
- **Mire King, Belly Flop wind-up (Kesh, 14 Nov, Version 3).** Not a dive (his word 跳水): he sinks onto his haunches with his
  hands flat, his hind legs push twice (后腿蹬两下: hips bob up onto the toes, heels stamp back at 0.36 s and 0.62 s, cue `stamp`,
  dust and a small hit feel), the hands rise onto the fingers, and on the third push he jumps. Apex 2.2 u (was 1.4 u, his ask:
  higher) in the game's 20-tick leap. A deep crouch drops the weed's root onto the floor and flips it 54 degrees: keep the
  crouch at oy -0.03 or above.
- **Millwheel, planks fly back (Kesh, 14 Nov, Version 3).** No new planks grow: a socket stays empty (`pg` 0) until its own
  plank's 4 s on the floor are up. Then an Ember path 0.6 u wide lights from the plank to the floor under its socket for 0.5 s
  (cue `path`), the plank lifts (`back`), flies home in 0.42 s, faster as it goes, hitting anyone on the path (his words: "when
  fly back also have damage"), and snaps in (`ret`, a 0.12 s overshoot) with a jolt to the lying wheel. The wheel lies flat
  until the last plank is home (5.64 to 6.50 s), kicks up at 6.75 s, settles 7.67 s. Path numbers are mine, offered as open.
- **Millwheel, Crosscut loose planks (Kesh, 14 Nov, Version 4).** His words: at the wall the planks fall off naturally (脱落), spin
  the same as the Plank Spin's when they land, at most 3 off. Done on the page alone, the GLB is unchanged: at the slam the page
  picks the planks pointing most at the wall (not already off), up to 3 off at once; each socket's joint is held at scale 0
  after the mixer, a copy falls on a path simulated at the hit (aimed one each side, the third further out and back; one
  bounce; settles flat in 0.1 s), so its Ember mark is the exact rest spot; then the Plank Spin's spin, path and flight home,
  and the socket snaps back. An empty socket under the hub lowers the hub onto the rim (up to 0.24 u). A Plank Spin puts loose
  planks straight back. Page code: `ccDrop`, `ccPegs`, the `fall` state in `millwheel/wip/genpage.py`.
- **Millwheel, 1 to 3 per wall hit (Kesh, 14 Nov, Version 5).** His words: "The wheel each hit wall randomly shoot 1 to 3 plank,
  if happen the wheel all plank were shooted out, then wheel hit wall won't shoot any plank". The cap of 3 off at once is gone:
  each slam picks 1 to 3 at random from the planks still on the wheel (the ones pointing most at the wall), none when none are
  left. A new plank's aim moves along if a plank already lies within 0.9 u of it.
- **Wyrm, surfaces only when the ring is full (Kesh, 14 Nov, Version 2).** His words: the head showed early (提早露出来). The skull
  reaches 1.9 u past the head joint, so `L` -1.2 left it 0.7 u above the floor for the whole ring. Now it climbs from `HIDE` -0.6 to
  `HIDE` (-2.0, top of the skull just under the floor) over the 54 ticks, breaks out on the burst frame and is full height 0.12 s
  later. The page also sets `clipShadows` so the part under the floor casts no shadow. Rule for every boss that comes out of the
  floor on a warning: measure the highest vertex, not a joint, and keep it under until the warning is full.

## Kit files

| File | Job |
| --- | --- |
| `inspect.mjs`, `view.html`, `shot.js` | count triangles, render four views |
| `stag/wip/rig.py` | joints, weights, glow masks, the overlay picture (copy and change the joints for a new boss) |
| `wheel.mjs` | the rig for a boss that is a wheel (rolls on peg corners, pendulum arms, a joint for each plank that can leave) |
| `wyrm.mjs` | the rig for a boss that is a snake: a head on a chain baked straight, posed by climb profiles, laid along its trail by the page (`wyrm/wip/genpage.py`) |
| `quad.mjs` | key curves, the spine chain, the leg solver (hoofed, pawed and folded `limb` legs), slides, hanging parts with a floor, toe-raise and body-drop guards, springs, gait and swing helpers |
| `stag/wip/clips.mjs` | the Stag's moves (copy for the next four-legged boss) |
| `lichram/wip/clips.mjs`, `lichram/wip/genpage.py` | the latest four-legged boss: bounds, the kneel, a fall carried in the body's frame; its page is generated from the wolf's |
| `ashraven/wip/rig.py`, `clips.mjs`, `genpage.py`, `stretch.py` | start a bird here: hop gait, built wings and feathers, seam sharing, the stretch probe |
| `cantor/wip/rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html` | start a floater or a robed caster here: robe columns with lining blend, built halo and lit notes, chin cut |
| `colossus/wip/rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html` | start a knuckle-walker here: fists as feet, `noDrop` arms, fist placement by the wrist (`fist()`, `fistTrack()`) |
| `veinweaver/wip/rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html`, `scripts/` | start a spider here: leg copying, `noDrop` on every leg, the abdomen beat, a thread drawn by the page |
| `skyhorn/wip/rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html` | start a hoofed charger here: ramped leg weights, base slack, raised hooves in the body frame, a leap, a lane and a wall |
| `hush/wip/rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html` | start a floating robed boss with orbiting parts here: a cut extra hand, a hand welded to the hem, page-driven bells, a state counter row (Stilled) |
| `bellfounder/wip/rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html` | start a biped with a held prop here: arm and leg limbs, hands on handles, cut welded arms, a prop set down and lifted, a counter row (Castings) |
| `cinderback/wip/rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html` | start a sprawled lizard or newt here: a cut-open mouth, a 5-bone tail kept on the floor (`floorBones`), `keepIn` raised feet, a dive under the floor with a clipping plane |
| `hourwarden/wip/cuts.py`, `rig.py`, `clips.mjs`, `genpage.py`, `script.js`, `body.html` | start a footless tower or a construct here: carved parts cut free, a bed that rocks on its edge (`P()`), fist IK (`solveFist`), chains on hang plus springs, a part turned by the page |
| `build.mjs` | writes the rigged GLB with every clip at 60 frames a second, the audit and the timing table |
| `anim.html`, `sheets.sh` | contact sheets |
| `stag/review/index.html` | the review page |
| `pagetest.js` | serves the page headless, presses buttons, steps time, takes shots |

Needs node packages `@gltf-transform/core`, `extensions`, `functions`, `three@0.147.0`, `playwright`
(pre-installed), and Python with numpy, scipy, trimesh, pillow, matplotlib.

## Bosses

| Boss | State | Page | File |
| --- | --- | --- | --- |
| Hollow Stag | PASSED by Kesh 2026-11-13 at Version 2 (head straightened), and again 2026-11-14 at Version 3, with the Antler Quake ring on the Stag himself (his ask of 13 Nov) | https://claude.ai/artifact/3DH2KR687LVWWp3RGb21PN | `stag/stag-tripo-rigged.glb` (12 clips, 27,620 triangles, 28 bones) |
| Thornmother | PASSED by Kesh 2026-11-13 at Version 1 ("Thornmother mark pass") | https://claude.ai/artifact/K7J8WmMS5RLtKHxZfpt7b4 | `thornmother/thornmother-tripo-rigged.glb` (11 clips, 27,383 triangles, 40 bones) |
| Gloam Wolf | PASSED 2026-11-13 (Version 4: detail audit, elbow pops fixed, flat-forearm bow, clean turns) | https://claude.ai/artifact/LRPbMpynLnj4WysCkdmjGr | `gloamwolf/gloamwolf-tripo-rigged.glb` (14 clips, 26,346 triangles, 31 bones) |
| Drowned Heron | PASSED by Kesh 2026-11-14 at Version 3 (Kesh's dive: fly up, stoop down flying, burst into the air on surfacing, soft landing; Bill Flurry; detail audit) | https://claude.ai/artifact/2SAjbgNgL5wN1taBMUeANF | `heron/heron-tripo-rigged.glb` (12 clips, 28,516 triangles, 51 bones) |
| Millwheel | PASSED by Kesh 2026-11-14 at Version 5 ("Millwheel mark pass"; Plank Spin in place of Cog Shards; planks fly back down an Ember path; each Crosscut wall hit knocks 1 to 3 planks loose at random, none when none are left, his asks) | https://claude.ai/artifact/Mi6CmM9k45EF1ibMa5iLDJ | `millwheel/millwheel-tripo-rigged.glb` (11 clips, 26,102 triangles, 4 bones) |
| Mire King | Version 3 PASSED 2026-11-14 (Venom Shake in place of the Swallow; Belly Flop wind-up is two hind-leg pushes and a higher jump, his asks) | https://claude.ai/artifact/7QNaeRHc4SH5FhDLVxmt1o | `mireking/mireking-tripo-rigged.glb` (13 clips, 29,656 triangles, 36 bones) |
| Barrow Wyrm | PASSED by Kesh 2026-11-14 at Version 2 ("Wyrm mark pass"; head and neck from the GLB, built ring body, his pick A; surfaces only when the ring is full, his ask) | https://claude.ai/artifact/RKfR2NL5UoWMhbzL5QUGAD | `wyrm/wyrm-tripo-rigged.glb` (12 clips, 22,666 triangles, 36 bones) |
| Lich Ram | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; jaw cut free, crown-plant stuck pose, beating heart; Enrage and Block poses are new) | https://claude.ai/artifact/B4PLRk8w8oL4fT8KfYuWc9 | `lichram/lichram-tripo-rigged.glb` (12 clips, 28,167 triangles, 27 bones) |
| Ash Raven | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; wings and 14 feathers built in the rig, hop gait, dive with hover and skim, Gust, Omen with crows; Enrage pose is new) | https://claude.ai/artifact/DpzjWfM1WLmcWiASJVDjar | `ashraven/ashraven-tripo-rigged.glb` (13 clips, 28,256 triangles, 48 bones) |
| Hollow Cantor | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; floats, robe on 8 two-part columns, built halo with 7 notes and 6 motes, jaw cut free; Verse pose and turn are mine) | https://claude.ai/artifact/218qFDmkai3cNKU6ZaBQh6 | `cantor/cantor-tripo-rigged.glb` (15 clips, 29,172 triangles, 64 bones) |
| Geode Colossus | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; knuckle-walk in diagonal pairs; Fissure crack and crystal patches, Geode Rain, Geode Burst with shards; Enrage chest beat and death are mine) | https://claude.ai/artifact/HZZceQqy8AW5PDrhvL5myW | `colossus/colossus-tripo-rigged.glb` (12 clips, 27,222 triangles, 23 bones) |
| Vein Weaver | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; 8 legs, the rear pair copied, pick open; Vein Bind thread and haul, Crystal Slam with vein patches, Brood sacs and webs; Enrage and death are mine) | https://claude.ai/artifact/MXftC9gzqXPrUkMdLvD7L5 | `veinweaver/veinweaver-tripo-rigged.glb` (12 clips, 29,210 triangles, 39 bones) |
| Skyhorn | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; Horn Rush with rear, paws, lane, wall and dazed; Bell Toll; Sky Leap with six shards; Enrage, the rear and the death are mine; the horns' violet vein is missing on the export) | https://claude.ai/artifact/MQoXVGvUxR6xWbJRf76uWQ | `skyhorn/skyhorn-tripo-rigged.glb` (12 clips, 27,466 triangles, 29 bones) |
| Hush | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; floats; the third hand cut away; right hand welded to the hem so it hangs; left forearm welded to the chest; 5 small bells built and moved by the page; Still Note, Unringing, Great Hush with drained; Stillness pose, turn and death are mine) | https://claude.ai/artifact/12KvHNfm5qwSbuJmeY59GJ | `hush/hush-tripo-rigged.glb` (12 clips, 28,308 triangles, 35 bones) |
| Bellfounder | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; biped; arms and hip bells cut free; one chest door; crucible from its own file held in both hands; Molten Pour, Bell Drop with a flying bell, the Firing with quenched; Casting pose, turn and death are mine) | https://claude.ai/artifact/UG16AFrdpDs4DHVXuUpiBF | `bellfounder/bellfounder-tripo-rigged.glb` (12 clips, 28,967 triangles, 26 bones) |
| Cinderback | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; sprawled walk with an S; mouth cut open; Magma Dive under the floor with a glow and a slag pool, spent grey; Tail Lash at a hero on its flank; Ember Spit rear with three gobbets; Enrage, the death, the spit rear and the turn are mine) | https://claude.ai/artifact/AQgcuMMgGJFjM4YxYnNxhs | `cinderback/cinderback-tripo-rigged.glb` (12 clips, 28,684 triangles, 30 bones) |
| Hourwarden | PASSED by Kesh 2026-11-14 at Version 1 ("for boss model mark all pass"; glides on its gear bed; pendulums and clock hand cut free; Pendulum with a ghost swing down the lane; Hand Sweep with the weights; Toll of the Hours striking its own dial with weights falling on the rings, then run down; the hand turned by the page; Enrage, the death on its back, the turn and the spawn rise are mine) | https://claude.ai/artifact/QCycNzbKV837CUS5o4ADgu | `hourwarden/hourwarden-tripo-rigged.glb` (12 clips, 27,174 triangles, 16 bones) |


## The detail audit (2026-11-13, Kesh: "need a audit and review, make sure is insanely detailed")

Every boss page goes through this before it is sent, and carries a table "Checked / Found / Now".

- Tools: `boss-kit/audit/audit.py <rigged.glb> <meta.json> <out.json> [clips]` takes every vertex through every frame: parts under the floor, one part pushed through another (bind pose subtracted, neighbouring parts skipped), a joint that turns far more in one frame than the frames beside it (a pop), stretch. `steps.py` prints one joint frame by frame, `tip.py` tracks a bone-local point, `boss-kit/smooth.mjs` counts jerks, dead stops and loop seams. `boss-kit/glbanim.py` reads and skins the GLB.
- Must be zero: pops (except a strike that is meant to be 2.5 frames), parts under the floor (over 4 mm on the model).
- Overlaps: fix legs through legs, legs folded into the body, a bill or horn into the neck. Soft parts brushing a leg (plumes, weed, tail fur) under about 0.1 u may stay, and the page names them.
- Kit rules that came out of it (in boss-kit/quad.mjs): springs are rods that cannot be left behind by a fast joint, ease to straight when thrown back along themselves, and change at most 0.55 rad a frame; a foot target takes `pole` (which way the knee or elbow points) and `yaw`; a foot carried a long way swings about the hip (`swingTo` in the heron's clips), never in a straight line through it; in a clip with travel the hip is `B.loc(k,[0,0,0])`.
- Pawed forelegs get a fixed elbow pole (back and down) in any move where the body tips: the Gloam Wolf's elbows flipped over the top in the bow, on landing and in the death.
- A turn on the spot uses shorter, quicker steps on a wider stance than the walk, or the hind legs pass through each other.
- A dive is head first (herons, gannets, kingfishers): bill into the water first, hips up and over, wings shut, the whole animal one line, toes last.
