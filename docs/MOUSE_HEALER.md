# The mouse healer model

From v0.5.329 the Healer is played by a skinned, textured mouse model with
keyframed clips, built in Blender from Kesh's Meshy mouse. The procedural chibi
(`src/render/critters/healer.js`) stays in the code as the fallback.

## Files

| What | Where |
|---|---|
| The model and its clips | `src/assets/heroes/mousehealer.glb` (1.7 MB, 1024 px WebP textures, 16 clips) |
| The rig code | `src/render/critters/mousehealer.js` |
| Where the Healer picks it | `healerBuilder()` in `src/render/critters/index.js` |
| The load at boot | `src/main.js`, before the first scene builds its heroes |
| Probe (in `npm test`) | `tools/mouse-healer-probe.mjs` |
| Game check and shots | `tools/mouse-healer-browser.mjs` (needs `npm run dev`) |
| Foot locks and IK run (Blender) | `tools/blender/mousehealer_footlock.py` |

The Blender source (all 15 clips, the Blender tooling, the trails) is kept
outside the repo with Kesh: `MouseHealer_rigged_animated.blend`.

## What the game asks for, and what plays

The game drives every hero through five clip names (`CLIPS` in
`src/render/critters/driver.js`). The Healer plays `cast` on each basic bolt
(the combo below), and each skill plays its own cast (below). A downed body
that is revived rises.

| Game clip | When | Model clip | Notes |
|---|---|---|---|
| `idle` | standing | `Idle` (2 s loop) | `Idle_Look` (1.6 s) plays about every 6.4 s, like the procedural look-around |
| `walk` | moving | `Run_F`, `Run_B`, `Strafe_L`, `Strafe_R` (0.4 s loops), blended by where she goes against where she faces | The planted foot moves back at exactly 2.4 u/s at rate 1, and the rate follows her real speed. See the self-check below. |
| `cast` | basic bolt (the player); basic and skills (AI seats) | `Bolt_1`, `Bolt_2`, `Bolt_3`, the combo below | Each shot is one hit, and its strike lands 2-3 frames after the shot. |
| `hurt` | struck | `Hit` (0.97 s, held) | |
| `downed` | 0 HP | `Death` (2.2 s at ×1.5, lands in ~0.75 s, held lying) | The ring still grows, and the body still greys through the driver's `desat`. |
| (rise) | revived | `Revive` (1.73 s at ×2, ~0.87 s) | Starts in the exact pose `Death` ends in. What the game asks for meanwhile plays once she is up (a hurt or a new down cuts in). |

The bolt emitter is the `StaffTip` node at the crystal (`tipWorld()`), and the
head is `Bone_023` (`headWorld()`). The gem keeps its Bright Heal halo and
flare, lifted on cast and dimmed when down, as on the procedural gem.

Clips in the Blender file that the game does not drive yet: `Cast_Channel`,
`Attack_Epic`, `Dodge` and `Victory`. They are left out of the game file.

## Skill casts

Each skill plays the cast that fits its shape. The shape comes from the
`skill_cast` event (the player) and the `ally_cast` event (an AI Healer).
The cast starts on the frame just before its strike, so the strike lands within
about 0.25 s of the cast while the wind-up still shows. This is render only:
skill timing and damage are untouched.

| Shape | Healer skills | Clip | What it shows |
|---|---|---|---|
| projectile | Mending Bolt, Spirit Bolt, Lantern Flurry, Pale Lance | `Cast_Bolt` | two-hand staff thrust, the gem leading the bolt |
| direct | Swift Mend, Guardian Bond, Kindred Shield, Lantern Ward | `Cast_Quick` | the free palm pushed toward the ally it lands on |
| nova | Nova Bloom, Hearthsong, Bell Toll | `Cast_Area` | staff high overhead, then slammed down: the burst |
| ground_aoe | Dewfall, Sanctuary, Rootsnare, Dawn Brand | `Attack` | an overhead staff strike on the ground ahead |
| melee_arc | Mending Tide, Restorative Wave | `Bolt_1` | the wide horizontal sweep: the wave's arc |
| anything else (the auras) | Quiet Hearth, Warding Aura | `Cast_Bolt` | |

`SKILL_CAST` in `mousehealer.js` holds the table. A skill breaks the basic
combo, so the next shot is hit 1. The player's rig holds a skill cast for
0.75 s standing (0.28 s moving); an AI Healer holds it for its usual cast hold.
The procedural rigs have no `castSkill` and keep their single cast pose.

## The basic-attack combo

Each basic shot plays the next hit of a three-hit staff combo. This is
render only: bolt timing, damage and the sim are untouched, and the nine
goldens stay identical.

The arena counts the shots (`comboStep` in `src/scenes/arena.js`). A shot
within `COMBO_WINDOW` (0.9 s) of the last one is the next hit; a later shot,
or a hit taken, starts again at hit 1. The count goes to the model as
`setAnim('cast', phase, step)`. The AI seats pass no step, so the model
counts their shots by the same window.

