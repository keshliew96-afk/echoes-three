import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh, face_graph, groove_cut, loops_of
M = Mesh(sys.argv[1]); V = M.V
G = face_graph(M); fc = G['fc']; fx, fy, fz = fc.T; fax = np.abs(fx); ftc = M.tc[M.F].mean(1).astype(float); fr, fg, fb = ftc.T; flum = ftc.sum(1)
frust = (fr > fg + 6) & (fg > fb - 4) & (flum < 330)
fviol = (fb - fg > 25) & (fr - fg > 5)
fteal = (fg - fr > 18)
cseed = (frust | fviol) & (fy > 0.80)
bseed = (fteal & (fy < 0.735)) | (fy < 0.6) | (fteal & (fy < 0.76) & (np.hypot(fx, fz - 0.13) < 0.11))
A = groove_cut(M, cseed, bseed); print('crown faces', A.sum()); P = V[M.F[A]].reshape(-1, 3); print('bbox', P.min(0).round(3), P.max(0).round(3))
loops = loops_of(M, A); print('loops', [len(l) for l in loops])
Vw = G['Vw']
for lp in loops:
    L = Vw[lp]; c = L.mean(0); rr = np.hypot(L[:, 0] - c[0], L[:, 2] - c[2]); print(' loop', len(lp), 'centre', c.round(3), 'radius', rr.min().round(3), rr.max().round(3), 'y', L[:, 1].min().round(3), L[:, 1].max().round(3))
# colours of the faces inside the crown ring on the head top
k = (np.hypot(fx, fz - 0.13) < 0.1) & (fy > 0.7) & (fy < 0.8); print('inside ring faces', k.sum(), 'teal', (k & fteal).sum(), 'rust', (k & frust).sum(), 'y', fy[k].min().round(3), fy[k].max().round(3))
ct = np.r_[[np.hypot(fx[A], fz[A] - 0.13)]]; print('crown face radius pct', np.percentile(ct, [0, 5, 50, 95, 100]).round(3))
print('--- colour region')
cseed = ((frust | fviol) & (fy > 0.76)) | ((fy > 0.74) & (np.hypot(fx, fz - 0.13) < 0.1))
bseed = (fteal & (fy < 0.745)) | (fy < 0.6)
A = groove_cut(M, cseed, bseed); print('crown faces', A.sum()); P = V[M.F[A]].reshape(-1, 3); print('bbox', P.min(0).round(3), P.max(0).round(3))
loops = loops_of(M, A); print('loops', [len(l) for l in loops])
for lp in loops:
    L = Vw[lp]; c = L.mean(0); rr = np.hypot(L[:, 0], L[:, 2] - 0.13); print(' loop', len(lp), 'centre', c.round(3), 'radius about (0,0.13)', rr.min().round(3), rr.max().round(3), 'y', L[:, 1].min().round(3), L[:, 1].max().round(3))
    _, sv, Vt = np.linalg.svd(L - c); print('   planarity', (sv[2] / np.sqrt(len(L))).round(4), 'normal', Vt[2].round(3))
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
fig, axs = plt.subplots(1, 2, figsize=(26, 12))
k = (V[:, 1] > 0.66) & (V[:, 1] < 0.84); c = np.clip(M.tc[k] * 1.5, 0, 255) / 255
for a, (hx, hy) in zip(axs, ((2, 0), (2, 1))):
    a.scatter(V[k, hx], V[k, hy], s=3, c=c)
    for lp in loops: L = Vw[lp + [lp[0]]]; a.plot(L[:, hx], L[:, hy], 'r-')
    a.set_facecolor('#444'); a.set_aspect('equal'); a.grid(True, lw=0.3)
plt.tight_layout(); plt.savefig(sys.argv[3] + '/crown.png', dpi=56)
