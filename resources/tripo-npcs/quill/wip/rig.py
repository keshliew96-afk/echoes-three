# Quill's rig (the Chronicler). usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A magpie standing tall: black head and back, a white belly and white shoulder patches, blue-green folded wings, a long
# green tail reaching down behind to the floor, thin dark legs with clawed feet, and a brown satchel on a strap across
# the chest with a rolled scroll and a white quill in it and a little ink bottle hanging off the strap. Nose to +z.
# Trunk: hips, body (the page squashes it for the hop, so the legs are not squashed with it), chest, neck, head; the
# lower beak on its own hinge; the tail on two bones; a wing each side. The legs are 'limb' chains (thigh, shin, foot,
# toes) so the feet plant. Mask x, y: none.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.36, 0.0]), 'body': ('hips', [0, 0.37, -0.005]), 'chest': ('body', [0, 0.56, 0.0]),
     'neck': ('chest', [0, 0.76, 0.02]), 'head': ('neck', [0, 0.85, 0.01]), 'jaw': ('head', [0, 0.887, 0.115]),
     'tail1': ('body', [0, 0.36, -0.05]), 'tail2': ('tail1', [0, 0.18, -0.11])}
ends = {'head': [0, 1.0, 0.0], 'jaw': [0, 0.877, 0.185], 'tail2': [0, 0.0, -0.175]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['wing' + s] = ('chest', m([0.15, 0.74, 0.0])); ends['wing' + s] = m([0.17, 0.33, -0.06])
    J['thigh' + s] = ('hips', m([0.065, 0.37, 0.0])); J['shin' + s] = ('thigh' + s, m([0.065, 0.205, 0.005]))
    J['foot' + s] = ('shin' + s, m([0.067, 0.055, 0.015])); J['toe' + s] = ('foot' + s, m([0.07, 0.025, 0.04])); ends['toe' + s] = m([0.08, 0.018, 0.14])
names = list(J.keys())
brown = (r > b + 25) & (r > g + 5)
bag = brown & (y < 0.64)
tailR = (z < -0.03 - 0.33 * (0.33 - y)) & (y < 0.38)
leg = (y < 0.345) & ~tailR & (ax > 0.02) & ~bag
wing = (ax > 0.125) & (y > 0.3) & (y < 0.79) & ~brown
beak = (z > 0.112) & (y > 0.86) & (y < 0.915) & (ax < 0.03)
yl = 0.887 - (z - 0.115) * 0.14
lower = beak & (y < yl + 0.002)
body = ~leg & ~wing & ~tailR
print({k: int(v.sum()) for k, v in dict(bag=bag, tail=tailR, leg=leg, wing=wing, beak=beak, lower=lower, body=body).items()})
W = np.zeros((len(V), len(names))); ix = {n: i for i, n in enumerate(names)}
def blend(idx, coord, knots):
    ks = np.array([k for k, _ in knots])
    for i in idx:
        c = coord[i]; k = min(max(np.searchsorted(ks, c) - 1, 0), len(knots) - 2); f = np.clip((c - ks[k]) / (ks[k + 1] - ks[k]), 0, 1)
        W[i, ix[knots[k][1]]] += 1 - f; W[i, ix[knots[k + 1][1]]] += f
blend(np.nonzero(body & ~bag)[0], y, [(-9, 'body'), (0.48, 'body'), (0.6, 'chest'), (0.74, 'chest'), (0.8, 'neck'), (0.82, 'neck'), (0.86, 'head'), (9, 'head')])
W[bag, ix['body']] = 1
blend(np.nonzero(tailR)[0], y, [(-9, 'tail2'), (0.16, 'tail2'), (0.22, 'tail1'), (0.33, 'tail1'), (0.4, 'body'), (9, 'body')])
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    i = np.nonzero(wing & sd)[0]; k = np.clip((0.74 - y[i]) / 0.1, 0, 1); W[i, ix['wing' + s]] += k; W[i, ix['chest']] += 1 - k
    i = np.nonzero(leg & sd)[0]
    blend(i, y, [(-9, 'toe' + s), (0.0, 'toe' + s), (0.04, 'foot' + s), (0.06, 'foot' + s), (0.08, 'shin' + s), (0.19, 'shin' + s), (0.22, 'thigh' + s), (9, 'thigh' + s)])
    j = i[(y[i] < 0.05) & (z[i] > 0.045)]; W[j] = 0; W[j, ix['toe' + s]] = 1
    j = i[(y[i] < 0.05) & (z[i] <= 0.045)]; W[j] = 0; W[j, ix['foot' + s]] = 1
    # the thigh's top blends into the body
    j = i[y[i] > 0.29]; k = np.clip((y[j] - 0.29) / 0.055, 0, 1); W[j] *= (1 - k)[:, None]; W[j, ix['body']] += k
i = np.nonzero(lower)[0]; k = np.clip((yl[i] + 0.002 - y[i]) / 0.004, 0, 1) * np.clip((z[i] - 0.112) / 0.008, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['jaw']] += k
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [z0, z0, z0], fallback='body')
