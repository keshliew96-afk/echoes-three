import sys, numpy as np
sys.path.insert(0, sys.argv[2])
import rigkit as rk
M = rk.Mesh(sys.argv[1]); V = M.V
print('bounds', V.min(0), V.max(0))
for y in np.arange(0.40, 1.0, 0.04):
    k = np.abs(V[:, 1] - y) < 0.012
    if k.sum() < 5: continue
    P = V[k]; print('y %.2f n %4d x [%.3f %.3f] z [%.3f %.3f] zc %.3f' % (y, k.sum(), P[:, 0].min(), P[:, 0].max(), P[:, 2].min(), P[:, 2].max(), P[:, 2].mean()))
