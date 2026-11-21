# mask.py <glb> <kit> <out.png> <expr>: plots side (z,y from +x... all x), back-ish front (x,y), top (x,z); expr verts in red
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc.astype(float); x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T; lum = (r + g + b) / 3
k = eval(sys.argv[4]); print('mask', k.sum())
c = np.clip(tc / 255, 0, 1); c[k] = [1, 0, 0]
fig, axs = plt.subplots(1, 3, figsize=(30, 11))
for a, (h, v, nm) in zip(axs, ((2, 1, 'side z,y'), (0, 1, 'front x,y'), (0, 2, 'top x,z'))):
    o = np.argsort(V[:, {2: 0, 0: 2}[h]] * (1 if h == 0 else -1)) if v == 1 else np.argsort(y)
    if h == 2: o = np.argsort(-x)  # look from -x side: model's right side near
    a.scatter(V[o, h], V[o, v], s=5, c=c[o]); a.set_aspect('equal'); a.set_title(nm, fontsize=18)
    a.set_xticks(np.arange(-0.4, 0.41, 0.05)); a.set_yticks(np.arange(-0.4, 1.01, 0.05)); a.grid(True, lw=0.4); a.tick_params(labelsize=8)
plt.tight_layout(); plt.savefig(sys.argv[3], dpi=50)
