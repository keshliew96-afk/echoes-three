import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; th = np.load(sys.argv[3]); lum = M.tc.sum(1)
w = (lum > 430) & (z > 0.03) & (y < 0.68) & (y > 0.36)
for y0 in np.arange(0.38, 0.68, 0.03):
    k = w & (y >= y0) & (y < y0 + 0.03)
    if k.any(): print('y %.2f n %4d  z %.3f..%.3f |x|<%.3f thick p10/50/90 %s  thin(<0.02) %d' % (y0, k.sum(), z[k].min(), z[k].max(), np.abs(x[k]).max(), np.percentile(th[k], [10, 50, 90]).round(3), (th[k] < 0.02).sum()))
