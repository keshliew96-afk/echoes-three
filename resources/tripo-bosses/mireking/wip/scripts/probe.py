import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh, face_graph, groove_cut, loops_of
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; tc = M.tc; r, g, b = tc.T.astype(float); lum = tc.sum(1)
G = face_graph(M); fc = G['fc']; fx, fy, fz = fc.T; ftc = M.tc[M.F].mean(1); fr, fg, fb = ftc.T; flum = ftc.sum(1)
def desc(nm, k): print(nm, int(k.sum()), 'bbox', V[k].min(0).round(3), V[k].max(0).round(3)) if k.sum() else print(nm, 0)
rust = (r > g + 12) & (g >= b - 5) & (y > 0.70) & (lum < 420)
viol = (b - g > 25) & (r - g > 5)
cream = (r > 180) & (g > 180) & (b > 120) & (r - b > 25)
lilac = (r > 150) & (b > 150) & (b - g > 8)
teal = (g - r > 25) & (b - r > 15)
dark = lum < 150
desc('rust', rust); desc('viol', viol); desc('viol high', viol & (y > 0.7)); desc('cream', cream); desc('lilac', lilac); desc('teal', teal); desc('dark', dark); desc('dark back', dark & (z < -0.3))
desc('eye white', (lum > 560) & (y > 0.62) & (z > 0.15)); desc('eye dark', dark & (y > 0.62) & (z > 0.15))
for s in (1, -1):
    k = (lum > 520) & (y > 0.62) & (z > 0.15) & (x * s > 0.05); print('eye', s, V[k].mean(0).round(3), V[k].min(0).round(3), V[k].max(0).round(3))
# colours along a few probes
import collections
for nm, k in (('lip mid front', (abs(x) < 0.02) & (z > 0.3) & (y > 0.4) & (y < 0.7)),):
    o = np.argsort(-y[k]);
    for i in o[::max(1, len(o)//30)]: print('  y %.3f z %.3f rgb' % (y[k][i], z[k][i]), tc[k][i])
