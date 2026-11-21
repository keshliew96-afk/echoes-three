# The Hollow Cantor's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# The model floats in a hooded robe with its arms out in bell sleeves (free of the robe below the shoulder), a mask with a
# closed mouth, a rib cage round a heart and three crystal fingers and a crystal thumb on each hand. This cuts the mask's chin
# free so the mouth can open to sing, builds the halo ring with seven runes and seven notes, and six motes, then skins the lot.
import sys, json; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); n0v = len(M.V)
g = face_graph(M); fc = g['fc']; fx, fy, fz = fc.T; fax = np.abs(fx); ftc = M.tc[M.F].mean(1); flum = ftc.sum(1)
smooth = lambda u: (lambda c: c * c * (3 - 2 * c))(np.clip(u, 0, 1))

# ---- the chin: the mask under the lip line
fpale = flum > 470
jseed = fpale & (fy < 0.852) & (fy > 0.838) & (fax < 0.02) & (fz > 0.1)
useed = (fy > 0.867) | (~fpale & (fy > 0.80)) | (fax > 0.05) | (fz < 0.06) | (fy < 0.8)
jaw = groove_cut(M, jseed, useed); print('chin faces', int(jaw.sum()))

def flat_uv(vmask, q):
    idx = np.nonzero(vmask)[0]; lum = M.tc[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0), 'spread', round(best[0], 1)); return best[1]
V0 = M.V; x0, y0, z0 = V0.T; tc0 = M.tc.astype(float); lum0 = tc0.sum(1)
purple0 = (tc0[:, 2] > tc0[:, 0] + 25) & (tc0[:, 2] > 120); pale0 = lum0 > 480
uv_mouth = flat_uv((y0 > 0.8) & (y0 < 0.95) & (z0 > 0.04) & ~pale0, 0.01)
uv_crys = flat_uv(purple0 & (np.abs(x0) > 0.15), 0.35)
uv_note = flat_uv(purple0 & (np.abs(x0) > 0.15), 0.8)
uv_bone = flat_uv(pale0 & (y0 > 0.62) & (y0 < 0.78), 0.6)

E_ = Editor(M)
rimJ = E_.split(jaw, 'jaw', uv_mouth, uv_mouth); print('chin rims', [len(r) for r in rimJ])

# ---- built parts: the halo ring behind the hood with seven runes and seven notes, and six motes
HC = np.array([0, 0.955, -0.125]); HR = 0.135; TILT = np.radians(12)  # the ring leans back a little at the top
def tilt(P):  # rotate about x through the halo's centre: the top goes back
    P = np.asarray(P, float) - HC; c, s = np.cos(TILT), np.sin(TILT); y, z = P[:, 1].copy(), P[:, 2].copy(); P[:, 1] = c * y + s * z; P[:, 2] = -s * y + c * z; return P + HC
def ring(R, r, nu=40, nv=5):
    pts = []; tris = []
    for i in range(nu):
        a = 2 * np.pi * i / nu; c = np.array([np.sin(a), np.cos(a), 0])
        for j in range(nv):
            b = 2 * np.pi * j / nv; pts.append(HC + c * (R + r * np.cos(b)) + np.array([0, 0, r * np.sin(b)]))
    for i in range(nu):
        for j in range(nv):
            a, b_, c_, d = i * nv + j, ((i + 1) % nu) * nv + j, ((i + 1) % nu) * nv + (j + 1) % nv, i * nv + (j + 1) % nv
            tris += [(a, b_, c_), (a, c_, d)]
    return tilt(pts), np.array(tris)
def prism(poly, th, centre, ax_u, ax_v, ax_n):
    """a flat shape (2D polygon, convex or star-shaped about its first point's centroid) given thickness th"""
    poly = np.asarray(poly, float); n = len(poly); c2 = poly.mean(0)
    pts = [centre + ax_u * c2[0] + ax_v * c2[1] + ax_n * th / 2, centre + ax_u * c2[0] + ax_v * c2[1] - ax_n * th / 2]
    for q in poly: pts.append(centre + ax_u * q[0] + ax_v * q[1] + ax_n * th / 2)
    for q in poly: pts.append(centre + ax_u * q[0] + ax_v * q[1] - ax_n * th / 2)
    tris = []
    for i in range(n):
        j = (i + 1) % n; tris += [(0, 2 + i, 2 + j), (1, 2 + n + j, 2 + n + i), (2 + i, 2 + n + i, 2 + n + j), (2 + i, 2 + n + j, 2 + j)]
    return np.array(pts), np.array(tris)
