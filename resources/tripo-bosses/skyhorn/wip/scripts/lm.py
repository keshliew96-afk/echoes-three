import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc; x, y, z = V.T; r, g, b = tc.T; lum = tc.sum(1)
c = np.clip(tc / 255, 0, 1)
print('lum pct', np.percentile(lum, [5, 25, 50, 75, 95]))
def panel(k, hx, hy, title, fn, xl, yl, sz=(30, 30), s=4):
    fig, a = plt.subplots(figsize=sz); a.scatter(V[k, hx], V[k, hy], s=s, c=c[k]); a.set_aspect('equal'); a.set_title(title); a.grid(True, lw=0.4); a.set_facecolor("#203040")
    a.set_xlim(*xl); a.set_ylim(*yl); a.set_xticks(np.arange(xl[0], xl[1] + 0.001, 0.025)); a.set_yticks(np.arange(yl[0], yl[1] + 0.001, 0.025)); a.tick_params(labelsize=8); plt.xticks(rotation=90)
    plt.tight_layout(); plt.savefig(sys.argv[2] + '/' + fn, dpi=50); plt.close(fig)
panel(x > 0.0, 2, 1, 'left half side (z right = front)', 'lm_side.png', (-0.42, 0.42), (0, 1.0))
panel((x > -0.03) & (x < 0.03), 2, 1, 'mid slab |x|<0.03 side', 'lm_mid.png', (-0.42, 0.42), (0, 1.0))
panel((x > 0.06), 2, 1, 'x>0.06 side', 'lm_legs.png', (-0.42, 0.42), (0, 0.75))
panel(z > 0.0, 0, 1, 'front half from front', 'lm_front.png', (-0.25, 0.25), (0, 1.0))
panel(z < 0.0, 0, 1, 'rear half from behind', 'lm_rear.png', (-0.25, 0.25), (0, 1.0))
panel(y < 0.7, 2, 0, 'top, y<0.7 (z right, x up)', 'lm_top.png', (-0.42, 0.42), (-0.25, 0.25))
panel((y > 0.5) & (z > 0.1), 2, 1, 'head side', 'lm_head.png', (0.05, 0.42), (0.3, 1.0), sz=(24, 30), s=8)
panel((ax_ := np.abs(x)) < 0.04, 2, 1, 'mid |x|<0.04 head and neck', 'lm_headmid.png', (0.0, 0.42), (0.25, 0.8), sz=(24, 24), s=10)
panel((y > 0.3) & (z > 0.0) & (y < 0.8), 0, 1, 'front z>0, 0.3<y<0.8', 'lm_headfront.png', (-0.25, 0.25), (0.3, 0.8), sz=(24, 24), s=8)
