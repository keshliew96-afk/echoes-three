# Sedge's rig (the Lost Pilgrim). usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A small hooded traveller in a ragged brown cloak and cape over a pale robe, the face lost in the hood's shadow, a rope
# belt with a gourd and a leather pouch, wrapped hands and shins, rope sandals, and in the right hand a tall crooked
# staff with a little lantern hanging off its hook. Nose to +z.
# Trunk: hips, spine, chest, head (the hood). The staff turns about its foot on the floor; the right hand rides it. The
# lantern hangs off the hook on its own bone. The feet and the hem stay on the root.
# Mask x: the lantern (the page lights only its amber glass). Mask y: none.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
SX, SZ = -0.142, 0.093  # the staff's line
LX, LZ = -0.185, 0.145  # the lantern's
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.42, 0]), 'spine': ('hips', [0, 0.56, 0]), 'chest': ('spine', [0, 0.66, 0]),
     'head': ('chest', [0, 0.74, 0]), 'staff': ('root', [SX, 0.0, SZ]), 'lantern': ('staff', [LX, 0.925, LZ])}
ends = {'head': [0, 0.9, 0], 'lantern': [LX, 0.8, LZ]}
names = list(J.keys())
ds = np.hypot(x - SX, z - SZ); dl = np.hypot(x - LX, z - LZ)
lantern = (dl < 0.047) & (y > 0.78) & (y < 0.918)
staff = ((ds < 0.022) | ((y > 0.8) & (x < -0.1) & (z > 0.06))) & ~lantern
hand = (ds < 0.08) & (y > 0.54) & (y < 0.7) & ~staff
body = ~staff & ~lantern
print({k: int(v.sum()) for k, v in dict(lantern=lantern, staff=staff, hand=hand, body=body).items()})
W = np.zeros((len(V), len(names))); ix = {n: i for i, n in enumerate(names)}
def blend(idx, coord, knots):
    ks = np.array([k for k, _ in knots])
    for i in idx:
        c = coord[i]; k = min(max(np.searchsorted(ks, c) - 1, 0), len(knots) - 2); f = np.clip((c - ks[k]) / (ks[k + 1] - ks[k]), 0, 1)
        W[i, ix[knots[k][1]]] += 1 - f; W[i, ix[knots[k + 1][1]]] += f
blend(np.nonzero(body)[0], y, [(-9, 'root'), (0.1, 'root'), (0.42, 'hips'), (0.5, 'hips'), (0.6, 'spine'), (0.64, 'chest'), (0.72, 'chest'), (0.78, 'head'), (9, 'head')])
W[staff] = 0; W[staff, ix['staff']] = 1
W[lantern] = 0; W[lantern, ix['lantern']] = 1
i = np.nonzero(hand)[0]; k = np.clip((0.075 - ds[i]) / 0.03, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['staff']] += k
lit = lantern
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [lit, z0, z0], fallback='hips')
