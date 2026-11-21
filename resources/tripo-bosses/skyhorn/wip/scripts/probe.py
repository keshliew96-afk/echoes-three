import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; ax = np.abs(x); r, g, b = M.tc.T.astype(int); lum = r + g + b
brown = (r > b + 25) & (r > g + 8)
def rep(nm, k): print(nm, int(k.sum()), 'rgb', M.tc[k].mean(0).round(0) if k.any() else '-', 'bbox', V[k].min(0).round(3) if k.any() else '', V[k].max(0).round(3) if k.any() else '')
rep('brown all', brown)
rep('brown y>0.72', brown & (y > 0.72)); rep('brown 0.3-0.5 mid', brown & (y > 0.3) & (y < 0.5) & (ax < 0.06) & (z > 0.2))
rep('brown neck band', brown & (y > 0.4) & (y < 0.7) & (z > 0.0) & (z < 0.3) & ~((ax < 0.06) & (y < 0.47)))
yel = (r > 150) & (g > 110) & (b < 90); rep('yellow', yel)
rep('ears', (ax > 0.1) & (y > 0.67) & (y < 0.73) & (z > 0.15))
rep('dark low', (lum < 250) & (y < 0.07))
# head symmetry: head verts (z>0.24, y>0.55, y<0.73) mean x per z band
for z0 in (0.25, 0.3, 0.35, 0.4):
    k = (z > z0 - 0.025) & (z < z0 + 0.025) & (y > 0.55) & (y < 0.73)
    print('z', z0, 'n', int(k.sum()), 'mean x', round(float(x[k].mean()), 4), 'mid', round(float((x[k].min() + x[k].max()) / 2), 4))
k = brown & (y > 0.72)
for s in (1, -1):
    h = k & (np.sign(x) == s); print('horn', s, 'tip-ish max z', V[h][V[h][:, 2].argmax()].round(3), 'min z', V[h][V[h][:, 2].argmin()].round(3))
