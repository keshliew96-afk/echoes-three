# The Ash Wraith's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the waist carry the ragged skirt (three bones down to its tail) and sq, which squashes the body; the body
# bends at spine and chest; the bell hood (with its ring and eyes) on the head bone; two long arms (upper arm, forearm,
# the clawed hand). The body's weights run linearly by height between its joints.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.42, 0.02]), 'sq': ('hips', [0, 0.42, 0.02]),
     'spine': ('sq', [0, 0.5, 0.02]), 'chest': ('spine', [0, 0.6, 0.01]), 'head': ('chest', [0, 0.66, 0.0]),
     'sk1': ('hips', [0, 0.36, 0.03]), 'sk2': ('sk1', [0, 0.24, 0.03]), 'sk3': ('sk2', [0, 0.12, 0.02])}
ends = {'head': [0, 1.0, 0.01], 'sk3': [0, 0.0, 0.0]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('chest', m([0.09, 0.6, 0.0])); J['fore' + s] = ('arm' + s, m([0.165, 0.46, 0.015])); J['hand' + s] = ('fore' + s, m([0.195, 0.335, 0.03])); ends['hand' + s] = m([0.19, 0.22, 0.07])
names = list(J.keys())
lab = M.comps(th < 0.06); arm = np.zeros(len(V), bool)
for c in np.unique(lab[lab >= 0]):
    k = lab == c; P = V[k]
    if k.sum() > 200 and np.abs(P[:, 0]).max() > 0.2 and P[:, 1].max() < 0.66: arm |= k
arm &= (ax > 0.06) | (y < 0.5)
arm |= (ax > 0.15) & (y > 0.2) & (y < 0.62)
headm = (y > 0.655) & ~arm
eye = (np.hypot(ax - 0.03, y - 0.78) < 0.03) & (z > 0.05) | ((r > 180) & (g < 150))
print({k: int(v.sum()) for k, v in dict(arm=arm, head=headm, eye=eye).items()})
segs = []
for n in names:
    if n in ('root', 'hips', 'sq', 'spine', 'chest', 'head', 'sk1', 'sk2', 'sk3'): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    segs.append((n, a, np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)))
segs.append(('chest', np.array(J['chest'][1]), np.array(J['head'][1])))
def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n.startswith(('arm', 'fore', 'hand')): return arm & side
    return ~arm
W, names, ix = skin(M, J, segs, vis_of)
# the body: linear by height between its joints (the skirt's bones point down, the trunk's up)
body = ~arm
H = [(0.0, 'sk3'), (0.12, 'sk3'), (0.24, 'sk2'), (0.36, 'sk1'), (0.42, 'hips'), (0.46, 'sq'), (0.5, 'spine'), (0.6, 'chest'), (0.66, 'head'), (2.0, 'head')]
W[body] = 0
for i in np.nonzero(body)[0]:
    yy = y[i]
    for k in range(len(H) - 1):
        if H[k][0] <= yy <= H[k + 1][0]:
            f = (yy - H[k][0]) / (H[k + 1][0] - H[k][0]); W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f; break
    else: W[i, ix['sk3']] = 1
W[headm] = 0; W[headm, ix['head']] = 1
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg; hm = arm & sd & (y < 0.34); W[hm] = 0; W[hm, ix['hand' + s]] = 1
finish(M, J, ends, W, names, out, [eye, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
