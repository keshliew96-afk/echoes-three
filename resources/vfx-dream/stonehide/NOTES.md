# Stonehide VFX dream loop (page only, game frozen)

Step 1 (19 Nov): four impact shots for Kesh to repaint in ChatGPT images.

- Taken in the page's review build (stonehide-abilities/tools/review-only-build applied to gauntlet ae0fc5d in a
  local worktree, never committed), flat floor, passed v10 moves (tools/motion/tank-tripo-moves.glb).
- Camera: the game's play camera (FOV 45, distance 12, 52 deg), not the page's narrowed FOV 28. Rendered at
  3840x2160 (1920x1080 at 2x); the targets are 1920x1080 native-pixel crops round the fight, full frames in full/.
- Review captions and legend hidden; game HUD kept.
- Jobs: the page's own all30.json entries S26 (full-Stone slam), S45, S23, S18 (settle2 4500 so the spawn
  rings are gone). Frames: heavy-slam 085, colossus 025, fault-line 033, landslide 023.
  Recorder: rec.cjs from stonehide-abilities/tools with W/H/DSF/from options (scratch copy).
- Crops (x,y in the 4K frame): heavy-slam 1040,464; colossus 900,464; fault-line 1200,424; landslide 1200,384.

Step 2 waits for his repaints: build page VFX to match, blind critic compares live shot vs target, aim 9/10.

## Round 2 (19 Nov, Kesh 19:55 SGT "except the 3, others also need a dream loop")

- 25 shots in round2/: every other skill on the page (S13 to S55, passives, basic attack and dash), same camera,
  seed 4, flat floor, 4K full frames in round2/full/, 1920x1080 crops. Combos (C1 to C9) and the Bare Claws moves wait.
- Jobs: the page's all30.json entries with from = impact frame - 2, settle2 4500, allies quiet except S13 and S20
  (they need ally hits). Frame picks and crop centres in round2/tools/crop.py; jobs j0-j2.json; recorder = rec.cjs here.
- Prompts: round2/PROMPTS.md (the round-1 base prompt plus one line per skill).
