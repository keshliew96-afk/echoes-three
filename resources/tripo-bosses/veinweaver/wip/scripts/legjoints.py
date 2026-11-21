import sys, json; sys.path.insert(0, sys.argv[2])
import numpy as np
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; ax = np.abs(x)
lab = M.comps((ax > 0.19) & (y < 0.5)); ids, cnt = np.unique(lab[lab >= 0], return_counts=True)
out = []
for i in ids[cnt > 300]:
    m = lab == i; P = V[m]
    tip = P[P[:, 1].argmin()]
    # the vertical lower segment: points close to the tip in plan
    dpl = np.linalg.norm(P[:, [0, 2]] - tip[[0, 2]], axis=1)
    low = P[dpl < 0.045]; 
    # walk up the vertical part: highest y while the plan offset stays small
    hy = np.sort(low[:, 1]); 
    inner = P[np.abs(P[:, 0]) < 0.215]; hip = inner.mean(0)
    top = P[P[:, 1] > P[:, 1].max() - 0.06]; knee = top.mean(0); knee[1] -= 0.03
    # ankle: where the leg turns down; the centroid of points 0.2..0.26 high near the tip in plan
    ak = P[(dpl < 0.07) & (P[:, 1] > 0.17) & (P[:, 1] < 0.27)]
    ankle = ak.mean(0) if len(ak) else tip + [0, 0.22, 0]
    out.append(dict(hip=hip.round(3).tolist(), knee=knee.round(3).tolist(), ankle=ankle.round(3).tolist(), tip=tip.round(3).tolist(), n=int(m.sum()), lowtop=float(hy[-1].round(3))))
out.sort(key=lambda o: (np.sign(o['tip'][0]), -o['tip'][2]))
for o in out: print(o)
json.dump(out, open(sys.argv[3], 'w'))
