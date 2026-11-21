# The Ash Keener's rig (the Chime Wraith's frame, no bell or rope). usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the waist carry the ragged skirt (three bones down to the hem) and sq, which squashes the body; the body bends
# at spine and chest; the hood and face on the head bone; two bony arms (upper arm, forearm, the clawed hand) found by
# their distance from the arm line outside the robe. The body's weights run linearly by height between its joints.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, segdist
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.45, 0.0]), 'sq': ('hips', [0, 0.45, 0.0]),
     'spine': ('sq', [0, 0.55, 0.0]), 'chest': ('spine', [0, 0.66, 0.0]), 'head': ('chest', [0, 0.78, 0.0]),
     'sk1': ('hips', [0, 0.36, 0.0]), 'sk2': ('sk1', [0, 0.24, 0.0]), 'sk3': ('sk2', [0, 0.12, 0.0])}
ends = {'head': [0, 1.0, 0.02], 'sk3': [0, 0.0, 0.0]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('chest', m([0.10, 0.71, 0.0])); J['fore' + s] = ('arm' + s, m([0.14, 0.59, 0.0])); J['hand' + s] = ('fore' + s, m([0.165, 0.49, 0.01])); ends['hand' + s] = m([0.18, 0.40, 0.01])
names = list(J.keys())
P = lambda n: np.array(J[n][1], float)
armd = {}
for s, sg in (('L', 1), ('R', -1)):
    d = np.minimum(np.minimum(segdist(V, P('arm' + s), P('fore' + s)), segdist(V, P('fore' + s), P('hand' + s))), segdist(V, P('hand' + s), np.array(ends['hand' + s], float)))
    armd[s] = (d < 0.045) & (ax > 0.115) & (y > 0.39) & (y < 0.7) & (np.sign(x) == sg)
arm = armd['L'] | armd['R']
headm = (y > 0.79) & ~arm
print({k: int(v.sum()) for k, v in dict(armL=armd['L'], armR=armd['R'], head=headm).items()})
segs = []
for n in names:
    if not n.startswith(('arm', 'fore', 'hand')): continue
    a = P(n); kids = [k for k in names if J[k][0] == n]
    segs.append((n, a, np.array(ends[n], float) if n in ends else P(kids[0])))
def vis_of(n, d):
    return armd[n[-1]]
W, names, ix = skin(M, J, segs, vis_of)
body = ~arm
H = [(0.0, 'sk3'), (0.12, 'sk3'), (0.24, 'sk2'), (0.36, 'sk1'), (0.45, 'hips'), (0.5, 'sq'), (0.55, 'spine'), (0.66, 'chest'), (0.78, 'head'), (2.0, 'head')]
W[body] = 0
for i in np.nonzero(body)[0]:
    yy = y[i]
    for k in range(len(H) - 1):
        if H[k][0] <= yy <= H[k + 1][0]:
            f = (yy - H[k][0]) / (H[k + 1][0] - H[k][0]); W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f; break
    else: W[i, ix['sk3']] = 1
# the shoulders blend from the chest into the upper arm over the top of the arm region
for s in 'LR':
    sh = armd[s] & (y > 0.63); f = np.clip((0.7 - y[sh]) / 0.07, 0, 1); ii = np.nonzero(sh)[0]
    W[ii] *= f[:, None]; W[ii, ix['chest']] += 1 - f
    hm = armd[s] & (y < 0.5); W[hm] = 0; W[hm, ix['hand' + s]] = 1
W[headm] = 0; W[headm, ix['head']] = 1
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [z0, z0, z0], fallback='spine')
