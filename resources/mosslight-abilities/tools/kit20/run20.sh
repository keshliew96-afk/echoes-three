#!/bin/bash
# run20.sh <log> <ids...>: kit 2.0 clips on the tile floor (jobs kit/K20_<id>.json -> page/vid/kit20_S<id>.mp4)
S=/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad
log=$1; shift
cd $S/tools
for n in "$@"; do
  if PORT=${PORT:-5199} QS="&flat=1$(cat kit/K20_$n.qs)" timeout 1500 node rec2.js $S/frames/kit kit/K20_$n.json >> $log 2>&1; then
    bash mkvid.sh $S/frames/kit/kit20_S$n 15 kit20_S$n >> $log 2>&1 && echo "done $n" >> $log
  else echo "FAILED $n" >> $log; fi
done
echo ALLDONE >> $log