| Hit | Direction | Anticipation (frame 0) | Strike | Contact | Follow-through, then held |
|---|---|---|---|---|---|
| 1 Sweep | horizontal, back-left to front-right at chest height | staff cocked behind the left hip; hips +18°, chest +28° wound toward the staff; eyes on the target | 1 | 2 (tip ~30 m/s) | 3-4 overshoot past the right, 4-9 the staff keeps rotating up behind the right shoulder: hit 2's wind-up, held to 28 |
| 2 Rising sweep | reverse diagonal, low right to high front | staff high behind the right shoulder; hips -20°, chest -38° | 1 | 2 (~24 m/s) | 3-4 over the top, 4-9 it carries on overhead and back: hit 3's wind-up on the toes, held to 28 |
| 3 Slam | overhead, down into the ground in front | staff overhead, tilted back; on the toes, chest arched back | 2 | 3 (~39 m/s), deep lunge, root 8 cm forward | 4-6 skids deeper, 10 rebounds, 14 lifts the staff in front, 20 swings it back left: hit 1's wind-up, held to 34 |

At 30 fps the basic attack repeats every 15 frames (0.5 s). Each hit therefore
has about 2-3 frames of strike, 2 of overshoot, and 5 to settle into the next
wind-up. The rest of the 15 is the next wind-up held, so every new shot snaps
straight from anticipation into strike.

**Momentum inheritance.** No hit passes through idle. Each clip ENDS in the
exact pose the next hit STARTS in (the probe checks every bone within 6°, and
they match within 0.1°). The follow-through keeps turning the same way the
strike went:
- the sweep's rightward swing rises into the shoulder cock;
- the rising sweep carries over the top into the overhead wind-up;
- the slam's recovery swings back to the left.

So the overshoot and settle of one hit IS the anticipation of the next.

**Weight of the staff.**
- The power rolls up the body. Hips lead at frame 0, then the chest a frame
  later, then the shoulder, the forearm, and the hand and staff last (+1), so
  the heavy end trails and then whips.
- The cape (+2 to +4) and the tail (+1 to +4) lag behind that.
- The staff's mass sits in its crystal end, so every strike is carried by the
  whole body: the hips turn up to 20° and the chest a further 38° (58° in
  all), and the knees bend. The arm never swings it alone.
- The overshoot frames let the crystal drag past the target before the body
  stops it.
- Before the slam the body rises onto its toes and lands into a deep lunge,
  the root dropping and sliding 8-10 cm forward. That is what sells a heavy weapon rather
  than a light stick.

## Self-check (Kesh's three rules, v0.5.330)

These rules stand for all animation work on the mouse:
1. The root's movement and the legs' movement share one velocity vector.
2. A planted foot does not slide.
3. The hips and legs drive and support every swing.

What was wrong in v0.5.329, measured on every clip in Blender:
- **The run (rule 1).** One forward run clip played for every move. She faces
  her aim, so backing away from the cursor ran forward while she travelled
  backward, and strafing ran forward sideways.
- **Run speed (rule 2).** The run's planted foot moved back at about 1 u/s while
  the body moved 2.4 u/s, so the feet skated.
- **Standing clips (rule 2).** Planted feet slid 3 to 68 cm over a clip. The
  worst were `Cast_Quick` (68 cm), `Cast_Bolt` (51 cm), `Bolt_3` (50 cm),
  `Attack` (27 cm), `Bolt_1` (21 cm) and `Hit` (18 cm). Root offsets (lunges,
  recoils) carried both feet along with the body, and stance changes were
  blended rather than stepped.
- **Moving casts (rules 1 and 3).** A cast while moving played its standing
  feet and its own lunge while the game slid the body: the legs did not carry
  her.
- **The slam and the flinch (rule 3).** `Bolt_3` lunged with no step; `Hit`
  recoiled 9 cm with both feet dragged back.

The fixes:
- **IK foot locks, baked** (`tools/blender/mousehealer_footlock.py`,
  `lock_bake`). A planted foot is locked to the floor, and steps only when the
  stance needs it, with a short lift.
  - The foot moving with the body steps first: the slam's front foot, and the
    flinch's back foot (a defensive step back). The other foot stays as the
    push-off anchor.
  - The combo is baked as one chain, so each hit starts on the feet the last
    one ended on.
  - Result: no planted foot moves more than 0.3 cm a frame in any standing
    clip (the probe measures it), and every clip still meets the next.
