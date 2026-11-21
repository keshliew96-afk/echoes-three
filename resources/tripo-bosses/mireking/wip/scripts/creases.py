import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh, face_graph
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
M = Mesh(sys.argv[1]); V = M.V
G = face_graph(M); Vw = G['Vw']; ev = G['ev']; ang = G['ang']; cc = G['concave']
k = cc & (ang > 0.45); E = Vw[ev[k]]; mid = E.mean(1)
fig, axs = plt.subplots(2, 2, figsize=(30, 26))
def panel(a, sel, hx, hy, title, vs):
    a.scatter(V[vs, hx], V[vs, hy], s=1.5, c='#8aa')
    s = sel(mid); a.add_collection(LineCollection(E[s][:, :, [hx, hy]], colors='red', linewidths=1.6)); a.set_facecolor('#333'); a.set_aspect('equal'); a.set_title(title); a.grid(True, lw=0.3)
    a.set_xticks(np.arange(-0.45, 0.46, 0.05)); a.set_yticks(np.arange(-0.4 if hy != 1 else 0, 0.75, 0.05)); a.tick_params(labelsize=8)
x, y, z = V.T
panel(axs[0, 0], lambda m: (m[:, 0] > 0.14) & (m[:, 1] < 0.6), 2, 1, 'left side creases (z right)', (x > 0.14) & (y < 0.6))
panel(axs[0, 1], lambda m: (m[:, 2] > 0.0) & (m[:, 1] < 0.6), 0, 1, 'front creases (x right)', (z > 0.0) & (y < 0.6))
panel(axs[1, 0], lambda m: (m[:, 1] < 0.35) & (m[:, 1] > 0.1), 2, 0, 'top creases y 0.1-0.35', (y < 0.35) & (y > 0.1))
panel(axs[1, 1], lambda m: (m[:, 2] < -0.1) & (m[:, 1] < 0.6), 0, 1, 'back creases (x right)', (z < -0.1) & (y < 0.6))
plt.tight_layout(); plt.savefig(sys.argv[3] + '/creases.png', dpi=60)
