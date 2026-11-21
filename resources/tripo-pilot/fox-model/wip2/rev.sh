#!/bin/bash
# rev.sh clip t0 t1 out [cams] : rows of 6 frames per camera
export NODE_PATH=$(npm root -g); cd $(dirname $0)
i=0; for c in ${5:-f s t}; do timeout 60 node shot.js "anim2.html?f=${GLB:-fox-new.glb}&clip=$1&n=6&cams=$c&half=1.3&cy=0.55&flat=1&t0=$2&t1=$3" _rv$i.png >/dev/null 2>&1; i=$((i+1)); done
python3 - $4 $i <<'P'
import sys
from PIL import Image
n=int(sys.argv[2]); ims=[Image.open('_rv%d.png'%i).crop((0,130,1200,500)) for i in range(n)]
o=Image.new('RGB',(1200,370*n))
for i,m in enumerate(ims):o.paste(m,(0,370*i))
o.save(sys.argv[1])
P
