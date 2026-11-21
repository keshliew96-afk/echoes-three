# The Bell Sacristan's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# usage with the cut model: python3 -I rig.py src/sac-cut.glb rig thick.npy ../kit (cut.py first).
# A small stone acolyte in a hooded robe and shoulder cape, both hands clasped on the wooden grip of a bronze hand bell
# held before its chest, a rope cord at the waist; the robe reaches the floor. Nose to +z. Trunk: hips, spine, chest,
# neck and head (the hood with it). The robe's skirt is two halves (skL, skR) that swing over the hidden feet. The arms
# are 'limb' chains (upper sleeve, forearm, hand, fingers) laid by IK onto one grip, so both hands and the bell move as
# one: the bell, its handle and the clasped hands ride the right hand. Mask x: the bell (its pale ring). The eyes are
# painted in the texture only.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.3, 0]), 'spine': ('hips', [0, 0.45, -0.01]), 'chest': ('spine', [0, 0.58, -0.02]),
     'neck': ('chest', [0, 0.7, -0.02]), 'head': ('neck', [0, 0.76, 0.0])}
ends = {'head': [0, 1.0, -0.03]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['sk' + s] = ('hips', m([0.06, 0.3, 0.0])); ends['sk' + s] = m([0.1, 0.0, 0.01])
    J['arm' + s] = ('chest', m([0.09, 0.67, -0.03])); J['fore' + s] = ('arm' + s, m([0.145, 0.53, 0.0]))
    J['hand' + s] = ('fore' + s, m([0.045, 0.6, 0.075])); J['fing' + s] = ('hand' + s, m([0.012, 0.625, 0.1])); ends['fing' + s] = m([-0.01, 0.64, 0.115])
names = list(J.keys())
bell = np.load(src[:-4] + '.parts.npz')['bell']  # the bell and its handle, cut off the robe by cut.py
hands = (y > 0.565) & (y < 0.7) & (z > 0.045) & (ax < 0.06)
grip = bell | hands
sleeve = (ax > 0.045) & (y > 0.44) & (y < 0.7) & (z > -0.07) & ~grip & ~((y < 0.53) & (ax < 0.085) & (z > 0.03))  # not the robe front behind the bell
skirt = y < 0.36
print({k: int(v.sum()) for k, v in dict(bell=bell, hands=hands, sleeve=sleeve, skirt=skirt).items()})
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm and not k.startswith(('sk', 'arm'))]
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm == 'hips': e = np.array(J['spine'][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore')): return sleeve & sd
    if nm == 'handR': return grip
    if nm.startswith(('handL', 'fing')): return np.zeros(len(V), bool)
    if nm.startswith('sk'): return skirt & sd
    return ~grip & ~sleeve
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(grip, 'handR')
# the trunk by its height, blended between the joints (the hood rides the head, the skirt its halves below)
trunk = ~grip & ~sleeve
H = [(-1, 'hips'), (0.3, 'hips'), (0.45, 'spine'), (0.58, 'chest'), (0.7, 'neck'), (0.77, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, y[i]) - 1, 0), len(H) - 2); f = (y[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# the skirt: each half takes the hem on its side, fading in from the hips down and across the middle
i = np.nonzero(trunk & (y < 0.36))[0]
k = np.clip((0.36 - y[i]) / 0.3, 0, 1); side = np.clip(x[i] / 0.08, -1, 1)
wl = k * np.clip(0.5 + 0.5 * side, 0, 1); wr = k * np.clip(0.5 - 0.5 * side, 0, 1)
W[i] *= (1 - k)[:, None]; W[i, ix['skL']] += wl; W[i, ix['skR']] += wr
# the sleeves' tops and backs blend into the cape and chest they hang from
i = np.nonzero(sleeve)[0]; kk = 0.7 * np.clip((y[i] - 0.6) / 0.08, 0, 1) + 0.5 * np.clip((0.0 - z[i]) / 0.07, 0, 1); kk = np.clip(kk, 0, 0.85)
W[i] *= (1 - kk)[:, None]; W[i, ix['chest']] += kk
finish(M, J, ends, W, names, out, [bell, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
