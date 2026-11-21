#!/bin/bash
# tryb.sh : build, print draw misses and the key gaps
cd $(dirname $0); export NODE_PATH=$(npm root -g)
node build3.mjs hare-new.glb 2>&1 | grep "misses" | sed -E 's/ \[lift.*//' | tr '\n' ';'; echo
node audit2.js hare-new.glb a2.json; python3 - <<'P'
import json
b=json.load(open('a2.json')); b.pop('__bind'); b.pop('__at')
stand=[c for c in b if not c.startswith('down') and c!='revive']
for k in ['bow-head','bow-trunk','bow-legL','arrow-head','armR-head','pawR-head','tail-legL','y-legL','y-legR']:
    xs=sorted((v[k][0],c,v[k][1]) for c,v in b.items() if k in v and c in stand)[:4]
    print(k.ljust(12),xs)
P
