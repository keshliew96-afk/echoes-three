#!/bin/bash
S=/tmp/claude-0/-home-user/abc95526-10ff-5672-b517-de825bbef76c/scratchpad
C=$S/mr/src/render/critters
cd $S/mr; npx vite --port 5200 --strictPort --host 127.0.0.1 > $S/vite.log 2>&1 &
VP=$!
sleep 8
cd $S/tools
cp $S/r2/reviewPathsFx.before.js $C/reviewPathsFx.js; cp $S/r2/reviewMossFx.before.js $C/reviewMossFx.js; sleep 3
RELOAD=1 W=1920 H=1080 DSF=2 NOCAP=1 EXT=png QS="&flat=1&seed=4" PORT=5200 node rec.cjs $S/r2/before $S/r2/ba.json > $S/r2/before.log 2>&1
cp $S/r2/after/reviewPathsFx.js $C/reviewPathsFx.js; cp $S/r2/after/reviewMossFx.js $C/reviewMossFx.js; sleep 3
RELOAD=1 W=1920 H=1080 DSF=2 NOCAP=1 EXT=png QS="&flat=1&seed=4" PORT=5200 node rec.cjs $S/r2/afterS $S/r2/ba.json > $S/r2/after.log 2>&1
kill $VP; pkill -f "vite --port 5200"
grep -c frames $S/r2/before.log $S/r2/after.log; grep -i "err " $S/r2/after.log | head -5
