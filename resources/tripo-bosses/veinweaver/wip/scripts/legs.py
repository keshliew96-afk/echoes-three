import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r, g, b = tc.T
viol = (r > g + 25) & (b > g + 40)
# body extent per z: the half-width of the body (middle band of y)
for th in (0.16, 0.18, 0.2, 0.22):
    lab = M.comps((ax > th) & (y < 0.5))
    ids, cnt = np.unique(lab[lab >= 0], return_counts=True)
    big = ids[cnt > 150]
    print('th', th, 'pieces', len(big), sorted(cnt[cnt > 150].tolist(), reverse=True))
th = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
lab = M.comps((ax > th) & (y < 0.5)); ids, cnt = np.unique(lab[lab >= 0], return_counts=True)
for i in ids[cnt > 150]:
    m = lab == i; P = V[m]
    print('leg', m.sum(), 'min', P.min(0).round(3), 'max', P.max(0).round(3))
    # sample along: the highest point (knee), the innermost point (hip side), the tip
    k = P[P[:, 1].argmax()]; tip = P[P[:, 1].argmin()]; inn = P[np.abs(P[:, 0]).argmin()]
    print('   knee', k.round(3), 'tip', tip.round(3), 'inner', inn.round(3))
    # radial profile: centroid per distance band from inner point
    d = np.linalg.norm(P[:, [0, 2]] - inn[[0, 2]], axis=1)
    for a in np.arange(0, d.max(), 0.04):
        q = P[(d >= a) & (d < a + 0.04)]
        if len(q): print('     d %.2f c %s ylo %.3f yhi %.3f n %d' % (a, q.mean(0).round(3), q[:, 1].min(), q[:, 1].max(), len(q)))
