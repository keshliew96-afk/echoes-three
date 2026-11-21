import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; tc = M.tc.astype(int); lum = tc.sum(1)
pale = (lum > 340) & ((tc[:, 2] - tc[:, 0]) < 3)
fig, axs = plt.subplots(1, 2, figsize=(22, 16))
for a, (h, v) in zip(axs, ((x, y), (z, y))):
    a.scatter(h[~pale], v[~pale], s=5, c='0.8'); a.scatter(h[pale], v[pale], s=14, c='r'); a.set_aspect('equal'); a.set_xticks(np.arange(-0.3,0.31,0.05)); a.set_yticks(np.arange(0,1.01,0.05)); a.grid(True, lw=0.5)
plt.tight_layout(); plt.savefig(sys.argv[3], dpi=50)
