# The Gloam Moth's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A plump moth with a pale fur collar, a dark head with yellow eyes and two feathered antennae, one broad swept wing a
# side (fore and hind fused into one pane, an eyespot on each), a banded abdomen behind and six thin legs dangling
# under; nose to +z. hips at the body's middle carry the hover and the lean; sq squashes the body; the head; the
# abdomen on its own hinge (it sways and curls in the dive); the antennae; one bone per wing from its root; the legs on
# one bone a side. Mask x: the wing eyespots (the game's indigo tell). Mask y: the eyes.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
from scipy.spatial import cKDTree
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.2, 0.05]), 'sq': ('hips', [0, 0.2, 0.05]),
     'head': ('sq', [0, 0.26, 0.21]), 'abd': ('sq', [0, 0.2, -0.04])}
ends = {'head': [0, 0.27, 0.33], 'sq': [0, 0.2, 0.2], 'abd': [0, 0.17, -0.32]}
WROOT, WTIP = [0.1, 0.27, 0.05], [0.5, 0.27, -0.14]
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['ant' + s] = ('head', m([0.04, 0.36, 0.22])); ends['ant' + s] = m([0.16, 0.49, 0.15])
    J['w' + s] = ('sq', m(WROOT)); ends['w' + s] = m(WTIP)
    J['leg' + s] = ('sq', m([0.06, 0.12, 0.08])); ends['leg' + s] = m([0.08, 0.0, 0.08])
names = list(J.keys())
lab = M.comps(th < 0.02); cnt = np.bincount(lab[lab >= 0])
wing = np.zeros(len(V), bool); ant = np.zeros(len(V), bool)
for c in np.nonzero(cnt)[0]:
    k = lab == c; P = V[k]
    if cnt[c] > 400 and ax[k].max() > 0.4: wing |= k
    elif cnt[c] > 100 and P[:, 1].min() > 0.3: ant |= k
# the panes' thick rims were left on the body: anything off the body's sides, or touching a pane out past the body
nw = ~wing & ~ant; dw = cKDTree(V[wing]).query(V)[0]; da = cKDTree(V[ant]).query(V)[0]
side = np.where(z < -0.04, 0.13, 0.2)  # the abdomen is narrower than the thorax
rim = nw & ((ax > side) | ((ax > 0.1) & (dw < 0.02))) & (dw < da)
print("rim", int(rim.sum())); wing |= rim
ant |= nw & ~rim & (((y > 0.36) & (da < 0.04)) | ((y > 0.42) & (da < 0.1)))
nb = ~wing & ~ant
legs = nb & (y < 0.13) & (ax < 0.17) & (z > -0.04)
abd = nb & ~legs & (z < -0.04)
headm = nb & (z > 0.2) & (y > 0.14)
spots = (r > 200) & (g > 150) & (b < 120) & (ax > 0.15)
eyes = (r > 200) & (g > 150) & (b < 120) & (ax < 0.1) & (z > 0.27)
print({k: int(v.sum()) for k, v in dict(wing=wing, ant=ant, legs=legs, abd=abd, head=headm, spots=spots, eyes=eyes).items()})
segs = [('sq', np.array([0, 0.2, -0.05]), np.array([0, 0.2, 0.2]))]
def vis_of(n, d): return np.ones(len(V), bool)
W, names, ix = skin(M, J, segs, vis_of)
W[:] = 0; W[:, ix['sq']] = 1
for sg, s in ((1, 'L'), (-1, 'R')):
    sd = np.sign(x) == sg
    # the wing: rigid on its bone out from the root, blended into the body over the first 4 cm
    i = np.nonzero(wing & sd)[0]; k = np.clip((ax[i] - 0.09) / 0.04, 0, 1); W[i] = 0; W[i, ix['w' + s]] = k; W[i, ix['sq']] += 1 - k
    i = np.nonzero(ant & sd)[0]; k = np.clip((y[i] - 0.36) / 0.03, 0, 1); W[i] = 0; W[i, ix['ant' + s]] = k; W[i, ix['head']] += 1 - k
    i = np.nonzero(legs & sd)[0]; k = np.clip((0.13 - y[i]) / 0.05, 0, 1); W[i] = 0; W[i, ix['leg' + s]] = k; W[i, ix['sq']] += 1 - k
# the abdomen from its hinge, blended over 5 cm; the head over 3 cm behind its front
i = np.nonzero(abd)[0]; k = np.clip((-0.04 - z[i]) / 0.05, 0, 1); W[i] = 0; W[i, ix['abd']] = k; W[i, ix['sq']] += 1 - k
i = np.nonzero(headm)[0]; k = np.clip((z[i] - 0.2) / 0.03, 0, 1); W[i] *= (1 - k)[:, None]; W[i, ix['head']] += k
finish(M, J, ends, W, names, out, [spots, eyes, np.zeros(len(V), bool)], fallback='sq')
