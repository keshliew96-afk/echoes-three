# Character review standard

Set by Kesh on 2026-11-12 ("all good, make it as a standard for future character review"), after the
mouse Healer review. Every future character made from a Tripo model gets the same review page with
the same controls, so each one is judged the same way.

Reference page (the Healer): https://claude.ai/artifact/1Mgu7yU2pGxyPdH3BykDBD
Tools: `/mnt/project-files/tripo-pilot/review-kit/` (copy to a scratch folder and work there).

The game on `gauntlet` stays untouched. A review page is not a game change. Putting a reviewed
character into the game is a separate step that needs Kesh's go.

## 1. What Kesh sends

One GLB per body and one GLB per weapon or held item, made in Tripo Studio with these settings:
HD Model, H3.1, Ultra Mesh off, Texture 2K, Remove Lighting on, PBR off, Triangle topology at 15000,
Generate in Parts off, no Tripo Rig, export GLB. Multiview slots Front, Right, Back.

The views come from the prompts in `HERO_SHEET_PROMPTS.md`: A-pose, empty paws, the same outfit in
every view (hood up or down in all of them), weapon on its own sheet.

## 2. Model checks before rigging

- Triangle budget from `docs/MODEL_STANDARD.md` in the repo: hero 15,000, boss 30,000, champion 12,000,
  foe 4,000, small mob 1,500. Body plus weapon count together. Trim the body with `simp.mjs` if over.
- Height 1, feet on y = 0, faces +z, one texture, no rig.
- Outfit matches in all four views (`view.html` renders front, right, back, left). If it does not,
  say so and ask for a new model before rigging.
- The reply names the triangle count before and after.

## 3. Rig

- Joints for a biped hero (24): root, hips, spine, chest, head, earL/R, legL/R, footL/R, tail1 to tail5,
  upperarm/forearm/hand/fingers L and R. Drop or add joints to fit the animal (no tail, wings, antennae),
  and say which.
- Identity bind rotations. Weights by diffusion from each bone with region masks so ears, arms and legs
  do not pull the hood, chest or robe (`rig.py`).
- A weapon is its own rigid node. On the page it follows the hand every frame, so it can be thrown.
- The rest pose holds the weapon naturally. It is not the A-pose.

## 4. Moves every hero must have

The page drives these clip names. Keep the names.

| Group | Clips | Rule |
| --- | --- | --- |
| Stand | `idle` | loops |
| Walk | `walk`, `walkBack`, `walkLeft`, `walkRight` | loops; the hero faces the pointer, so travel picks the clip |
| Dash | `dash`, `dashBack`, `dashLeft`, `dashRight` | whole body |
| Basic attack | `combo` (all three hits), `combo1`, `combo2`, `combo3` | the three hits are cut from the one combo so they chain |
| Casts | `castPoint`, `castBloom`, `castPlant`, `castSweep` | upper body only, one per cast style in the game |
| Hurt | `hurt` | played as an additive flinch on top of anything |
| Downed | `downFall`, `downLie`, `downCrawl`, `revive` | whole body |
| Character | `wave`, plus one move that shows off the weapon (the Healer has `throw`) | upper body |

Upper-body clips key only spine, chest, head, ears, arms, hands and fingers, so the legs can keep
walking under them. Each attack and cast has a contact time written down for the hit feel.

Foes, champions and bosses use the same page with a shorter list: idle, walk in four directions,
each attack, hurt, death, spawn. Dash, casts and downed appear only when the creature has them.

## 5. Review page controls

The page keeps these rows, in this order, with these names.

- **Move** (multi-select): Idle, Walk, Dash, Downed, Crawl, Spawn. Moves that cannot combine grey out.
  Downed takes the whole body. Dash has top priority and is never greyed out by an attack or a cast (see the
  dash rule below). Crawl lights up only while downed. Downed greys her colours.
- **Going**: eight directions for Walk and Dash. The four diagonals blend two clips half and half.
  The floor grid slides so the travel direction is visible.
- **Action** (one at a time, plays over Idle or Walk): Tap attack (each press plays the next hit when
  pressed after the last one lands), the full combo, the four casts, Wave, the weapon move, Hurt.
