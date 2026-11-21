import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r, g, b = tc.T
viol = (r > g + 25) & (b > g + 40)
lab = M.comps((ax > 0.2) & (y < 0.5)); leg = lab >= 0
body = ~leg
for zz in np.arange(-0.44, 0.44, 0.04):
    m = body & (z > zz) & (z < zz + 0.04)
    if m.any(): print('z %.2f x<=%.3f y %.3f..%.3f viol %.2f n %d' % (zz, ax[m].max(), y[m].min(), y[m].max(), viol[m].mean(), m.sum()))
# where the abdomen meets the thorax, and the head
f = body & ~viol
print('dark body z range', z[f].min().round(3), z[f].max().round(3))
v = body & viol
print('viol body z range', z[v].min().round(3), z[v].max().round(3), 'y', y[v].min().round(3), y[v].max().round(3))
# eyes: violet in front, high
e = viol & (z > 0.25)
print('front violet', e.sum(), V[e].min(0).round(3), V[e].max(0).round(3))
fang = body & (z > 0.3) & (y < 0.25)
print('fang region', fang.sum(), V[fang].min(0).round(3), V[fang].max(0).round(3), 'lum', tc[fang].sum(1).mean())