P, T = ring(HR, 0.0085); E_.add(P, uv_crys, T, 'halo')
P, T = ring(HR - 0.022, 0.004, 40, 4); E_.add(P, uv_crys, T, 'halo')
ex, ey, ez = np.array([1, 0, 0.]), np.array([0, 1, 0.]), np.array([0, 0, 1.])
NOTE_A = [2 * np.pi * k / 7 for k in range(7)]  # from the top, round to its left
notes = []
for k in range(7):
    a = NOTE_A[k] + np.pi / 7  # runes sit between the notes, on the ring
    c = tilt([HC + np.array([np.sin(a), np.cos(a), 0]) * HR])[0] + ez * 0.006
    d = np.array([[0, 0.016], [0.009, 0], [0, -0.016], [-0.009, 0]]) * 1.2
    P, T = prism(d, 0.006, c, np.array([np.cos(a), -np.sin(a), 0]), np.array([np.sin(a), np.cos(a), 0]), ez); E_.add(P, uv_bone, T, 'rune')
ell = [(0.013 * np.cos(t) * np.cos(0.45) - 0.0095 * np.sin(t) * np.sin(0.45), 0.013 * np.cos(t) * np.sin(0.45) + 0.0095 * np.sin(t) * np.cos(0.45)) for t in np.linspace(0, 2 * np.pi, 12, endpoint=False)]
for k in range(7):
    a = NOTE_A[k]; c = tilt([HC + np.array([np.sin(a), np.cos(a), 0]) * (HR + 0.03)])[0]
    p0, t0 = prism(ell, 0.007, c, ex, ey, ez)
    p1, t1 = prism([(0.0095, 0.003), (0.0135, 0.003), (0.0135, 0.058), (0.0095, 0.058)], 0.006, c, ex, ey, ez)
    p2, t2 = prism([(0.0135, 0.058), (0.0135, 0.04), (0.03, 0.026), (0.034, 0.034)], 0.005, c, ex, ey, ez)
    P = np.vstack([p0, p1, p2]); T = np.vstack([t0, t1 + len(p0), t2 + len(p0) + len(p1)]); E_.add(P, uv_note, T, 'note%d' % k); notes.append(c + np.array([0.008, 0.02, 0]))
MOTE = [np.array([np.sin(a) * 0.27, 0.5 + 0.06 * (k % 3), 0.03 + np.cos(a) * 0.24]) for k, a in enumerate(np.linspace(0, 2 * np.pi, 6, endpoint=False) + 0.4)]
octa = np.array([[1, 0, 0], [-1, 0, 0], [0, 1.6, 0], [0, -1.6, 0], [0, 0, 1], [0, 0, -1.0]]) * 0.011
otri = np.array([[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]])
for k, m in enumerate(MOTE): E_.add(octa + m, uv_note, otri, 'mote%d' % k)

M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); lum = tc.sum(1); tag = M.tag; T = M.tags
print('after the cuts:', len(V), 'verts', len(M.F), 'tris', T)
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
part = tag != 0
purple = (tc[:, 2] > tc[:, 0] + 25) & (tc[:, 2] > 120) & ~part; pale = (lum > 480) & ~part

# ---- joints
ZC = 0.03  # the robe's axis
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.43, 0.02]), 'spine': ('hips', [0, 0.55, 0.025]), 'chest': ('spine', [0, 0.66, 0.03]),
 'neck': ('chest', [0, 0.775, 0.03]), 'head': ('neck', [0, 0.835, 0.035]), 'jaw': ('head', [0, 0.859, 0.093]),
 'heart': ('chest', [0, 0.732, 0.128]), 'halo': ('head', HC.tolist()),
}
ends = {'head': [0, 0.99, 0.05], 'jaw': [0, 0.842, 0.126], 'heart': [0, 0.732, 0.15], 'halo': (HC + [0, 0.1, 0]).tolist()}
for k in range(7): J['note%d' % k] = ('halo', notes[k].tolist()); ends['note%d' % k] = (notes[k] + [0, 0.03, 0]).tolist()
for k in range(6): J['mote%d' % k] = ('root', MOTE[k].tolist()); ends['mote%d' % k] = (MOTE[k] + [0, 0.02, 0]).tolist()
FING = {'th': ([0.214, 0.505, 0.08], [0.21, 0.433, 0.111]), 'f1': ([0.25, 0.462, 0.028], [0.233, 0.402, 0.041]),
        'f2': ([0.254, 0.465, 0.059], [0.259, 0.381, 0.067]), 'f3': ([0.255, 0.475, 0.079], [0.285, 0.399, 0.089])}
