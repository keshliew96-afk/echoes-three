import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; tc = M.tc.astype(float); r, g, b = tc.T; lum = tc.sum(1)
dark = lum < 200
print('lum pct', np.percentile(lum,[5,25,50,75,95]).round())
# arm: dark and x>0.18
arm = dark & (x > 0.17)
print('arm count', arm.sum(), V[arm].min(0).round(3), V[arm].max(0).round(3))
for y0 in np.arange(0.24, 0.76, 0.03):
    k = arm & (y >= y0) & (y < y0 + 0.03)
    if k.sum(): print('arm y %.2f n %4d x %.3f..%.3f z %.3f..%.3f  c %s' % (y0, k.sum(), x[k].min(), x[k].max(), z[k].min(), z[k].max(), V[k].mean(0).round(3)))
for z0 in np.arange(-0.1, 0.24, 0.02):
    k = arm & (z >= z0) & (z < z0 + 0.02) & (y < 0.42)
    if k.sum(): print('arm z %.2f n %4d y %.3f..%.3f x %.3f..%.3f' % (z0, k.sum(), y[k].min(), y[k].max(), x[k].min(), x[k].max()))
# legs
leg = (x > 0.02) & (y < 0.26) & (x < 0.2)
for y0 in np.arange(0.0, 0.27, 0.02):
    k = leg & (y >= y0) & (y < y0 + 0.02)
    if k.sum(): print('leg y %.2f n %4d x %.3f..%.3f z %.3f..%.3f lum %d' % (y0, k.sum(), x[k].min(), x[k].max(), z[k].min(), z[k].max(), lum[k].mean()))
# head
for y0 in np.arange(0.7, 1.0, 0.03):
    k = (y >= y0) & (y < y0 + 0.03) & (np.abs(x) < 0.2)
    if k.sum(): print('head y %.2f x %.3f..%.3f z %.3f..%.3f lum %d' % (y0, x[k].min(), x[k].max(), z[k].min(), z[k].max(), lum[k].mean()))
for y0 in np.arange(0.2, 0.76, 0.04):
    k = (y >= y0) & (y < y0 + 0.04) & (np.abs(x) < 0.17)
    print('body y %.2f x %.3f..%.3f z %.3f..%.3f' % (y0, x[k].min(), x[k].max(), z[k].min(), z[k].max()))
# hip bells: x 0.18..0.3, y<0.3, not leg
hb = (x > 0.19) & (y < 0.3) & (y > 0.1)
for y0 in np.arange(0.1, 0.32, 0.02):
    k = hb & (y >= y0) & (y < y0 + 0.02)
    if k.sum(): print('hb y %.2f n %4d x %.3f..%.3f z %.3f..%.3f lum %d' % (y0, k.sum(), x[k].min(), x[k].max(), z[k].min(), z[k].max(), lum[k].mean()))
# door: front z>0.18, y .3..55
fr = (z > 0.17) & (y > 0.28) & (y < 0.6) & (np.abs(x)<0.2)
for y0 in np.arange(0.28, 0.6, 0.03):
    k = fr & (y >= y0) & (y < y0 + 0.03)
    dk = k & dark
    if k.sum(): print('front y %.2f z max %.3f dark n %d x %.3f..%.3f zmax %.3f' % (y0, z[k].max(), dk.sum(), x[dk].min() if dk.any() else 0, x[dk].max() if dk.any() else 0, z[dk].max() if dk.any() else 0))
