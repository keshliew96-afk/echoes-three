# The Vein Lancer's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A tall thin spearman: hips, spine, chest, neck, head (the helmet rides the head); legs as 'limb' chains (thigh, shin,
# foot, toe); arms on a clavicle, upper arm, forearm and hand. The spear is its own piece: one 'spear' bone pivoting at the
# right hand's grip, so the page can aim it, throw it (it vanishes) and grow it back.
# The trunk's weights run linearly by height; arms and legs by heat from their bones, each seeing only its own region.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
import scipy.sparse.csgraph as cg
from rigkit import Mesh, skin, finish, segdist
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
n, lab = cg.connected_components(M.A); labv = lab[M.inv]
spear = labv != np.bincount(labv).argmax()
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.30, -0.02]), 'spine': ('hips', [0, 0.42, -0.025]), 'chest': ('spine', [0, 0.54, -0.03]),
     'neck': ('chest', [0, 0.65, -0.03]), 'head': ('neck', [0, 0.69, -0.02])}
ends = {'head': [0, 0.8, -0.01]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['thigh' + s] = ('hips', m([0.06, 0.28, -0.025])); J['shin' + s] = ('thigh' + s, m([0.072, 0.155, -0.028]))
    J['foot' + s] = ('shin' + s, m([0.08, 0.05, -0.042])); J['toe' + s] = ('foot' + s, m([0.09, 0.012, 0.02])); ends['toe' + s] = m([0.095, 0.0, 0.055])
    J['clv' + s] = ('chest', m([0.03, 0.61, -0.03])); J['arm' + s] = ('clv' + s, m([0.095, 0.6, -0.04])); J['fore' + s] = ('arm' + s, m([0.125, 0.46, -0.05]))
J['handL'] = ('foreL', [0.14, 0.355, -0.02]); ends['handL'] = [0.145, 0.29, -0.01]
J['handR'] = ('foreR', [-0.133, 0.415, 0.02]); ends['handR'] = [-0.12, 0.40, 0.07]
J['spear'] = ('handR', [-0.118, 0.40, 0.07]); ends['spear'] = [-0.118, 1.0, 0.07]
names = list(J.keys())
# --- regions: the arms hang clear of the torso from 0.3 to 0.55 (inner edge about 0.085); above, the shoulder
armL = ~spear & (x > 0.085) & (y > 0.28) & (y < 0.63)
armR = ~spear & (x < -0.085) & (y > 0.28) & (y < 0.63)
arm = armL | armR
leg = (y < 0.27) & ~arm & ~spear
head = (y > 0.665) & ~arm & ~spear
eye = (r + b - 2 * g > 100) & (y > 0.70) & (y < 0.74) & (z > 0.015) & (ax < 0.03) & ~spear
vein = (b - g > 40) & (r - g > 30) & ~spear & ~eye
tip = spear & (y > 0.8) & (b - g > 40)
print({k: int(v.sum()) for k, v in dict(armL=armL, armR=armR, leg=leg, head=head, spear=spear, eye=eye, vein=vein, tip=tip).items()})
segs = []
for nm in names:
    if nm in ('root', 'spear'): continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm and k != 'spear']
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm in ('hips', 'spine', 'chest', 'neck'): e = np.array(J[{'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head'}[nm]][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore', 'hand')): return armL if nm[-1] == 'L' else armR
    if nm.startswith(('thigh', 'shin', 'foot', 'toe')): return leg & sd
    if nm.startswith('clv'): return ~arm & ~leg & ~spear & sd
    return ~arm & ~leg & ~spear
W, names, ix = skin(M, J, segs, vis_of)
trunk = ~arm & ~leg & ~spear
H = [(-1, 'hips'), (0.30, 'hips'), (0.42, 'spine'), (0.54, 'chest'), (0.65, 'neck'), (0.69, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, y[i]) - 1, 0), len(H) - 2); f = (y[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# shoulders: the trunk's top out past the neck rides the clavicle; the arm's top blends into it
for s, sg, A in (('L', 1, armL), ('R', -1, armR)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y > 0.55) & (y < 0.66) & (ax > 0.04))[0]
    k = np.clip((ax[i] - 0.04) / 0.04, 0, 1) * np.clip((y[i] - 0.55) / 0.04, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
    i = np.nonzero(A & (y > 0.56))[0]; k = 0.5 * np.clip((y[i] - 0.56) / 0.07, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
# the skirt's strips below the belt: the hips, blended into the thigh on its side lower down
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y < 0.3))[0]
    k = 0.6 * np.clip((0.3 - y[i]) / 0.1, 0, 1) * np.clip(ax[i] / 0.04, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['thigh' + s]] += k
W[spear] = 0; W[spear, ix['spear']] = 1
W[head] = 0; W[head, ix['head']] = 1
finish(M, J, ends, W, names, out, [vein, tip, eye], fallback='spine')
