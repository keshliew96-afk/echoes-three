import sys, numpy as np
sys.path.insert(0, sys.argv[2])
import rigkit as rk
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = rk.Mesh(sys.argv[1]); V = M.V; F = M.F; out = sys.argv[3]
fc = V[F].mean(1); ftc = M.tc[F].mean(1) / 255.0
CX = 0.0415
fig, axs = plt.subplots(1, 3, figsize=(42, 14))
k = (fc[:, 0] > CX) & (fc[:, 1] > 0.45); axs[0].scatter(fc[k, 2], fc[k, 1], s=14, c=ftc[k]); axs[0].set_title('left half, z right')
k = (fc[:, 2] > 0.0) & (fc[:, 1] > 0.45); axs[1].scatter(fc[k, 0], fc[k, 1], s=14, c=ftc[k]); axs[1].set_title('front half, x right')
k = (fc[:, 1] < 0.775) & (fc[:, 1] > 0.45) & (fc[:, 2] > -0.1); o = np.argsort(-fc[k, 1]); axs[2].scatter(fc[k, 0][o], fc[k, 2][o], s=14, c=ftc[k][o]); axs[2].set_title('from below, x right z up')
for a in axs: a.set_aspect('equal'); a.grid(True, lw=0.3); a.set_facecolor('#779'); a.xaxis.set_major_locator(matplotlib.ticker.MultipleLocator(0.02)); a.yaxis.set_major_locator(matplotlib.ticker.MultipleLocator(0.02)); a.tick_params(labelsize=7)
plt.tight_layout(); plt.savefig(out, dpi=50)
