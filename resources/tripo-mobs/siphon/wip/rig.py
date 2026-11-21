# The Vein Siphon's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A violet sac netted in pink veins, a cluster of warts on its crown, two eye sockets on its face, standing on six thin
# tendrils with soft pads (front, two front-sides, two back-sides, back). Nose to +z. Bones: hips (at the sac's base; the
# tendrils hang from it), sac (the same point, squashed by the page's sx/sy/sz about its base), crown (the warts); each
# tendril a chain of four bones from the sac's base to its pad. Weights: the sac by height between sac and crown; each
# tendril by height along its own chain, its top blending into the body. Mask x: the eye sockets (the page lights them).
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V
x, y, z = V.T
T = {'F': (0.0, 0.13), 'FL': (0.105, 0.035), 'L': (0.185, -0.05), 'B': (0.0, -0.11), 'R': (-0.185, -0.05), 'FR': (-0.105, 0.035)}
HY = [0.43, 0.31, 0.2, 0.09]
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.45, 0]), 'sac': ('hips', [0, 0.45, 0]), 'crown': ('sac', [0, 0.85, 0])}
ends = {'crown': [0, 1.0, 0]}
for k, (tx, tz) in T.items():
    par = 'hips'
    for i, h in enumerate(HY):
        nm = f't{k}{i + 1}'; J[nm] = (par, [tx, h, tz]); par = nm
    ends[par] = [tx, 0.0, tz]
names = list(J.keys()); ix = {n: i for i, n in enumerate(names)}
W = np.zeros((len(V), len(names)))
# which tendril each low vertex belongs to (nearest axis), and whether it is tendril at all
ax = np.array(list(T.values())); d = np.sqrt((x[:, None] - ax[None, :, 0]) ** 2 + (z[:, None] - ax[None, :, 1]) ** 2)
near = d.argmin(1); dmin = d.min(1)
tend = (y < 0.445) & (dmin < 0.075)
print('tendril verts', int(tend.sum()), [int(((near == i) & tend).sum()) for i in range(6)])
keys = list(T.keys())
hs = np.array([0.0] + HY[::-1])  # 0, .09, .2, .31, .43 heights of joints from the bottom
for i in np.nonzero(tend)[0]:
    k = keys[near[i]]; chain = [f't{k}{j}' for j in (4, 3, 2, 1)]  # bottom to top
    yy = y[i]
    if yy <= HY[3]: W[i, ix[chain[0]]] = 1; continue
    for j in range(3):
        lo, hi = HY[3 - j], HY[2 - j]
        if yy <= hi:
            f = (yy - lo) / (hi - lo); W[i, ix[chain[j]]] = 1 - f; W[i, ix[chain[j + 1]]] = f; break
    else:
        f = np.clip((yy - HY[0]) / 0.015, 0, 1); W[i, ix[chain[3]]] = 1 - f; W[i, ix['hips']] = f
sacm = ~tend
f = np.clip((y - 0.8) / 0.06, 0, 1)
W[sacm, ix['sac']] = 1 - f[sacm]; W[sacm, ix['crown']] = f[sacm]
# the sac's very bottom, where the tendrils root, rides the body (unsquashed) so the roots stay joined
f2 = np.clip((0.47 - y) / 0.04, 0, 1) * sacm
W[:, ix['sac']] *= 1 - f2; W[:, ix['hips']] += f2
eyes = (y > 0.68) & (y < 0.79) & (np.abs(x) > 0.02) & (np.abs(x) < 0.115) & (z > 0.19)
print('eyes', int(eyes.sum()))
finish(M, J, ends, W, names, out, [eyes, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='sac')
