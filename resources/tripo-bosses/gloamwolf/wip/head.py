import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[2]); tc = M.tc; x, y, z = V.T; ax = np.abs(x)
c = tc / 255
fig, axs = plt.subplots(2, 4, figsize=(44, 22))
def sc(a, k, hx, hy, col, t, s=5):
    a.scatter(V[k, hx], V[k, hy], s=s, c=col[k] if col.ndim == 2 else col[k], cmap='viridis'); a.set_aspect('equal'); a.set_title(t); a.grid(True, lw=0.3)
    a.set_xticks(np.arange(np.floor(V[k, hx].min() * 50) / 50, V[k, hx].max() + 0.02, 0.02)); a.set_yticks(np.arange(np.floor(V[k, hy].min() * 50) / 50, V[k, hy].max() + 0.02, 0.02)); a.tick_params(labelsize=7)
hd = (z > 0.2) & (y > 0.5)
sc(axs[0, 0], hd & (x > 0), 2, 1, c, 'head left half, texture')
sc(axs[0, 1], hd & (ax < 0.012), 2, 1, c, 'head mid slice |x|<0.012', 12)
sc(axs[0, 2], hd, 0, 1, c, 'head front')
sc(axs[0, 3], hd & (x > 0), 2, 1, np.clip(th, 0, 0.1), 'head thickness')
mn = (z > -0.2) & (z < 0.3) & (y > 0.45)
sc(axs[1, 0], mn & (x > 0), 2, 1, c, 'mane side texture', 3)
sc(axs[1, 1], mn & (x > 0), 2, 1, np.clip(th, 0, 0.08), 'mane side thickness', 3)
sc(axs[1, 2], mn & (y > 0.5), 0, 2, np.clip(th, 0, 0.08), 'mane top thickness (x right, z up)', 3)
sc(axs[1, 3], (z < -0.3), 2, 1, np.clip(th, 0, 0.1), 'tail thickness', 4)
plt.tight_layout(); plt.savefig(sys.argv[4], dpi=50)
# colour stats
lum = tc.sum(1)
print('lum pct', np.percentile(lum, [5, 25, 50, 75, 95]))
viol = (tc[:, 2] - tc[:, 1] > 40) & (tc[:, 2] > 110)
print('violet verts', viol.sum(), 'bbox', V[viol].min(0).round(3) if viol.any() else None, V[viol].max(0).round(3) if viol.any() else None)
