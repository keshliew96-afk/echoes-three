# The Vane Cock's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A rooster of riveted brass plates gone green with verdigris: a red copper comb and wattles, glowing yellow eyes, a
# tall fan of tail plates, plate wings at its sides, thin jointed brass legs with clawed feet, and a stub of its rusted
# iron spindle under its belly. Nose to +z. Trunk: hips, chest, neck, head; the tail fan on two bones; a wing each side;
# the spindle stub on the hips. The legs are 'limb' chains (thigh inside the body, shin, foot, toes) so the feet plant.
# Mask x: the front of the head (the page lights only the bright yellow eyes in it). Mask y: none.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.36, 0.0]), 'chest': ('hips', [0, 0.5, 0.05]),
     'neck': ('chest', [0, 0.64, 0.1]), 'head': ('neck', [0, 0.78, 0.15]),
     'tail1': ('hips', [0, 0.48, -0.1]), 'tail2': ('tail1', [0, 0.66, -0.2]),
     'spindle': ('hips', [0, 0.29, -0.035])}
ends = {'head': [0, 0.84, 0.3], 'tail2': [0, 0.92, -0.27], 'spindle': [0, 0.14, -0.035]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['wing' + s] = ('chest', m([0.14, 0.52, 0.04])); ends['wing' + s] = m([0.17, 0.3, -0.06])
    J['thigh' + s] = ('hips', m([0.07, 0.38, 0.0])); J['shin' + s] = ('thigh' + s, m([0.08, 0.275, 0.035]))
    J['foot' + s] = ('shin' + s, m([0.08, 0.07, 0.03])); J['toe' + s] = ('foot' + s, m([0.08, 0.02, 0.08])); ends['toe' + s] = m([0.09, 0.0, 0.19])
names = list(J.keys())
spin = (ax < 0.03) & (z < -0.015) & (z > -0.07) & (y < 0.29) & (y > 0.1)
leg = (y < 0.3) & ~spin & (ax > 0.02)
wing = (ax > 0.125) & (y > 0.27) & (y < 0.56) & (z > -0.14) & (z < 0.1)
tailR = (z < -0.06) & (y > 0.44) & ~wing
headR = (y > 0.6) & (z > -0.02) & ~tailR
body = ~spin & ~leg & ~wing & ~tailR & ~headR
print({k: int(v.sum()) for k, v in dict(spin=spin, leg=leg, wing=wing, tail=tailR, head=headR, body=body).items()})
W = np.zeros((len(V), len(names))); ix = {n: i for i, n in enumerate(names)}
def blend(idx, coord, knots):
    ks = np.array([k for k, _ in knots])
    for i in idx:
        c = coord[i]; k = min(max(np.searchsorted(ks, c) - 1, 0), len(knots) - 2); f = np.clip((c - ks[k]) / (ks[k + 1] - ks[k]), 0, 1)
        W[i, ix[knots[k][1]]] += 1 - f; W[i, ix[knots[k + 1][1]]] += f
blend(np.nonzero(body)[0], y, [(-9, 'hips'), (0.38, 'hips'), (0.52, 'chest'), (9, 'chest')])
blend(np.nonzero(headR)[0], y, [(-9, 'chest'), (0.6, 'chest'), (0.68, 'neck'), (0.74, 'neck'), (0.8, 'head'), (9, 'head')])
blend(np.nonzero(tailR)[0], y, [(-9, 'hips'), (0.44, 'hips'), (0.52, 'tail1'), (0.62, 'tail1'), (0.72, 'tail2'), (9, 'tail2')])
W[spin, ix['spindle']] = 1
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    i = np.nonzero(wing & sd)[0]; k = np.clip((0.53 - y[i]) / 0.08, 0, 1); W[i, ix['wing' + s]] += k; W[i, ix['chest']] += 1 - k
    i = np.nonzero(leg & sd)[0]
    blend(i, y, [(-9, 'toe' + s), (0.0, 'toe' + s), (0.035, 'foot' + s), (0.065, 'foot' + s), (0.085, 'shin' + s), (0.25, 'shin' + s), (0.28, 'thigh' + s), (9, 'thigh' + s)])
    # the toes reaching forward ride the toe bone, the heel spur the foot
    j = i[(y[i] < 0.06) & (z[i] > 0.07)]; W[j] = 0; W[j, ix['toe' + s]] = 1
    j = i[(y[i] < 0.06) & (z[i] <= 0.07)]; W[j] = 0; W[j, ix['foot' + s]] = 1
    # the thigh's top blends into the hips
    j = i[y[i] > 0.27]; k = np.clip((y[j] - 0.27) / 0.03, 0, 1) * 0.6; W[j] *= (1 - k)[:, None]; W[j, ix['hips']] += k
eyes = headR & (y > 0.72) & (z > 0.1)  # the head's front; the page picks the bright yellow eyes out of the texture
print('eyes', int(eyes.sum()))
finish(M, J, ends, W, names, out, [eyes, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='hips')
