# Mosslight VFX dream loop (page only, game frozen)

Step 1 (19 Nov 07:50 UTC): four impact shots for Kesh to repaint in ChatGPT images.

- Review build: tools-vfx/rebuild.sh (v40 = src-v26 snapshot + flat floor + kit20 patches + motion pass, Stonehide tile
  floor via tilefloor.py) on gauntlet ae0fc5d in a scratch worktree, never committed. Dev server port 5200.
- Camera: the game's play camera (FOV 45). 1920x1080 at DSF 2 (3840x2160); targets are 1920x1080 native crops; full in full/.
  Caption, legend and guide overlay hidden (NOCAP=1), game HUD kept (out of crop). `&seed=4`. AI allies silenced per frame
  (job.every) so their bolts don't litter the shot.
- Recorder tools-vfx/rec.cjs, jobs tools-vfx/vjobs.json (fps 15). Frames: Swiftleaf 013, Dew Wave 005, Rootspear 011, Wispfall 012.
- Crops (x,y in 4K): swiftleaf 960,300; dew-wave 940,260; rootspear 1500,450; wispfall 1160,500.

Step 2 waits for his repaints. Judge: one persistent Fable subagent per skill; Opus builds; Kesh judges when stuck.
