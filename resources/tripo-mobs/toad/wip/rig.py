# The Mire Toad's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A squat warty mud-green toad with a huge pale throat and belly, orange eyes with a cross slit, a mud cap down its back
# with duckweed and a tuft of reeds, short front legs and big folded hind legs. Nose to +z. Trunk: hips (the rump) and
# chest; the head above the mouth line on its own hinge, the jaw below it, the throat sac hung on the jaw (the page swells
# it). The legs are 'limb' chains so the feet plant: the front legs upper arm, forearm, hand, fingers; the hind legs
# folded, the thigh out and forward to the knee, the shin back down to the heel, the foot and toes forward on the floor.
# Mask x: the eyes. Mask y: none.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.22, -0.2]), 'chest': ('hips', [0, 0.3, 0.08]),
     'head': ('chest', [0, 0.45, 0.08]), 'jaw': ('chest', [0, 0.43, 0.1]), 'sac': ('jaw', [0, 0.28, 0.3])}
ends = {'head': [0, 0.62, 0.46], 'jaw': [0, 0.42, 0.48], 'sac': [0, 0.12, 0.46], 'chest': [0, 0.45, 0.08]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('chest', m([0.19, 0.25, 0.13])); J['fore' + s] = ('arm' + s, m([0.25, 0.14, 0.15]))
    J['paw' + s] = ('fore' + s, m([0.24, 0.035, 0.2])); J['claw' + s] = ('paw' + s, m([0.24, 0.012, 0.28])); ends['claw' + s] = m([0.25, 0.0, 0.38])
    J['thigh' + s] = ('hips', m([0.2, 0.18, -0.22])); J['shin' + s] = ('thigh' + s, m([0.36, 0.17, -0.04]))
    J['foot' + s] = ('shin' + s, m([0.3, 0.035, -0.3])); J['toe' + s] = ('foot' + s, m([0.36, 0.012, -0.17])); ends['toe' + s] = m([0.42, 0.0, -0.08])
names = list(J.keys())
sacF = (z > 0.2) & (ax < 0.24) & (y > 0.06) & (y < 0.46)
front = (z > 0.04) & (z < 0.43) & (((y < 0.24) & (ax > 0.15)) | ((y < 0.05) & (ax > 0.1))) & ~sacF
hind = (z < 0.06) & (z > -0.42) & (((y < 0.3) & (ax > 0.25)) | ((y < 0.06) & (ax > 0.17)))
hind &= ~front
mouthY = 0.455 - 0.12 * np.clip((0.3 - z) / 0.3, 0, 1)  # the lip line, dropping toward the mouth's corners
headR = (y > mouthY) & (z > 0.0) & ~hind & ~front
trunk = ~front & ~hind & ~headR
print({k: int(v.sum()) for k, v in dict(sac=sacF, front=front, hind=hind, head=headR, trunk=trunk).items()})
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm]
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm == 'hips': e = np.array(J['chest'][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore', 'paw', 'claw')): return front & sd
    if nm.startswith(('thigh', 'shin', 'foot', 'toe')): return hind & sd
    return ~front & ~hind
W, names, ix = skin(M, J, segs, vis_of)
def blend(idx, coord, knots):
    ks = np.array([k for k, _ in knots])
    for i in idx:
        c = coord[i]; k = min(max(np.searchsorted(ks, c) - 1, 0), len(knots) - 2); f = np.clip((c - ks[k]) / (ks[k + 1] - ks[k]), 0, 1)
        W[i, ix[knots[k][1]]] += 1 - f; W[i, ix[knots[k + 1][1]]] += f
# the trunk along its length, rump to chest
ti = np.nonzero(trunk)[0]; W[ti] = 0
blend(ti, z, [(-9, 'hips'), (-0.2, 'hips'), (0.1, 'chest'), (9, 'chest')])
# the throat: just under the lip it rides the jaw, lower down the sac; the sac fades into the chest at its bottom and back
i = np.nonzero(trunk & (z > 0.1))[0]
kz = np.clip((z[i] - 0.1) / 0.12, 0, 1)
dy = mouthY[i] - y[i]
kj = kz * np.clip(1 - dy / 0.1, 0, 1)
ks = kz * np.clip(dy / 0.1, 0, 1) * np.clip((y[i] - 0.05) / 0.1, 0, 1) * np.clip((0.3 - ax[i]) / 0.08, 0, 1)
ks = np.minimum(ks, 1 - kj)
W[i] *= (1 - kj - ks)[:, None]; W[i, ix['jaw']] += kj; W[i, ix['sac']] += ks
# the head above the lip, blended into the chest at its back and just over the lip line
hi = np.nonzero(headR)[0]; W[hi] = 0
kb = np.clip((z[hi] - 0.0) / 0.14, 0, 1) * np.clip((y[hi] - mouthY[hi]) / 0.025, 0.35, 1)
W[hi, ix['head']] = kb; W[hi, ix['chest']] = 1 - kb
# the legs' tops blend into the body they come out of
for s in ('L', 'R'):
    sd = np.sign(x) == (1 if s == 'L' else -1)
    i = np.nonzero(front & sd & (y > 0.17))[0]; k = 0.7 * np.clip((y[i] - 0.17) / 0.07, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['chest']] += k
    i = np.nonzero(hind & sd & ((y > 0.22) | (ax < 0.29)) & (y > 0.06))[0]; k = 0.6 * np.clip(np.maximum((y[i] - 0.22) / 0.08, (0.29 - ax[i]) / 0.04), 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['hips']] += k
# the feet are rigid from the ankle down
for s_, (leg, bs) in ((s_, lb) for s_ in ('L', 'R') for lb in ((front, ('paw', 'claw')), (hind, ('foot', 'toe')))):
    top = 0.045 if bs[0] == 'paw' else 0.075  # the hind heel sits higher
    sd = np.sign(x) == (1 if s_ == 'L' else -1); i = np.nonzero(leg & sd & (y < top))[0]
    keep = np.zeros(W.shape[1], bool); keep[[ix[n + s_] for n in bs]] = True
    w = W[i] * keep; tot = w.sum(1); w[tot < 1e-6, ix[bs[0] + s_]] = 1; tot = w.sum(1)
    k = np.clip((top - y[i]) / 0.02, 0, 1)[:, None]; W[i] = W[i] * (1 - k) + (w / tot[:, None]) * k
eyes = (y > 0.55) & (z > 0.2) & (r > 190) & (g > 110) & (b < 90)
print('eyes', int(eyes.sum()))
finish(M, J, ends, W, names, out, [eyes, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='chest')
