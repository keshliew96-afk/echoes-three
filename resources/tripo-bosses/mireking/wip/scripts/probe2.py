import sys; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
from scipy.cluster.vq import kmeans2
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; tc = M.tc.astype(float)
np.random.seed(3); cen, lab = kmeans2(tc, 10, minit='++', seed=3)
for i in np.argsort(-np.bincount(lab, minlength=10)):
    k = lab == i
    if k.sum(): print(i, int(k.sum()), 'rgb', cen[i].round(0), 'bbox', V[k].min(0).round(2), V[k].max(0).round(2), 'mean', V[k].mean(0).round(2))
