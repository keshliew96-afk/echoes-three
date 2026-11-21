# The Weir Crab's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# hips at the body's middle carry the scuttle and the lean; sq on the hips squashes the shell (the game's sx, sy) and
# carries the eye stalks, the two arms (merus to the wrist, then the claw as one rigid plate) and the eight walking legs
# (four a side: coxa up to the knee under the shell's rim, then down to the tip, traced foot to body with legtrace.py).
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
LEG = {  # coxa, knee, ankle, ball, tip (left side; the right mirrors)
 '1': [(0.14, 0.24, 0.07), (0.25, 0.29, 0.10), (0.30, 0.13, 0.15), (0.325, 0.05, 0.165), (0.334, 0.0, 0.171)],
 '2': [(0.17, 0.22, -0.03), (0.30, 0.27, -0.08), (0.42, 0.14, -0.11), (0.455, 0.06, -0.095), (0.465, 0.0, -0.088)],
 '3': [(0.16, 0.20, -0.10), (0.30, 0.25, -0.22), (0.42, 0.14, -0.32), (0.455, 0.07, -0.355), (0.458, 0.0, -0.378)],
 '4': [(0.10, 0.20, -0.18), (0.20, 0.24, -0.32), (0.27, 0.14, -0.44), (0.288, 0.07, -0.475), (0.296, 0.0, -0.485)],
}
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.3, 0.0]), 'sq': ('hips', [0, 0.3, 0.0])}
ends = {'sq': [0, 0.3, 0.3]}
PL = {}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['eye' + s] = ('sq', m([0.045, 0.44, 0.29])); ends['eye' + s] = m([0.075, 0.6, 0.33])
    J['arm' + s] = ('sq', m([0.2, 0.34, 0.15])); J['claw' + s] = ('arm' + s, m([0.19, 0.34, 0.3])); ends['claw' + s] = m([0.15, 0.3, 0.5])
    for k, pts in LEG.items():
        P = [np.array([p[0] * sg, p[1], p[2]]) for p in pts]; PL[k + s] = P
        nm = ['f' + k + s, 't' + k + s, 'a' + k + s, 'c' + k + s]
        for i in range(4): J[nm[i]] = ('sq' if i == 0 else nm[i - 1], P[i].tolist())
        ends[nm[3]] = P[4].tolist()
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, np.array(J[n][1], float), np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, np.array([0, 0.3, -0.1]), np.array([0, 0.3, 0.1])))
    else: segs.append((n, np.array(J[n][1], float), np.array(J[kids[0]][1], float)))
def polyd(P):
    best = np.full(len(V), np.inf)
    for a, bb in zip(P[:-1], P[1:]):
        a = np.asarray(a, float); bb = np.asarray(bb, float); ab = bb - a; t = np.clip(((V - a) @ ab) / (ab @ ab), 0, 1); best = np.minimum(best, np.linalg.norm(V - (a + np.outer(t, ab)), axis=1))
    return best
side = lambda s: np.sign(x) == (1 if s == 'L' else -1)
legm = {}
for k, P in PL.items():
    d = polyd(P[1:]); dc = polyd(P[:2])
    legm[k] = (((d < 0.06) & (y < 0.28)) | ((dc < 0.05) & (y < 0.27))) & side(k[-1]) & (z < 0.24)
anyleg = np.zeros(len(V), bool)
for mm in legm.values(): anyleg |= mm
stalk = {s: (polyd([J['eye' + s][1], ends['eye' + s]]) < 0.045) & (y > 0.42) & side(s) for s in 'LR'}
eye = (r > 180) & (g > 100) & (b < 80) & (y > 0.5)
mouth = (ax < 0.075) & (z < 0.37) & (y > 0.25) & (y < 0.45)
claw = {s: (z > 0.255) & (y < 0.53) & ~mouth & ~stalk[s] & ~anyleg & side(s) & ~((y > 0.44) & (ax < 0.12) & (z < 0.34)) for s in 'LR'}
arm = {s: (polyd([J['arm' + s][1], J['claw' + s][1]]) < 0.06) & (y < 0.42) & (z > 0.12) & ~claw[s] & ~anyleg & side(s) for s in 'LR'}
print({k: int(v.sum()) for k, v in dict(leg=anyleg, clawL=claw['L'], clawR=claw['R'], armL=arm['L'], stalkL=stalk['L'], eye=eye, mouth=mouth).items()})
def vis_of(n, d):
    if n[0] in 'ftac' and n[1].isdigit(): return legm[n[1:]]
    if n.startswith('claw'): return claw[n[-1]]
    if n.startswith('arm'): return arm[n[-1]]
    if n.startswith('eye'): return stalk[n[-1]] | (eye & side(n[-1]))
    if n == 'hips': return np.zeros(len(V), bool)
    return ~(anyleg | claw['L'] | claw['R'])
W, names, ix = skin(M, J, segs, vis_of)
def force(mk, n): W[mk] = 0; W[mk, ix[n]] = 1
for s in 'LR':
    force(claw[s], 'claw' + s); force(eye & side(s), 'eye' + s)
for k in PL: force(legm[k] & (y < 0.03), 'c' + k)
finish(M, J, ends, W, names, out, [eye, claw['L'] | claw['R'], np.zeros(len(V), bool)], fallback='sq')
