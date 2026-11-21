# The Hush's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A tall veiled figure in a cloak, a cracked bronze bell for a head (tipped forward), a violet face under it, the left arm
# raised with one finger up at the bell's mouth, the right arm hanging. Tripo gave it a third hand (a second left hand
# hanging out of the left side of the cloak): this cuts it away. It builds the five small bells that circle it, then
# skins the lot. The cloak below the waist hangs from eight columns (the Cantor's robe).
import sys, json; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src)
smooth = lambda u: (lambda c: c * c * (3 - 2 * c))(np.clip(u, 0, 1))

# ---- the third hand: pale skin below the left sleeve's edge, cut away and the mesh compacted
V0 = M.V; x0, y0, z0 = V0.T; tc0 = M.tc.astype(float); lum0 = tc0.sum(1)
extra = (lum0 > 560) & (x0 > 0.115) & (y0 < 0.415) & (y0 > 0.26) & (np.abs(z0) < 0.05)
# grow by one ring so the wrist goes too, but never into the cloak (cloak is darker)
fm = extra[M.F].any(1)
print('third hand verts', int(extra.sum()), 'faces cut', int(fm.sum()))
F = M.F[~fm]; used = np.unique(F); rem = -np.ones(len(V0), int); rem[used] = np.arange(len(used))
M.V = V0[used]; M.UV = M.UV[used]; M.N = M.N[used]; M.F = rem[F]; M.reindex()

V0 = M.V; x0, y0, z0 = V0.T; tc0 = M.tc.astype(float); lum0 = tc0.sum(1)
def pick_uv(vmask, q):
    idx = np.nonzero(vmask)[0]; lum = tc0[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0)); return best[1]
uv_bronze = pick_uv((y0 > 0.86) & (z0 < 0.0), 0.55)
uv_dark = pick_uv((y0 > 0.78) & (z0 < 0.0), 0.03)
E_ = Editor(M)

# ---- the five small bells: bronze, mouth down, on a ring round its waist (the game's ring, at its scale)
RING_Y, RING_R, NB = 0.5, 0.36, 5
def lathe(prof, n=12):
    pts = []; tris = []
    for i in range(n):
        a = 2 * np.pi * i / n
        for (r, h) in prof: pts.append([r * np.cos(a), h, r * np.sin(a)])
    m = len(prof)
    for i in range(n):
        for j in range(m - 1):
            a, b, c, d = i * m + j, ((i + 1) % n) * m + j, ((i + 1) % n) * m + j + 1, i * m + j + 1
            tris += [(a, c, b), (a, d, c)]
    return np.array(pts), np.array(tris)
br, bh = 0.03, 0.056
prof = [(br * 1.0, 0), (br * 1.06, bh * 0.07), (br * 0.86, bh * 0.22), (br * 0.74, bh * 0.5), (br * 0.66, bh * 0.82), (br * 0.42, bh * 0.98), (0.001, bh)]
BELLS = []
for k in range(NB):
    a = 2 * np.pi * k / NB
    c = np.array([RING_R * np.sin(a), RING_Y, RING_R * np.cos(a)])
    P, T = lathe(prof); E_.add(P + c - [0, bh * 0.55, 0], uv_bronze, T, 'bell%d' % k)
    P2, T2 = lathe([(br * 0.95, bh * 0.05), (0.001, bh * 0.05)]); E_.add(P2 + c - [0, bh * 0.55, 0], uv_dark, T2, 'bell%d.in' % k, flip=True)  # the dark mouth
    tor = []; tt = []
    for i in range(10):
        b = 2 * np.pi * i / 10
        for j in range(4):
            g = 2 * np.pi * j / 4; rr = 0.009 + 0.0025 * np.cos(g); tor.append([rr * np.cos(b), 0.0025 * np.sin(g) + rr * np.sin(b), 0])
    for i in range(10):
        for j in range(4):
            q0, q1, q2, q3 = i * 4 + j, ((i + 1) % 10) * 4 + j, ((i + 1) % 10) * 4 + (j + 1) % 4, i * 4 + (j + 1) % 4; tt += [(q0, q1, q2), (q0, q2, q3)]
    tor = np.array(tor); tor[:, 1] = tor[:, 1] * 1.0
    E_.add(tor + c + [0, bh * 0.45 + 0.008, 0], uv_bronze, np.array(tt), 'bell%d.loop' % k)
    BELLS.append(c)

M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); lum = tc.sum(1); tag = M.tag; T = M.tags
print('after the cuts:', len(V), 'verts', len(M.F), 'tris', T)
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
part = tag != 0

