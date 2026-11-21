# The Lockkeeper's rig. usage: python3 -I rig.py <lockkeeper.glb> <outdir> <kit dir> [stage]
# A stout keeper in a long coat and a wide hat: one welded piece. His left forearm is wrapped in chain and the left fist
# holds a great iron key by its ring. The key is cut free of the fist so it can fly (Chain Hook) and be driven into the
# floor (Lock Turn); the part of the ring that the fist hid is rebuilt, so the flying key has a whole ring.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); STOP = sys.argv[4] if len(sys.argv) > 4 else ''
N0 = len(M.F)

# ---- 1. the key leaves the fist
g = face_graph(M); fc = g['fc']; X, Y, Z = fc.T
d = segdist(fc, np.array([0.24, 0.19, 0.035]), np.array([0.24, 0.31, 0.035]))
K = groove_cut(M, ((d < 0.012) & (Y > 0.24) & (Y < 0.31)) | ((Y > 0.325) & (Y < 0.385) & (X > 0.195) & (Z > -0.02) & (Z < 0.07)), (Y > 0.43) | (X < 0.17) | (Y < 0.14))
kv = np.zeros(len(M.V), bool); kv[M.F[K].ravel()] = True
tcs = M.tc.astype(float)[:, :3].sum(1); dark = np.nonzero(kv)[0][np.argmin(tcs[kv])]; UVK = M.UV[dark]
E = Editor(M); rims = E.split(K, 'key', UVK, UVK)
rims = [r for r in rims if len(r) >= 3]; assert len(rims) == 2, len(rims)
c1, c2 = (r.mean(0) for r in rims); rho = float(np.mean([np.linalg.norm(r - r.mean(0), axis=1).mean() for r in rims]))
# the ring: its plane holds the up axis and the line between the two stubs; the hidden arc runs over the top between them
u = c2 - c1; u[1] = 0; half = np.linalg.norm(u) / 2; u /= np.linalg.norm(u); mid = (c1 + c2) / 2
ringv = kv & (M.V[:, 1] > 0.325); bottom = M.V[ringv][:, 1].min() + rho                    # the ring's centre line at its lowest
# centre height yc and radius r from: r^2 = half^2 + (mid.y - yc)^2 and yc - r = bottom
yc = (half ** 2 + mid[1] ** 2 - bottom ** 2) / (2 * (mid[1] - bottom)); r = yc - bottom; a0 = np.arcsin(min(1, half / r))
C = np.array([mid[0], yc, mid[2]]); nrm = np.cross(u, [0, 1, 0]); SEG, SIDES = 6, 6
P = []
for i in range(SEG + 1):
    a = -a0 * 1.06 + 2 * a0 * 1.06 * i / SEG; ctr = C + r * (np.sin(a) * u + np.cos(a) * np.array([0, 1.0, 0])); rad = np.sin(a) * u + np.cos(a) * np.array([0, 1.0, 0])
    for j in range(SIDES): b = 2 * np.pi * j / SIDES; P.append(ctr + rho * (np.cos(b) * rad + np.sin(b) * nrm))
T = []
for i in range(SEG):
    for j in range(SIDES): a, b, c, e = i * SIDES + j, i * SIDES + (j + 1) % SIDES, (i + 1) * SIDES + j, (i + 1) * SIDES + (j + 1) % SIDES; T += [[a, c, b], [b, c, e]]
P = np.array(P); T = np.array(T); fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]); outw = ((P[T].mean(1) - (C + r * (P[T].mean(1) - C) / np.linalg.norm(P[T].mean(1) - C, axis=1, keepdims=True))) * fn).sum(1)
E.add(P, UVK, T, 'key', flip=bool((outw < 0).sum() > len(T) / 2))
M = E.done(); TAG, TAGS = M.tag, M.tags
print('key: faces', int(K.sum()), 'stubs at', c1.round(3), c2.round(3), 'tube radius %.4f' % rho, 'ring centre', C.round(3), 'radius %.3f' % r, 'arc %.0f deg' % np.degrees(2 * a0), 'tris now', len(M.F), 'added', len(M.F) - N0, 'pieces', M.nc)
key = np.isin(TAG, [TAGS['key'], TAGS['key.lid']]); GRIP = C + np.array([0, r, 0])                 # the top of the ring, in the middle of the fist
keyv = M.V[key]; print('key bbox', keyv.min(0).round(3), keyv.max(0).round(3), 'grip', GRIP.round(3))

