import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; tc = M.tc; lum = tc.sum(1)
for zz in np.arange(0.04, 0.29, 0.02):
    k = (np.abs(z - zz) < 0.006) & (y > 0.76) & (y < 0.9)
    if k.sum() > 2:
        # look for a mouth line: darkest / most concave band
        yy = y[k]; print('z %.2f  y %.3f..%.3f  x ±%.3f  n %d  lum by y:' % (zz, yy.min(), yy.max(), np.abs(x[k]).max(), k.sum()), ' '.join('%d' % lum[k][(yy >= a) & (yy < a + 0.01)].mean() if ((yy >= a) & (yy < a + 0.01)).any() else '-' for a in np.arange(yy.min(), yy.max(), 0.01)))
k = (y > 0.84) & (lum > 500); print('white', k.sum(), V[k].min(0).round(3), V[k].max(0).round(3))
r, g, b = tc.T; vi = (b - g > 25) & (y > 0.8); print('violet head', vi.sum(), V[vi].min(0).round(3), V[vi].max(0).round(3))
