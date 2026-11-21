# The Barrow Crow's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# hips at the body carry the hop and the lean; sq squashes the body (the game's sx, sy) and carries the neck, the head
# (the eyes; the lower beak on its own hinge, cut from the beak below the line of its gape), the two half-open wings on
# two bones each (shoulder to wrist, then the primaries), the tail and the two bird legs ('limb': thigh to the knee in
# the feathers, shin down to the heel, the bare tarsus to the ball of the foot, the toes).
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
LEG = [(0.07, 0.4, 0.0), (0.085, 0.33, 0.09), (0.095, 0.28, 0.04), (0.1, 0.035, 0.07), (0.105, 0.0, 0.2)]  # hip, knee, heel, ball, toe tip
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.42, 0.0]), 'sq': ('hips', [0, 0.42, 0.0]),
     'neck': ('sq', [0, 0.54, 0.14]), 'head': ('neck', [0, 0.66, 0.2]), 'jaw': ('head', [0, 0.668, 0.282]),
     'tail': ('sq', [0, 0.32, -0.12])}
ends = {'head': [0, 0.66, 0.39], 'jaw': [0, 0.64, 0.38], 'tail': [0, 0.12, -0.38], 'sq': [0, 0.42, 0.2]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['wing' + s] = ('sq', m([0.12, 0.55, 0.03])); J['wtip' + s] = ('wing' + s, m([0.3, 0.5, -0.08])); ends['wtip' + s] = m([0.5, 0.08, -0.29])
    P = [m(p) for p in LEG]; nm = ['f' + s, 't' + s, 'a' + s, 'c' + s]
    for i in range(4): J[nm[i]] = ('hips' if i == 0 else nm[i - 1], P[i])
    ends['c' + s] = P[4]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, np.array(J[n][1], float), np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, np.array([0, 0.42, -0.1]), np.array([0, 0.42, 0.1])))
    else: segs.append((n, np.array(J[n][1], float), np.array(J[kids[0]][1], float)))
def polyd(P):
    best = np.full(len(V), np.inf)
    for a, bb in zip(P[:-1], P[1:]):
        a = np.asarray(a, float); bb = np.asarray(bb, float); ab = bb - a; t = np.clip(((V - a) @ ab) / (ab @ ab), 0, 1); best = np.minimum(best, np.linalg.norm(V - (a + np.outer(t, ab)), axis=1))
    return best
side = lambda s: np.sign(x) == (1 if s == 'L' else -1)
legm = {s: (polyd([[p[0] * (1 if s == 'L' else -1), p[1], p[2]] for p in LEG[2:]]) < 0.04) & (y < 0.29) & side(s) & ((z > -0.06) | (y < 0.07)) for s in 'LR'}
anyleg = legm['L'] | legm['R']
wing = {s: (ax > 0.13) & (y > 0.07) & (z < 0.2) & side(s) & ~anyleg for s in 'LR'}
beak = (z > 0.28) & (y > 0.55)
# the lower beak: below the gape's line, from the mouth's corner to the hooked tip
gl = 0.668 + (z - 0.282) * (0.64 - 0.668) / (0.38 - 0.282)
jaw = beak & (y < gl - 0.004) & (z > 0.29)
headm = (y > 0.6) & (z > 0.08) & ~beak
neckm = (y > 0.5) & (z > 0.05) & (ax < 0.12) & ~headm & ~beak
tailm = (z < -0.1) & (y < 0.4) & (ax < 0.13)
eye = np.zeros(len(V), bool)
for sg in (1, -1): eye |= np.linalg.norm(V - np.array([0.044 * sg, 0.71, 0.228]), axis=1) < 0.02
print({k: int(v.sum()) for k, v in dict(leg=anyleg, wingL=wing['L'], wingR=wing['R'], beak=beak, jaw=jaw, head=headm, neck=neckm, tail=tailm, eye=eye).items()})
def vis_of(n, d):
    if n[0] in 'ftac' and len(n) == 2: return legm[n[1]]
    if n.startswith('wing') or n.startswith('wtip'): return wing[n[-1]]
    if n == 'jaw': return jaw
    if n == 'head': return headm | (beak & ~jaw)
    if n == 'neck': return neckm | headm
    if n == 'tail': return tailm
    if n == 'hips': return np.zeros(len(V), bool)
    return ~(anyleg | jaw | beak)
W, names, ix = skin(M, J, segs, vis_of)
def force(mk, n): W[mk] = 0; W[mk, ix[n]] = 1
i = np.nonzero(headm)[0]; k = np.clip((y[i] - 0.6) / 0.04, 0, 1); W[i] = 0; W[i, ix['head']] = k; W[i, ix['neck']] = 1 - k
force(jaw, 'jaw'); force(beak & ~jaw, 'head')
for s in 'LR': force(legm[s] & (y < 0.03), 'c' + s)
finish(M, J, ends, W, names, out, [eye, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='sq')
