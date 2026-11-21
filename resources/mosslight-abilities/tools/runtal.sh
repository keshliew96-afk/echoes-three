#!/bin/bash
# runtal.sh <log> <T numbers...>: record each talent clip in its own page load, then encode it
S=/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad
log=$1; shift
cd $S/tools
for n in "$@"; do
  QS=$(cat tal/T$n.qs) timeout 1500 node rec2.js $S/frames/tal tal/T$n.json >> $log 2>&1
  fps=$(python3 -c "import json;print(json.load(open('tal/T$n.json'))[0].get('fps',20))")
  bash mkvid.sh $S/frames/tal/tal_T$n $fps tal_T$n >> $log 2>&1 && echo "done T$n" >> $log
done
echo ALLDONE >> $log
