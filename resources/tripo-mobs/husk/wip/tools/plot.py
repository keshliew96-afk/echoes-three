import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc/255; x, y, z = V.T
fig, axs = plt.subplots(1, 2, figsize=(40, 14), gridspec_kw={'width_ratios':[3,1]})
k = x > -0.005
axs[0].scatter(z[k], y[k], s=6, c=tc[k]); axs[0].set_aspect('equal'); axs[0].grid(True, lw=0.4)
axs[0].set_xticks(np.arange(-0.5, 0.52, 0.02)); axs[0].set_yticks(np.arange(0, 0.66, 0.02)); axs[0].tick_params(labelsize=7)
axs[1].scatter(x, y, s=4, c=tc); axs[1].set_aspect('equal'); axs[1].grid(True, lw=0.4); axs[1].set_xticks(np.arange(-0.14, 0.15, 0.02)); axs[1].set_yticks(np.arange(0, 0.66, 0.02)); axs[1].tick_params(labelsize=7)
plt.tight_layout(); plt.savefig(sys.argv[3], dpi=45)
