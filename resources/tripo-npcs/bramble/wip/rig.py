# Bramble's rig (the Peddler). usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# An old sage-green tortoise on four stubby legs with a red scarf knotted at her neck, carrying her whole shop on her
# shell: a wooden frame with a striped cream and slate awning, shelves of jars and pots, sacks and a basket strapped on,
# bunches of herbs hanging, and an iron lantern hanging off the awning's front corner. Nose to +z. The shell and shop
# ride the hips; the neck and head reach out of the shell, the jaw on its own hinge; an eye each side the page squashes
# for a blink; the lantern and the two herb bunches hang on their own bones. The feet stay on the root.
# Mask x: the lantern's glass. Mask y: none.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.3, -0.1]),
     'neck': ('hips', [0, 0.28, 0.16]), 'head': ('neck', [0, 0.33, 0.27]), 'jaw': ('head', [0, 0.31, 0.3]),
     'lantern': ('hips', [-0.24, 0.72, 0.27]), 'herbL': ('hips', [0.17, 0.77, -0.24]), 'herbR': ('hips', [-0.17, 0.77, -0.24])}
ends = {'head': [0, 0.36, 0.44], 'jaw': [0, 0.28, 0.42], 'lantern': [-0.24, 0.56, 0.27], 'herbL': [0.17, 0.6, -0.24], 'herbR': [-0.17, 0.6, -0.24], 'hips': [0, 0.6, -0.1]}
EYE = (0.062, 0.373)
for s, sg in (('L', 1), ('R', -1)):
    J['eye' + s] = ('head', [sg * EYE[0], EYE[1], 0.37]); ends['eye' + s] = [sg * EYE[0], EYE[1] + 0.04, 0.37]
names = list(J.keys())
legs = (y < 0.2) & (ax > 0.07) & (((z > -0.05) & (z < 0.17)) | (z < -0.17))
scarf = (r > g + 35) & (r > 110) & (z > 0.1) & (y < 0.36) & (ax < 0.16)
headR = (z > 0.17) & (y > 0.2) & (y < 0.46) & (ax < 0.12) & ~scarf
lantern = (x < -0.17) & (y > 0.54) & (y < 0.74) & (z > 0.18)
herb = (g > r) & (g > b + 25) & (y > 0.55) & (ax > 0.12)
eyeD = [np.hypot(x - sg * EYE[0], y - EYE[1]) for sg in (1, -1)]
eye = [(d < 0.028) & (z > 0.33) for d in eyeD]
print({k: int(v.sum()) for k, v in dict(legs=legs, scarf=scarf, head=headR, lantern=lantern, herb=herb, eyeL=eye[0], eyeR=eye[1]).items()})
W = np.zeros((len(V), len(names))); ix = {n: i for i, n in enumerate(names)}
def blend(idx, coord, knots):
    ks = np.array([k for k, _ in knots])
    for i in idx:
        c = coord[i]; k = min(max(np.searchsorted(ks, c) - 1, 0), len(knots) - 2); f = np.clip((c - ks[k]) / (ks[k + 1] - ks[k]), 0, 1)
        W[i, ix[knots[k][1]]] += 1 - f; W[i, ix[knots[k + 1][1]]] += f
rest = ~legs & ~scarf & ~headR & ~lantern & ~herb
W[rest, ix['hips']] = 1
blend(np.nonzero(legs)[0], y, [(-9, 'root'), (0.1, 'root'), (0.19, 'hips'), (9, 'hips')])
blend(np.nonzero(headR)[0], z, [(-9, 'hips'), (0.16, 'hips'), (0.21, 'neck'), (0.25, 'neck'), (0.29, 'head'), (9, 'head')])
# the scarf is tied round the neck: its top rides the neck, the knot hanging below swings toward the shell
i = np.nonzero(scarf)[0]; k = np.clip((y[i] - 0.12) / 0.14, 0, 1); W[i, ix['neck']] = k; W[i, ix['hips']] = 1 - k
# the jaw: the head's front below the mouth line
i = np.nonzero(headR & (z > 0.3) & (y < 0.322))[0]; k = np.clip((0.322 - y[i]) / 0.015, 0, 1) * np.clip((z[i] - 0.3) / 0.03, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['jaw']] += k
i = np.nonzero(lantern)[0]; k = np.clip((0.73 - y[i]) / 0.03, 0, 1); W[i] = 0; W[i, ix['lantern']] = k; W[i, ix['hips']] = 1 - k
for s, sg, ek in (('L', 1, 0), ('R', -1, 1)):
    i = np.nonzero(herb & (np.sign(x) == sg))[0]; k = np.clip((0.78 - y[i]) / 0.05, 0, 1); W[i] = 0; W[i, ix['herb' + s]] = k; W[i, ix['hips']] = 1 - k
    i = np.nonzero(eye[ek])[0]; k = np.clip((0.028 - eyeD[ek][i]) / 0.01, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['eye' + s]] += k
glass = lantern & (r > 170) & (g > 120) & (b < 140)
print('glass', int(glass.sum()))
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [lantern, z0, z0], fallback='hips')
