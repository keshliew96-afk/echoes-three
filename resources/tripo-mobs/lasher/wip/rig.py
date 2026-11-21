# The Vine Lasher's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# The model is shifted so the pod sits on the origin (Tripo centred the bounding box, which the long vine pulls 0.15
# to its right). hips at the pod's base carry eight roots ('limb' legs: a thigh out under the pod, a shin down to the
# floor, a foot and a toe along it) and the vine; sq on them squashes the pod (the game's sx, sy) and carries the two
# halves of the toothed rim (lipL, lipR: the game's two jaws). The vine is a chain of fourteen bones along its traced
# centreline plus an end bone; its weights run linearly between neighbouring joints so it bends smoothly and stretches
# evenly when its joints slide apart (the game lays its vine dead straight to the lane's end).
import sys, json; sys.path.insert(0, sys.argv[4])
import numpy as np, scipy.sparse as sp, scipy.sparse.csgraph as cg
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3])
SHIFT = np.array([0.15, 0, -0.08]); M.V = M.V - SHIFT; V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); rad = np.hypot(x, z); ang = np.arctan2(x, z); r, g, b = tc.T.astype(int)

# ---- the vine: the thin piece reaching furthest to its right; centreline by graph distance from the pod
lab = M.comps(th < 0.05); best = None
for c in np.unique(lab[lab >= 0]):
    k = lab == c
    if k.sum() > 100 and V[k, 0].min() < -0.5 and (best is None or k.sum() > (lab == best).sum()): best = c
vc = lab == best
Wg = M.A.copy().tocoo(); Vw = np.zeros((M.nw, 3)); Vw[M.inv] = V
Lg = np.linalg.norm(Vw[Wg.row] - Vw[Wg.col], axis=1); G = sp.coo_matrix((Lg, (Wg.row, Wg.col)), shape=Wg.shape).tocsr()
wk = np.unique(M.inv[vc]); sub = G[wk][:, wk]; root = np.argmin(np.linalg.norm(Vw[wk] - [0, 0.4, 0], axis=1))
d = cg.dijkstra(sub, indices=root); fin = np.isfinite(d); mx = d[fin].max()
pts = []
for a in np.arange(0, mx, 0.05):
    s = (d >= a) & (d < a + 0.05)
    if s.sum(): pts.append(Vw[wk[s]].mean(0))
pts = np.array(pts)
for _ in range(2): pts[1:-1] = 0.25 * pts[:-2] + 0.5 * pts[1:-1] + 0.25 * pts[2:]   # smooth the centreline
seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); cum = np.r_[0, np.cumsum(seg)]; NV = 14
at = np.linspace(0, cum[-1], NV + 1); JV = np.array([[np.interp(t, cum, pts[:, i]) for i in range(3)] for t in at])
print('vine length %.3f, %d bones of %.3f' % (cum[-1], NV, cum[-1] / NV), 'root', JV[0].round(3), 'tip', JV[-1].round(3))

# vine vertices: the thin piece, plus anything thin hugging its centreline outside the pod
def polyproj(P, J):
    best_d = np.full(len(P), np.inf); best_s = np.zeros(len(P)); best_f = np.zeros(len(P))
    for i in range(len(J) - 1):
        a, bb = J[i], J[i + 1]; ab = bb - a; t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1); dd = np.linalg.norm(P - (a + np.outer(t, ab)), axis=1)
        m = dd < best_d; best_d[m] = dd[m]; best_s[m] = i; best_f[m] = t[m]
    return best_d, best_s.astype(int), best_f
# extend the centreline a little into the pod so the root's own verts project onto it
J0 = JV[0] + (JV[0] - JV[1]) * 0.5
dv, sv, fv = polyproj(V, np.vstack([J0, JV]))
vine = vc | ((dv < 0.045) & (th < 0.07) & ~((rad < 0.27) & (y > 0.1)))
# grow it through the thorns and leaves that ride the vine: anything near the centreline, outside the pod, joined to it
cand = vine | ((dv < 0.1) & ~((rad < 0.26) & (y > 0.08))) | ((dv < 0.18) & (rad > 0.42))
cl = M.comps(cand); keep = np.unique(cl[vine & (cl >= 0)]); vine = np.isin(cl, keep) & cand
print('vine verts', int(vine.sum()))

# ---- bones
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.15, 0]), 'pod': ('hips', [0, 0.2, 0]), 'sq': ('pod', [0, 0.2, 0]),
     'lipL': ('sq', [0.1, 0.56, 0.03]), 'lipR': ('sq', [-0.1, 0.56, 0.03])}
ends = {'lipL': [0.2, 0.8, 0.0], 'lipR': [-0.2, 0.8, 0.0], 'sq': [0, 0.6, 0]}
VN = ['v%d' % i for i in range(NV)] + ['vend']
for i, n in enumerate(VN): J[n] = ('pod' if i == 0 else VN[i - 1], JV[i].tolist())
ends['vend'] = (JV[-1] + (JV[-1] - JV[-2]) * 0.3).tolist()
RA = [np.radians(45 * k) for k in range(8)]
RB = [(0.04, 0.12), (0.13, 0.19), (0.25, 0.045), (0.30, 0.018)]
for k, a in enumerate(RA):
    u = np.array([np.sin(a), 0, np.cos(a)]); nm = ['r%d%s' % (k, s) for s in 'abcd']
    for i, (rr, yy) in enumerate(RB): J[nm[i]] = ('hips' if i == 0 else nm[i - 1], (u * rr + [0, yy, 0]).tolist())
    ends[nm[3]] = (u * 0.35).tolist()
