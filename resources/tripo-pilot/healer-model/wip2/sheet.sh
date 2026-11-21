#!/bin/bash
# usage: sheet.sh clip n cams out [extra]
cd "$(dirname "$0")"; export NODE_PATH=$(npm root -g)
W=${W:-1800} H=${H:-800} node shot.js "anim.html?clip=$1&n=$2&cams=$3$5" $4
