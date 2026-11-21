# zslice.py <glb> <kit> <thick.npy> <thr>: per z bin, the y range and centre of the thick body near the midline
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[3]); thick = th >= float(sys.argv[4])
x, y, z = V.T
for a in np.arange(-0.5, 0.5, 0.04):
    s = thick & (z >= a) & (z < a + 0.04) & (np.abs(x) < 0.2)
    if s.sum(): print('z %.2f..%.2f' % (a, a + .04), 'y %.3f..%.3f' % (y[s].min(), y[s].max()), 'x %.3f' % np.abs(x[s]).max(), int(s.sum()))
