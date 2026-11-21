# The Grave Mole's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A round star-nosed mole with a grave candle and broken planks on its back, big digging claws in front, short hind
# feet and a pink tail; nose to +z. Trunk: hips, spine, chest, head and the star nose (it wiggles); two tail bones.
# The digging arms and the hind legs are 'limb' chains (arm / fore / paw / claw and thigh / shin / foot / toe) so the
# paws plant on the floor and rake. Mask x: the claw tips (the game's indigo tell).
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, segdist
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.18, -0.12]), 'spine': ('hips', [0, 0.22, 0.02]), 'chest': ('spine', [0, 0.25, 0.15]),
     'head': ('chest', [0, 0.27, 0.29]), 'snout': ('head', [0, 0.28, 0.39]),
     'tail1': ('hips', [0, 0.11, -0.33]), 'tail2': ('tail1', [0, 0.09, -0.42])}
ends = {'snout': [0, 0.29, 0.5], 'tail2': [0, 0.07, -0.5]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('chest', m([0.14, 0.2, 0.12])); J['fore' + s] = ('arm' + s, m([0.2, 0.11, 0.17]))
    J['paw' + s] = ('fore' + s, m([0.22, 0.045, 0.2])); J['claw' + s] = ('paw' + s, m([0.23, 0.015, 0.27])); ends['claw' + s] = m([0.24, 0.0, 0.35])
    J['thigh' + s] = ('hips', m([0.12, 0.13, -0.19])); J['shin' + s] = ('thigh' + s, m([0.15, 0.07, -0.2]))
    J['foot' + s] = ('shin' + s, m([0.16, 0.03, -0.21])); J['toe' + s] = ('foot' + s, m([0.16, 0.01, -0.15])); ends['toe' + s] = m([0.16, 0.0, -0.11])
names = list(J.keys())
# --- regions
front = ((z > 0.04) & (y < 0.21) & (ax > 0.1) & (z < 0.4)) | ((ax > 0.065) & (z > 0.1) & (y < 0.15) & (z < 0.4))  # the paws' inner walls and claws reach in to 0.07
hind = (z < -0.08) & (z > -0.31) & (y < 0.1) & (ax > 0.06)
tail = (z < -0.33) & (y < 0.16) & (ax < 0.06)
nose = (z > 0.36) & (y > 0.17) & (ax < 0.12)
tips = (r > 170) & (g > 150) & (b > 120) & (y < 0.13) & (z > 0.29)
print({k: int(v.sum()) for k, v in dict(front=front, hind=hind, tail=tail, nose=nose, tips=tips).items()})
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm]
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm in ('hips', 'spine', 'chest', 'head'): e = np.array(J[{'hips': 'spine', 'spine': 'chest', 'chest': 'head', 'head': 'snout'}[nm]][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore', 'paw', 'claw')): return front & sd
    if nm.startswith(('thigh', 'shin', 'foot', 'toe')): return hind & sd
    if nm.startswith('tail'): return tail
    if nm == 'snout': return nose
    return ~front & ~hind & ~tail & ~nose
W, names, ix = skin(M, J, segs, vis_of)
# the trunk by its length: hips, spine, chest, head (the candle and planks ride along)
trunk = ~front & ~hind & ~tail & ~nose
H = [(-1, 'hips'), (-0.12, 'hips'), (0.02, 'spine'), (0.15, 'chest'), (0.29, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, z[i]) - 1, 0), len(H) - 2); f = (z[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# the head's lower face and the nose's root blend; the tail's root blends into the hips
i = np.nonzero(nose & (z < 0.42))[0]; k = np.clip((0.42 - z[i]) / 0.06, 0, 1) * 0.6; W[i] *= (1 - k)[:, None]; W[i, ix['head']] += k
i = np.nonzero(tail & (z > -0.4))[0]; k = np.clip((z[i] + 0.4) / 0.07, 0, 1) * 0.6; W[i] *= (1 - k)[:, None]; W[i, ix['hips']] += k
# the limbs' tops blend into the body they come out of
for s in ('L', 'R'):
    i = np.nonzero(front & (np.sign(x) == (1 if s == 'L' else -1)) & (y > 0.15))[0]; k = 0.6 * np.clip((y[i] - 0.15) / 0.06, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['chest']] += k
    i = np.nonzero(hind & (np.sign(x) == (1 if s == 'L' else -1)) & (y > 0.07))[0]; k = 0.6 * np.clip((y[i] - 0.07) / 0.03, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['hips']] += k
finish(M, J, ends, W, names, out, [tips, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
