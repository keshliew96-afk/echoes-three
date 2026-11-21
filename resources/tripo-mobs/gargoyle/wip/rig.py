# The Gargoyle's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# hips at the haunches carry the two hind legs ('limb': thigh to the forward knee, shin down to the heel, the long flat
# foot to the ball, the toes); sq squashes the body; spine and chest bend the hunched torso; neck, head and the fanged
# lower jaw; two long arms, knuckles down (upper arm, forearm, the clawed hand); two stone wings on two bones each;
# the one tail that is left (the extra one was cut away) on two bones.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V
x, y, z = V.T; ax = np.abs(x)
LEG = [(0.16, 0.3, -0.12), (0.28, 0.42, 0.04), (0.3, 0.11, -0.2), (0.3, 0.035, 0.04), (0.3, 0.0, 0.15)]   # hip, knee, heel, ball, toe tip
ARM = [(0.17, 0.6, 0.08), (0.18, 0.37, 0.21), (0.14, 0.1, 0.33), (0.13, 0.0, 0.44)]                      # shoulder, elbow, wrist, claw tip
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.3, -0.1]), 'sq': ('hips', [0, 0.3, -0.1]),
     'spine': ('sq', [0, 0.4, -0.02]), 'chest': ('spine', [0, 0.54, 0.06]),
     'neck': ('chest', [0, 0.62, 0.14]), 'head': ('neck', [0, 0.7, 0.2]), 'jaw': ('head', [0, 0.655, 0.25]),
     'tail': ('sq', [0, 0.22, -0.26]), 'tail2': ('tail', [0.04, 0.06, -0.38])}
ends = {'head': [0, 0.72, 0.42], 'jaw': [0, 0.58, 0.37], 'tail2': [0.32, 0.05, -0.3]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    P = [m(p) for p in LEG]; nm = ['f' + s, 't' + s, 'a' + s, 'c' + s]
    for i in range(4): J[nm[i]] = ('hips' if i == 0 else nm[i - 1], P[i])
    ends['c' + s] = P[4]
    A = [m(p) for p in ARM]; J['arm' + s] = ('chest', A[0]); J['fore' + s] = ('arm' + s, A[1]); J['hand' + s] = ('fore' + s, A[2]); ends['hand' + s] = A[3]
    J['wing' + s] = ('chest', m([0.12, 0.72, -0.08])); J['wtip' + s] = ('wing' + s, m([0.3, 0.84, -0.2])); ends['wtip' + s] = m([0.42, 0.27, -0.36])
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, np.array(J[n][1], float), np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, np.array([0, 0.3, -0.2]), np.array([0, 0.3, 0.0])))
    elif n == 'sq': segs.append((n, np.array([0, 0.25, -0.15]), np.array([0, 0.35, -0.05])))
    elif n == 'chest': segs.append((n, np.array(J[n][1], float), np.array([0, 0.62, 0.12])))
    else: segs.append((n, np.array(J[n][1], float), np.array(J[[k for k in kids if not k.startswith(('arm', 'wing', 'jaw'))][0] if [k for k in kids if not k.startswith(('arm', 'wing', 'jaw'))] else kids[0]][1], float)))
def polyd(P):
    best = np.full(len(V), np.inf)
    for a, bb in zip(P[:-1], P[1:]):
        a = np.asarray(a, float); bb = np.asarray(bb, float); ab = bb - a; t = np.clip(((V - a) @ ab) / (ab @ ab), 0, 1); best = np.minimum(best, np.linalg.norm(V - (a + np.outer(t, ab)), axis=1))
    return best
side = lambda s: np.sign(x) == (1 if s == 'L' else -1)
mir = lambda P, s: [[p[0] * (1 if s == 'L' else -1), p[1], p[2]] for p in P]
WR = float(sys.argv[4]) if len(sys.argv) > 4 else 0.2
wing = {s: side(s) & (z < 0.02) & (y > 0.22) & (((ax > WR) & (z < -0.04)) | ((y > 0.66) & (z < -0.03) & (ax > 0.06))) for s in 'LR'}
anyw = wing['L'] | wing['R']
arm = {s: side(s) & (((polyd(mir(ARM, s)) < 0.1) & (z > 0.1)) | ((z > 0.22) & (y < 0.24))) & ~anyw for s in 'LR'}
anya = arm['L'] | arm['R']
foot = {s: side(s) & (y < 0.13) & (z > -0.3) & (z < 0.18) & (ax > 0.17) & ~anya for s in 'LR'}
leg = {s: side(s) & (polyd(mir(LEG[:4], s)) < 0.1) & ~anyw & ~anya & (y < 0.5) | foot[s] for s in 'LR'}
anyl = leg['L'] | leg['R']
headm = (y > 0.6) & (z > 0.12) & ~anyw & ~anya | (y > 0.8) & ~anyw
jaw = headm & (z > 0.2) & (y < 0.655 - (z - 0.25) * 0.3) & (ax < 0.13)
tailm = (z < -0.22) & (y < 0.24) & ~anyw & ~anyl & ~((ax > 0.17) & (z > -0.3))
eye = np.zeros(len(V), bool)
for sg in (1, -1): eye |= np.linalg.norm(V - np.array([0.066 * sg, 0.735, 0.325]), axis=1) < 0.03
print({k: int(v.sum()) for k, v in dict(wing=anyw, arm=anya, leg=anyl, head=headm, jaw=jaw, tail=tailm, eye=eye).items()})
def vis_of(n, d):
    if n[0] in 'ftac' and len(n) == 2: return leg[n[1]]
    if n.startswith(('wing', 'wtip')): return wing[n[-1]]
    if n.startswith(('arm', 'fore', 'hand')): return arm[n[-1]]
    if n == 'jaw': return jaw
    if n == 'head': return headm & ~jaw
    if n == 'neck': return headm | ((y > 0.5) & (z > 0.05) & ~anyw & ~anya)
    if n.startswith('tail'): return tailm
    if n == 'hips': return np.zeros(len(V), bool)
    return ~(anyw | anya | anyl | jaw | tailm)
W, names, ix = skin(M, J, segs, vis_of)
def force(mk, n): W[mk] = 0; W[mk, ix[n]] = 1
i = np.nonzero(headm & ~jaw)[0]; k = np.clip((y[i] - 0.6) / 0.06, 0, 1) * np.clip((z[i] - 0.1) / 0.06, 0, 1); k = np.maximum(k, (y[i] > 0.8)); W[i] = 0; W[i, ix['head']] = k; W[i, ix['neck']] = 1 - k
force(jaw, 'jaw')
for s in 'LR': force(foot[s] & (z > 0.06), 'c' + s); force(foot[s] & (z <= 0.06) & (z > -0.12) & (y < 0.06), 'a' + s)
finish(M, J, ends, W, names, out, [eye, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='sq')
