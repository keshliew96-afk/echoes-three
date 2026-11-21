# legpath.py <glb> <thick.npy> <kit> <thr> <comp ids...>: per thin leg piece, centroids in bins of graph distance from its lowest point
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, scipy.sparse.csgraph as cg
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[2]); lab = M.comps(th < float(sys.argv[4]))
W = M.A.copy().tocoo(); Vw = np.zeros((M.nw, 3)); Vw[M.inv] = V
import scipy.sparse as sp
L = np.linalg.norm(Vw[W.row] - Vw[W.col], axis=1); G = sp.coo_matrix((L, (W.row, W.col)), shape=W.shape).tocsr()
for c in map(int, sys.argv[5:]):
    k = lab == c; wk = np.unique(M.inv[k]); sub = G[wk][:, wk]
    lo = wk[np.argmin(Vw[wk, 1])]; d = cg.dijkstra(sub, indices=list(wk).index(lo))
    print('piece', c, 'length %.3f' % d[np.isfinite(d)].max())
    for a in np.arange(0, d[np.isfinite(d)].max(), 0.03):
        s = (d >= a) & (d < a + 0.03)
        if s.sum(): print('  %.2f' % a, Vw[wk[s]].mean(0).round(3), int(s.sum()))
