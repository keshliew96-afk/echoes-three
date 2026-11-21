# The Heart Bloom's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the knot carry eight roots ('limb' legs, traced from the mesh: one per root it was modelled with) and the
# stem (stem > neck > bud); the bud carries five petal bones round it (the game's five), weighted by angle round the
# stem and rising with height, so the closed bud peels open from its top when they splay (it is one welded mesh).
import sys, json; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3])
V = M.V; tc = M.tc
x, y, z = V.T; rad = np.hypot(x, z); ang = np.arctan2(x, z); r, g, b = tc.T.astype(int)
smooth = lambda k: (lambda c: c * c * (3 - 2 * c))(np.clip(k, 0, 1))

RA = np.radians([-178, -144, -80, -36, 2, 48, 82, 140])
RB = [(0.05, 0.13), (0.12, 0.16), (0.21, 0.08), (0.27, 0.02)]   # arched over the modelled root so the chain has slack to reach
PA = np.radians([0, 72, 144, 216, 288])
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.12, 0]), 'stem': ('hips', [0, 0.14, 0]), 'neck': ('stem', [0, 0.32, 0]),
     'bud': ('neck', [0, 0.52, 0])}
ends = {'bud': [0, 0.75, 0]}
for k, a in enumerate(RA):
    u = np.array([np.sin(a), 0, np.cos(a)]); nm = ['r%d%s' % (k, s) for s in 'abcd']
    for i, (rr, yy) in enumerate(RB): J[nm[i]] = ('hips' if i == 0 else nm[i - 1], (u * rr + [0, yy, 0]).tolist())
    ends[nm[3]] = (u * 0.31).tolist()
for k, a in enumerate(PA):
    u = np.array([np.sin(a), 0, np.cos(a)]); J['p%d' % k] = ('bud', (u * 0.06 + [0, 0.56, 0]).tolist()); ends['p%d' % k] = (u * 0.2 + [0, 0.97, 0]).tolist()
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    kids = [k for k in names if J[k][0] == n]
    if n == 'hips': kids = ['stem']
    if n == 'bud': kids = []
    e = np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)
    segs.append((n, np.array(J[n][1], float), e))
rootm = ((y < 0.15) & (rad > 0.075)) | ((y < 0.22) & (rad > 0.13))
budm = y > 0.5
W, names, ix = skin(M, J, segs, lambda n, dd: np.ones(len(V), bool))
W[:] = 0
# the stem and its leaves, by height
H = [(0.0, 'hips'), (0.12, 'hips'), (0.2, 'stem'), (0.34, 'neck'), (0.5, 'bud')]
st = ~rootm & ~budm
hy = np.array([h for h, _ in H]); hn = [n for _, n in H]
for i in np.nonzero(st)[0]:
    yy = y[i]; j = int(np.clip(np.searchsorted(hy, yy, side='right') - 1, 0, len(H) - 1))
    if j >= len(H) - 1: W[i, ix[hn[-1]]] = 1; continue
    f = (yy - hy[j]) / (hy[j + 1] - hy[j]); W[i, ix[hn[j]]] += 1 - f; W[i, ix[hn[j + 1]]] += f
# the roots: nearest root by angle, linear out along its joints
RJ = [0.05, 0.13, 0.21, 0.27, 0.31]
for i in np.nonzero(rootm)[0]:
    da = np.abs((ang[i] - RA + np.pi) % (2 * np.pi) - np.pi); k = int(np.argmin(da)); rr = rad[i]; nm = ['r%d%s' % (k, c) for c in 'abcd']
    if rr <= RJ[1]: f = np.clip((rr - 0.075) / (RJ[1] - 0.075), 0, 1); W[i, ix['hips']] = 0.6 * (1 - f); W[i, ix[nm[0]]] = 0.4 * (1 - f) + 0.6 * f; W[i, ix[nm[1]]] = 0.4 * f; continue
    j = min(3, int(np.searchsorted(RJ, rr) - 1)); f = np.clip((rr - RJ[j]) / (RJ[j + 1] - RJ[j]), 0, 1)
    W[i, ix[nm[j]]] += 1 - f
    W[i, ix[nm[min(3, j + 1)]]] += f
# the bud: the bulb on 'bud', the petals rising with height, each vertex shared by the petals either side by angle
pw = smooth((y - 0.56) / 0.3)
for i in np.nonzero(budm)[0]:
    da = (ang[i] - PA + np.pi) % (2 * np.pi) - np.pi; c = np.maximum(0, np.cos(da)) ** 4
    if rad[i] < 0.03: c = np.ones(5)
    c = c / c.sum(); W[i, ix['bud']] = 1 - pw[i]
    for k in range(5): W[i, ix['p%d' % k]] += pw[i] * c[k]
glow = (r > 180) & (b > 190) & (g < 110)
print('roots', int(rootm.sum()), 'bud', int(budm.sum()), 'stem', int(st.sum()), 'glow', int(glow.sum()))
finish(M, J, ends, W, names, out, [glow, rootm, budm], fallback='bud')
