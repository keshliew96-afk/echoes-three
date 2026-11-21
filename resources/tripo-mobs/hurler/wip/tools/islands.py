# islands.py <glb> <kit>: UV islands (faces joined by shared unwelded vertices), with bounds and how much lies in the sure-sack zone
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
M = Mesh(sys.argv[1]); V = M.V; F = M.F; x, y, z = V.T
n = len(V); e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
k, lab = connected_components(coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)), directed=False)
sure = ((x < -0.28) | (z < -0.2)) & (y > 0.6) & (y < 0.88)
print('islands', k)
rows = []
for c in range(k):
    m = lab == c
    if m.sum() < 3: continue
    P = V[m]; rows.append((m.sum(), c, sure[m].mean(), P.min(0).round(2), P.max(0).round(2)))
for r in sorted(rows, key=lambda r: -r[0]): print('%5d isl %3d sure %.2f  min %s max %s' % r)
np.save('islands.npy', lab)