mir = np.array([-1, 1, 1.0])
for sg, s in ((1, 'L'), (-1, 'R')):
    m = np.array([sg, 1, 1.0])
    J['sh' + s] = ('chest', (np.array([0.12, 0.655, 0.015]) * m).tolist()); J['el' + s] = ('sh' + s, (np.array([0.185, 0.575, 0.028]) * m).tolist())
    J['wr' + s] = ('el' + s, (np.array([0.222, 0.515, 0.052]) * m).tolist()); ends['wr' + s] = (np.array([0.252, 0.468, 0.055]) * m).tolist()
    for f, (a, b) in FING.items(): J[f + s] = ('wr' + s, (np.array(a) * m).tolist()); ends[f + s] = (np.array(b) * m).tolist()
SK = 8; SKA = [2 * np.pi * k / SK for k in range(SK)]  # robe columns from the front, round to its left
def rob(r, yy, a): return [r * np.sin(a), yy, ZC + r * np.cos(a)]
for k, a in enumerate(SKA):
    J['skA%d' % k] = ('hips', rob(0.1, 0.4, a)); J['skB%d' % k] = ('skA%d' % k, rob(0.135, 0.22, a)); ends['skB%d' % k] = rob(0.185, 0.0, a)
names = list(J.keys())
NEXT = {'neck': 'head', 'shL': 'elL', 'elL': 'wrL', 'shR': 'elR', 'elR': 'wrR'}
for k in range(SK): NEXT['skA%d' % k] = 'skB%d' % k
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float)
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n in ('hips', 'spine', 'chest'): segs.append((n, a, a + [0, 0.1, 0.005]))
    else: segs.append((n, a, np.array(J[NEXT[n]][1], float)))

# ---- regions
w0 = np.array([0.25, 0.42, 0.07]); lab = M.comps((y < 0.65) & ~part)
armL = lab == lab[np.argmin(np.linalg.norm(V - w0, axis=1))]; armR = lab == lab[np.argmin(np.linalg.norm(V - w0 * mir, axis=1))]
arm = armL | armR
# the top of the sleeve, above where it parts from the robe
armtop = ~part & ~arm & (y > 0.6) & (y < 0.72) & (ax > 0.13)
hand = arm & (purple | pale) & (ax > 0.15)
fing = {}
for sg, s in ((1, 'L'), (-1, 'R')):
    fl = M.comps(purple & (ax > 0.15) & (np.sign(x) == sg))
    for L in np.unique(fl[fl >= 0]):
        k = fl == L
        if k.sum() < 5: continue
        c = V[k].mean(0) * [sg, 1, 1]; best = min(FING, key=lambda f: np.linalg.norm(np.array(FING[f][0]) + np.array(FING[f][1]) - 2 * c))
        fing[best + s] = k
