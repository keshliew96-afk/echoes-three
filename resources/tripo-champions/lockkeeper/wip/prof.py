import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); x, y, z = M.V.T
for y0 in np.arange(0.1, 1.0, 0.05):
    m = (y >= y0) & (y < y0 + 0.05); c = m & (np.abs(x) < 0.1)
    print('y %.2f  x [%.3f %.3f]  z all [%.3f %.3f]  z centre [%.3f %.3f]' % (y0, x[m].min(), x[m].max(), z[m].min(), z[m].max(), z[c].min() if c.any() else 0, z[c].max() if c.any() else 0))
