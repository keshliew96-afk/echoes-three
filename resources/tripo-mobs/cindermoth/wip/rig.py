# The Cinder Moth's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the body's middle carry the hover and the lean; sq squashes the furry body; the head (eyes) with two
# feathered antennae; four wings from their roots (the thin panes, split fore and hind by the nearer of their two
# lines); the dangling legs and the belly's underside on one bone a side.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.3, 0.05]), 'sq': ('hips', [0, 0.3, 0.05]), 'head': ('sq', [0, 0.36, 0.17])}
ends = {'head': [0, 0.4, 0.29], 'sq': [0, 0.3, 0.17]}
FORE = ([0.1, 0.36, -0.02], [0.48, 0.47, -0.2]); HIND = ([0.1, 0.26, -0.02], [0.38, 0.15, -0.2])
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['ant' + s] = ('head', m([0.05, 0.44, 0.2])); ends['ant' + s] = m([0.17, 0.64, 0.12])
    J['wf' + s] = ('sq', m(FORE[0])); ends['wf' + s] = m(FORE[1])
    J['wh' + s] = ('sq', m(HIND[0])); ends['wh' + s] = m(HIND[1])
    J['leg' + s] = ('sq', m([0.07, 0.17, 0.05])); ends['leg' + s] = m([0.08, 0.0, 0.05])
names = list(J.keys())
lab = M.comps(th < 0.02); cnt = np.bincount(lab[lab >= 0])
wing = np.zeros(len(V), bool); ant = np.zeros(len(V), bool)
for c in np.nonzero(cnt)[0]:
    k = lab == c; P = V[k]
    if cnt[c] > 400 and ax[k].max() > 0.4: wing |= k
    elif cnt[c] > 100 and P[:, 1].min() > 0.38: ant |= k
def segd(P, a, b):
    a = np.array(a, float); b = np.array(b, float); d = b - a; t = np.clip(((P - a) @ d) / (d @ d), 0, 1); return np.linalg.norm(P - (a + t[:, None] * d), axis=1)
fore = np.zeros(len(V), bool); fsoft = np.zeros(len(V))
for sg in (1, -1):
    sd = np.sign(x) == sg; m = lambda p: [p[0] * sg, p[1], p[2]]
    df = segd(V, m(FORE[0]), m(FORE[1])); dh = segd(V, m(HIND[0]), m(HIND[1]))
    fore |= wing & sd & (df < dh)
    # the two wings of a side are one pane: blend fore into hind over a 6 cm band so the seam bends, not tears
    u = np.clip((dh - df) / 0.06 + 0.5, 0, 1); fsoft[sd] = (u * u * (3 - 2 * u))[sd]
# the panes' glowing rims are thicker than the panes and were left on the body: anything off the body's sides, or
# touching a pane out past the body, goes with the wing
from scipy.spatial import cKDTree
nw = ~wing & ~ant; dw = cKDTree(V[wing]).query(V)[0]
da = cKDTree(V[ant]).query(V)[0]
rim = nw & ((ax > 0.19) | ((ax > 0.12) & (dw < 0.02))) & (dw < da)
ant |= nw & ~rim & (((y > 0.42) & (da < 0.05)) | ((y > 0.5) & (da < 0.12)))
print("rim", int(rim.sum())); wing |= rim
legs = (y < 0.17) & ~wing & (ax < 0.18)
headm = (z > 0.14) & (y > 0.27) & ~wing & ~ant
eye = (r > 200) & (g > 150) & (b < 90) & (z > 0.18)
fire = (r > 190) & (g > 70) & (b < 90) & ~eye
print({k: int(v.sum()) for k, v in dict(wing=wing, fore=fore, ant=ant, legs=legs, head=headm, eye=eye, fire=fire).items()})
segs = [('sq', np.array([0, 0.3, -0.05]), np.array([0, 0.3, 0.15]))]
def vis_of(n, d): return np.ones(len(V), bool)
W, names, ix = skin(M, J, segs, vis_of)
W[:] = 0; W[:, ix['sq']] = 1
def setw(mk, wts):
    i = np.nonzero(mk)[0]; W[i] = 0
    for n, w in wts: W[i, ix[n]] += w if np.ndim(w) == 0 else w[i] if len(w) == len(V) else w
for sg, s in ((1, 'L'), (-1, 'R')):
    sd = np.sign(x) == sg
    # wings: rigid on their bone out from the root, blended into the body over the first 3 cm
    i = np.nonzero(wing & sd)[0]; k = np.clip((ax[i] - 0.1) / 0.03, 0, 1); f = fsoft[i]
    W[i] = 0; W[i, ix['wf' + s]] = k * f; W[i, ix['wh' + s]] = k * (1 - f); W[i, ix['sq']] += 1 - k
    i = np.nonzero(ant & sd)[0]; k = np.clip((y[i] - 0.42) / 0.03, 0, 1); W[i] = 0; W[i, ix['ant' + s]] = k; W[i, ix['head']] += 1 - k
    i = np.nonzero(legs & sd)[0]; k = np.clip((0.17 - y[i]) / 0.05, 0, 1); W[i] = 0; W[i, ix['leg' + s]] = k; W[i, ix['sq']] += 1 - k
i = np.nonzero(headm)[0]; W[i] = 0; W[i, ix['head']] = 1
finish(M, J, ends, W, names, out, [fire, eye, np.zeros(len(V), bool)], fallback='sq')
if len(sys.argv) > 5:
    k = y > 0.5
    for nm in names: 
        c = int(((W[:, ix[nm]] > 0.5) & k).sum())
        if c: print('top', nm, c, np.round(V[(W[:, ix[nm]] > 0.5) & k].min(0), 2), np.round(V[(W[:, ix[nm]] > 0.5) & k].max(0), 2))
