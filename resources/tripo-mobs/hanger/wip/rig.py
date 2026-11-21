# The Rope Hanger's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A lanky dead bell-ringer: hips, spine, chest, neck, head; legs as 'limb' chains (thigh, shin, foot, toe); arms on
# four bones a side (upper arm, forearm, hand, fingers) after a clavicle; the rope's end and its tassel, in the left
# hand, on a 'tas' bone that hangs plumb from the fist.
# The trunk's weights run linearly by height; the coat's skirt blends the hips into the thighs; arms, hands and legs
# by heat from their bones, each seeing only its own region.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
lum = (r + g + b) / 3; warm = (r - b) > 8
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.29, -0.005]), 'spine': ('hips', [0, 0.42, -0.01]), 'chest': ('spine', [0, 0.6, -0.01]),
     'neck': ('chest', [0, 0.78, -0.005]), 'head': ('neck', [0, 0.84, 0.0])}
ends = {'head': [0, 1.0, 0.0]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['thigh' + s] = ('hips', m([0.05, 0.27, -0.005])); J['shin' + s] = ('thigh' + s, m([0.045, 0.145, -0.005]))
    J['foot' + s] = ('shin' + s, m([0.048, 0.045, -0.02])); J['toe' + s] = ('foot' + s, m([0.055, 0.012, 0.045])); ends['toe' + s] = m([0.058, 0.0, 0.09])
    J['clv' + s] = ('chest', m([0.03, 0.765, -0.01])); J['arm' + s] = ('clv' + s, m([0.095, 0.765, -0.01]))
    J['fore' + s] = ('arm' + s, m([0.125, 0.62, -0.012])); J['hand' + s] = ('fore' + s, m([0.125, 0.475, 0.035]))
    J['fing' + s] = ('hand' + s, m([0.12, 0.42, 0.035])); ends['fing' + s] = m([0.11, 0.35, 0.035])
J['tas'] = ('handL', [0.108, 0.44, 0.065]); ends['tas'] = [0.12, 0.3, 0.065]
names = list(J.keys())
# --- regions
xb = np.interp(y, [0.36, 0.5, 0.6, 0.7, 0.76, 0.8], [0.085, 0.09, 0.1, 0.095, 0.08, 0.07])
sleeve = ((ax > xb) & (y > 0.48) | (ax > 0.112) & (y > 0.43)) & (y < 0.8)  # the cuffs flare out past the wrists
hand = (y > 0.33) & (y <= 0.5) & (ax > 0.075) & (lum > 95)
# the rope's end in the left hand, below the knot, with its tassel
tas = (x > 0.07) & (y > 0.27) & (y < 0.505) & (z > 0.015) & (warm | (lum < 120) & (r > 85)) & ~((y > 0.42) & (x > 0.122))
tas &= ~((y < 0.36) & (lum < 70) & ((r - b) < 15))
# cut.py split the rope's end off the sash and wrote which vertices are its
PT = np.load(src[:-4] + '.parts.npz'); tas = PT['tas']; ARM = {'L': ((sleeve | hand) & (x > 0)) | tas, 'R': (sleeve | hand) & (x < 0) & ~tas}
arm = ARM['L'] | ARM['R']
leg = (y < 0.255) & ~arm
head = (y > 0.83) & ~arm
eye = (r > 170) & (g > 130) & (b < 110) & (y > 0.86) & (z > 0.03)
print({k: int(v.sum()) for k, v in dict(armL=ARM['L'], armR=ARM['R'], tas=tas, leg=leg, head=head).items()})
segs = []
for n in names:
    if n in ('root', 'tas'): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and k != 'tas']
    e = np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)
    if n in ('hips', 'spine', 'chest', 'neck'): e = np.array(J[{'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head'}[n]][1], float)
    segs.append((n, a, e))
def vis_of(n, d):
    sd = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n.startswith(('arm', 'fore', 'hand', 'fing')): return ARM[n[-1]]
    if n.startswith(('thigh', 'shin', 'foot', 'toe')): return leg & sd
    if n.startswith('clv'): return ~arm & ~leg & sd
    return ~arm & ~leg
W, names, ix = skin(M, J, segs, vis_of)
# the trunk: linear by height between its joints (the clavicles take a share of the shoulders)
trunk = ~arm & ~leg
H = [(-1, 'hips'), (0.29, 'hips'), (0.42, 'spine'), (0.6, 'chest'), (0.76, 'neck'), (0.84, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
clvw = W[:, [ix['clvL'], ix['clvR']]].copy()
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, y[i]) - 1, 0), len(H) - 2); f = (y[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# shoulders: the top of the coat out past the neck rides the clavicle
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y > 0.66) & (y < 0.8) & (ax > 0.04))[0]
    k = np.clip((ax[i] - 0.04) / 0.04, 0, 1) * np.clip((y[i] - 0.66) / 0.06, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
# the coat's skirt (0.255..0.34): the hips, blended into the thigh on its side
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y < 0.34))[0]
    k = 0.45 * np.clip((0.34 - y[i]) / 0.085, 0, 1) * np.clip(ax[i] / 0.03, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['thigh' + s]] += k
# legs below the coat: heat from their bones already (pants, shins, shoes)
# the rope's end rides the tassel bone; where it meets the knot it blends into the chest
# the knot and the rope down to the fist ride the hand; below the fist it hangs on the tassel bone
i = np.nonzero(tas)[0]; k = np.clip((0.45 - y[i]) / 0.015, 0, 1); W[i] = 0; W[i, ix['tas']] = k; W[i, ix['handL']] = 1 - k
W[head] = 0; W[head, ix['head']] = 1
finish(M, J, ends, W, names, out, [eye, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
