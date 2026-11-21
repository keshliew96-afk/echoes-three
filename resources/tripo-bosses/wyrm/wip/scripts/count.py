import sys, numpy as np
sys.path.insert(0, sys.argv[2])
from rigkit import Mesh
M = Mesh(sys.argv[1]); CX = 0.0415; M.V[:, 0] -= CX; V = M.V; F = M.F
d = np.array([0, -0.894, 0.447]); d /= np.linalg.norm(d); n0 = np.array([0, -0.447, -0.894]); n0 /= np.linalg.norm(n0); Hp = np.array([0, 0.74, 0.02])
fc = V[F].mean(1); rel = fc - Hp; b = rel @ d; rad = np.hypot(rel @ n0, rel[:, 0])
for bc in (0.14, 0.16, 0.18, 0.2):
    drop = ((b >= bc) & (rad < 0.14) & (fc[:, 1] < 0.68)) | (fc[:, 1] < 0.5)
    print('cut', bc, 'kept faces', int((~drop).sum()))
tc = M.tc.astype(float)
# colours
k = (V[:, 1] > 0.3) & (V[:, 1] < 0.5)
r_, g_, b_ = tc.T; viol = (b_ - g_ > 40) & (r_ - g_ > 10)
print('violet verts', viol.sum(), 'median', np.median(tc[viol], axis=0), 'bright', np.percentile(tc[viol], 90, axis=0))
pew = (V[:, 1] > 0.33) & (V[:, 1] < 0.37) & (np.abs(r_ - b_) < 14) & (tc.sum(1) > 380) & (tc.sum(1) < 560)
print('pewter band', pew.sum(), np.median(tc[pew], axis=0), np.percentile(tc[pew], 10, axis=0), np.percentile(tc[pew], 90, axis=0))
dark = tc.sum(1) < 200; print('dark lines', dark.sum(), np.median(tc[dark], axis=0))