names = list(J.keys())
segs = []
for n in names:
    if n in ('root', 'hips', 'pod') or n in VN: continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith(('lip', 'v'))]
    if n.startswith('r') and n[-1] == 'a': kids = [n[:-1] + 'b']
    segs.append((n, a, np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)))
segs.append(('hips', np.array([0, 0.15, 0.]), np.array([0, 0.05, 0.])))

lipm = (y > 0.55) & ~vine
rootm = (r > g + 5) & (y < 0.25) & ~vine & (rad > 0.08)
def sector(k, wide=1.0):
    da = (ang - RA[k] + np.pi) % (2 * np.pi) - np.pi; return np.abs(da) < np.radians(22.5 * wide)
def vis_of(n, dd):
    if n.startswith('lip'): return lipm & (np.sign(x) == (1 if n[-1] == 'L' else -1))
    if n[0] == 'r' and n[1].isdigit(): return rootm & sector(int(n[1]), 1.15) & (rad > 0.06 + 0.04 * 'abcd'.index(n[-1]))
    if n == 'hips': return (y < 0.2) & (rad < 0.14) & ~vine
    return ~(vine | rootm | lipm)
W, names, ix = skin(M, J, segs, vis_of)
# the pod: sq above, hips at the base where the roots gather
body = ~(vine | rootm) & ~lipm
hw = np.clip((y - 0.04) / 0.12, 0, 1)
W[body] = 0; W[body, ix['sq']] = hw[body]; W[body, ix['hips']] = (1 - hw)[body]
# the rim: its two halves (the jaws), blended at the seam front and back and into the pod below
lw = np.clip((y - 0.55) / 0.07, 0, 1); side = np.clip((x + 0.04) / 0.08, 0, 1)
rim = (y > 0.55) & ~vine
W[rim] = 0; W[rim, ix['lipL']] = (lw * side)[rim]; W[rim, ix['lipR']] = (lw * (1 - side))[rim]; W[rim, ix['sq']] = (1 - lw)[rim]
# the vine: linear between neighbouring joints (the extension into the pod rides v0)
W[vine] = 0
# each vine vertex's place along the vine: its graph distance from the root (never the nearest stretch of centreline,
# which jumps to wherever the coil passes close to itself), mapped onto the joints' arc positions
binc = np.array([a + 0.025 for a in np.arange(0, mx, 0.05) if ((d >= a) & (d < a + 0.05)).sum()])
cumb = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
pos_in = -np.ones(M.nw, int); pos_in[wk] = np.arange(len(wk))
from scipy.spatial import cKDTree
kd = cKDTree(Vw[wk[fin]]); dfin = d[fin]
for i in np.nonzero(vine)[0]:
    wi = pos_in[M.inv[i]]
    dd = d[wi] if wi >= 0 and np.isfinite(d[wi]) else dfin[kd.query(V[i])[1]]
    if wi < 0 and dv[i] < 0.06 and sv[i] == 0: W[i, ix['v0']] = 1; continue
    arc = np.interp(dd, binc, cumb)
    j = int(np.clip(np.searchsorted(at, arc, side='right') - 1, 0, NV)); 
    if j >= NV: W[i, ix['vend']] = 1; continue
    f = np.clip((arc - at[j]) / (at[j + 1] - at[j]), 0, 1)
    W[i, ix[VN[j]]] += 1 - f; W[i, ix[VN[j + 1]]] += f
# the roots: each vertex to its nearest root's chain, linear by distance out between that root's joints
RJ = [0.04, 0.13, 0.25, 0.30, 0.35]
kk = np.round(((ang % (2 * np.pi)) / np.radians(45))).astype(int) % 8
W[rootm] = 0
for i in np.nonzero(rootm)[0]:
    k = kk[i]; rr = rad[i]; nm = ['r%d%s' % (k, c) for c in 'abcd']
    if rr <= RJ[1]: f = np.clip((rr - RJ[0]) / (RJ[1] - RJ[0]), 0, 1); W[i, ix['hips']] = 0.5 * (1 - f); W[i, ix[nm[0]]] = 0.5 * (1 - f) + 0.5 * f; W[i, ix[nm[1]]] = 0.5 * f; continue
    j = min(3, int(np.searchsorted(RJ, rr) - 1)); f = np.clip((rr - RJ[j]) / (RJ[j + 1] - RJ[j]), 0, 1)
    W[i, ix[nm[j]]] += 1 - f
    if j < 3: W[i, ix[nm[j + 1]]] += f
    else: W[i, ix[nm[3]]] += f
glow = (r > 170) & (g > 170) & (b < 90)
finish(M, J, ends, W, names, out, [glow, vine, rootm], fallback='sq', extra={'shift': SHIFT.tolist()})
json.dump({'vine': JV.tolist()}, open(out + '/vine.json', 'w'))
