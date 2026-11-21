import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[2]); tc = M.tc; x, y, z = V.T; ax = np.abs(x); c = np.clip(tc / 255 * 1.3, 0, 1)
fig, axs = plt.subplots(2, 4, figsize=(48, 30))
def sc(a, k, hx, hy, col, t, s=4, step=0.02):
    a.scatter(V[k, hx], V[k, hy], s=s, c=col[k]); a.set_aspect('equal'); a.set_title(t); a.grid(True, lw=0.3); a.set_facecolor('#888')
    a.set_xticks(np.arange(np.floor(V[k, hx].min() / step) * step, V[k, hx].max() + step, step)); a.set_yticks(np.arange(np.floor(V[k, hy].min() / step) * step, V[k, hy].max() + step, step)); a.tick_params(labelsize=6)
tcol = plt.cm.viridis(np.clip(th / 0.08, 0, 1))[:, :3]
sc(axs[0, 0], x > 0, 2, 1, c, 'left half side (z right)')
sc(axs[0, 1], x > -9, 0, 1, c, 'front (x right = its left)')
sc(axs[0, 2], x > 0, 2, 1, tcol, 'left half thickness')
sc(axs[0, 3], y > 0.2, 0, 2, tcol, 'top thickness (x right, z up)')
for a, yy in zip(axs[1], (0.3, 0.4, 0.5, 0.6)):
    k = np.abs(y - yy) < 0.006; sc(a, k, 0, 2, c, 'slice y=%.2f (x right, z up)' % yy, 14, 0.01)
plt.tight_layout(); plt.savefig(sys.argv[4], dpi=45)
print('lowest pts', V[y < 0.01][:, [0, 2]].min(0).round(3), V[y < 0.01][:, [0, 2]].max(0).round(3))
