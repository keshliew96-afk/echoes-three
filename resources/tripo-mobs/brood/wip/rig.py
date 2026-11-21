# The Brood Spider's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the cephalothorax carry the eight legs ('limb' legs: femur from the coxa up to the high knee, tibia down, a
# tarsus and a claw at the floor, traced foot to body with legtrace.py); sq on the hips squashes the body (the game's
# sx, sy) and carries the head (the eyes and the two fangs on their own bones) and the abdomen on its hinge.
# The yellow mark floating above the thorax (a separate piece) rides sq.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
LEG = {  # coxa, knee, ankle, ball, tip (left side; the right mirrors)
 '1': [(0.08, 0.32, 0.25), (0.165, 0.345, 0.33), (0.195, 0.12, 0.442), (0.197, 0.05, 0.462), (0.198, 0.0, 0.479)],
 '2': [(0.10, 0.34, 0.22), (0.22, 0.355, 0.21), (0.361, 0.12, 0.237), (0.39, 0.045, 0.236), (0.404, 0.0, 0.236)],
 '3': [(0.15, 0.33, 0.13), (0.28, 0.40, 0.035), (0.44, 0.12, -0.05), (0.452, 0.05, -0.06), (0.458, 0.0, -0.066)],
 '4': [(0.17, 0.36, 0.02), (0.30, 0.395, -0.14), (0.374, 0.10, -0.331), (0.388, 0.04, -0.345), (0.395, 0.0, -0.354)],
}
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.36, 0.12]), 'sq': ('hips', [0, 0.36, 0.12]),
     'head': ('sq', [0, 0.36, 0.28]), 'abd': ('sq', [0, 0.45, -0.02]),
     'fangL': ('head', [0.065, 0.33, 0.44]), 'fangR': ('head', [-0.065, 0.33, 0.44])}
ends = {'head': [0, 0.34, 0.5], 'abd': [0, 0.6, -0.5], 'fangL': [0.07, 0.24, 0.5], 'fangR': [-0.07, 0.24, 0.5], 'sq': [0, 0.36, 0.28]}
PL = {}
for s, sg in (('L', 1), ('R', -1)):
    for k, pts in LEG.items():
        P = [np.array([p[0] * sg, p[1], p[2]]) for p in pts]; PL[k + s] = P
        nm = ['f' + k + s, 't' + k + s, 'a' + k + s, 'c' + k + s]
        for i in range(4): J[nm[i]] = ('hips' if i == 0 else nm[i - 1], P[i].tolist())
        ends[nm[3]] = P[4].tolist()
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    kids = [k for k in names if J[k][0] == n and not k.startswith(('f', 'fang'))]
    if n in ends: segs.append((n, np.array(J[n][1], float), np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, np.array([0, 0.36, 0.0]), np.array([0, 0.36, 0.25])))
    else: segs.append((n, np.array(J[n][1], float), np.array(J[kids[0]][1], float)))
def polyd(P):
    best = np.full(len(V), np.inf)
    for a, bb in zip(P[:-1], P[1:]):
        ab = bb - a; t = np.clip(((V - a) @ ab) / (ab @ ab), 0, 1); best = np.minimum(best, np.linalg.norm(V - (a + np.outer(t, ab)), axis=1))
    return best
AC = np.array([0, 0.6, -0.06]); dab = np.linalg.norm(V - AC, axis=1)
lab = M.comps(np.ones(len(V), bool)); mark = lab == np.argsort(np.bincount(lab))[0]  # the small floating piece
legm = {}
for k, P in PL.items():
    d = polyd(P[1:]); dc = polyd(P[:2])
    legm[k] = (((d < 0.05) & ((dab > 0.38) | (y < 0.22))) | ((dc < 0.045) & (dab > 0.38))) & (np.sign(x) == (1 if k[-1] == 'L' else -1)) & ~mark
anyleg = np.zeros(len(V), bool)
for m in legm.values(): anyleg |= m
fang = (z > 0.42) & (y < 0.335) & (ax < 0.11) & (ax > 0.02) & ~anyleg
headm = (z > 0.27) & (y < 0.52) & ~anyleg & ~fang & ~mark & (dab > 0.3)
abdm = ~anyleg & ~fang & ~headm & ~mark & ((z < 0.2) | (y > 0.5))
eye = (r > 160) & (g > 150) & (b < 110) & (z > 0.38) & ~mark
print({k: int(v.sum()) for k, v in dict(leg=anyleg, fang=fang, head=headm, abd=abdm, mark=mark, eye=eye).items()})
def vis_of(n, d):
    if n.startswith('fang'): return fang & (np.sign(x) == (1 if n[-1] == 'L' else -1))
    if n[0] in 'ftac' and n[1].isdigit(): return legm[n[1:]]
    if n == 'head': return headm
    if n == 'abd': return abdm
    return ~(anyleg | fang)
W, names, ix = skin(M, J, segs, vis_of)
def force(m, n): W[m] = 0; W[m, ix[n]] = 1
force(mark, 'sq'); force(eye, 'head'); force(fang & (x > 0), 'fangL'); force(fang & (x < 0), 'fangR')
for k in PL: force(legm[k] & (y < 0.03), 'c' + k)
finish(M, J, ends, W, names, out, [mark, eye, abdm], fallback='sq')
