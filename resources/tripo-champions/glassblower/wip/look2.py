import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T
PA = np.array([-0.1482, 0.0, 0.101]); PU = np.array([0.037, 0.9991, -0.0194]); PU /= np.linalg.norm(PU)
t = (V - PA) @ PU; r = np.linalg.norm((V - PA) - np.outer(t, PU), axis=1); body = r > 0.02
for y0 in np.arange(0.0, 1.0, 0.03):
    b = (y > y0) & (y < y0 + 0.03) & body
    lab = M.comps(b); ids, cnt = np.unique(lab[lab >= 0], return_counts=True); o = []
    for i, n in sorted(zip(ids, cnt), key=lambda q: x[lab == q[0]].mean()):
        if n < 4: continue
        k = lab == i; o.append('n%d x[%.3f %.3f] z[%.3f %.3f]' % (n, x[k].min(), x[k].max(), z[k].min(), z[k].max()))
    print('y %.2f |' % y0, ' ; '.join(o))
