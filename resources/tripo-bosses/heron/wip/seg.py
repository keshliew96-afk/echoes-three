# Find the folded wings on the fused body: a minimum cut between wing seeds and body seeds that prefers to run along grooves.
# usage: python3 -I seg.py <glb> <kit> <out.npy> <dbg.glb>
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np, scipy.sparse as sp, scipy.sparse.csgraph as cg, trimesh
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; F = M.F; Fw = M.inv[F]; nF = len(F)
P = V[F]; fn = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]); fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-12; fc = P.mean(1)
# face pairs over welded edges
e = np.vstack([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]]); fid = np.tile(np.arange(nF), 3); es = np.sort(e, 1)
key = es[:, 0].astype(np.int64) * M.nw + es[:, 1]; o = np.argsort(key, kind='stable'); ks = key[o]; same = ks[1:] == ks[:-1]
a = fid[o][:-1][same]; b = fid[o][1:][same]; ev = es[o][:-1][same]
Vw = np.zeros((M.nw, 3)); Vw[M.inv] = V; ln = np.linalg.norm(Vw[ev[:, 0]] - Vw[ev[:, 1]], axis=1)
ang = np.arccos(np.clip((fn[a] * fn[b]).sum(1), -1, 1)); concave = ((fc[b] - fc[a]) * fn[a]).sum(1) > 0
w = np.where(concave, np.clip(1 - ang / 0.5, 0.03, 1), 1 + 2 * ang)
cap = np.maximum(1, (ln * w * 2e5).astype(np.int64))
x, y, z = fc.T; ax = np.abs(x); lum = M.tc[F].sum(2).mean(1)
wing = (ax > 0.112) & (y > 0.44) & (y < 0.62)
body = (ax < 0.028) | (y < 0.355) | (y > 0.70) | ((lum > 430) & (z > 0.03)) | ((y < 0.45) & (ax < 0.085) & (z > -0.075)) | ((z > 0.1))
r_, g_, b_ = M.tc[F].mean(1).T; viol = (b_ - g_ > 14) & (r_ - g_ > 0) & (y < 0.47) & (y > 0.2)
print('violet faces', viol.sum())
body &= ~wing & ~viol
print('seeds wing', wing.sum(), 'body', body.sum())
S_, T_ = nF, nF + 1; BIG = 10 ** 9
rows = np.r_[a, b, np.full(wing.sum(), S_), np.nonzero(body)[0]]; cols = np.r_[b, a, np.nonzero(wing)[0], np.full(body.sum(), T_)]
caps = np.r_[cap, cap, np.full(wing.sum(), BIG), np.full(body.sum(), BIG)]
G = sp.csr_matrix((caps, (rows, cols)), shape=(nF + 2, nF + 2)).astype(np.int32)
res = cg.maximum_flow(G, S_, T_); print('cut value', res.flow_value)
R = (G - res.flow).tocsr(); R.data[R.data < 0] = 0; R.eliminate_zeros()
reach = cg.breadth_first_order(R, S_, directed=True, return_predecessors=False); isw = np.zeros(nF + 2, bool); isw[reach] = True; isw = isw[:nF]
print('wing faces', isw.sum(), 'L', (isw & (x > 0)).sum(), 'R', (isw & (x < 0)).sum())
np.save(sys.argv[3], isw)
for sg in (1, -1):
    k = isw & (x * sg > 0); pts = P[k].reshape(-1, 3)
    print('side', sg, 'faces', k.sum(), 'bbox', pts.min(0).round(3), pts.max(0).round(3), 'violet in wing', (k & viol).sum(), 'of', (viol & (x * sg > 0)).sum())
    # boundary edges of the region
    inw = isw[a] != isw[b]; kk = inw & (fc[a][:, 0] * sg > 0); bp = (Vw[ev[kk, 0]] + Vw[ev[kk, 1]]) / 2
    print('  boundary edges', kk.sum(), 'bbox', bp.min(0).round(3), bp.max(0).round(3))
    # boundary by height band
    for y0 in np.arange(0.36, 0.68, 0.04):
        q = (bp[:, 1] >= y0) & (bp[:, 1] < y0 + 0.04)
        if q.any(): print('   y %.2f n %3d  z %.3f..%.3f  |x| %.3f..%.3f' % (y0, q.sum(), bp[q, 2].min(), bp[q, 2].max(), np.abs(bp[q, 0]).min(), np.abs(bp[q, 0]).max()))

col = np.full((nF, 4), 255, np.uint8); col[:, :3] = (np.clip(M.tc[F].mean(1) * 0.6, 0, 255)).astype(np.uint8); col[isw, 0] = 255; col[isw & (x < 0), 2] = 255; col[wing, 1] = 255; col[body, :3] //= 2
# unweld so the colours are per face
trimesh.Trimesh(P.reshape(-1, 3), np.arange(nF * 3).reshape(-1, 3), vertex_colors=np.repeat(col, 3, 0), process=False).export(sys.argv[4])