print('fingers', {k: int(v.sum()) for k, v in fing.items()})
headm = ~part & ~arm & (((y > 0.80) & (ax < 0.11)) | (pale & (y > 0.83)))
eye = ~part & np.any([np.linalg.norm(V - [sg * 0.028, 0.907, 0.122], axis=1) < 0.016 for sg in (1, -1)], axis=0)
heartm = ~part & purple & (y > 0.69) & (y < 0.77) & (ax < 0.04)
robe = ~part & ~arm & ~headm
print({k: int(v.sum()) for k, v in dict(arm=arm, armtop=armtop, hand=hand, head=headm, eye=eye, heart=heartm, robe=robe).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n in ('jaw', 'heart', 'halo') or n.startswith(('note', 'mote', 'sk')): return np.zeros(len(V), bool)
    if n[:-1] in FING: return np.zeros(len(V), bool)
    if n.startswith('sh'): return side & (armtop | (arm & (y > 0.58)))
    if n.startswith('el'): return side & arm & (y < 0.62) & ~hand
    if n.startswith('wr'): return side & hand
    if n == 'head': return headm & ~is_('jaw', 'jaw.lid')
    if n == 'neck': return (robe & (y > 0.74) & (ax < 0.1)) | (headm & (y < 0.86) & ~pale)
    if n == 'chest': return robe & (y > 0.6)
    if n == 'spine': return robe & (y > 0.46) & (y < 0.72)
    if n == 'hips': return robe & (y < 0.6) & (y > 0.3)
    return robe
W, names, ix = skin(M, J, segs, vis_of)
FORCED = np.zeros(len(W), bool)
def force(mask, n):
    global FORCED
    W[mask] = 0; W[mask, ix[n]] = 1; FORCED = FORCED | mask
for f, k in fing.items(): force(k, f)
force(is_('jaw', 'jaw.lid'), 'jaw'); force(is_('jaw.hole'), 'head'); force(eye, 'head'); force(heartm, 'heart')
force(is_('halo', 'rune'), 'halo')
for k in range(7): force(is_('note%d' % k), 'note%d' % k)
for k in range(6): force(is_('mote%d' % k), 'mote%d' % k)
# the mask is rigid on the head (the chin apart)
force(pale & (y > 0.845) & ~is_('jaw', 'jaw.lid'), 'head')

# ---- the skirt: below the waist the robe hangs from eight columns, blended round the axis and down the height
sk = robe & (y < 0.47)
th = np.arctan2(x, z - ZC) % (2 * np.pi); u = th / (2 * np.pi / SK); k0 = np.floor(u).astype(int) % SK; k1 = (k0 + 1) % SK; f = smooth(u - np.floor(u))
wH = smooth((y - 0.36) / 0.09); wB = smooth((0.27 - y) / 0.11) * (1 - wH); wA = 1 - wH - wB
An = np.zeros_like(W); rows = np.arange(len(V))
An[rows, ix['hips']] = wH
for (kk, ff) in ((k0, 1 - f), (k1, f)):
    ia = np.array([ix['skA%d' % q] for q in range(SK)])[kk]; ib = np.array([ix['skB%d' % q] for q in range(SK)])[kk]
    np.add.at(An, (rows, ia), wA * ff); np.add.at(An, (rows, ib), wB * ff)
# the inside of the hem (its lining and the cap across it) lies near the axis: a point follows the columns as far as it is out
# towards the robe's outer surface at its height, and the hips the rest, so a flared robe does not tear its lining apart
rad = np.hypot(x, z - ZC); yb = np.clip((y / 0.01).astype(int), 0, 99); rmax = np.zeros(100)
np.maximum.at(rmax, yb[sk], rad[sk]); rmax = np.maximum.accumulate(rmax[::-1])[::-1] * 0 + np.convolve(np.pad(rmax, 3, mode='edge'), np.ones(7) / 7, 'valid')
fr = smooth((rad / np.maximum(rmax[yb], 1e-3) - 0.35) / 0.5); An[:, ix['hips']] += (1 - fr) * (1 - An[:, ix['hips']]); cols = [ix['skA%d' % q] for q in range(SK)] + [ix['skB%d' % q] for q in range(SK)]
An[:, cols] *= fr[:, None]
mblend = smooth((y - 0.43) / 0.04)[:, None]
W[sk] = (W * mblend + An * (1 - mblend))[sk]
# points on top of each other share one set of weights (seams), the pinned side wins
from scipy.spatial import cKDTree as _KD
body = (tag == 0) | is_('jaw.hole')
bi = np.nonzero(body)[0]; prs = _KD(V[bi]).query_pairs(0.0015, output_type='ndarray'); Fb = FORCED[bi]
for _ in range(3):
    Wb = W[bi]; acc = Wb.copy(); cnt = np.ones(len(bi))
    np.add.at(acc, prs[:, 0], Wb[prs[:, 1]]); np.add.at(acc, prs[:, 1], Wb[prs[:, 0]]); np.add.at(cnt, prs[:, 0], 1); np.add.at(cnt, prs[:, 1], 1)
    Wn = acc / cnt[:, None]; Wn[Fb] = Wb[Fb]
    for a_, b_ in ((0, 1), (1, 0)):
        m_ = Fb[prs[:, a_]] & ~Fb[prs[:, b_]]; Wn[prs[m_, b_]] = Wb[prs[m_, a_]]
    W[bi] = Wn
print('seam pairs shared', len(prs))
glow = is_('halo').astype(float); glow[is_('rune')] = 0.5
for k in range(6): glow[is_('mote%d' % k)] = 0.75
for k in range(7): glow[is_('note%d' % k)] = 0.01 * (k + 1)
em = eye.astype(float); em[is_('jaw.hole')] = 0.5
extra = {'robe': {'zc': ZC, 'cols': SK}, 'halo': {'c': HC.tolist(), 'r': HR, 'tilt': float(TILT), 'notes': [n.tolist() for n in notes]}, 'motes': [m.tolist() for m in MOTE]}
finish(M, J, ends, W, names, out, [em, heartm, glow], fallback='chest', extra=extra)
