# The Barrow Sexton's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A hunched old gravedigger in a long tattered coat over an apron, a wide floppy hat, a pack on his back with rope and
# two iron traps, keys at the belt, boots; the right hand grips a spade standing upright on its blade before him, the left
# arm hangs. Nose to +z. Trunk: hips, spine, chest (the pack rides it), neck, head (the hat with it). Legs are 'limb'
# chains (thigh, shin, foot, toe) under the coat, whose hem blends onto the thighs. Arms: clavicle, upper arm, forearm,
# hand; the right hand's bone sits at the centre of its grip, and the SPADE (with the fist round it) rides its own bone
# there, so the page can aim it. Mask x: the head (the page lights the painted cyan eyes inside it, the tell).
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
GRIP = [-0.155, 0.655, 0.095]
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.34, -0.04]), 'spine': ('hips', [0, 0.46, -0.04]), 'chest': ('spine', [0, 0.58, -0.04]),
     'neck': ('chest', [0, 0.71, -0.03]), 'head': ('neck', [0, 0.78, 0.0])}
ends = {'head': [0, 1.0, 0.0]}
LEG = {'L': [[0.08, 0.34, -0.05], [0.082, 0.2, -0.05], [0.088, 0.075, -0.05], [0.095, 0.03, 0.03], [0.1, 0.0, 0.075]],
       'R': [[-0.06, 0.34, -0.05], [-0.056, 0.2, -0.045], [-0.052, 0.075, -0.045], [-0.05, 0.03, 0.035], [-0.05, 0.0, 0.08]]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    th, sh, ft, to, en = LEG[s]
    J['thigh' + s] = ('hips', th); J['shin' + s] = ('thigh' + s, sh); J['foot' + s] = ('shin' + s, ft); J['toe' + s] = ('foot' + s, to); ends['toe' + s] = en
    J['clv' + s] = ('chest', m([0.04, 0.69, -0.04]))
J['armL'] = ('clvL', [0.14, 0.72, -0.05]); J['foreL'] = ('armL', [0.17, 0.565, -0.045]); J['handL'] = ('foreL', [0.198, 0.47, -0.03]); ends['handL'] = [0.205, 0.39, -0.02]
J['armR'] = ('clvR', [-0.15, 0.72, -0.045]); J['foreR'] = ('armR', [-0.175, 0.615, -0.03]); J['handR'] = ('foreR', GRIP); ends['handR'] = [GRIP[0], GRIP[1], GRIP[2] + 0.05]
J['spade'] = ('handR', GRIP); ends['spade'] = [-0.158, 0.0, 0.115]
names = list(J.keys())
spade = ((x < -0.105) & (z > 0.04) & (y < 0.75)) | ((x < -0.09) & (z > 0.066) & (y > 0.04) & (y < 0.2)) | ((x < -0.1) & (z > 0.04) & (y > 0.58) & (y < 0.72))  # the blade's inner edge and the fist's knuckles too
armR = ~spade & (((x < -0.12) & (y > 0.56) & (y < 0.77)) | ((x < -0.11) & (z > -0.03) & (y > 0.58) & (y < 0.7)))
armL = ~spade & (((x > 0.12) & (y > 0.56) & (y < 0.77)) | ((x > 0.155) & (y > 0.37) & (y <= 0.56)))
arm = armL | armR
leg = (y < 0.2) & ~spade
head = (y > 0.77) & ~arm
pack = (z < -0.09) & (y > 0.48) & (y < 0.8) & ~arm
print({k: int(v.sum()) for k, v in dict(spade=spade, armL=armL, armR=armR, leg=leg, head=head, pack=pack).items()})
segs = []
for nm in names:
    if nm in ('root', 'spade'): continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm and k != 'spade']
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm in ('hips', 'spine', 'chest', 'neck'): e = np.array(J[{'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head'}[nm]][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore', 'hand')): return armL if nm[-1] == 'L' else armR
    if nm.startswith(('thigh', 'shin', 'foot', 'toe')): return leg & sd
    if nm.startswith('clv'): return ~arm & ~leg & ~spade & sd
    return ~arm & ~leg & ~spade
W, names, ix = skin(M, J, segs, vis_of)
trunk = ~arm & ~leg & ~spade
H = [(-1, 'hips'), (0.34, 'hips'), (0.46, 'spine'), (0.58, 'chest'), (0.71, 'neck'), (0.78, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, y[i]) - 1, 0), len(H) - 2); f = (y[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# shoulders: the trunk's top out past the neck rides the clavicle; the arm's top blends into it
for s, sg, A in (('L', 1, armL), ('R', -1, armR)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y > 0.6) & (y < 0.77) & (ax > 0.05) & ~pack)[0]
    k = np.clip((ax[i] - 0.05) / 0.05, 0, 1) * np.clip((y[i] - 0.6) / 0.05, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
    i = np.nonzero(A & (y > 0.62) & (z < 0.0))[0]; k = 0.55 * np.clip((y[i] - 0.62) / 0.08, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
# the coat below the belt: the hips, blended onto the thigh on its side lower down (the hem follows the legs)
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y < 0.36))[0]
    k = 0.6 * np.clip((0.36 - y[i]) / 0.14, 0, 1) * np.clip(ax[i] / 0.05, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['thigh' + s]] += k
# the leg tops just under the hem blend back into the coat's hips
for s in ('L', 'R'):
    i = np.nonzero(leg & (np.sign(x) == (1 if s == 'L' else -1)) & (y > 0.17))[0]; k = 0.3 * np.clip((y[i] - 0.17) / 0.03, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['hips']] += k
# the spade (and the fist round its grip) on its bone; the wrist blends from the forearm into it
W[spade] = 0; W[spade, ix['spade']] = 1
i = np.nonzero(armR & (z > 0.0) & (y > 0.58))[0]; k = np.clip((z[i] - 0.0) / 0.04, 0, 1)
W[i] *= (1 - k)[:, None]; W[i, ix['spade']] += k
W[pack] = 0; W[pack, ix['chest']] = 1
i = np.nonzero(head)[0]; k = np.clip((y[i] - 0.77) / 0.03, 0, 1)
W[i] *= (1 - k)[:, None]; W[i, ix['head']] += k
eyes = (y > 0.76) & (z > -0.02)
finish(M, J, ends, W, names, out, [eyes, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
