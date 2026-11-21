# legscan.py <glb> <thick.npy> <kit dir> <thr>: connected components of thin vertices; prints each one's extent
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[2]); thr = float(sys.argv[4])
lab = M.comps(th < thr)
for c in np.unique(lab[lab >= 0]):
    k = lab == c
    if k.sum() < 15: continue
    P = V[k]; lo, hi = P.min(0), P.max(0)
    print(c, k.sum(), 'x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f' % (lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]))
print('verts', len(V), 'th pct', np.percentile(th, [10, 25, 50, 75, 90]).round(3))
