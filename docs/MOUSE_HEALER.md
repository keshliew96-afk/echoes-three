# The mouse healer model

From v0.5.329 the Healer is played by a skinned, textured mouse model with
keyframed clips, built in Blender from Kesh's Meshy mouse. The procedural chibi
(`src/render/critters/healer.js`) stays in the code as the fallback.

## Files

| What | Where |
|---|---|
| The model and its clips | `src/assets/heroes/mousehealer.glb` (1.5 MB, 1024 px WebP textures, 10 clips) |
| The rig code | `src/render/critters/mousehealer.js` |
| Where the Healer picks it | `healerBuilder()` in `src/render/critters/index.js` |
| The load at boot | `src/main.js`, before the first scene builds its heroes |
| Probe (in `npm test`) | `tools/mouse-healer-probe.mjs` |
| Game check and shots | `tools/mouse-healer-browser.mjs` (needs `npm run dev`) |

The Blender source (all 15 clips, the Blender tooling, the trails) is kept
outside the repo with Kesh: `MouseHealer_rigged_animated.blend`.

## What the game asks for, and what plays

The game drives every hero through five clip names (`CLIPS` in
`src/render/critters/driver.js`). The player's Healer plays `cast` on each
basic bolt (`basic_fire`); an AI Healer plays it for both basics and skills. A
downed body that is revived rises.

| Game clip | When | Model clip | Notes |
|---|---|---|---|
| `idle` | standing | `Idle` (2 s loop) | `Idle_Look` (1.6 s) plays about every 6.4 s, like the procedural look-around |
| `walk` | moving | `Run` (0.67 s loop, ×1.05) | Her 2.4 u/s is a trot for her size. The cadence (1.5 strides/s) matches the procedural walk's 1.55 Hz. |
| `cast` | basic bolt (the player); basic and skills (AI seats) | `Bolt_1`, `Bolt_2`, `Bolt_3`, the combo below | Each shot is one hit, and its strike lands 2-3 frames after the shot. |
| `hurt` | struck | `Hit` (0.97 s, held) | |
| `downed` | 0 HP | `Death` (2.2 s, held lying) | The ring still grows, and the body still greys through the driver's `desat`. |
| (rise) | revived | `Revive` (1.73 s at ×2, ~0.87 s) | Starts in the exact pose `Death` ends in. What the game asks for meanwhile plays once she is up (a hurt or a new down cuts in). |

The bolt emitter is the `StaffTip` node at the crystal (`tipWorld()`), and the
head is `Bone_023` (`headWorld()`). The gem keeps its Bright Heal halo and
flare, lifted on cast and dimmed when down, as on the procedural gem.

Clips in the Blender file that the game does not drive yet: `Cast_Bolt`,
`Cast_Quick`, `Cast_Channel`, `Cast_Area`, `Attack`, `Attack_Epic`, `Dodge`,
`Victory`. They are left out of the game file.

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

## Look

- Toon shading: the painted textures sit on `MeshToonMaterial` with the party's
  3-step gradient, so the hit flash (toon emissive) and the downed greying reach
  the model.
- Scaled to the party's 1.10 u standing height (the model is 1.70 m in Blender).
- No ink hull: the inverted-hull outline does not follow a skinned mesh.

## Switching back

- `HEALER_MODEL = 'classic'` in `src/render/critters/mousehealer.js` puts the
  procedural healer back everywhere.
- In a harness build, `?healer=classic` does the same for one page.
- A model that fails to load, or takes over 8 s, also leaves the procedural
  healer in place for that session.

## Checks

- `node tools/mouse-healer-probe.mjs` checks:
  - the file: one 77-bone skin, the `StaffTip` and head nodes, WebP textures, under 2 MB;
  - the ten clips, and that every game clip maps to one of them;
  - that `Revive` starts within 6° of where `Death` ends, and each combo hit within 6° of where the hit before it ends, for every bone;
  - the fallback.
- `node tools/mouse-healer-browser.mjs` checks, in the real game:
  - held fire walks the combo 1, 2, 3, a hit plays `Hit`, and 0 HP plays `Death` and holds;
  - a revive plays `Revive` and ends standing;
  - the camp builds the mouse;
  - `?healer=classic` keeps the old rig.

  It also writes the shots `captures/mouse-1..6` and the combo hits
  `mouse-2-hit1..3`.
