# The Gravewisp's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# hips at the waist carry the hover, the lean and the push; sq squashes the whole ghost (the game scales its body
# sx, sy, sx); the trunk bends at chest and head; the flame tip on its own bone; the stubby arms (the game's sleeves);
# the lantern on the collar swings on its own bone (the game's indigo core); the tail streams on three bones.
# Rig the cut model (cut.py frees the lantern from the chest). The body's weights run linearly by height between its joints.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.45, 0.01]), 'sq': ('hips', [0, 0.45, 0.01]),
     'chest': ('sq', [0, 0.55, 0.01]), 'head': ('chest', [0, 0.64, 0.01]), 'flame': ('head', [0, 0.85, -0.01]),
     'lamp': ('chest', [0, 0.6, 0.11]),
     't1': ('sq', [0, 0.36, 0.01]), 't2': ('t1', [0, 0.25, 0.02]), 't3': ('t2', [-0.01, 0.14, 0.0])}
ends = {'head': [0, 0.85, -0.01], 'flame': [0.02, 1.0, -0.03], 'lamp': [0, 0.37, 0.11], 't3': [-0.01, 0.0, -0.01]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('chest', m([0.1, 0.5, 0.0])); ends['arm' + s] = m([0.18, 0.44, 0.0])
names = list(J.keys())
grey = (b - r) < 50
lamp = grey & (z > 0.045) & (y < 0.6) & (ax < 0.08)
# the lantern's glass is pale blue like the body: take what sits inside the frame (near the grey, off the chest)
from scipy.spatial import cKDTree
dl = cKDTree(V[lamp]).query(V)[0]
lamp |= (dl < 0.02) & (z > 0.075) & (y < 0.55) & (y > 0.35) & (ax < 0.075)
# cut.py split the lantern's faces off the chest and wrote which vertices are the lantern's (the chest's copies on the seam stay body)
lamp = np.load(src[:-4] + '.lamp.npy')
arm = (ax > 0.1) & (y > 0.39) & (y < 0.56) & ~lamp
glass = lamp & (r > 150)
eye = (r > 200) & (g > 200) & (b > 200) & (y > 0.64)
print({k: int(v.sum()) for k, v in dict(lamp=lamp, arm=arm, glass=glass, eye=eye).items()})
segs = [('chest', np.array(J['chest'][1]), np.array(J['head'][1]))]
def vis_of(n, d): return np.ones(len(V), bool)
W, names, ix = skin(M, J, segs, vis_of)
H = [(-1, 't3'), (0.14, 't3'), (0.25, 't2'), (0.36, 't1'), (0.45, 'sq'), (0.55, 'chest'), (0.64, 'head'), (0.84, 'head'), (0.9, 'flame'), (2.0, 'flame')]
W[:] = 0
hs = np.array([h for h, _ in H])
for i in range(len(V)):
    k = np.searchsorted(hs, y[i]) - 1; k = min(max(k, 0), len(H) - 2)
    f = (y[i] - hs[k]) / (hs[k + 1] - hs[k]); W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(arm & (np.sign(x) == sg))[0]; k = np.clip((ax[i] - 0.1) / 0.035, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['arm' + s]] += k
# the lantern hangs rigid; its chain blends into the collar over its top 3 cm
i = np.nonzero(lamp)[0]; k = np.clip((0.595 - y[i]) / 0.03, 0, 1); W[i] = 0; W[i, ix['lamp']] = k; W[i, ix['chest']] += 1 - k
finish(M, J, ends, W, names, out, [glass, eye, np.zeros(len(V), bool)], fallback='sq')