- **Speed**: slow motion through full speed.
- **View**: fixed camera angles, plus drag to orbit.
- **Show**: Hit feel (on by default: about 70 ms freeze, squash and weapon flash on contact, and a lean
  into travel), Bones, Pause.
- Beside the new model: recordings of the character as it is in the game now, for the same moves.

Changing the action never restarts the walk.

Page build notes: three 0.147.0 from jsdelivr, the GLB shipped as base64 in a `<name>-model.js` file
because artifacts do not serve `.glb`, legs and upper body as two animation layers split by bone name.
Start from `review-kit/review-index.html` and change the model file, the weapon grip, the contact
times and the labels.

## 6. Checks before sending the page

- Every button pressed once in a headless browser with no console errors (`page-test.js`).
- A contact sheet looked at for every clip (`sheet.sh clip n cams out`): no limb through the body,
  weapon clear of the face, feet on the floor, prone pose flat on the floor.
- Triangle total within budget.
- The reply says the moves were checked as still frames only. The cloud machine cannot play them at
  full speed, so timing and feel are Kesh's to judge.

## 7. The reply

One link to the page, what is new since the last version, what was only checked as stills, and what is
not done. Known gaps for now, to be named every time until built: planted feet, cloth sway, fingers
closing on the weapon, ink outline and flat game colours, real skill effects.

## 8. Rounds

Kesh asks for changes and the page is republished at the same link. The character is done when he says so.
Then the rigged GLB is saved as `/mnt/project-files/tripo-pilot/<hero>-model/<hero>-tripo-rigged.glb`.

## Kit files

| File | Job |
| --- | --- |
| `inspect.mjs`, `view.html`, `shot.js` | count triangles, render four views |
| `simp.mjs` | trim triangles to budget |
| `lm.py`, `rig.py`, `skel.json` | joints and weights |
| `clips.mjs` | every clip as keyframes, plus the rest pose |
| `build.mjs` | writes the rigged GLB with all clips |
| `anim.html`, `sheet.sh` | contact sheets of a clip |
| `review-index.html` | the review page |
| `page-test.js` | presses the page controls headless |
| `dashrule.py` | adds the dash rule to a review page (`from dashrule import apply`, call it last in the page script) |
| `dashtest.js` | plays an action, presses Dash part way in, prints what was cut off, saves a shot |

Needs node packages `@gltf-transform/core`, `extensions`, `functions`, `meshoptimizer`, `three`, and
Python with numpy and scipy. A local web server is not allowed in the cloud session, so `shot.js` and
`page-test.js` serve files through Playwright `page.route`.

## Passed characters

| Character | Passed | File | In the game |
| --- | --- | --- | --- |
| Healer (mouse) | 2026-11-12, Kesh: "mouse healer checked and all pass" | `healer-model/healer-tripo-rigged.glb` (28 clips, 14,870 triangles) | no, waits for Kesh's go |
| Tank (badger) | 2026-11-12, Kesh: "tank thread checked and pass" | `tank-model/tank-tripo-rigged.glb` (28 clips, 14,973 triangles) | no, waits for Kesh's go |

## Added 2026-11-12 after the Tank

- Clipping is measured, not eyeballed. The build checks every frame of every clip for body vertices inside the
  weapon and for the weapon under the floor, and prints a report (`tank-model/wip/build.mjs`, "CLIPPING").
  A page is not sent while a clip reports more than a couple of vertices. Kesh found the Tank's guard cutting
  into his face before this check existed.
- Clips of the in-game character beside the new model are optional. Kesh said they are not needed for the Tank.
- Start the next hero from `tank-model/wip/` (config-driven build, feet kept on the floor, clipping check),
  not from `review-kit/`.

## Added 2026-11-12: Run (Kesh: "all character add run move")

- Every character has `run`, `runBack`, `runLeft`, `runRight`, all on one period so the diagonals blend. The Move
  row is Idle, Walk, Run, Dash, Downed, Crawl, Spawn. Run layers under upper-body actions the same way Walk does.
