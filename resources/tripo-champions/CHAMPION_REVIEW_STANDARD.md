# Champion review standard

> Copied into the repo as `docs/tripo/CHAMPION_REVIEW_STANDARD.md` (PR #145, 2026-11-15). Once that PR merges, change the repo copy, not this one.

Champions follow the boss standard (`/mnt/project-files/tripo-bosses/BOSS_REVIEW_STANDARD.md`) and the hero standard
(`/mnt/project-files/tripo-pilot/CHARACTER_REVIEW_STANDARD.md`). This file holds only what the champions add.
Thread: "Rig and animate Tripo champions". Kit: `champion-kit/` (README.md there).

## Every champion page

- Moves: Idle, Walk, Turn left, Turn right, both abilities, Rage (plus the Enraged state as a toggle), Hurt, Heavy hit,
  Spawn, Death. Champion budget 12,000 triangles.
- Timings from `src/sim/enemies/champions.js` and `src/sim/champions.js` (entrance 96 ticks; rage below half health:
  cooldowns x0.7, speed x1.15) and the beats in `src/render/facet/beats.js` (a frame is 1/30 s: strike 2.5, held 3,
  spawn grow 7).
- A page after the first lists what changed under "Changed in Version N" and marks the changed rows "new".

## Rules from Kesh

- **No 外八 (13 Nov 2026).** In the walk and the run of every humanoid the legs must not splay: the feet fall close to one
  line and the knees and toes point straight ahead. A Tripo model often stands with its legs spread and its boots turned
  out; the walk closes them (narrow the track to about the hip joints' width and turn each boot in until it points
  ahead). Exception, his words: "unless it is a tank-like / heavy character". Heavy champions may keep a wide,
  turned-out step.
- **A picture is a pose to hit.** When he sends a picture for a move ("end up like image", "this feeling"), the move
  ends in or carries that pose, and the page says where the model cannot match it (a short sword, a fixed shield).
- Death does not have to be a fall. The Briar Knight ends on one knee with his sword planted (his picture, 13 Nov).

## Checks added by the champions

- An arm that reaches for a point must keep the twist it was modelled with. Look at the shoulder plate of a reaching arm
  from the front and from behind before sending (the Briar Knight's Version 1 had the sword arm twisted half a turn).
- Seen from the front, a walking champion's boots point at the camera.

## Status

**All 12 champion models PASSED** (Kesh, 15 Nov 2026 07:23 UTC, relayed by the coordinator): Briar Knight (Version 3,
both shields removed), Sluice Warden, Bone Reeve, Hollow Choir, Gale Herald, Moss Hart, Lockkeeper, Gravebell Ringer,
Vein Matron, Bell Abbess, Furnace Knight, Glassblower. Each passed model is `<folder>/<folder>-tripo-rigged.glb` with its
page under `<folder>/review/`. They become game assets only after the feature freeze is lifted.
