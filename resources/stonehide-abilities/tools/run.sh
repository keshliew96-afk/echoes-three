#!/bin/bash
# run.sh OUT JOBS [JOBS2 ...]: start the dev server if it is down, then record each jobs file in parallel (max 2)
cd /home/user/echoes-three
if ! curl -s -o /dev/null http://127.0.0.1:5199/; then
  (npm run dev > /tmp/claude-0/sh/dev.log 2>&1 &)
  for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:5199/ && break; sleep 1; done
fi
cd /tmp/claude-0/sh
out=$1; shift
pids=()
for j in "$@"; do
  n=$(basename $j .json)
  FLAT=1 node rec.cjs $out jobs/$n.json > $n.log 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait $p; done
for j in "$@"; do n=$(basename $j .json); grep -E "frames|Error" $n.log | tail -n 20; done
