#!/bin/bash
# mk.sh out.glb [ONLY list]: join the passed clips with ours and bake
cd /home/user/wb/bake && cat clips.mjs new/*.mjs > wbclips.mjs && CLIPS=./wbclips.mjs ONLY="$2" node build3.mjs "$1" 2>&1 | grep -v "^palm"
