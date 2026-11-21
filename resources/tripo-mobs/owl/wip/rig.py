# The Shriek Owl's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the body's middle carry the hover, the bank and the lean; sq on them squashes the body (the game's sx, sy,
# sz); the head (the look, the dip, the disc's flare as a small swell); each wing an arm and a hand on the wrist (beat,
# sweep, fold, the leading edge's twist); the tail fan; each leg a shank and the talons.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3])
x, y, z = V.T; ax = np.abs(x)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.42, 0.01]), 'sq': ('hips', [0, 0.42, 0.01]), 'head': ('sq', [0, 0.49, 0.04]),
 'tail': ('sq', [0, 0.3, -0.04]),
}
ends = {'head': [0, 0.7, 0.06], 'tail': [0, 0.0, -0.08]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('sq', m([0.11, 0.56, 0.01])); J['hand' + s] = ('arm' + s, m([0.3, 0.7, -0.07])); ends['hand' + s] = m([0.49, 0.71, -0.165])
    J['leg' + s] = ('sq', m([0.05, 0.3, 0.05])); J['tal' + s] = ('leg' + s, m([0.06, 0.2, 0.08])); ends['tal' + s] = m([0.07, 0.1, 0.12])
names = list(J.keys())
segs = []
for n in names:
    if n in ('root', 'hips'): continue
    if n == 'sq': segs.append((n, np.array([0, 0.3, 0.02]), np.array([0, 0.5, 0.03]))); continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    segs.append((n, a, np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)))
wing = (ax > 0.13) | ((ax > 0.1) & (y > 0.33) & (z < 0.06))
head = (y > 0.48) & (ax < 0.115) & ~wing
leg = (y < 0.29) & (z > 0.005) & (ax < 0.11) & ~wing
tail = (y < 0.36) & (z <= 0.005) & (ax < 0.07) & ~leg & ~wing
print({k: int(v.sum()) for k, v in dict(wing=wing, head=head, leg=leg, tail=tail).items()})
def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n.startswith(('arm', 'hand')): return wing & side
    if n == 'head': return head | ((y > 0.45) & (ax < 0.1))
    if n.startswith(('leg', 'tal')): return leg & side
    if n == 'tail': return tail
    return ~(wing | head | leg | tail) | ((ax < 0.14) & (y > 0.3) & (y < 0.6))
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(head & (y > 0.52), 'head')
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    force(wing & sd & (ax > 0.33), 'hand' + s)
    force(leg & sd & (y < 0.19), 'tal' + s)
force(tail & (y < 0.25), 'tail')
eyes = (np.hypot(ax - 0.045, np.hypot(y - 0.555, z - 0.13)) < 0.032)
print('eyes', int(eyes.sum()))
finish(M, J, ends, W, names, out, [eyes, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='sq')
