import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc; x, y, z = V.T
c = np.clip(tc / 255, 0, 1)
def panel(k, hx, hy, title, fn, xl, yl, sz=(24, 30), s=6):
    fig, a = plt.subplots(figsize=sz); a.scatter(V[k, hx], V[k, hy], s=s, c=c[k]); a.set_aspect('equal'); a.set_title(title); a.grid(True, lw=0.4); a.set_facecolor("#203040")
    a.set_xlim(*xl); a.set_ylim(*yl); a.set_xticks(np.arange(xl[0], xl[1] + 0.001, 0.02)); a.set_yticks(np.arange(yl[0], yl[1] + 0.001, 0.02)); a.tick_params(labelsize=8); plt.xticks(rotation=90)
    plt.tight_layout(); plt.savefig(sys.argv[2] + '/' + fn, dpi=40); plt.close(fig)
panel(z > 0.02, 0, 1, 'front z>0.02 from front', 'lm_front.png', (-0.18, 0.18), (0.2, 1.0))
panel(x > 0.0, 2, 1, 'x>0 side (z right)', 'lm_sideL.png', (-0.17, 0.17), (0.2, 1.0))
panel(x < 0.0, 2, 1, 'x<0 side (z right)', 'lm_sideR.png', (-0.17, 0.17), (0.2, 1.0))
panel(y > 0.55, 0, 2, 'top y>0.55 (x right, z up)', 'lm_top.png', (-0.18, 0.18), (-0.1, 0.17), sz=(24, 18))
panel(np.abs(x) < 0.03, 2, 1, 'mid slab', 'lm_mid.png', (-0.17, 0.17), (0.4, 1.0))
