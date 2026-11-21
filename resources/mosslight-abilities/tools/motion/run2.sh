#!/bin/bash
# run2.sh <log> <job file bases...>: records kit/<base>.json on the review copy (port 5200), then the page mp4
S=/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad
log=$1; shift
cd $S/tools
for n in "$@"; do
  nm=$(python3 -c "import json;print(json.load(open('kit/$n.json'))[0]['name'])")
  if PORT=5200 QS="&flat=1$(cat kit/$n.qs)" timeout 2400 node rec2.js $S/frames/kit kit/$n.json >> $log 2>&1; then
    bash mkvid.sh $S/frames/kit/$nm 15 $nm >> $log 2>&1 && echo "done $n $(date +%T)" >> $log
  else echo "FAILED $n" >> $log; fi
done
echo ALLDONE >> $log
