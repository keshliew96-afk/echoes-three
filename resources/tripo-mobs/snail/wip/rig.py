# The Lantern Snail's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A pale green slug of a snail with dark spots, a striped coiled shell on its back tied round with rope and topped with
# moss, an iron lantern lashed on top of the shell, a calm face and two eye stalks with yellow eyes. Nose to +z. The foot
# rides the hips (the page stretches it for the creep), the tail end on two bones; the neck and head rise from the foot's
# front; each eye stalk on two bones; the shell on its own bone over the foot, the lantern on the shell.
# Mask x: the lantern's glass (the page swells its light for the mend). Mask y: the eyes.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.05, 0.0]),
     'tail1': ('hips', [0, 0.04, -0.22]), 'tail2': ('tail1', [0, 0.03, -0.38]),
     'neck': ('hips', [0, 0.08, 0.32]), 'head': ('neck', [0, 0.3, 0.39]),
     'shell': ('hips', [0, 0.12, -0.1]), 'lantern': ('shell', [0.03, 0.63, -0.11])}
ends = {'tail2': [0, 0.01, -0.5], 'head': [0, 0.47, 0.41], 'lantern': [0.03, 1.0, -0.11], 'shell': [0, 0.62, -0.1]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['stalk1' + s] = ('head', m([0.05, 0.45, 0.37])); J['stalk2' + s] = ('stalk1' + s, m([0.1, 0.6, 0.39])); ends['stalk2' + s] = m([0.14, 0.75, 0.42])
names = list(J.keys())
lantern = (y > 0.6) & (z < 0.15)
stalk = (y > 0.46) & (z > 0.25)
shellR = (y > 0.11) & (z < 0.19) & ~lantern
headR = (z >= 0.19) & (y > 0.07) & ~stalk & ~lantern & ((ax < 0.15) | (y < 0.14))  # the shell's lip out past the neck stays on the shell
shellR = shellR | ((z >= 0.19) & (y >= 0.14) & (ax >= 0.15) & ~stalk & ~lantern)
foot = ~lantern & ~stalk & ~shellR & ~headR
print({k: int(v.sum()) for k, v in dict(lantern=lantern, stalk=stalk, shell=shellR, head=headR, foot=foot).items()})
W = np.zeros((len(V), len(names))); ix = {n: i for i, n in enumerate(names)}
def blend(idx, coord, knots):
    ks = np.array([k for k, _ in knots])
    for i in idx:
        c = coord[i]; k = min(max(np.searchsorted(ks, c) - 1, 0), len(knots) - 2); f = np.clip((c - ks[k]) / (ks[k + 1] - ks[k]), 0, 1)
        W[i, ix[knots[k][1]]] += 1 - f; W[i, ix[knots[k + 1][1]]] += f
# the foot along its length: the tail bones behind, the hips from under the shell to the front (the neck rises off it)
blend(np.nonzero(foot)[0], z, [(-9, 'tail2'), (-0.4, 'tail2'), (-0.24, 'tail1'), (-0.08, 'hips'), (9, 'hips')])
# the neck and head up the column
blend(np.nonzero(headR)[0], y, [(-9, 'hips'), (0.07, 'hips'), (0.15, 'neck'), (0.3, 'head'), (9, 'head')])
# the shell's bottom blends onto the foot
i = np.nonzero(shellR)[0]; k = np.clip((y[i] - 0.11) / 0.07, 0, 1); W[i, ix['shell']] += k; W[i, ix['hips']] += 1 - k
W[lantern, ix['lantern']] = 1
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(stalk & (np.sign(x) == sg))[0]
    blend(i, y, [(-9, 'head'), (0.46, 'head'), (0.52, 'stalk1' + s), (0.6, 'stalk1' + s), (0.66, 'stalk2' + s), (9, 'stalk2' + s)])
glass = lantern & (r > 190) & (g > 150) & (b < 150)
eyes = stalk & (y > 0.64) & (r > 170) & (g > 120) & (b < 110)
print('glass', int(glass.sum()), 'eyes', int(eyes.sum()))
finish(M, J, ends, W, names, out, [glass, eyes, np.zeros(len(V), bool)], fallback='hips')
