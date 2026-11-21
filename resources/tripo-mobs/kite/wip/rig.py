# The Gust Kite's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# The model stands upright like a real kite: the body (hips at the cane cross, chest, the folded-cloth head on top), two
# wings (the cane spar with its sail: an inner and an outer bone each, so the sails can billow and fold), and the tail of
# rag bows hanging below on four bones. Weights by position: the sails blend outward along |x|, the tail down along y.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); lum = tc.sum(1)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.72, 0.03]), 'chest': ('hips', [0, 0.78, 0.03]), 'head': ('chest', [0, 0.86, 0.05]),
     'tail1': ('hips', [0, 0.60, 0.0]), 'tail2': ('tail1', [0, 0.45, -0.03]), 'tail3': ('tail2', [0, 0.30, -0.04]), 'tail4': ('tail3', [0, 0.16, -0.06])}
ends = {'head': [0, 1.0, 0.04], 'tail4': [0, 0.0, -0.07]}
for s, sg in (('L', 1), ('R', -1)):
    J['wing1' + s] = ('chest', [0.07 * sg, 0.82, 0.04]); J['wing2' + s] = ('wing1' + s, [0.27 * sg, 0.82, -0.02]); ends['wing2' + s] = [0.5 * sg, 0.79, -0.15]
names = list(J.keys()); ix = {n: i for i, n in enumerate(names)}
W = np.zeros((len(V), len(names)))
def lin(i, val, H):
    for k in range(len(H) - 1):
        if H[k][0] <= val <= H[k + 1][0]:
            f = (val - H[k][0]) / (H[k + 1][0] - H[k][0]); W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f; return
    W[i, ix[H[-1][1] if val > H[-1][0] else H[0][1]]] += 1
tail = (y < 0.6) & (ax < 0.13)
headm = (y > 0.875) & (ax < 0.09)
for i in range(len(V)):
    if tail[i]: lin(i, y[i], [(0.0, 'tail4'), (0.16, 'tail4'), (0.3, 'tail3'), (0.45, 'tail2'), (0.58, 'tail1'), (0.64, 'hips')]); continue
    if headm[i]: W[i, ix['head']] = 1; continue
    s = 'L' if x[i] > 0 else 'R'
    if ax[i] > 0.08:
        lin(i, ax[i], [(0.08, 'chest'), (0.13, 'wing1' + s), (0.25, 'wing1' + s), (0.32, 'wing2' + s), (0.6, 'wing2' + s)])
    else:
        lin(i, y[i], [(0.5, 'hips'), (0.72, 'hips'), (0.8, 'chest'), (0.86, 'chest'), (0.9, 'head')])
bright = lum > 520
eye = bright & (y > 0.86) & (z > 0.06)
print({k: int(v.sum()) for k, v in dict(tail=tail, head=headm, eye=eye).items()})
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [z0, eye, z0], fallback='hips')
