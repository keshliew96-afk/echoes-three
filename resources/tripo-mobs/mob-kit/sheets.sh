#!/bin/bash
# usage: sheets.sh glb outdir clip:n:cams[:t0:t1] ...
cd "$(dirname "$0")"; G=$1; O=$2; shift 2
for s in "$@"; do IFS=: read c n cams t0 t1 <<< "$s"; x=""; [ -n "$t0" ] && x="&t0=$t0&t1=$t1"
 W=${W:-2400} H=${H:-1000} node shot.js "anim.html?f=$G&clip=$c&n=$n&cams=$cams&half=${HALF:-0.8}&cy=${CY:-0.55}$x" $O/sheet_$c${t0:+_$t0}.png 2>&1 | grep -v "^$" | tail -2; done
