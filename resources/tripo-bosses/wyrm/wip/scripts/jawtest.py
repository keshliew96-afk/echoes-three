import sys, numpy as np
sys.path.insert(0, sys.argv[2])
from rigkit import Mesh, groove_cut, face_graph, loops_of
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
M = Mesh(sys.argv[1]); V = M.V; F = M.F; out = sys.argv[3]; CX = 0.0415
g = face_graph(M); fc = g['fc']; fn = g['fn']; fx, fy, fz = fc.T; fax = np.abs(fx - CX)
lin = lambda z, z0, y0, z1, y1: y0 + (y1 - y0) * np.clip((z - z0) / (z1 - z0), 0, 1)
ylo = lin(fz, 0.20, 0.728, 0.36, 0.708); yhi = lin(fz, 0.20, 0.772, 0.36, 0.748)
src = (fz > 0.19) & (fy < ylo) & (fy > 0.66)
sink = (fy > yhi) | (fz < 0.15) | (fy < 0.66) | ((fz < 0.19) & (fy > 0.75))
A = groove_cut(M, src, sink)
print('jaw faces', A.sum())
lp = max(loops_of(M, A), key=len); L = g['Vw'][lp]; print('rim', len(lp), 'bounds', L.min(0).round(3), L.max(0).round(3))
np.save(out + '/jawA0.npy', A)
ftc = M.tc[F].mean(1) / 255.0; col = ftc.copy(); col[A] = col[A] * 0.5 + np.array([0.9, 0.2, 0.2]) * 0.5; col[src] = col[src] * 0.6 + np.array([0.2, 0.9, 0.2]) * 0.4; col[sink] = col[sink] * 0.7 + np.array([0.2, 0.2, 0.9]) * 0.3
fig, axs = plt.subplots(1, 3, figsize=(48, 13))
for a, (k, hx, hy, od, xl, yl) in zip(axs, (((fn[:, 0] > 0.05), 2, 1, fx, (0.1, 0.39), (0.66, 0.8)), ((fn[:, 2] > 0.05), 0, 1, fz, (-0.08, 0.16), (0.66, 0.8)), ((fn[:, 1] < -0.05) & (fy < 0.78), 0, 2, -fy, (-0.08, 0.16), (0.1, 0.39)))):
    o = np.nonzero(k & (fy > 0.64) & (fy < 0.82) & (fz > 0.05))[0]; o = o[np.argsort(od[o])]
    a.add_collection(PolyCollection(V[F[o]][:, :, [hx, hy]], facecolors=col[o], edgecolors=(0, 0, 0, 0.15), linewidths=0.3)); a.set_xlim(*xl); a.set_ylim(*yl)
    a.set_aspect('equal'); a.grid(True, lw=0.4); a.xaxis.set_major_locator(matplotlib.ticker.MultipleLocator(0.01)); a.yaxis.set_major_locator(matplotlib.ticker.MultipleLocator(0.01)); a.tick_params(labelsize=8)
plt.tight_layout(); plt.savefig(out + '/jawtest.png', dpi=45)
