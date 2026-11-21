import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh, face_graph, groove_cut, loops_of
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V
G = face_graph(M); fc = G['fc']; fx, fy, fz = fc.T; fax = np.abs(fx); ftc = M.tc[M.F].mean(1).astype(float); fr, fg, fb = ftc.T; flum = ftc.sum(1)
fcream = (flum > 480) & (fr - fb > 12) & (np.abs(fr - fg) < 14)
fteal = (fg - fr > 18)
eyezone = (fy > 0.63) & (fax > 0.08)
jseed = fcream & (fy > 0.47) & (fz > 0.1) & ~eyezone
useed = (fteal & (fy > 0.67)) | (fz < 0.0) | (fy < 0.3) | eyezone
print('seeds', jseed.sum(), useed.sum())
A = groove_cut(M, jseed, useed); print('jaw faces', A.sum()); P = V[M.F[A]].reshape(-1, 3); print('bbox', P.min(0).round(3), P.max(0).round(3))
loops = loops_of(M, A); print('loops', [len(l) for l in loops])
Vw = G['Vw']
lp = max(loops, key=len); L = Vw[lp]
# which rim vertices are on the mouth line: the face outside lies above
fig, axs = plt.subplots(1, 3, figsize=(36, 12))
for a, (hx, hy, t) in zip(axs, ((0, 1, 'front'), (2, 1, 'side'), (2, 0, 'top'))):
    k = (V[:, 1] > 0.3) & (V[:, 2] > -0.05); c = np.clip(M.tc[k] * 1.3, 0, 255) / 255
    a.scatter(V[k, hx], V[k, hy], s=2, c=c); a.plot(L[:, hx], L[:, hy], 'r-', lw=1.2); a.scatter(L[::10, hx], L[::10, hy], s=14, c='yellow')
    for i in range(0, len(L), 10): a.annotate(str(i), (L[i, hx], L[i, hy]), color='white', fontsize=7)
    a.set_facecolor('#444'); a.set_aspect('equal'); a.set_title(t); a.grid(True, lw=0.3)
plt.tight_layout(); plt.savefig(sys.argv[3] + '/mouth.png', dpi=56)
np.save(sys.argv[3] + '/jawA.npy', A)
for i in range(0, len(L), 6): print(i, L[i].round(3))
