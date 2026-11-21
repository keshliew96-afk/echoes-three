import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[2]); tc = M.tc; x, y, z = V.T; ax = np.abs(x)
lum = tc.sum(1); r, g, b = tc.T
zone = (y > 0.56) & (z > -0.12) & (z < 0.24)
for nm, k in (('zone thin', zone & (th < 0.03)), ('zone thick', zone & (th >= 0.03))):
    print(nm, k.sum(), 'lum pct', np.percentile(lum[k], [5, 25, 50, 75, 95]).round(0), 'b-g pct', np.percentile((b - g)[k], [5, 50, 95]).round(0))
dark = lum < 150
print('dark', dark.sum(), 'bbox', V[dark].min(0).round(3), V[dark].max(0).round(3))
bud = (b - g > 12) & (b > r + 6)
print('bud', bud.sum(), V[bud].min(0).round(3), V[bud].max(0).round(3))
purp = (r - g > 18) & (b - g > 25)
print('purple', purp.sum(), V[purp].min(0).round(3) if purp.any() else '', V[purp].max(0).round(3) if purp.any() else '')
white = lum > 520
print('white', white.sum(), V[white].min(0).round(3), V[white].max(0).round(3))
fig, axs = plt.subplots(1, 3, figsize=(40, 14))
cls = np.zeros((len(V), 3)) + 0.8
cls[dark] = [0, 0, 0]; cls[bud] = [0.2, 0.2, 1]; cls[purp] = [1, 0, 1]; cls[white] = [1, 0.6, 0]; cls[(th < 0.03) & ~dark & ~bud & ~purp & ~white] = [0.2, 0.8, 0.2]
for a, (k, hx, hy, t) in zip(axs, ((x > 0, 2, 1, 'left half'), (z > -9, 0, 1, 'front'), (y > 0.3, 0, 2, 'top'))):
    a.scatter(V[k, hx], V[k, hy], s=2, c=cls[k]); a.set_aspect('equal'); a.set_title(t); a.grid(True, lw=0.3); a.set_xticks(np.arange(-0.5, 0.51, 0.05)); a.set_yticks(np.arange(-0.5, 0.9, 0.05)); a.tick_params(labelsize=7)
plt.tight_layout(); plt.savefig(sys.argv[4], dpi=50)
