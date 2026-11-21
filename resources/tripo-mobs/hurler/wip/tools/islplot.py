# islplot.py <glb> <kit> <out.png> ids...: side (z,y, x<-0.05), front (x,y, z>-0.1 ... all), back (x,y) with the given islands coloured and labelled
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; lab = np.load('islands.npy'); ids = [int(a) for a in sys.argv[4:]]
cm = plt.get_cmap('tab20')
fig, axs = plt.subplots(1, 3, figsize=(30, 11))
for a, (h, v, nm, k, depth) in zip(axs, ((2, 1, 'right side z,y (x<-0.05)', x < -0.05, x), (0, 1, 'front x,y', z > -0.5, -z), (0, 1, 'back x,y', z > -0.5, z))):
    o = np.argsort(-depth[k]); P = V[k][o]; L = lab[k][o]
    col = np.array([cm(ids.index(l) % 20) if l in ids else (0.75, 0.75, 0.75, 1) for l in L])
    a.scatter(P[:, h], P[:, v], s=8, c=col)
    for i, l in enumerate(ids):
        m = (lab == l) & k
        if m.any(): c = V[m].mean(0); a.text(c[h], c[v], str(l), fontsize=13, weight='bold')
    a.set_aspect('equal'); a.set_title(nm, fontsize=18); a.set_xticks(np.arange(-0.4, 0.41, 0.05)); a.set_yticks(np.arange(0.4, 1.01, 0.05)); a.set_ylim(0.45, 1.0); a.grid(True, lw=0.4)
plt.tight_layout(); plt.savefig(sys.argv[3], dpi=50)