# ---- joints
ZC = -0.01
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.42, 0.0]), 'spine': ('hips', [0, 0.52, 0.0]), 'chest': ('spine', [0, 0.62, 0.0]),
 'neck': ('chest', [0, 0.71, 0.0]), 'head': ('neck', [0, 0.765, 0.02]),
 'shL': ('chest', [0.095, 0.665, 0.0]), 'elL': ('shL', [0.145, 0.58, 0.045]), 'wrL': ('elL', [0.045, 0.69, 0.12]), 'fiL': ('wrL', [0.011, 0.735, 0.126]),
 'shR': ('chest', [-0.095, 0.665, 0.0]), 'elR': ('shR', [-0.14, 0.52, 0.0]), 'wrR': ('elR', [-0.15, 0.405, 0.0]),
 'orbit': ('root', [0, RING_Y, 0]),
}
ends = {'head': [0, 1.0, 0.0], 'wrL': [0.005, 0.715, 0.14], 'fiL': [0.01, 0.79, 0.125], 'wrR': [-0.155, 0.29, 0.0], 'orbit': [0, RING_Y + 0.05, 0]}
for k in range(NB): J['bell%d' % k] = ('orbit', (BELLS[k] + [0, bh * 0.45, 0]).tolist()); ends['bell%d' % k] = (BELLS[k] + [0, bh * 0.45 + 0.03, 0]).tolist()
SK = 8; SKA = [2 * np.pi * k / SK for k in range(SK)]
def rob(r, yy, a): return [r * np.sin(a), yy, ZC + r * np.cos(a)]
for k, a in enumerate(SKA):
    J['skA%d' % k] = ('hips', rob(0.11, 0.32, a)); J['skB%d' % k] = ('skA%d' % k, rob(0.13, 0.17, a)); ends['skB%d' % k] = rob(0.15, 0.0, a)
names = list(J.keys())
NEXT = {'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head', 'shL': 'elL', 'elL': 'wrL', 'shR': 'elR', 'elR': 'wrR'}
for k in range(SK): NEXT['skA%d' % k] = 'skB%d' % k
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float)
    segs.append((n, a, np.array(ends[n], float) if n in ends else np.array(J[NEXT[n]][1], float)))

# ---- regions
bellhead = ~part & (y > 0.775) | (~part & (y > 0.745) & (lum < 330) & ((tc[:, 1] >= tc[:, 0]) & (tc[:, 1] >= tc[:, 2] - 4)) & (ax < 0.11))
purple = ~part & (tc[:, 2] > tc[:, 0] + 15) & (tc[:, 2] > tc[:, 1] + 15)
face = purple & (y > 0.68)
crack = bellhead & (lum < 215) & (z > 0.0)
skinpale = ~part & (lum > 560)
# the raised left arm: the forearm and fist in front of the chest, the finger above the fist
fistL = skinpale & (y > 0.64) & (y < 0.745) & (z > 0.08) & (x > -0.05) & (x < 0.07)
fingL = skinpale & (y >= 0.735) & (z > 0.1) & (ax < 0.03)
foreL = ~part & ~skinpale & (z > 0.06) & (y > 0.56) & (y < 0.72) & (x > 0.02) & ~bellhead & ~face
upperL = ~part & (x > 0.09) & (y > 0.54) & (y < 0.7) & ~foreL
handR = skinpale & (x < -0.12) & (y < 0.42)
armR = ~part & (x < -0.11) & (y > 0.27) & (y < 0.66) & ~handR
robe = ~part & ~bellhead & ~face & ~fistL & ~fingL & ~foreL
print({k: int(v.sum()) for k, v in dict(bellhead=bellhead, face=face, crack=crack, fistL=fistL, fingL=fingL, foreL=foreL, upperL=upperL, handR=handR, armR=armR, robe=robe).items()})

def vis_of(n, d):
    if n.startswith(('bell', 'sk')) or n in ('orbit',): return np.zeros(len(V), bool)
    if n == 'head': return bellhead | face
    if n == 'neck': return robe & (y > 0.66) & (ax < 0.09)
    if n == 'shL': return upperL  # the upper arm and the drape that hangs from it
    if n == 'elL': return foreL & (x > 0.07)
    if n == 'wrL': return fistL | (foreL & (x < 0.08))
    if n == 'fiL': return fingL
    if n == 'shR': return armR & (y > 0.55)
    if n == 'elR': return armR & (y < 0.6)
    if n == 'wrR': return handR
    if n == 'chest': return robe & (y > 0.56) & ~upperL & ~armR
    if n == 'spine': return robe & (y > 0.44) & (y < 0.66) & ~upperL & ~armR
    if n == 'hips': return robe & (y < 0.56) & (y > 0.3) & ~armR
    return robe
