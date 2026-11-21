# Wick's rig (the Hearth-Keeper). usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# An old round owl: brown feathers, a cream face and belly, big dark eyes behind round brass spectacles, ear tufts, a
# teal knitted shawl with a brass brooch and two tassels, folded wings at the sides and small grey feet. Nose to +z.
# Trunk: hips, chest (the shawl rides it), neck, head; the beak on its own hinge; each eye on a bone the page squashes
# for a blink (inside the spectacle rims); an ear tuft and a wing each side. The feet stay on the root.
# Mask x: none. Mask y: none.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.12, 0]), 'chest': ('hips', [0, 0.35, 0]),
     'neck': ('chest', [0, 0.52, 0]), 'head': ('neck', [0, 0.6, 0]), 'beak': ('head', [0, 0.645, 0.2])}
ends = {'head': [0, 0.92, 0.04], 'beak': [0, 0.585, 0.27]}
EYE = (0.095, 0.685)
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['eye' + s] = ('head', m([EYE[0], EYE[1], 0.2])); ends['eye' + s] = m([EYE[0], EYE[1] + 0.06, 0.2])  # points up, so its y scale squashes the eye shut
    J['tuft' + s] = ('head', m([0.2, 0.84, 0.0])); ends['tuft' + s] = m([0.25, 0.98, -0.02])
    J['wing' + s] = ('chest', m([0.28, 0.42, -0.02])); ends['wing' + s] = m([0.31, 0.1, -0.05])
names = list(J.keys())
feet = y < 0.055
shawl = (g > r + 10) & (b > r) & (y > 0.24) & (y < 0.6)
wing = (ax > 0.245) & (y > 0.06) & (y < 0.44) & ~shawl
tuft = (y > 0.83) & (ax > 0.12)
beak = (z > 0.19) & (y > 0.56) & (y < 0.67) & (ax < 0.045) & ~shawl
eyeD = [np.hypot(x - sg * EYE[0], y - EYE[1]) for sg in (1, -1)]
eye = [(d < 0.05) & (z > 0.12) for d in eyeD]
body = ~feet & ~shawl & ~wing & ~tuft & ~beak
print({k: int(v.sum()) for k, v in dict(feet=feet, shawl=shawl, wing=wing, tuft=tuft, beak=beak, eyeL=eye[0], eyeR=eye[1]).items()})
W = np.zeros((len(V), len(names))); ix = {n: i for i, n in enumerate(names)}
def blend(idx, coord, knots):
    ks = np.array([k for k, _ in knots])
    for i in idx:
        c = coord[i]; k = min(max(np.searchsorted(ks, c) - 1, 0), len(knots) - 2); f = np.clip((c - ks[k]) / (ks[k + 1] - ks[k]), 0, 1)
        W[i, ix[knots[k][1]]] += 1 - f; W[i, ix[knots[k + 1][1]]] += f
W[feet, ix['root']] = 1
blend(np.nonzero(body)[0], y, [(-9, 'hips'), (0.12, 'hips'), (0.35, 'chest'), (0.5, 'chest'), (0.56, 'neck'), (0.6, 'head'), (9, 'head')])
W[shawl, ix['chest']] = 1
for s, sg, ek in (('L', 1, 0), ('R', -1, 1)):
    sd = np.sign(x) == sg
    i = np.nonzero(wing & sd)[0]; k = np.clip((0.44 - y[i]) / 0.08, 0, 1); W[i] = 0; W[i, ix['wing' + s]] = k; W[i, ix['chest']] = 1 - k
    i = np.nonzero(tuft & sd)[0]; k = np.clip((y[i] - 0.83) / 0.05, 0, 1); W[i] = 0; W[i, ix['tuft' + s]] = k; W[i, ix['head']] = 1 - k
    i = np.nonzero(eye[ek])[0]; k = np.clip((0.05 - eyeD[ek][i]) / 0.015, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['eye' + s]] += k
i = np.nonzero(beak)[0]; k = np.clip((z[i] - 0.19) / 0.03, 0, 1) * np.clip((0.655 - y[i]) / 0.02, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['beak']] += k
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [z0, z0, z0], fallback='chest')
