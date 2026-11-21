# per-frame turn of some joints (degrees a frame, local) and where they are. usage: python3 -I steps.py <glb> <clip> t0 t1 bone [bone ...]
import sys; sys.path.insert(0, sys.argv[0].rsplit('/', 2)[0] + '/kit')
import numpy as np
from glbanim import Rigged
R = Rigged(sys.argv[1]); c = sys.argv[2]; t0, t1 = float(sys.argv[3]), float(sys.argv[4]); bs = sys.argv[5:]; T = R.clips[c]['t']; qp = None
for f in range(R.nframes(c)):
    q, _, _ = R.local(c, f); M = R.world(c, f)
    if qp is not None and t0 <= T[f] <= t1:
        print('%5.3f ' % T[f] + '  '.join('%s %5.1f [%+.2f %+.2f %+.2f]' % (b, 2 * np.degrees(np.arccos(min(1, abs((q[R.ix[b]] * qp[R.ix[b]]).sum())))), *M[R.ix[b]][:3, 3]) for b in bs))
    qp = q
