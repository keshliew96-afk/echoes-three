# The Slag Golem's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A hulking golem of cooled grey-black slag boulders, molten orange seams through the cracks (brightest down its chest),
# a small head sunk between huge shoulders with glowing eyes, long thick arms ending in boulder fists that hang to the
# knee, short thick legs on wide feet; a rake and some bricks stuck in its back. Nose to +z. Trunk: hips, spine, chest
# (the shoulders, the rake and bricks ride it), head. Legs are 'limb' chains (thigh, shin, foot, toe). Arms: clavicle,
# upper arm, forearm, fist. Mask x: the chest's middle (the page flares its seams there for the open core).
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V
x, y, z = V.T; ax = np.abs(x)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.34, 0.0]), 'spine': ('hips', [0, 0.46, 0.0]), 'chest': ('spine', [0, 0.6, 0.0]),
     'head': ('chest', [0, 0.76, 0.03])}
ends = {'head': [0, 0.9, 0.07]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['thigh' + s] = ('hips', m([0.17, 0.33, 0.0])); J['shin' + s] = ('thigh' + s, m([0.18, 0.18, 0.01])); J['foot' + s] = ('shin' + s, m([0.185, 0.06, 0.0]))
    J['toe' + s] = ('foot' + s, m([0.19, 0.02, 0.08])); ends['toe' + s] = m([0.19, 0.0, 0.15])
    J['clv' + s] = ('chest', m([0.1, 0.66, 0.0]))
    J['arm' + s] = ('clv' + s, m([0.26, 0.67, 0.0])); J['fore' + s] = ('arm' + s, m([0.38, 0.46, -0.01])); J['hand' + s] = ('fore' + s, m([0.39, 0.33, 0.03]))
    ends['hand' + s] = m([0.39, 0.19, 0.04])
names = list(J.keys())
lab = M.comps(y < 0.56); big = [l for l in np.unique(lab) if l >= 0 and np.abs(x[lab == l]).mean() > 0.25]  # under the shoulders the arms are pieces of their own
arm = np.isin(lab, big) | ((ax > 0.29) & (y >= 0.56) & (y < 0.7))
armL, armR = arm & (x > 0), arm & (x < 0)
leg = (y < 0.3) & ~arm
head = (y > 0.74) & (ax < 0.1) & (z > -0.02)
print({k: int(v.sum()) for k, v in dict(armL=armL, armR=armR, leg=leg, head=head).items()})
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm]
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm in ('hips', 'spine', 'chest'): e = np.array(J[{'hips': 'spine', 'spine': 'chest', 'chest': 'head'}[nm]][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore', 'hand')): return armL if nm[-1] == 'L' else armR
    if nm.startswith(('thigh', 'shin', 'foot', 'toe')): return leg & sd
    if nm.startswith('clv'): return ~arm & ~leg & sd
    return ~arm & ~leg
W, names, ix = skin(M, J, segs, vis_of)
trunk = ~arm & ~leg
H = [(-1, 'hips'), (0.34, 'hips'), (0.46, 'spine'), (0.6, 'chest'), (2, 'chest')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, y[i]) - 1, 0), len(H) - 2); f = (y[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# the shoulder boulders: the trunk out past 0.13 and above 0.55 rides the clavicle; the arm's top blends into it
for s, sg, A in (('L', 1, armL), ('R', -1, armR)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y > 0.5) & (ax > 0.1) & ~head)[0]
    k = np.clip((ax[i] - 0.1) / 0.08, 0, 1) * np.clip((y[i] - 0.5) / 0.07, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
    # the shoulder boulder's outer half rides the upper arm, so a raised arm lifts the boulder with it
    k2 = np.clip((ax[i] - 0.17) / 0.09, 0, 1) * np.clip((y[i] - 0.52) / 0.06, 0, 1)
    W[i] *= (1 - k2)[:, None]; W[i, ix['arm' + s]] += k2
    i = np.nonzero(A & (y > 0.6))[0]; k = 0.15 * np.clip((y[i] - 0.6) / 0.1, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
# the belly's bottom blends onto the thighs; the leg tops blend back into the hips
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y < 0.38))[0]
    k = 0.5 * np.clip((0.38 - y[i]) / 0.08, 0, 1) * np.clip((ax[i] - 0.04) / 0.06, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['thigh' + s]] += k
    i = np.nonzero(leg & (np.sign(x) == sg) & (y > 0.24))[0]; k = 0.45 * np.clip((y[i] - 0.24) / 0.06, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['hips']] += k
i = np.nonzero(head)[0]; k = np.clip((y[i] - 0.74) / 0.04, 0, 1)
W[i] *= (1 - k)[:, None]; W[i, ix['head']] += k
core = (z > 0.06) & (ax < 0.18) & (y > 0.4) & (y < 0.76) & ~arm
finish(M, J, ends, W, names, out, [core, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
