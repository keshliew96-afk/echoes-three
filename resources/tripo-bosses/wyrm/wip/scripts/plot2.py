import sys, numpy as np
sys.path.insert(0, sys.argv[2])
import rigkit as rk
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
M = rk.Mesh(sys.argv[1]); V = M.V; F = M.F; out = sys.argv[3]
fc = V[F].mean(1); ftc = M.tc[F].mean(1) / 255.0; CX = 0.0415
fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-12
fig, axs = plt.subplots(1, 2, figsize=(40, 16))
k = (fn[:, 0] > 0.05) & (fc[:, 1] > 0.66) & (fc[:, 1] < 0.84) & (fc[:, 2] > 0.02); o = np.nonzero(k)[0]; o = o[np.argsort(fc[o, 0])]
axs[0].add_collection(PolyCollection(V[F[o]][:, :, [2, 1]], facecolors=ftc[o], edgecolors=(0, 0, 0, 0.15), linewidths=0.3)); axs[0].set_xlim(0.02, 0.39); axs[0].set_ylim(0.66, 0.84); axs[0].set_title('left side (+x), z right')
k = (fn[:, 2] > 0.05) & (fc[:, 1] > 0.66) & (fc[:, 1] < 0.84); o = np.nonzero(k)[0]; o = o[np.argsort(fc[o, 2])]
axs[1].add_collection(PolyCollection(V[F[o]][:, :, [0, 1]], facecolors=ftc[o], edgecolors=(0, 0, 0, 0.15), linewidths=0.3)); axs[1].set_xlim(-0.1, 0.18); axs[1].set_ylim(0.66, 0.84); axs[1].set_title('front, x right')
for a in axs: a.set_aspect('equal'); a.grid(True, lw=0.4); a.set_facecolor('#779'); a.xaxis.set_major_locator(matplotlib.ticker.MultipleLocator(0.01)); a.yaxis.set_major_locator(matplotlib.ticker.MultipleLocator(0.01)); a.tick_params(labelsize=8)
plt.tight_layout(); plt.savefig(out, dpi=55)
