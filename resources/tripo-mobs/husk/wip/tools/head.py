import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc; x, y, z = V.T; r,g,b = tc.T; lum=tc.sum(1)
fig, axs = plt.subplots(1, 3, figsize=(30, 10))
hd = (z > 0.25) & (y > 0.33)
for a,k,t in ((axs[0], hd & (x>0), 'left half'), (axs[1], hd & (np.abs(x)<0.02), 'mid |x|<0.02')):
    a.scatter(z[k], y[k], s=40, c=(tc[k]/255)**0.6); a.set_aspect('equal'); a.set_xticks(np.arange(0.25,0.52,0.01)); a.set_yticks(np.arange(0.33,0.66,0.01)); a.grid(True,lw=0.3); a.set_title(t); a.tick_params(labelsize=7)
viol = (b - g > 30) & (b > 100)
w = lum > 450
cls = np.zeros((len(V),3))+0.7; cls[viol]=[0.6,0,1]; cls[w]=[1,0.6,0]
axs[2].scatter(z[x>0], y[x>0], s=8, c=cls[x>0]); axs[2].set_aspect('equal'); axs[2].grid(True,lw=0.3)
plt.tight_layout(); plt.savefig(sys.argv[3], dpi=55)
print('viol', viol.sum(), 'white', w.sum(), V[w].min(0).round(3), V[w].max(0).round(3))
