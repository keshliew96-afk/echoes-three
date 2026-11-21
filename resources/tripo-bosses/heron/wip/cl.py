import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; th = np.load(sys.argv[2]); tc = M.tc; x, y, z = V.T; ax = np.abs(x)
print('neck/head slices (y: z range, x range, n) for |x|<0.06, z>-0.06')
for yy in np.arange(0.62, 0.97, 0.02):
    k = (np.abs(y - yy) < 0.008) & (ax < 0.07) & (z > -0.07) & (th > 0.012)
    if k.sum() > 3: print('y %.2f  z %.3f..%.3f mid %.3f  x %.3f..%.3f n %d' % (yy, z[k].min(), z[k].max(), (z[k].min() + z[k].max()) / 2, x[k].min(), x[k].max(), k.sum()))
print('legs (x>0)')
for yy in np.arange(0.02, 0.44, 0.03):
    k = (np.abs(y - yy) < 0.008) & (x > 0.005) & (x < 0.085) & (z > -0.1) & (z < 0.06)
    if k.sum() > 3: print('y %.2f  z %.3f..%.3f mid %.3f  x %.3f..%.3f mid %.3f n %d' % (yy, z[k].min(), z[k].max(), (z[k].min() + z[k].max()) / 2, x[k].min(), x[k].max(), (x[k].min() + x[k].max()) / 2, k.sum()))
k = y < 0.03; print('foot x>0: z', z[k & (x > 0)].min().round(3), z[k & (x > 0)].max().round(3), 'x', x[k & (x > 0)].min().round(3), x[k & (x > 0)].max().round(3))
k = (z > 0.12) & (y > 0.76); print('bill tip', V[k][z[k].argmax()].round(3))
k = (y > 0.93); print('crest: z', z[k].min().round(3), z[k].max().round(3), 'top', V[y.argmax()].round(3))
k = (z < -0.1) & (y < 0.45); print('tail/wingtips: lowest', V[k][y[k].argmin()].round(3), 'rearmost', V[z.argmin()].round(3))
lum = tc.sum(1); r, g, b = tc.T
print('white', (lum > 560).sum(), V[lum > 560].min(0).round(2), V[lum > 560].max(0).round(2))
vi = (b.astype(int) - g > 25) & (r.astype(int) - g > 5); print('violet', vi.sum(), V[vi].min(0).round(2) if vi.any() else '', V[vi].max(0).round(2) if vi.any() else '')
