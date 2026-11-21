import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc/255; x, y, z = V.T
th = np.load(sys.argv[4])
fig, ax = plt.subplots(1, 1, figsize=(20, 13))
k = x > 0.0
ax.scatter(z[k], y[k], s=10, c=tc[k]**0.6)
ax.set_aspect('equal'); ax.grid(True, lw=0.6); ax.set_xticks(np.arange(-0.5, 0.52, 0.05)); ax.set_yticks(np.arange(0, 0.66, 0.05)); ax.tick_params(labelsize=13)
ax.minorticks_on(); ax.grid(True, which='minor', lw=0.2)
plt.tight_layout(); plt.savefig(sys.argv[3], dpi=60)
