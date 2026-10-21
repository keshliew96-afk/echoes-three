# The mouse healer model

From v0.5.329 the Healer is played by a skinned, textured mouse model with
keyframed clips, built in Blender from Kesh's Meshy mouse. The procedural chibi
(`src/render/critters/healer.js`) stays in the code as the fallback.

## Files

| What | Where |
|---|---|
| The model and its clips | `src/assets/heroes/mousehealer.glb` (1.3 MB, 1024 px WebP textures, 8 clips) |
| The rig code | `src/render/critters/mousehealer.js` |
| Where the Healer picks it | `healerBuilder()` in `src/render/critters/index.js` |
| The load at boot | `src/main.js`, before the first scene builds its heroes |
| Probe (in `npm test`) | `tools/mouse-healer-probe.mjs` |
| Game check and shots | `tools/mouse-healer-browser.mjs` (needs `npm run dev`) |

The Blender source (all 15 clips, the Blender tooling, the trails) is kept
outside the repo with Kesh: `MouseHealer_rigged_animated.blend`.

## What the game asks for, and what plays

The game drives every hero through five clip names (`CLIPS` in
`src/render/critters/driver.js`). Every Healer action uses `cast`: the basic
bolt and all 19 skills. A downed body that is revived rises.

| Game clip | When | Model clip | Notes |
|---|---|---|---|
| `idle` | standing | `Idle` (2 s loop) | `Idle_Look` (1.6 s) plays about every 6.4 s, like the procedural look-around |
| `walk` | moving | `Run` (0.67 s loop, ×1.05) | Her 2.4 u/s is a trot for her size. The cadence (1.5 strides/s) matches the procedural walk's 1.55 Hz. |
| `cast` | basic bolt, every skill | `Cast_Bolt` (1.4 s) | An instant cast starts at the release (0.4 s), so the gem is already thrusting when the bolt leaves it. Hold-to-repeat restarts it on every shot. |
| `hurt` | struck | `Hit` (0.97 s, held) | |
| `downed` | 0 HP | `Death` (2.2 s, held lying) | The ring still grows, and the body still greys through the driver's `desat`. |
| (rise) | revived | `Revive` (1.73 s at ×2, ~0.87 s) | Starts in the exact pose `Death` ends in. What the game asks for meanwhile plays once she is up (a hurt or a new down cuts in). |

The bolt emitter is the `StaffTip` node at the crystal (`tipWorld()`), and the
head is `Bone_023` (`headWorld()`). The gem keeps its Bright Heal halo and
flare, lifted on cast and dimmed when down, as on the procedural gem.

Clips in the Blender file that the game does not drive yet: `Walk`,
`Cast_Quick`, `Cast_Channel`, `Cast_Area`, `Attack`, `Attack_Epic`, `Dodge`,
`Victory`. They are left out of the game file.

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
  - the eight clips, and that every game clip maps to one of them;
  - that the cast release sits inside `Cast_Bolt`;
  - that `Revive` starts within 6° of where `Death` ends, for every bone;
  - the fallback.
- `node tools/mouse-healer-browser.mjs` checks, in the real game:
  - firing plays `Cast_Bolt`, a hit plays `Hit`, and 0 HP plays `Death` and holds;
  - a revive plays `Revive` and ends standing;
  - the camp builds the mouse;
  - `?healer=classic` keeps the old rig.

  It also writes the shots `captures/mouse-1..6`.
