#!/bin/bash
# sheets.sh out.png cams clip:t0:t1 ... : one contact sheet per clip (6 frames per camera row), stacked and labelled
S=$(dirname $0); out=$1; cams=$2; shift 2; i=0
for a in "$@"; do IFS=: read c t0 t1 <<<"$a"; GLB=${GLB:-hare-new.glb} HALF=${HALF:-1.0} CY=${CY:-0.5} $S/rev.sh $c $t0 $t1 /tmp/_sh$i.png "$cams"; i=$((i+1)); done
python3 - $out $i "$@" <<'P'
import sys
from PIL import Image, ImageDraw
out=sys.argv[1]; n=int(sys.argv[2]); labs=sys.argv[3:]
ims=[Image.open('/tmp/_sh%d.png'%i) for i in range(n)]
H=sum(m.size[1] for m in ims); o=Image.new('RGB',(1200,H)); y=0
for m,l in zip(ims,labs):
    o.paste(m,(0,y)); ImageDraw.Draw(o).text((6,y+4),l,fill=(200,30,30)); y+=m.size[1]
sc=float(__import__('os').environ.get('SC','0.8')); o=o.resize((int(1200*sc),int(H*sc))); o.save(out); print(o.size)
P
