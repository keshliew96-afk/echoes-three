#!/bin/bash
# runmix.sh <log> <items...>: k:<id> = kit 2.0 clip on the patched copy (port 5200); g:<id> = tile-floor retake (5199)
S=/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad
log=$1; shift
cd $S/tools
for it in "$@"; do
  t=${it%%:*}; n=${it#*:}
  if [ $t = k ]; then
    if PORT=5200 QS="&flat=1$(cat kit/K20_$n.qs)" timeout 1500 node rec2.js $S/frames/kit kit/K20_$n.json >> $log 2>&1; then
      bash mkvid.sh $S/frames/kit/kit20_S$n 15 kit20_S$n >> $log 2>&1 && echo "done k:$n" >> $log
    else echo "FAILED k:$n" >> $log; fi
  else
    nm=kit_S$n; case $n in C*|S*) nm=kit_$n;; esac
    if QS="&flat=1$(cat kit/K$n.qs)" timeout 1500 node rec2.js $S/frames/kit kit/K$n.json >> $log 2>&1; then
      bash mkvid.sh $S/frames/kit/$nm 15 $nm >> $log 2>&1 && echo "done g:$n" >> $log
    else echo "FAILED g:$n" >> $log; fi
  fi
done
echo ALLDONE >> $log
