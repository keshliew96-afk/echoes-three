import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; ax = np.abs(x)
for th in (0.17, 0.19, 0.2):
    lab = M.comps((ax > th) & (y < 0.5))
    rear = lab == lab[np.argmin(np.where((ax > 0.4) & (np.abs(z + 0.02) < 0.03) & (x > 0), y, 9))]
    F = M.F; inF = rear[F].all(1)
    print(th, 'rear leg verts', rear.sum(), 'faces', inF.sum())
