#!/bin/bash
# rebuild.sh <worktree dir>: Mosslight's passed v40 review build on gauntlet ae0fc5d (never committed).
set -e
W=$1; T=/mnt/project-files/mosslight-abilities/tools; R=$T/review-only-build; K=$T/kit20
cd /home/user/echoes-three && git worktree add --detach $W ae0fc5d
cd $W && git apply $R/src-v26/review-build.diff && cp -r $R/src-v26/src/. src/
mkdir -p public/review && cp $R/src-v23/public/review/* public/review/ && cp $R/src-v15/review-*.html .
cp $R/flat-floor/arena.js src/scenes/arena.js
python3 $K/patch_sim.py src/sim/world.js; python3 $K/patch_fx.py src/render/critters/reviewPathsFx.js
for p in seed seed2 kesh4 sapling kit21 kit22 kit22b kit23 kit24 kit25 motion motion2 motion3; do python3 $K/patch_$p.py $W; done
cp /mnt/project-files/tripo-summons/lurelily/lurelily.glb /mnt/project-files/tripo-summons/snapjaw/snapjaw.glb public/review/
cp $T/motion/reviewCasts.js src/render/critters/; cp $T/motion/casts.json public/review/
cp /mnt/project-files/stonehide-abilities/tools/review-only-build/reviewFlatStage.js src/render/critters/
python3 /mnt/project-files/vfx-dream/mosslight/tools-vfx/tilefloor.py $W
npm ci --ignore-scripts
# then: npx vite --port 5200 --strictPort --host 127.0.0.1 (as a tracked background task)
