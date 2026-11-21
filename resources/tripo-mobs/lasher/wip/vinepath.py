# vinepath.py <glb> <thick.npy> <kit> <thr> <comp> <bin>: centreline of a thin piece by graph distance from its root (the vertex nearest the body centre)
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, scipy.sparse as sp, scipy.sparse.csgraph as cg
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[2]); lab = M.comps(th < float(sys.argv[4]))
W = M.A.copy().tocoo(); Vw = np.zeros((M.nw, 3)); Vw[M.inv] = V
L = np.linalg.norm(Vw[W.row] - Vw[W.col], axis=1); G = sp.coo_matrix((L, (W.row, W.col)), shape=W.shape).tocsr()
c = int(sys.argv[5]); b = float(sys.argv[6])
k = lab == c; wk = np.unique(M.inv[k]); sub = G[wk][:, wk]
ctr = np.array([0, 0.4, 0]); root = np.argmin(np.linalg.norm(Vw[wk] - ctr, axis=1))
d = cg.dijkstra(sub, indices=root); mx = d[np.isfinite(d)].max(); print('length %.3f root' % mx, Vw[wk[root]].round(3))
for a in np.arange(0, mx, b):
    s = (d >= a) & (d < a + b)
    if s.sum(): P = Vw[wk[s]]; print('  %.2f' % a, P.mean(0).round(3), 'r %.3f' % np.linalg.norm(P - P.mean(0), axis=1).mean(), int(s.sum()))
