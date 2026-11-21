#!/bin/bash
S=/tmp/claude-0/-home-user/abc95526-10ff-5672-b517-de825bbef76c/scratchpad
cd $S/mr; npx vite --port 5200 --strictPort --host 127.0.0.1 > $S/vite.log 2>&1 &
VP=$!
sleep 8
cd $S/tools
env RELOAD=1 W=1920 H=1080 DSF=1 NOCAP=1 EXT=png QS="&flat=1&seed=4" PORT=5200 node rec.cjs $S/r2/rs1 $S/r2/rs.json > $S/r2/rs1.log 2>&1 &
A=$!
sleep 20
env RELOAD=1 W=1920 H=1080 DSF=2 NOCAP=1 EXT=png QS="&flat=1&seed=4" PORT=5200 node rec.cjs $S/r2/dw2 $S/r2/dw.json > $S/r2/dw2.log 2>&1 &
B=$!
wait $A $B
kill $VP; pkill -f "vite --port 5200"
grep -c frames $S/r2/rs1.log $S/r2/dw2.log; grep -i "error" $S/r2/rs1.log | head -5
