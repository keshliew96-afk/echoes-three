import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc/255; x, y, z = V.T
print('bbox', V.min(0).round(3), V.max(0).round(3))
fig, axs = plt.subplots(1, 2, figsize=(22, 16))
axs[0].scatter(x, y, s=8, c=tc**0.6); axs[1].scatter(z[x>-0.02], y[x>-0.02], s=8, c=tc[x>-0.02]**0.6)
for a in axs: a.set_aspect('equal'); a.set_xticks(np.arange(-0.5,0.51,0.05)); a.set_yticks(np.arange(0,1.01,0.05)); a.minorticks_on(); a.grid(True,lw=0.6); a.grid(True,which='minor',lw=0.2); a.tick_params(labelsize=12)
plt.tight_layout(); plt.savefig(sys.argv[3], dpi=50)
r,g,b=(M.tc.T).astype(int); lum=M.tc.sum(1)
for nm,k in (('warm r-b>6',(r-b)>6),('cyan g-r>40',(g-r>40)&(b-r>40)),('bright',lum>520),('dark',lum<120)):
    print(nm,k.sum(), V[k].min(0).round(3) if k.any() else '', V[k].max(0).round(3) if k.any() else '')
