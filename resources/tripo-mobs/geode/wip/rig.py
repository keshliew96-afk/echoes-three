# The Geode Brute's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A knuckle-walker on four 'limb' legs: two short hind legs (thigh, shin, the foot from heel to ball, the toes) on the
# hips, and the two huge arms on the chest (upper arm, forearm, the fist from wrist to knuckles, the crystal knuckles);
# sq squashes the body; spine and chest bend the hunched mass; the low head and the tusked lower jaw.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V
x, y, z = V.T; ax = np.abs(x); r, g, b = M.tc.T.astype(int)
LEG = [(0.13, 0.33, -0.07), (0.15, 0.2, -0.03), (0.15, 0.07, -0.17), (0.15, 0.02, -0.02), (0.15, 0.0, 0.05)]    # hip, knee, heel, ball, toe tip
ARM = [(0.32, 0.62, 0.0), (0.42, 0.38, -0.03), (0.41, 0.15, 0.09), (0.38, 0.05, 0.17), (0.38, 0.0, 0.27)]      # shoulder, elbow, wrist, knuckles, tip
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.33, -0.05]), 'sq': ('hips', [0, 0.33, -0.05]),
     'spine': ('sq', [0, 0.42, -0.04]), 'chest': ('spine', [0, 0.58, -0.02]),
     'head': ('chest', [0, 0.6, 0.15]), 'jaw': ('head', [0, 0.56, 0.18])}
ends = {'head': [0, 0.62, 0.37], 'jaw': [0, 0.53, 0.33], 'chest': [0, 0.9, -0.12]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    P = [m(p) for p in LEG]; nm = ['f' + s, 't' + s, 'a' + s, 'c' + s]
    for i in range(4): J[nm[i]] = ('hips' if i == 0 else nm[i - 1], P[i])
    ends['c' + s] = P[4]
    A = [m(p) for p in ARM]; nm = ['arm' + s, 'fore' + s, 'hand' + s, 'knk' + s]
    for i in range(4): J[nm[i]] = ('chest' if i == 0 else nm[i - 1], A[i])
    ends['knk' + s] = A[4]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    kids = [k for k in names if J[k][0] == n and k not in ('fL', 'fR', 'armL', 'armR', 'jaw', 'head')]
    if n in ends: segs.append((n, np.array(J[n][1], float), np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, np.array([0, 0.33, -0.15]), np.array([0, 0.33, 0.05])))
    elif n == 'sq': segs.append((n, np.array([0, 0.3, -0.1]), np.array([0, 0.4, 0.0])))
    else: segs.append((n, np.array(J[n][1], float), np.array(J[kids[0]][1], float)))
def polyd(P):
    best = np.full(len(V), np.inf)
    for a, bb in zip(P[:-1], P[1:]):
        a = np.asarray(a, float); bb = np.asarray(bb, float); ab = bb - a; t = np.clip(((V - a) @ ab) / (ab @ ab), 0, 1); best = np.minimum(best, np.linalg.norm(V - (a + np.outer(t, ab)), axis=1))
    return best
side = lambda s: np.sign(x) == (1 if s == 'L' else -1)
mir = lambda P, s: [[p[0] * (1 if s == 'L' else -1), p[1], p[2]] for p in P]
AX = float(sys.argv[4]) if len(sys.argv) > 4 else 0.26
arm = {s: side(s) & ((ax > AX) & (y < 0.6) | (ax > 0.24) & (y >= 0.6) & (y < 0.72) & (polyd(mir(ARM[:2], s)) < 0.14)) for s in 'LR'}
anya = arm['L'] | arm['R']
leg = {s: side(s) & (y < 0.3) & (ax > 0.03) & (ax < 0.27) & (z < 0.08) & ~anya for s in 'LR'}
anyl = leg['L'] | leg['R']
headm = (z > 0.13) & (y > 0.46) & (ax < 0.19) & ~anya
jaw = headm & (y < 0.556) & (z > 0.17)
crys = (b > 150) & (r > 110) & (g < 130) & (b - g > 50)
print({k: int(v.sum()) for k, v in dict(arm=anya, leg=anyl, head=headm, jaw=jaw, crystal=crys).items()})
def vis_of(n, d):
    if n[0] in 'ftac' and len(n) == 2: return leg[n[1]]
    if n.startswith(('arm', 'fore', 'hand', 'knk')): return arm[n[-1]]
    if n == 'jaw': return jaw
    if n == 'head': return headm & ~jaw
    if n == 'hips': return np.zeros(len(V), bool)
    return ~(anya | anyl | headm)
W, names, ix = skin(M, J, segs, vis_of)
def force(mk, n): W[mk] = 0; W[mk, ix[n]] = 1
i = np.nonzero(headm & ~jaw)[0]; k = np.clip((z[i] - 0.13) / 0.06, 0, 1); W[i] = 0; W[i, ix['head']] = k; W[i, ix['chest']] = 1 - k
force(jaw, 'jaw')
for s in 'LR':
    force(leg[s] & (y < 0.045) & (z > -0.03), 'c' + s); force(leg[s] & (y < 0.045) & (z <= -0.03), 'a' + s)
    force(arm[s] & (y < 0.1) & (z > 0.2), 'knk' + s)
finish(M, J, ends, W, names, out, [np.zeros(len(V), bool), crys, np.zeros(len(V), bool)], fallback='sq')
