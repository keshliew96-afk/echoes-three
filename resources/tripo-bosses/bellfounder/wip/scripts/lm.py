import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc; x, y, z = V.T
c = np.clip(tc / 255, 0, 1)
print('bounds', V.min(0).round(3), V.max(0).round(3), len(V))
def panel(k, hx, hy, title, fn, xl, yl, sz=(24, 30), s=6, st=0.02):
    fig, a = plt.subplots(figsize=sz); a.scatter(V[k, hx], V[k, hy], s=s, c=c[k]); a.set_aspect('equal'); a.set_title(title); a.grid(True, lw=0.4); a.set_facecolor("#203040")
    a.set_xlim(*xl); a.set_ylim(*yl); a.set_xticks(np.arange(xl[0], xl[1] + 0.001, st)); a.set_yticks(np.arange(yl[0], yl[1] + 0.001, st)); a.tick_params(labelsize=8); plt.xticks(rotation=90)
    plt.tight_layout(); plt.savefig(sys.argv[2] + '/' + fn, dpi=40); plt.close(fig)
panel(np.ones(len(V),bool), 0, 1, 'front all', 'lm_front.png', (-0.4, 0.4), (0, 1.0))
panel(x > 0.0, 2, 1, 'x>0 side (z right)', 'lm_sideL.png', (-0.25, 0.25), (0, 1.0), sz=(16,30))
panel(np.abs(x) < 0.03, 2, 1, 'mid slab', 'lm_mid.png', (-0.25, 0.25), (0, 1.0), sz=(16,30))
panel(x > 0.25, 2, 1, 'arm x>0.25 (z right)', 'lm_arm.png', (-0.25, 0.25), (0.1, 0.85), sz=(16,26))
panel((y<0.2), 0, 2, 'feet y<0.2 top (x right z up)', 'lm_feet.png', (-0.4, 0.4), (-0.25, 0.25), sz=(24,16))