# ---- 2. regions
V = M.V; x, y, z = V.T; ax = np.abs(x); g = face_graph(M); fc = g['fc']; X, Y, Z = fc.T
def vmask(A): v = np.zeros(len(V), bool); v[M.F[A].ravel()] = True; return v
keyf = key[M.F].all(1)
arm = {}
for s, sg in (('L', 1), ('R', -1)):                                                       # the forearm and hand that come out of the sleeve
    arm[s] = vmask(groove_cut(M, (X * sg > 0.21) & (Y > 0.42) & (Y < 0.62) & ~keyf, (X * sg < 0.1) | (Y > 0.84) | keyf)) & ~key
    print('forearm', s, int(arm[s].sum()), V[arm[s]].min(0).round(3), V[arm[s]].max(0).round(3))
arms = arm['L'] | arm['R']
headm = (y > 0.8) & ((ax < 0.1) | (y > 0.845)) & ~arms
CX = {'L': 0.12, 'R': -0.13}
leg = np.zeros(len(V), bool)
for s in 'LR': leg |= ((y < 0.11) & (x * (1 if s == 'L' else -1) > 0)) | ((y < 0.3) & (np.abs(x - CX[s]) < 0.075) & (np.abs(z) < 0.07))
leg &= ~key & ~arms
low = (y < 0.5) & ~arms & ~key & ~leg
panelF = low & (z > 0.085) & (ax < 0.11) & (y < 0.47); panelB = low & (z < -0.075) & (ax < 0.15) & (y < 0.47)
eyes = headm & (z > 0.06) & (y > 0.83) & (y < 0.885) & (ax < 0.06)
print({k: int(v.sum()) for k, v in dict(head=headm, leg=leg, low=low, panelF=panelF, panelB=panelB, eyes=eyes, key=key).items()})
for s, sg in (('L', 1), ('R', -1)):
    b = leg & (x * sg > 0) & (y < 0.05); f = b & (z > 0.09); h = b & (z < -0.02)
    print('boot', s, 'toe x %.3f heel x %.3f' % (x[f].mean(), x[h].mean()), 'toes turn out %.1f deg' % np.degrees(np.arctan2((x[f].mean() - x[h].mean()) * sg, z[f].mean() - z[h].mean())), 'z', z[b].min().round(3), z[b].max().round(3), 'x', x[b].min().round(3), x[b].max().round(3))
if STOP == 'key': sys.exit()

