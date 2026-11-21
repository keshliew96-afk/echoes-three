import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; tc = M.tc.astype(float); lum = tc.sum(1)
print('verts', len(V), 'tris', len(M.F), 'bbox', V.min(0).round(3), V.max(0).round(3))
green = (tc[:,1] > tc[:,0] + 8) & (tc[:,1] > tc[:,2]) & (lum < 450)
purple = (tc[:,2] > tc[:,0] + 20) & (tc[:,2] > tc[:,1] + 20)
pale = lum > 560
print('green', green.sum(), V[green].min(0).round(3), V[green].max(0).round(3))
print('purple', purple.sum(), V[purple].min(0).round(3), V[purple].max(0).round(3))
lab = M.comps(np.ones(len(V), bool)); u, c = np.unique(lab[lab>=0], return_counts=True)
print('components', len(u)); 
for L in u[np.argsort(-c)][:12]:
    k = lab == L; print(' comp', L, k.sum(), V[k].min(0).round(3), V[k].max(0).round(3), 'col', tc[k].mean(0).round(0))
# hand candidates: pale skin (bluish white) below y .5
for name, m in (('pale lowy', pale & (y < 0.5)),):
    l2 = M.comps(m); 
    for L in np.unique(l2[l2>=0]):
        k = l2 == L
        if k.sum() > 30: print(name, k.sum(), V[k].min(0).round(3), V[k].max(0).round(3), tc[k].mean(0).round(0))
# per y slice: x extent
for yy in np.arange(0, 1.0, 0.05):
    k = (y >= yy) & (y < yy + 0.05); print('y %.2f' % yy, 'x', V[k,0].min().round(3), V[k,0].max().round(3), 'z', V[k,2].min().round(3), V[k,2].max().round(3), 'col', tc[k].mean(0).round(0))
