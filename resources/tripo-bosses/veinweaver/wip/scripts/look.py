import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; tc = M.tc.astype(float); r, g, b = tc.T
comp = M.comp[M.inv] if len(M.comp) != len(V) else M.comp
print('verts', len(V), 'comps', len(M.cnt), sorted(M.cnt)[-10:])
for c in np.argsort(M.cnt)[::-1][:12]:
    m = comp == c; print(' comp', c, m.sum(), V[m].min(0).round(3), V[m].max(0).round(3))
viol = (r > g + 25) & (b > g + 40)
low = viol & (y < 0.06)
# cluster the foot tips
P = V[low]; lab = -np.ones(len(P), int); k = 0
for i in range(len(P)):
    if lab[i] >= 0: continue
    st = [i]; lab[i] = k
    while st:
        j = st.pop(); d = np.linalg.norm(P - P[j], axis=1); nb = np.where((d < 0.03) & (lab < 0))[0]; lab[nb] = k; st += list(nb)
    k += 1
print('foot tips', k)
for i in range(k):
    q = P[lab == i]; print('  tip', len(q), q.mean(0).round(3), 'ymin', q[:,1].min().round(3))
# slices for the body
for zz in np.arange(-0.43, 0.44, 0.05):
    m = (z > zz) & (z < zz + 0.05) & (np.abs(x) < 0.12)
    if m.any(): print('z %.2f body y %.3f..%.3f viol %.2f' % (zz, y[m].min(), y[m].max(), viol[m].mean()))
