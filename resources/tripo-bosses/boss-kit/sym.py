# Is a part straight? Fits the mirror plane of the vertices inside a box and prints how far it is turned (yaw, to
# the model's left +) and tilted (roll). usage: python3 -I sym.py <in.glb> name:xmin,xmax,ymin,ymax,zmin,zmax ...
import sys, trimesh, numpy as np
from scipy.spatial import cKDTree
from scipy.optimize import minimize
m = trimesh.load(sys.argv[1], force='mesh', process=False); V = np.asarray(m.vertices)
for spec in sys.argv[2:]:
    name, box = spec.split(':'); b = list(map(float, box.split(',')))
    k = (V[:, 0] > b[0]) & (V[:, 0] < b[1]) & (V[:, 1] > b[2]) & (V[:, 1] < b[3]) & (V[:, 2] > b[4]) & (V[:, 2] < b[5])
    P = V[k]; rng = np.random.RandomState(1); P = P[rng.choice(len(P), min(len(P), 4000), replace=False)]; T = cKDTree(P); c0 = P.mean(0)
    def cost(q):
        yaw, roll, off = q; n = np.array([np.cos(yaw) * np.cos(roll), np.sin(roll), -np.sin(yaw) * np.cos(roll)])
        d = (P - c0) @ n - off; dist, _ = T.query(P - 2 * np.outer(d, n)); return np.mean(np.minimum(dist, 0.03) ** 2)
    best = None
    for y0 in np.radians([-20, -10, 0, 10, 20]):
        for r0 in np.radians([-6, 0, 6]):
            r = minimize(cost, [y0, r0, 0], method='Nelder-Mead', options=dict(xatol=1e-4, fatol=1e-10, maxiter=400))
            if best is None or r.fun < best.fun: best = r
    print(name, 'verts', int(k.sum()), 'yaw deg', round(float(np.degrees(best.x[0])), 1), 'roll deg', round(float(np.degrees(best.x[1])), 1), 'plane x', round(float(c0[0] + best.x[2]), 4), 'fit mm', round(float(np.sqrt(best.fun) * 1000), 1))