W, names, ix = skin(M, J, segs, vis_of)
FORCED = np.zeros(len(W), bool)
def force(mask, n):
    global FORCED
    W[mask] = 0; W[mask, ix[n]] = 1; FORCED = FORCED | mask
force(bellhead | face, 'head'); force(fingL, 'fiL')
for k in range(NB): force(is_('bell%d' % k, 'bell%d.in' % k, 'bell%d.loop' % k), 'bell%d' % k)

# ---- the skirt: below the waist the cloak hangs from eight columns, blended round the axis and down the height (the
# right arm's sleeve keeps its own weights down to the hand; the columns take the rest)
sk = robe & (y < 0.44)
th = np.arctan2(x, z - ZC) % (2 * np.pi); u = th / (2 * np.pi / SK); k0 = np.floor(u).astype(int) % SK; k1 = (k0 + 1) % SK; f = smooth(u - np.floor(u))
wH = smooth((y - 0.33) / 0.09); wB = smooth((0.25 - y) / 0.12) * (1 - wH); wA = 1 - wH - wB
An = np.zeros_like(W); rows = np.arange(len(V))
An[rows, ix['hips']] = wH
for (kk, ff) in ((k0, 1 - f), (k1, f)):
    ia = np.array([ix['skA%d' % q] for q in range(SK)])[kk]; ib = np.array([ix['skB%d' % q] for q in range(SK)])[kk]
    np.add.at(An, (rows, ia), wA * ff); np.add.at(An, (rows, ib), wB * ff)
rad = np.hypot(x, z - ZC); yb = np.clip((y / 0.01).astype(int), 0, 99); rmax = np.zeros(100)
np.maximum.at(rmax, yb[sk], rad[sk]); rmax = np.convolve(np.pad(rmax, 3, mode='edge'), np.ones(7) / 7, 'valid')
fr = smooth((rad / np.maximum(rmax[yb], 1e-3) - 0.35) / 0.5); An[:, ix['hips']] += (1 - fr) * (1 - An[:, ix['hips']]); cols = [ix['skA%d' % q] for q in range(SK)] + [ix['skB%d' % q] for q in range(SK)]
An[:, cols] *= fr[:, None]
mblend = smooth((y - 0.42) / 0.05)[:, None]
# the right sleeve hangs to the hem beside the cloak: it follows the arm, fading into the columns towards the hem and the middle
armness = (smooth((-x - 0.095) / 0.045) * smooth((y - 0.42) / 0.1))[:, None]  # the hand is fused to the hem: it hangs with the columns
mb = np.maximum(mblend, armness)
W[sk] = (W * mb + An * (1 - mb))[sk]
# points on top of each other share one set of weights (seams), the pinned side wins
from scipy.spatial import cKDTree as _KD
body = (tag == 0)
bi = np.nonzero(body)[0]; prs = _KD(V[bi]).query_pairs(0.0015, output_type='ndarray'); Fb = FORCED[bi]
for _ in range(3):
    Wb = W[bi]; acc = Wb.copy(); cnt = np.ones(len(bi))
    np.add.at(acc, prs[:, 0], Wb[prs[:, 1]]); np.add.at(acc, prs[:, 1], Wb[prs[:, 0]]); np.add.at(cnt, prs[:, 0], 1); np.add.at(cnt, prs[:, 1], 1)
    Wn = acc / cnt[:, None]; Wn[Fb] = Wb[Fb]
    for a_, b_ in ((0, 1), (1, 0)):
        m_ = Fb[prs[:, a_]] & ~Fb[prs[:, b_]]; Wn[prs[m_, b_]] = Wb[prs[m_, a_]]
    W[bi] = Wn
print('seam pairs shared', len(prs))
bellsm = np.zeros(len(V)); 
for k in range(NB): bellsm[is_('bell%d' % k, 'bell%d.loop' % k)] = 0.2 * (k + 1)  # which bell (0.2 .. 1.0)
extra_ = {'robe': {'zc': ZC, 'cols': SK}, 'bells': {'y': RING_Y, 'r': RING_R, 'n': NB, 'pos': [b.tolist() for b in BELLS]}}
finish(M, J, ends, W, names, out, [crack, face, bellsm], fallback='chest', extra=extra_)
