import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; th = np.load(sys.argv[3]); isw = np.load(sys.argv[4]); vw = np.zeros(len(V), bool); vw[M.F[isw].ravel()] = True
k = (z < -0.18) & (y > 0.38) & ~vw
lab = M.comps(k)
for c in np.unique(lab[lab >= 0]):
    q = lab == c; print('piece', q.sum(), V[q].min(0).round(3), V[q].max(0).round(3), 'thick', th[q].mean().round(3))
tc = M.tc; viol = (tc[:, 2] - tc[:, 1] > 14) & (tc[:, 0] - tc[:, 1] > 0) & (y < 0.47) & (y > 0.2)
for sg in (1, -1):
    q = viol & vw & (x * sg > 0); print('weed in wing', sg, q.sum(), V[q].min(0).round(3), V[q].max(0).round(3), 'thick', np.percentile(th[q], [10, 50, 90]).round(3))
    q2 = viol & ~vw & (x * sg > 0); print('  weed not in wing', q2.sum(), V[q2].min(0).round(3) if q2.any() else '', V[q2].max(0).round(3) if q2.any() else '')
    lab = M.comps(q)
    for c in np.unique(lab[lab >= 0]):
        p = lab == c
        if p.sum() > 8: print('    strand', p.sum(), V[p].min(0).round(3), V[p].max(0).round(3))