- **A four-way run from IK foot paths** (`gen_loco`).
  - The planted foot moves back along the run's direction at exactly 2.4 u/s,
    for a third of a 12-frame cycle (2.5 strides a second, a mouse's scurry).
  - The game blends the four by her travel in her facing frame
    (`critters/index.js` reads it from the body's own motion).
  - The rate is her speed / 2.4, so the feet hold still on the floor at any
    speed.
  - She leans into each run: forward, a little back when backpedalling, and to
    the side on a strafe.
- **Casting or flinching on the move** plays the clip's upper body only, over
  the run's legs, hips and root, so her feet keep stepping the way she
  travels. Standing, the clip plays whole, its planted steps included.

- **Live foot locks in the game** (Kesh's follow-up pick; `liveLocks` in
  `mousehealer.js`). The game turns her on the spot whenever her aim moves,
  and it blends clips into each other. Both used to swing her planted feet
  round with the body. Now, while she stands:
  - Each planted foot is held where it landed, by a two-bone IK on the thigh
    and shin (knee kept in the clip's own plane, foot kept at its landed
    angle).
  - A foot steps once the body has shifted 7 cm or twisted 0.6 rad over it.
    The step is lifted 3.5 cm, takes 0.14 s, and lands on the clip's own foot
    position.
  - One foot steps at a time, the one most out of place first; the other
    anchors.
  - A foot the clip itself lifts (a hop, a baked step) follows the clip.
  - The locks fade in over about 0.17 s when she stops, and off while she
    runs, lies down or gets up (those clips carry their own foot work).
  - Checked in the game: turning 2.4 rad and back, the worst planted slide is
    0.01 cm a frame, and she steps round 14 times.
  - A foot the clip lifts hands back from its lock over 0.1 s (no pop). A lock
    the body has jumped away from (a teleport, a room change) is dropped. The
    locks switch off at once when she sets off.
- **Blending rules** (from an independent review of the change):
  - The clips are normalised to a total weight of 1, and the run fills
    whatever they leave, so no hand-off ever blends toward the bind pose. The
    game check asserts this for upper and lower body through
    run, cast, stop, idle and run.
  - The bones edited after the mixer (chest, head, legs) go back to the clip
    pose before each update, so the IK never reads its own output.
  - The four runs all plant the left foot at phase 0 and the right at 0.5,
    so diagonals blend in step. On a diagonal the rate is divided by
    |sum of w_i d_i|, so the blended planted foot still moves at her speed.
  - Casting on the move puts the cast's own pelvis turn back on the chest,
    so the torso still winds and unwinds through the strike over the running
    legs (rule 3).

Limits: the arenas are flat, so the locks hold the feet at the clip's own
height; on a slope or stairs a foot would float or sink.

## Look

- Toon shading: the painted textures sit on `MeshToonMaterial` with the party's
  3-step gradient, so the hit flash (toon emissive) and the downed greying reach
  the model.
- Readability pass (Kesh's pick):
  - The lit colour is lifted ×1.18 (`LIFT`), because the painted textures read
    darker than the toon party.
  - The party's 2.7 px ink line is drawn by a skinned hull
    (`addSkinnedInk` in `common.js`). It is welded across the UV seams and
    skinned by the body's own skeleton, so it follows every clip.
  - The head tips back 0.2 rad on top of every clip (`CHIN_UP`, faded out
    while down), so the face shows under the hood at the 52° gameplay camera,
    as the procedural rigs' chin-up does.
- Scaled to the party's 1.10 u standing height (the model is 1.70 m in Blender).

## Switching back

- `HEALER_MODEL = 'classic'` in `src/render/critters/mousehealer.js` puts the
  procedural healer back everywhere.
- In a harness build, `?healer=classic` does the same for one page.
- A model that fails to load, or takes over 8 s, also leaves the procedural
  healer in place for that session.

## Checks

- `node tools/mouse-healer-probe.mjs` checks:
  - the file: one 77-bone skin, the `StaffTip` and head nodes, WebP textures, under 2 MB;
  - the fourteen clips, that every game clip maps to one of them, and that every skill shape's cast clip is in the file;
  - that `Revive` starts within 6° of where `Death` ends, and each combo hit within 6° of where the hit before it ends, for every bone;
  - the three rules by forward kinematics: each run's planted foot moves against its travel at 2.4 u/s, no planted foot in a standing clip moves 0.3 cm a frame, and a foot steps with the body wherever a strike or flinch moves it over 4 cm;
  - the fallback.
- `node tools/mouse-healer-browser.mjs` checks, in the real game:
  - held fire walks the combo 1, 2, 3;
  - a skill key plays its own cast, and every shape maps to its clip;
  - a hit plays `Hit`;
  - 0 HP plays `Death` and holds, unless an ally revives her first;
  - a revive plays `Revive` and ends standing;
  - the camp builds the mouse;
  - `?healer=classic` keeps the old rig;
  - running toward, away from and across the aim plays `Run_F`, `Run_B` and a strafe, at a stride rate matching her speed;
  - casting while running plays the cast's upper half over the running legs.
  - turning on the spot keeps the planted feet still (worst slide under 0.1 cm a frame) while she steps round.

  It also writes the shots `captures/mouse-1..6`, the combo hits
  `mouse-2-hit1..3` and a skill cast `mouse-2-skill`.
