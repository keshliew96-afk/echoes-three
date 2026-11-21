# The Coal Hurler's rig. usage: python3 -I rig.py <cut.glb> <outdir> <kit dir> <orig.glb> <islands.npy>
# A squat imp: hips, spine, chest, neck, head; legs as 'limb' chains (thigh, shin, foot, toe); arms on a clavicle, upper
# arm, forearm and hand (the right hand a fist round the sack's fold, on hand and knuckle bones; the left open); the coal sack, cut free by cut.py,
# rides one 'sack' bone pivoting on top of the right shoulder.
# The trunk's weights run linearly by height; arms and legs by heat from their bones, each seeing only its own region.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, segdist
from scipy.spatial import cKDTree
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
# carry the UV islands over from the uncut model (same position and UV)
O = Mesh(sys.argv[4]); lab0 = np.load(sys.argv[5])
d, j = cKDTree(np.c_[O.V, O.UV * 0.01]).query(np.c_[V, M.UV * 0.01]); lab = np.where(d < 1e-4, lab0[j], -1)
sack = np.load(src[:-4] + '.sack.npy')
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.34, 0.0]), 'spine': ('hips', [0, 0.47, 0.0]), 'chest': ('spine', [0, 0.6, 0.0]),
     'neck': ('chest', [0, 0.76, 0.02]), 'head': ('neck', [0, 0.81, 0.05])}
ends = {'head': [0, 1.0, 0.05]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['thigh' + s] = ('hips', m([0.1, 0.32, 0.0])); J['shin' + s] = ('thigh' + s, m([0.15, 0.2, 0.0]))
    J['foot' + s] = ('shin' + s, m([0.175, 0.1, 0.0])); J['toe' + s] = ('foot' + s, m([0.18, 0.035, 0.08])); ends['toe' + s] = m([0.185, 0.0, 0.16])
    J['clv' + s] = ('chest', m([0.06, 0.72, 0.0]))
J['armL'] = ('clvL', [0.2, 0.7, -0.01]); J['foreL'] = ('armL', [0.255, 0.54, -0.02]); J['handL'] = ('foreL', [0.28, 0.43, 0.0]); ends['handL'] = [0.29, 0.32, 0.03]
J['armR'] = ('clvR', [-0.21, 0.72, 0.02]); J['foreR'] = ('armR', [-0.27, 0.6, 0.0]); J['handR'] = ('foreR', [-0.205, 0.655, 0.09]); J['fingR'] = ('handR', [-0.165, 0.665, 0.135]); ends['fingR'] = [-0.125, 0.672, 0.18]
J['sack'] = ('chest', [-0.16, 0.68, 0.14]); ends['sack'] = [-0.23, 0.72, -0.16]
names = list(J.keys())
# --- regions
xbL = np.interp(y, [0.3, 0.42, 0.46, 0.6, 0.66, 0.72, 0.79], [0.25, 0.24, 0.215, 0.215, 0.19, 0.17, 0.17])
foreL = segdist(V, np.array(J['foreL'][1], float), np.array(ends['handL'], float))
armL = ~sack & (((x > xbL) & (y > 0.3) & (y < 0.79)) | (foreL < 0.085) & (x > 0.238))
fore = segdist(V, np.array(J['foreR'][1], float), np.array(ends['fingR'], float))
xbR = np.interp(y, [0.53, 0.6, 0.66, 0.72, 0.81], [0.225, 0.2, 0.175, 0.165, 0.165])
armR = ~sack & (((x < -xbR) & (y > 0.53) & (y < 0.82)) | (fore < 0.055) & (z > -0.02) | np.isin(lab, [27, 16]))
arm = armL | armR
leg = (y < 0.3) & ~arm & ~sack
head = (y > 0.8) & ~arm & ~sack
coal = np.isin(lab, [6, 18, 36, 42]) & (r > 140) & (g > 50)
eye = (r > 200) & (g > 90) & (g < 180) & (b < 90) & (z > 0.14) & (y > 0.84) & (y < 0.93)
print({k: int(v.sum()) for k, v in dict(armL=armL, armR=armR, leg=leg, head=head, sack=sack, coal=coal, eye=eye).items()})
segs = []
for n in names:
    if n in ('root',): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and k != 'sack']
    e = np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)
    if n in ('hips', 'spine', 'chest', 'neck'): e = np.array(J[{'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head'}[n]][1], float)
    segs.append((n, a, e))
def vis_of(n, d):
    sd = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'sack': return sack
    if n.startswith(('arm', 'fore', 'hand', 'fing')): return armL if n[-1] == 'L' else armR
    if n.startswith(('thigh', 'shin', 'foot', 'toe')): return leg & sd
    if n.startswith('clv'): return ~arm & ~leg & ~sack & sd
    return ~arm & ~leg & ~sack
np.savez(out + '/regions.npz', armL=armL, armR=armR, leg=leg, head=head, sack=sack)
W, names, ix = skin(M, J, segs, vis_of)
trunk = ~arm & ~leg & ~sack
H = [(-1, 'hips'), (0.34, 'hips'), (0.47, 'spine'), (0.6, 'chest'), (0.76, 'neck'), (0.81, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, y[i]) - 1, 0), len(H) - 2); f = (y[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# shoulders: the trunk's top out past the neck rides the clavicle
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y > 0.62) & (y < 0.8) & (ax > 0.08))[0]
    k = np.clip((ax[i] - 0.08) / 0.06, 0, 1) * np.clip((y[i] - 0.62) / 0.06, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
# the vest's flaps and the apron (below 0.36): the hips, blended a little into the thigh on its side
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y < 0.36))[0]
    k = 0.5 * np.clip((0.36 - y[i]) / 0.08, 0, 1) * np.clip(ax[i] / 0.05, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['thigh' + s]] += k
# the left arm's shoulder blends into the clavicle over the top 6 cm, so a raised arm stretches the deltoid, not the chest
for s, sg, A in (('L', 1, armL), ('R', -1, armR)):
    i = np.nonzero(A & (y > 0.64) & ~np.isin(lab, [27, 16]))[0]; k = 0.5 * np.clip((y[i] - 0.64) / 0.12, 0, 1) * np.clip((0.26 - sg * x[i]) / 0.06, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['clv' + s]] += k
W[sack] = 0; W[sack, ix['sack']] = 1
W[head] = 0; W[head, ix['head']] = 1
finish(M, J, ends, W, names, out, [coal, eye, np.zeros(len(V), bool)], fallback='spine')
