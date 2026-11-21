# The Ember Newt's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A small sooty fire lizard with glowing cracks, a row of flame spines down its back and a long tapering tail; nose to
# +z. Trunk: hips, spine, chest, neck and head; four tail bones. The splayed legs are 'limb' chains (upper arm,
# forearm, foot, toes and thigh, shin, foot, toes) so the feet plant on the floor. Mask x: the glowing cracks, spots and
# spines (its heat). Mask y: the eyes.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.12, -0.04]), 'spine': ('hips', [0, 0.14, 0.08]), 'chest': ('spine', [0, 0.15, 0.22]),
     'neck': ('chest', [0, 0.17, 0.32]), 'head': ('neck', [0, 0.18, 0.38]),
     'tail1': ('hips', [0, 0.12, -0.14]), 'tail2': ('tail1', [0, 0.1, -0.26]), 'tail3': ('tail2', [0, 0.08, -0.38]), 'tail4': ('tail3', [0, 0.07, -0.47])}
ends = {'head': [0, 0.15, 0.5], 'tail4': [0, 0.07, -0.56]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('chest', m([0.09, 0.13, 0.24])); J['fore' + s] = ('arm' + s, m([0.15, 0.09, 0.24]))
    J['paw' + s] = ('fore' + s, m([0.165, 0.025, 0.26])); J['claw' + s] = ('paw' + s, m([0.18, 0.008, 0.29])); ends['claw' + s] = m([0.2, 0.0, 0.32])
    J['thigh' + s] = ('hips', m([0.08, 0.12, -0.04])); J['shin' + s] = ('thigh' + s, m([0.14, 0.08, -0.05]))
    J['foot' + s] = ('shin' + s, m([0.15, 0.025, -0.04])); J['toe' + s] = ('foot' + s, m([0.17, 0.008, -0.02])); ends['toe' + s] = m([0.19, 0.0, 0.0])
names = list(J.keys())
front = (z > 0.12) & (z < 0.36) & (((y < 0.11) & (ax > 0.085)) | ((y < 0.17) & (ax > 0.115)) | ((y < 0.04) & (ax > 0.045)))  # the inner toes reach in to 0.07
hind = (z > -0.16) & (z < 0.07) & (((y < 0.11) & (ax > 0.08)) | ((y < 0.16) & (ax > 0.11)) | ((y < 0.04) & (ax > 0.045)))
tail = z < -0.14
heat = (r > 190) & (g > 70) & (b < 90)
eyes = (r > 200) & (g > 170) & (b < 90) & (z > 0.36) & (ax > 0.05)
heat &= ~eyes
print({k: int(v.sum()) for k, v in dict(front=front, hind=hind, tail=tail, heat=heat, eyes=eyes).items()})
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm]
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm == 'hips': e = np.array(J['spine'][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore', 'paw', 'claw')): return front & sd
    if nm.startswith(('thigh', 'shin', 'foot', 'toe')): return hind & sd
    return ~front & ~hind
W, names, ix = skin(M, J, segs, vis_of)
# the trunk and the tail by their length, blended between the joints
trunk = ~front & ~hind
H = [(-2, 'tail4'), (-0.47, 'tail4'), (-0.38, 'tail3'), (-0.26, 'tail2'), (-0.14, 'tail1'), (-0.04, 'hips'), (0.08, 'spine'), (0.22, 'chest'), (0.32, 'neck'), (0.38, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, z[i]) - 1, 0), len(H) - 2); f = (z[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# the legs' tops blend into the body they come out of
for s in ('L', 'R'):
    sd = np.sign(x) == (1 if s == 'L' else -1)
    i = np.nonzero(front & sd & (ax < 0.13))[0]; k = 0.6 * np.clip((0.13 - ax[i]) / 0.04, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['chest']] += k
    i = np.nonzero(hind & sd & (ax < 0.12))[0]; k = 0.6 * np.clip((0.12 - ax[i]) / 0.04, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['hips']] += k
# the feet are rigid from the ankle down (anything the shin or forearm held there sinks through the floor as the leg bends)
for s_, (leg, bs) in ((s_, lb) for s_ in ('L', 'R') for lb in ((front, ('paw', 'claw')), (hind, ('foot', 'toe')))):
    sd = np.sign(x) == (1 if s_ == 'L' else -1); i = np.nonzero(leg & sd & (y < 0.04))[0]
    keep = np.zeros(W.shape[1], bool); keep[[ix[n + s_] for n in bs]] = True
    w = W[i] * keep; tot = w.sum(1); w[tot < 1e-6, ix[bs[0] + s_]] = 1; tot = w.sum(1)
    k = np.clip((0.04 - y[i]) / 0.015, 0, 1)[:, None]; W[i] = W[i] * (1 - k) + (w / tot[:, None]) * k
finish(M, J, ends, W, names, out, [heat, eyes, np.zeros(len(V), bool)], fallback='spine')
