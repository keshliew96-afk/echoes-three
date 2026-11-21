# bill tip (or any bone-local point) through a clip. usage: python3 -I tip.py <glb> <clip> <bone> x y z [every]
import sys; sys.path.insert(0, sys.argv[0].rsplit('/', 2)[0] + '/kit')
import numpy as np
from glbanim import Rigged
R = Rigged(sys.argv[1]); c = sys.argv[2]; b = R.ix[sys.argv[3]]; p = np.array(list(map(float, sys.argv[4:7])) + [1.0]); ev = int(sys.argv[7]) if len(sys.argv) > 7 else 1
for f in range(0, R.nframes(c), ev):
    w = R.world(c, f) [b] @ p; print('%5.3f  x %+.3f  y %+.3f  z %+.3f' % (R.clips[c]['t'][f], w[0], w[1], w[2]))