# ---- 3. joints
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.46, 0.0]), 'spine': ('hips', [0, 0.56, 0.0]), 'chest': ('spine', [0, 0.66, 0.0]), 'head': ('chest', [0, 0.8, 0.0]),
 'upperarmL': ('chest', [0.17, 0.745, -0.01]), 'forearmL': ('upperarmL', [0.213, 0.635, -0.005]), 'handL': ('forearmL', [0.226, 0.475, 0.022]), 'key': ('handL', GRIP.tolist()),
 'upperarmR': ('chest', [-0.17, 0.745, -0.01]), 'forearmR': ('upperarmR', [-0.218, 0.635, 0.012]), 'handR': ('forearmR', [-0.234, 0.475, 0.058]),
 'skF': ('hips', [0, 0.47, 0.1]), 'skB': ('hips', [0, 0.47, -0.08]),
}
ends = {'head': [0, 0.98, 0.02], 'handL': [0.232, 0.385, 0.03], 'key': [0.24, 0.158, 0.035], 'handR': [-0.243, 0.365, 0.066], 'skF': [0, 0.2, 0.14], 'skB': [0, 0.16, -0.14]}
for s, sg in (('L', 1), ('R', -1)):
    cx = CX[s]; J['thigh' + s] = ('hips', [0.1 * sg, 0.42, 0.0]); J['shin' + s] = ('thigh' + s, [cx * 0.96, 0.235, 0.012]); J['foot' + s] = ('shin' + s, [cx, 0.065, 0.0]); ends['foot' + s] = [cx, 0, 0.125]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, -0.05, 0])); segs.append((n, a + [-0.1, 0, 0], a + [0.1, 0, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.13, 0.06, 0], a + [0.13, 0.06, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float))); segs.append((n, a + [-0.08, 0, 0], a + [0.08, 0, 0]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
    if n.startswith('foot'): segs.append((n, a, a + [0, -0.04, -0.05]))

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'key': return key
    if n.startswith('hand'): return arm[n[-1]] & (y < 0.5)
    if n.startswith('forearm'): return arm[n[-1]] & (y > 0.45)
    if n.startswith('upperarm'): return side & ~arms & ~key & ~headm & (ax > 0.12) & (y > 0.58) & (y < 0.82) & (d < 0.13)
    if n == 'head': return headm
    if n == 'skF': return panelF
    if n == 'skB': return panelB
    if n[:4] in ('shin', 'foot'): return leg & side
    if n[:4] == 'thig': return side & (low | leg) & (y < 0.47) & (y > 0.2) & (ax > 0.02)
    ok = ~(headm | leg | arms | key)
    if n == 'hips': ok = ok & (y < 0.56)
    if n == 'spine': ok = ok & (y > 0.44) & (y < 0.68)
    if n == 'chest': ok = ok & (y > 0.58)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(key, 'key')
force(headm & (y > 0.835), 'head')
for s, sg in (('L', 1), ('R', -1)):
    a = arm[s]; w = np.clip((y[a] - 0.455) / 0.04, 0, 1); w = w * w * (3 - 2 * w)                    # the chain and the forearm are stiff; the wrist bends over 4 cm
    up = np.clip((y[a] - 0.615) / 0.06, 0, 1); up = up * up * (3 - 2 * up)                            # what the cut took of the sleeve above the elbow goes with the upper arm
    W[a] = 0; W[a, ix['forearm' + s]] = w * (1 - up); W[a, ix['hand' + s]] = 1 - w; W[a, ix['upperarm' + s]] = up
    force(leg & (y < 0.045) & (x * sg > 0), 'foot' + s)
# the shoulders: the weights are evened out over the sleeve, the armpit and the cape, so no single rag stays behind when an arm goes up
import scipy.sparse as sp
W /= W.sum(1, keepdims=True); R = (ax > 0.1) & (y > 0.6) & (y < 0.84) & ~headm & ~key
Ww = np.zeros((M.nw, W.shape[1])); cnt = np.zeros(M.nw); np.add.at(Ww, M.inv, W); np.add.at(cnt, M.inv, 1); Ww /= cnt[:, None]
Rw = np.zeros(M.nw, bool); Rw[M.inv[R]] = True; As = M.A + sp.eye(M.nw); As = sp.diags(1 / np.asarray(As.sum(1)).ravel()) @ As
for it in range(8): Ww[Rw] = (As @ Ww)[Rw]
W[R] = Ww[M.inv][R]; print('shoulder verts evened out', int(R.sum()))
kc = ix['key']; stray = ~key & (W[:, kc] > 0); W[stray, ix['handL']] += W[stray, kc]; W[stray, kc] = 0; print('verts by the fist that leaned on the key, now the hand alone:', int(stray.sum()))   # or they stretch after the flying key
keymask = key
finish(M, J, ends, W, names, out, [eyes, keymask, arm['L'] & (y > 0.455)], fallback='spine', extra={'grip': GRIP.tolist(), 'ringCentre': C.tolist(), 'ringRadius': float(r)})
print('tris', len(M.F), 'bones', len(names) - 1)
