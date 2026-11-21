#!/bin/bash
# usage: mont.sh out.png cams clip...
out=$1; cams=$2; shift; shift; fl=""
for c in "$@"; do W=1560 H=${H:-290} node shot.js "anim.html?f=${F:-fox-rigged.glb}&clip=$c&n=${N:-6}&cams=$cams&half=${HALF:-0.95}&cy=0.6&flat=1" m-$c.png; fl="$fl m-$c.png"; done
python3 -c "
import sys;from PIL import Image
ims=[Image.open(f) for f in sys.argv[2:]];W=ims[0].width;H=sum(i.height for i in ims);o=Image.new('RGB',(W,H));y=0
for i in ims:o.paste(i,(0,y));y+=i.height
o.save(sys.argv[1])" $out $fl
