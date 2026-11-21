import sys, numpy as np
sys.path.insert(0, sys.argv[2])
from rigkit import Mesh
M = Mesh(sys.argv[1]); CX = 0.0415; M.V[:, 0] -= CX; V = M.V; tc = M.tc.astype(float)
d = np.array([0, -0.894, 0.447]); d /= np.linalg.norm(d); n0 = np.array([0, -0.447, -0.894]); n0 /= np.linalg.norm(n0); Hp = np.array([0, 0.74, 0.02])
rel = V - Hp; b = rel @ d; pn = rel @ n0; px = rel[:, 0]; rad = np.hypot(pn, px)
for bb in np.arange(0.04, 0.36, 0.04):
    k = (np.abs(b - bb) < 0.012) & (rad < 0.16) & (V[:, 1] < 0.72)
    if k.sum() < 10: continue
    th = np.arctan2(px[k], pn[k]); r = rad[k]; lum = tc[k].sum(1)
    print('b %.2f n %3d centre n %.3f x %.3f | r dorsal %.3f side %.3f ventral %.3f | lum dorsal %.0f side %.0f ventral %.0f' % (bb, k.sum(), pn[k].mean(), px[k].mean(),
          r[np.abs(th) < 0.5].mean() if (np.abs(th) < 0.5).any() else 0, r[np.abs(np.abs(th) - 1.57) < 0.35].mean(), r[np.abs(th) > 2.6].mean() if (np.abs(th) > 2.6).any() else 0,
          lum[np.abs(th) < 0.5].mean() if (np.abs(th) < 0.5).any() else 0, lum[np.abs(np.abs(th) - 1.57) < 0.35].mean(), lum[np.abs(th) > 2.6].mean() if (np.abs(th) > 2.6).any() else 0))
# belly edge: at b 0.16..0.24, luminance by angle
k = (b > 0.14) & (b < 0.26) & (rad < 0.13) & (rad > 0.05)
th = np.abs(np.arctan2(px[k], pn[k])); lum = tc[k].sum(1)
for a0 in np.arange(0, 3.14, 0.2):
    q = (th >= a0) & (th < a0 + 0.2)
    if q.any(): print('  angle %.1f..%.1f lum %.0f rgb %s n %d r %.3f' % (a0, a0 + 0.2, lum[q].mean(), np.median(tc[k][q], axis=0).round(0), q.sum(), rad[k][q].mean()))
