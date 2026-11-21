#!/bin/bash
S=/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad
log=$1; shift
cd $S/tools
for n in "$@"; do
  QS="&flat=1&vignette=0$(cat kit/K$n.qs)" timeout 1500 node rec2.js $S/frames/kit kit/K$n.json >> $log 2>&1
  nm=kit_S$n; case $n in C*|S*) nm=kit_$n;; esac; bash mkvid.sh $S/frames/kit/$nm 15 $nm >> $log 2>&1 && echo "done $n" >> $log
done
echo ALLDONE >> $log