- A move that turns the whole body (the fox's `bladeStorm`) is an Action that plays from Idle only and greys out
  Walk and Run while it is on.
- `fox-model/wip/aim.mjs` finds the hand angle that points a weapon along a wanted direction for a pose.

## Added 2026-11-12: smoothness audit (Kesh: "audit and review again for the smoothness of all the movement")

Done on the Healer first (`healer-model/wip3/`). Every character gets the same before a page is sent:

- `audit.mjs <glb>` measures every clip: loop pop (pose jump at the wrap, must be 0), loop seam, stop-and-go dips,
  hard frames, distance from rest at start and end.
- `wip3/build.mjs` is the build to start from. It stores 60 frames a second, joins keys with a monotone cubic
  (no stop at every key), samples loops over their exact period, lags arm, wrist and head behind the chest
  (`CFG.lag`), carries a blow a little past its target (`CFG.carry`), runs ears and tail as springs (`CFG.springs`),
  keeps soles, body, both hands and the weapon above the floor, and moves the weapon hand until no body point is
  inside the weapon. A prone pose must lie on the floor, not in it.
- Loop clips written as functions use `pos()` (a soft max) instead of `Math.max(0, x)`, and only whole periods.
- The page blends between moves (0.07 s into attacks, dashes and falls, 0.16 s otherwise) instead of switching.
- The Tank and the fox are still on the older build and have not had this pass.

## Added 2026-11-13: the dash rule (Kesh, for all characters)

Kesh: "for all character, the dash 优先级 need to be very high, it can 取消 a skill 前摇, 后摇 and perform dash.
and while dashing, make character have 无敌帧 this is good and important for roguelike game."

- Dash has top priority. Pressing Dash during any attack, cast or weapon move cuts that move off at once,
  in its wind-up (前摇), between its hits, or in its recovery (后摇), and the dash plays.
- The character is invincible for the whole dash (无敌帧).
- On every review page: the Dash button is never locked by an attack or a cast; the cut-off move fades out fast
  (0.07 s); the line under the stage says what was cut and where, for example "Dash cut off cast: nightfall at
  0.30 s in its wind-up"; the model carries a pale blue tint (`#9FD8FF`, dim) while it is invincible, and the
  label reads "Dash · invincible".
- Downed still beats Dash: a downed character cannot dash.
- A charged finisher from a held attack (the otter's tsunami): cut in its wind-up it keeps its charge and starts
  again after the dash; cut after it has fired, the charge is spent. This part is our guess, not Kesh's words.
- Applied 2026-11-13 to all seven pages (Healer, Tank, fox, hare, otter, beetle, bat) with `review-kit/dashrule.py`.
  Review pages only. The game already makes a dashing hero untouchable (`iframeUntilTick` in `src/sim/allies.js`).
  From a quick read, not a test, a dash there holds a waiting cast until the dash ends instead of cancelling it,
  so the cancel part would be a rule change in the game and needs Kesh's go and the freeze lifted.

## Added 2026-11-13: a dash of its own for each hero (Kesh's designs)

Every hero's dash is now one clip called `dash` (the three direction copies are gone). On the page the hero turns to face the dash direction and the floor slides by the dash distance, so effects stay where they were left. In the game today a hero keeps facing the aim during a dash; that difference is ours and is flagged to Kesh. All of these are review pages only: none of it is in the game, and each needs his go and the freeze lifted.

| Hero | Dash | Moves in | Distance | Cannot be hit | What it does to foes | Numbers that are first guesses |
|---|---|---|---|---|---|---|
| Healer | leaf turn: one full spin on a hop, a bow on landing | 0.06 to 0.33 s | 1.8 u | 0 to 0.35 s | nothing; she heals herself a little at 0.37 s | heal 2% of her health |
| Tank | shield charge: both paws on the shield as in the guard, the run's legs, a shove at the end | 0.10 to 0.68 s | 2.2 u | 0 to 0.70 s | knocks them aside, stuns 0.3 s | stun 0.3 s (asked: 0.1 to 0.5), push 3.2 |
| Fox | the stance from Kesh's picture, then a thrust along the way and a flick | 0.11 to 0.36 s | 2.2 u | 0 to 0.38 s | slight damage to each foe passed | damage amount |
| Hare | a jump with a forward somersault; at the top three arrows loosed at once that home on the nearest foe; a deep landing | 0.15 to 0.75 s | 2.6 u, 0.75 u high | 0 to 0.76 s | three homing arrows | arrow damage, homing range |
| Otter | calls a tide and rides it side-on; it breaks where she steps off | 0.14 to 0.68 s | 2.8 u | 0 to 0.70 s | the water left on the floor (1 u wide) slows foes for the 3 s it stays | slow 30%, 3 s |
| Beetle | the bell: a great bell drops over her in 0.36 s; under it she walks where the player steers; an attack, a cast, Dash again or the end of its time lifts it | up to 2.5 s | 1.5 times her walk speed | from the bell landing until it lifts | nothing | 2.5 s, the speed; she is not safe in the first 0.36 s |
| Bat | a blink: he breaks into thirteen small bats that scatter, stream to the spot and gather into him | 0.05 to 0.17 s | 2.6 u | 0 to 0.20 s | nothing | distance |

The bat's claw combo is six hits in the same 1.35 s: rake 0.10, rake 0.24, bite 0.46, then hits 4, 5 and 6 each with a blink of its own (Kesh, 13 Nov: "each hit blink 1 time, if is same foe, then blink to different direction"): blinks at 0.50, 0.66 and 0.83 (hidden 0.06 s each), hits at 0.62, 0.78 and 0.96, blink home 1.04 to 1.10. Each blink goes to the foe nearest the mouse; for the same foe he comes out on a different side each time (a third of a turn apart, facing it). With Tap attack, each of hits 4, 5 and 6 blinks out to its own side and blinks home if no tap follows.

Page parts: `review-kit/dashkit.py` (the shared dash kit: one clip, turning, exact travel, floor-fixed effects, practice posts with knock, hit and slow modes, the invincible window; `free: True` for a dash the page drives itself, like the bell), each hero's `wip-dash/dashfx.js` (its effects) and `wip-dash/mkpage.py` (its settings). Test tools: `dashtest.js` (dash cuts a move off), `dashshot.js`, `homshot.js` and `actshot.js` (stills at given times at quarter speed, because the cloud machine drops frames at full speed), `belltest.js` (the bell's states).

Tank weight pass, same day: the step is skewed so he spends 65% of each step in the low half, more sway and a later shield bounce, a hurt that sinks him instead of throwing him back, footfall dust and a small camera knock timed to the foot. A hero that should feel heavy gets the same checks: time spent low in a step, a sink under a blow, long load and slow recovery, marks on the floor.

## Added 2026-11-13: passes and the true-gap check

- Passed by Kesh on 13 November with their own dashes: Tank V9, Fox V12, Healer V20 (03:22 UTC); Bat V4, Otter V6, Beetle V6 (04:11 UTC). Hare V9 (detail audit) passed 04:35 UTC. All seven heroes are passed.
- A detail audit measures true gaps, not joint centres: every vertex of the body, the weapon and anything on it, in every frame (`review-kit/hare-audit2.html` and `hare-audit2.js` for a hero with a rigid weapon; the bat's and the otter's tools are in their `wip` folders). The hare's joint-centre table had missed a bow 1.2 cm from her face and toes 1.2 cm under the floor.
- Floor check: the sole points must cover the whole foot, out to the outer toe (the hare's wide feet needed five points, mirrored for the right foot).
- Short arms set how far a weapon can be held from the body: check the grip miss and the gap together when moving one.

## Added 2026-11-13: no turned-out feet in walk and run (Kesh, for all humanoid characters)

Kesh: "for all humanoid character, the walk and run move, the leg cannot be 外八 ... unless it is a tank-like / heavy character".

- The rule: in every walk and run (all eight directions) the toes point straight ahead, not outward. A tank-like or heavy character is exempt and keeps a turned-out stance (the Tank bear was left as it is).
- Why it happens: Tripo models the feet turned out (15 to 40 degrees on the seven heroes), so a plain forward leg swing walks splay-footed. The run's hip turn adds a little more.
- The fix lives in the build, not in each clip: `CFG.toe={L:deg,R:deg}` in `clips.mjs` is how far each foot is turned out as modelled. For clips named `walk*` and `run*` the build turns each leg about its own length (hip to ankle) in every frame until the foot's side-to-side line is square to straight ahead, leaving 2 degrees of toe-out (`TOE_KEEP`) so a small measuring error cannot make pigeon toes (内八). The step, the foot path and the floor solve are unchanged. Idle and every other move keep the modelled stance.
- Measure it: `review-kit/splay/` (`node run.js <hero>.glb <hero>.json`, `python3 rep.py <hero>.json`). It finds the footprint (the vertices of the foot below the ankle), takes the heel-to-toe line through the middles of its back third and front third, and prints the toe-out of each foot in every frame of idle and the eight walks and runs. `feet.html?f=<hero>.glb&clip=walk&t=0,0.15,...` shows the feet from above with a red line straight ahead through each ankle.
- Check before sending: toe-out within 0 to 5 degrees in all eight walks and runs, never negative; stills from above (no pigeon toes) and from the front (no twisted mesh at the hip).
- Done on 13 November for the Healer (V21), Fox (V13), Hare (V10), Otter (V7), Beetle (V7) and Bat (V5). Before: toes out 10 to 21, 10 to 19, 14 to 30, 26 to 40, 15 to 20 and 21 to 32 degrees. After: 2 degrees on every hero. Checked as numbers and stills only (`no-splay-check/`), not at full speed. The Beetle and the Otter were treated as not heavy; if Kesh calls either one heavy, remove its `CFG.toe` line and rebuild.
- New characters: measure the feet once after rigging, set `CFG.toe`, and the build does the rest. For a heavy character leave `CFG.toe` out.

## Added 2026-11-13: the trunk must not ride on the arms (Kesh, on the Bat)

Kesh, on the Bat's run with the wings out: "bat model this 2 i think rigged together? 大腿肉看着像和手那边绑一起了" (the thigh flesh looks bound to the arm side).

- What was wrong: weights by distance to the bones bound the sides of the round body and the thighs 50 to 75% to the wing arms, because the folded wing hangs right beside them in the rest pose. Raising a wing dragged the flank out into a triangle.
- The rule: the thick trunk follows only trunk and leg bones. Only the arm and what hangs from it (a wing sheet, a sleeve) follow the arm bones. The two blend only where they really join, measured along the surface, not through the air.
- The fix (`review-kit/thick.py` then `review-kit/reweigh.py <hero dir>`): `thick.py` measures the local thickness of the mesh at every vertex (a ray along the inward normal to the opposite wall). `reweigh.py` calls a vertex limb if it is thin (under 7 cm) and bound to an arm, trunk otherwise; trunk vertices keep arm weight only within 3 cm of the seam, limb vertices take trunk weight only within 6 cm of it, both measured along the mesh. It keeps the old files as `b_ji.prethigh.bin` and `b_jw.prethigh.bin`. Rebuild after it.
- Check for it on every new character: play a move with the arms raised to shoulder height and look at the trunk from the front and the back; it must keep its shape. `review-kit/scan.py <hero dir>` counts thick vertices that ride an arm, but it cannot tell on characters whose arms or sleeves are thick themselves (Tank, Healer), so look at those by eye.
- Done for the Bat (V6, 13 November): thick trunk vertices riding an arm over 30% went from 431 to 39 (the rest are at the shoulder). Stills in `bat-rebind-check/`. By the count the Fox, Hare, Otter and Beetle are clean.

## Passed 2026-11-13 12:32 UTC: no turned-out feet and the Bat rebind

Kesh: "now i checked, all mark pass". Passed versions: Healer V21, Fox V13, Hare V10, Otter V7, Beetle V7, Bat V6 (toes straight in walk and run; the Bat also with its body unbound from the wing arms). Tank stays V9 (heavy, exempt). The Beetle and Otter passed with straight toes, so they count as not heavy.
