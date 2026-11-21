# The Barrow Wyrm's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# Kesh's pick A: keep only the head and a short neck of the export, and build the body: a chain of scale rings in the model's
# own colours (brick-laid slate scales, pale belly plates, pewter bands, pewter-tipped dorsal spikes, violet cracks, a tapering
# tail). The export's mouth is sealed, so the jaw is slit open along the grooves round the teeth and the mouth gets an inside.
# The body is built straight, along the line of the kept neck; the bake lays it along its path (boss-kit/wyrm.mjs).
import sys, json; sys.path.insert(0, sys.argv[3])
import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator
from rigkit import Mesh, skin, finish, groove_cut, face_graph, loops_of, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src)
CX = 0.0415; M.V[:, 0] -= CX  # the export sits off centre (its tail went to one side)
ex = np.array([1.0, 0, 0]); d = np.array([0, -0.894, 0.447]); d /= np.linalg.norm(d); n0 = np.cross(d, ex); n0 /= np.linalg.norm(n0)
if n0[2] > 0: n0 = -n0  # the neck's back faces -z
Hp = np.array([0, 0.74, 0.02])  # the head's pivot, where the skull sits on the neck
STEP, NB, BCUT, BEND = 0.0625, 32, 0.16, 2.02  # joint spacing, joints, where the export is cut, the tail tip (all along the body from the pivot)
BEL = 2.0  # the belly plates start this far round from the spine (radians)
Rf = PchipInterpolator([0.14, 0.25, 0.45, 0.62, 0.85, 1.10, 1.40, 1.65, 1.85, 1.98, 2.02], [0.083, 0.087, 0.100, 0.112, 0.115, 0.113, 0.092, 0.062, 0.036, 0.015, 0.004])
R = lambda b: float(Rf(min(max(b, 0.14), 2.02)))

# ---- the texture: the export's own, with a strip added underneath for the built body
T0 = M.tex; TW = T0.shape[1]; AH = 2560; assert T0.shape[0] == 2048 and TW == 2048
assert M.UV.min() >= -1e-6 and M.UV.max() <= 1 + 1e-6, 'the export tiles its texture'
atlas = np.zeros((AH, TW, 3), float); atlas[:2048] = T0
SLATE, SLINE, PALE, PLINE, SEAM, PEW = np.array([95, 97, 107.]), np.array([56, 58, 68.]), np.array([142, 132, 127.]), np.array([98, 88, 88.]), np.array([46, 48, 56.]), np.array([122, 122, 124.])
VIO, VIOH = np.array([205, 150, 255.]), np.array([128, 84, 205.])
def tile(seed, crack):
    """two rows of brick-laid slate scales over one belly plate; x runs round the body (spine in the middle), y toward the tail"""
    W_, H_ = 2048, 384; rng = np.random.RandomState(seed); yy, xx = np.mgrid[0:H_, 0:W_]; th = (xx + 0.5) / W_ * 2 * np.pi - np.pi; s = (yy + 0.5) / H_ * 2
    row = np.minimum(1, s.astype(int)); sf = s - row; nb = 8; wd = 2 * BEL / nb; img = np.zeros((H_, W_, 3)); px = W_ / (2 * np.pi)
    dv = np.full((H_, W_), 9.0); idx = np.zeros((H_, W_), int); bnds = []
    for r in (0, 1):
        bn = -BEL - (wd / 2 if r else 0) + wd * np.arange(nb + 2) + rng.uniform(-0.035, 0.035, nb + 2); bnds.append(bn); k = row == r
        dd = np.abs(th[k][:, None] - bn[None]); dv[k] = dd.min(1); idx[k] = (th[k][:, None] > bn[None]).sum(1)
    tint = 1 + rng.uniform(-0.045, 0.045, (2, nb + 3)); shade = tint[row, idx] * (1.05 - 0.10 * sf)
    img[:] = SLATE * shade[..., None]
    line = (dv * px < 3.6) | (np.minimum(sf, 1 - sf) * H_ / 2 < 3.6)
    img[line] = SLINE
    bel = np.abs(th) > BEL; s2 = s / 2; cen = (np.abs(th) - BEL) / (np.pi - BEL)
    pb = PALE * ((1.05 - 0.17 * s2 ** 2) * (0.9 + 0.1 * np.clip(cen * 2.5, 0, 1)))[..., None]; img[bel] = pb[bel]
    img[bel & (np.minimum(s2, 1 - s2) * H_ < 3.2)] = PLINE
    img[np.abs(np.abs(th) - BEL) * px < 4.5] = SEAM
    if crack:  # God-stuff showing through a gap: down one joint, along the row line, down the next
        r0 = bnds[0][crack]; r1 = bnds[1][crack + (1 if crack > 4 else 0)]; X = lambda t_: (t_ + np.pi) * px
        pts = [(X(r0), 20), (X(r0), 192), (X(r1), 192), (X(r1), 330)]; dist = np.full((H_, W_), 1e9)
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            vx, vy = x1 - x0, y1 - y0; t_ = np.clip(((xx - x0) * vx + (yy - y0) * vy) / (vx * vx + vy * vy), 0, 1); dist = np.minimum(dist, np.hypot(xx - x0 - t_ * vx, yy - y0 - t_ * vy))
        halo = np.clip(1 - dist / 13, 0, 1)[..., None] ** 1.5; img = img * (1 - 0.8 * halo) + VIOH * 0.8 * halo; img[dist < 3.4] = VIO
    return img.reshape(H_ // 2, 2, W_ // 2, 2, 3).mean((1, 3))
TILES = [(0, 2048), (1024, 2048), (0, 2240), (1024, 2240)]  # where each scale tile sits in the atlas (x, y), 1024 x 192
for (x0, y0), (seed, crack) in zip(TILES, [(3, 0), (5, 3), (8, 6), (11, 0)]): atlas[y0:y0 + 192, x0:x0 + 1024] = tile(seed, crack)
BX, BY, BW, BH = 0, 2432, 1024, 64  # the pewter band
yb = (np.arange(BH) + 0.5) / BH; rngb = np.random.RandomState(2); streak = 1 + 0.03 * np.repeat(rngb.uniform(-1, 1, BW // 8), 8)
band = PEW[None, None] * ((0.9 + 0.24 * np.exp(-((yb - 0.3) / 0.16) ** 2) - 0.1 * yb)[:, None] * streak[None])[..., None]; band[(yb < 0.07) | (yb > 0.93)] = SLINE * 1.1
atlas[BY:BY + BH, BX:BX + BW] = band; atlas[BY:BY + BH, BX + BW:BX + 2 * BW] = band
SY = 2496  # swatches: ramps 256 wide
def ramp(x0, c0, c1): t_ = np.linspace(0, 1, 256)[None, :, None]; atlas[SY:AH, x0:x0 + 256] = np.array(c0) * (1 - t_) + np.array(c1) * t_
ramp(0, (84, 86, 96), (204, 202, 198)); ramp(320, (22, 12, 36), (72, 42, 112)); ramp(640, SLATE * 0.8, SLATE * 0.8); ramp(960, PEW, PEW)
suv = lambda px_, py_: np.array([px_ / (TW - 1), 1 - py_ / (AH - 1)])
uv_spike = lambda q: suv(0 + 20 + 216 * q, SY + 32); uv_maw = lambda q: suv(320 + 20 + 216 * q, SY + 32); uv_dark = suv(640 + 128, SY + 32); uv_pew = suv(960 + 128, SY + 32)
M.UV[:, 1] = 1 - (1 - M.UV[:, 1]) * 2047 / (AH - 1)
M.tex = np.clip(atlas, 0, 255).astype(int); M.m.visual.material.baseColorTexture = Image.fromarray(M.tex.astype(np.uint8))

# ---- cut the export: keep the head and the neck down to BCUT
fc = M.V[M.F].mean(1); rel = fc - Hp; fb = rel @ d; frad = np.hypot(rel @ n0, rel[:, 0])
drop = ((fb >= BCUT) & (frad < 0.14) & (fc[:, 1] < 0.68)) | (fc[:, 1] < 0.5)
F = M.F[~drop]; used = np.zeros(len(M.V), bool); used[F.ravel()] = True; remap = np.cumsum(used) - 1
M.V = M.V[used]; M.N = M.N[used]; M.UV = M.UV[used]; M.F = remap[F]; M.reindex()
keepc = np.bincount(M.comp[M.F[:, 0]], minlength=M.nc); big = keepc.argmax(); fk = M.comp[M.F[:, 0]] == big
if (~fk).any():
    F = M.F[fk]; used = np.zeros(len(M.V), bool); used[F.ravel()] = True; remap = np.cumsum(used) - 1; M.V = M.V[used]; M.N = M.N[used]; M.UV = M.UV[used]; M.F = remap[F]; M.reindex()
n0v = len(M.V); print('kept the head and neck:', len(M.F), 'tris; cut rim at b', BCUT)

# ---- the jaw: slit along the grooves between the upper teeth and the lower jaw, from one mouth corner round the snout to the other
g = face_graph(M); fc = g['fc']; fx, fy, fz = fc.T
lin = lambda z_, y0, y1: y0 + (y1 - y0) * np.clip((z_ - 0.20) / 0.16, 0, 1)
jsrc = (fz > 0.19) & (fy < lin(fz, 0.728, 0.708)) & (fy > 0.66)
jsink = (fy > lin(fz, 0.772, 0.748)) | (fz < 0.15) | (fy < 0.66) | ((fz < 0.19) & (fy > 0.75))
jawA = groove_cut(M, jsrc, jsink)
lp = max(loops_of(M, jawA), key=len); L = g['Vw'][lp]; n = len(lp)
def run(lp, L, pa, pb):
    n = len(lp); ca = int(np.argmin(np.linalg.norm(L - pa, axis=1))); cb = int(np.argmin(np.linalg.norm(L - pb, axis=1))); i0 = int(np.argmax(L[:, 2]))
    fw = [lp[(ca + k) % n] for k in range(((cb - ca) % n) + 1)]; bw = [lp[(cb + k) % n] for k in range(((ca - cb) % n) + 1)][::-1]
    return fw if lp[i0] in fw else bw
path = run(lp, L, np.array([0.062, 0.757, 0.205]), np.array([-0.062, 0.757, 0.205])); PP = g['Vw'][path]
if PP[0, 0] < PP[-1, 0]: path = path[::-1]; PP = PP[::-1]
print('lip line', len(path), 'points; corners', PP[0].round(3), PP[-1].round(3), 'front', PP[np.argmax(PP[:, 2])].round(3), 'y', PP[:, 1].min().round(3), PP[:, 1].max().round(3))
cornL, cornR = PP[0].copy(), PP[-1].copy(); HING = np.array([0, 0.752, 0.165])
inner = set(path[1:-1]); GAP = 0.0003; dup = {}; newV, newUV, newN = [], [], []
for fi in np.nonzero(jawA)[0]:
    for c in range(3):
        vi = M.F[fi, c]
        if M.inv[vi] in inner:
            if vi not in dup: dup[vi] = len(M.V) + len(newV); newV.append(M.V[vi] - [0, GAP, 0]); newUV.append(M.UV[vi]); newN.append(M.N[vi])
            M.F[fi, c] = dup[vi]
jawF = jawA.copy()
M.V = np.vstack([M.V, newV]); M.UV = np.vstack([M.UV, newUV]); M.N = np.vstack([M.N, newN]); lipLow = np.zeros(len(M.V), bool); lipLow[n0v:] = True
M.reindex(); print('slit: doubled', len(newV), 'lip points')
E_ = Editor(M)
# the inside of the mouth: a roof under the skull and a floor on the jaw, from the lip line back to a line between the corners
m_ = 5; n = len(PP); seg = np.linalg.norm(np.diff(PP, axis=0), axis=1); u = np.r_[0, np.cumsum(seg)] / seg.sum()
BACK = cornL[None] + np.outer(u, cornR - cornL) + np.outer(np.sin(np.pi * u), [0, -0.004, -0.05]); wgt = np.sin(np.pi * u) ** 0.5
def pocket(rim, h):
    P = []
    for j in range(m_ + 1):
        s = j / m_; P.append(rim * (1 - s) + BACK * s + np.outer(wgt * h * np.sin(np.pi * s) ** 0.8, [0, 1, 0]))
    P = np.vstack(P); T = []
    for j in range(m_):
        for i in range(n - 1):
            a0, b0, c0, d0 = j * n + i, j * n + i + 1, (j + 1) * n + i, (j + 1) * n + i + 1; T += [(a0, b0, c0), (b0, d0, c0)]
    T = np.array(T); ar = np.linalg.norm(np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]), axis=1); T = T[ar > 1e-10]
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]).sum(0); uvp = np.vstack([np.tile(uv_maw(1 - (j / m_) ** 0.7), (n, 1)) for j in range(m_ + 1)]); return P, T, fn[1], uvp
Pr, Tr, ny, uvp = pocket(PP, 0.016); E_.add(Pr, uvp, Tr, 'roof', flip=ny > 0)
Pf, Tf, ny, uvp = pocket(PP - [0, GAP, 0], -0.02); E_.add(Pf, uvp, Tf, 'floor', flip=ny < 0)

# ---- the built body: rings along the neck's own line, P(b, angle, r)
NA = 36; TH = -np.pi + 2 * np.pi * np.arange(NA + 1) / NA
def Pt(b, th, r): return Hp + d * b + np.outer(r * np.cos(th), n0) + np.outer(r * np.sin(th), ex)
wb = lambda th: np.clip((np.abs(th) - (BEL - 0.08)) / 0.16, 0, 1) ** 2 * (3 - 2 * np.clip((np.abs(th) - (BEL - 0.08)) / 0.16, 0, 1))
groove = lambda th: -0.02 * np.exp(-((np.abs(th) - BEL) / 0.07) ** 2)
saw = lambda f, pk: np.where(f <= pk, f / pk, (1 - f) / (1 - pk))
ROW = 0.045; rings = []  # each: (b, radius per column, segment id, v within the segment, kind)
segs_ = []  # (kind, b0, b1, tile)
segs_.append(('collar', 0.148, 0.196, None)); b = 0.196; ti = 0
for grp in range(6):
    for k in range(3): segs_.append(('rows', b, b + 2 * ROW, ti % 4)); b += 2 * ROW; ti += 1
    if grp < 5: segs_.append(('band', b, b + 0.035, None)); b += 0.035
print('body rings end at b %.3f; tail tip %.3f' % (b, BEND)); BLAST = b
Vt, UVt, Bt, Ft, kindt = [], [], [], [], []
def emit(bv, rr, uvs):
    i0 = len(Vt); Vt.extend(Pt(bv, TH, rr)); UVt.extend(uvs); Bt.extend([bv] * (NA + 1)); return i0
def quads(i0, i1):
    for j in range(NA): Ft.extend([(i0 + j, i0 + j + 1, i1 + j), (i0 + j + 1, i1 + j + 1, i1 + j)])
spikes = []
for kind, b0, b1, tl in segs_:
    prev = None
    if kind == 'collar':
        prof = [(0.148, 0.84), (0.156, 1.115), (0.166, 1.135), (0.186, 1.135), (0.196, 1.0)]
        for i, (bv, k) in enumerate(prof):
            v = [0.0, 0.1, 0.3, 0.7, 0.95][i]; uvs = [suv(BX + 4 + (BW - 8) * j / NA, BY + 3 + (BH - 6) * v) for j in range(NA + 1)]
            cur = emit(bv, np.full(NA + 1, R(bv) * k), uvs); kindt.extend(['band'] * (NA + 1))
            if prev is not None: quads(prev, cur)
            prev = cur
    elif kind == 'band':
        for bv, k, v in ((b0, 1.0, 0.03), (b0 + 0.006, 1.075, 0.15), (b1 - 0.006, 1.075, 0.85), (b1, 1.0, 0.97)):
            uvs = [suv(BX + 4 + (BW - 8) * j / NA, BY + 3 + (BH - 6) * v) for j in range(NA + 1)]
            cur = emit(bv, np.full(NA + 1, R(bv) * k), uvs); kindt.extend(['band'] * (NA + 1))
            if prev is not None: quads(prev, cur)
            prev = cur
    else:
        x0, y0 = TILES[tl]
        for s in (0, 0.5, 0.9, 1.0, 1.5, 1.9, 2.0):
            bv = b0 + s * ROW; sf = s - min(1, int(s)); sl = 0.05 * saw(np.array(sf), 0.9) if s not in (0, 1.0, 2.0) else 0.0; bl = 0.035 * saw(np.array(s / 2), 0.95) if s not in (0, 2.0) else 0.0
            rr = R(bv) * (1 + (1 - wb(TH)) * sl + wb(TH) * bl + groove(TH))
            uvs = [suv(x0 + 1 + 1022 * j / NA, y0 + 1 + 190 * s / 2) for j in range(NA + 1)]
            cur = emit(bv, rr, uvs); kindt.extend(['tube'] * (NA + 1))
            if prev is not None: quads(prev, cur)
            prev = cur
        spikes.append(b0 + 0.55 * ROW)
# the tail tip: the last ring closes to a point
x0, y0 = TILES[0]; tipi = len(Vt); Vt.append(Hp + d * BEND); UVt.append(suv(x0 + 512, y0 + 96)); Bt.append(BEND); kindt.append('tube')
lastring = len(Vt) - 1 - (NA + 1)
for j in range(NA): Ft.append((lastring + j, lastring + j + 1, tipi))
Vt = np.array(Vt); Ft = np.array(Ft); UVt = np.array(UVt); Bt = np.array(Bt)
fn = np.cross(Vt[Ft[:, 1]] - Vt[Ft[:, 0]], Vt[Ft[:, 2]] - Vt[Ft[:, 0]]); cen = Vt[Ft].mean(1); axp = Hp + np.outer((cen - Hp) @ d, d)
flipT = ((cen - axp) * fn).sum() < 0
t0i = E_.add(Vt, UVt, Ft, 'tube', flip=flipT)
# smooth normals over the doubled rings and the seam column: average by position
key = np.round(Vt, 6); uq, invq = np.unique(key, axis=0, return_inverse=True); invq = invq.ravel(); Nt = E_.N[-1]; acc = np.zeros((len(uq), 3)); np.add.at(acc, invq, Nt); acc /= np.linalg.norm(acc, axis=1, keepdims=True) + 1e-12; E_.N[-1] = acc[invq]
# the dorsal spikes: one to every two rows, leaning toward the tail, slate at the foot and pewter at the tip
SPK = []
for sb in spikes:
    r = R(sb); h = 0.062 * (r / 0.115) ** 0.75; w = 0.021 * (r / 0.115) ** 0.6; lean = 0.5; ax_ = np.cos(lean) * n0 + np.sin(lean) * d; base = Hp + d * sb + n0 * (r * 1.0)
    P = []; UVs = []; T = []; NS = 7
    for lvl, (hh, ww) in enumerate(((-0.012, 1.15), (0.0, 1.0), (0.55, 0.5))):
        for q in range(NS): a = 2 * np.pi * q / NS; P.append(base + ax_ * (h * hh) + ww * w * (np.cos(a) * ex + np.sin(a) * 1.5 * d) + (n0 * (-0.004) if lvl == 0 else 0)); UVs.append(uv_spike([0.0, 0.1, 0.62][lvl]))
    P.append(base + ax_ * h + d * (0.25 * w)); UVs.append(uv_spike(1.0)); ap = len(P) - 1
    for lvl in range(2):
        for q in range(NS): a0, b0_, c0, d0 = lvl * NS + q, lvl * NS + (q + 1) % NS, (lvl + 1) * NS + q, (lvl + 1) * NS + (q + 1) % NS; T += [(a0, b0_, c0), (b0_, d0, c0)]
    for q in range(NS): T.append((2 * NS + q, 2 * NS + (q + 1) % NS, ap))
    P = np.array(P); T = np.array(T); fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]); outw = ((P[T].mean(1) - (base + ax_ * h * 0.4)) * fn).sum()
    E_.add(P, np.array(UVs), T, 'spike', flip=outw < 0); SPK.append((sb, len(P)))

M = E_.done(); V = M.V; x, y, z = V.T; tc = M.tc.astype(float); r_, g_, b_ = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
lipLow = np.r_[lipLow, np.zeros(len(V) - len(lipLow), bool)]
print('built:', len(V), 'verts', len(M.F), 'tris', T)
is_ = lambda *names: np.isin(tag, [T[n_] for n_ in names if n_ in T]); body = tag == 0
rel = V - Hp; vb = rel @ d; vrad = np.hypot(rel @ n0, rel[:, 0])

# ---- joints: the head, the jaw, and the chain c0..c31 down the body (all children of hips, so the bake can lay each on its path)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0, 0]), 'head': ('hips', Hp.tolist()), 'jaw': ('head', HING.tolist())}
ends = {'head': [0, 0.77, 0.33], 'jaw': [0, 0.712, 0.34]}
for k in range(NB): J['c%d' % k] = ('hips', (Hp + d * (STEP * k)).tolist())
ends['c%d' % (NB - 1)] = (Hp + d * BEND).tolist()
names = list(J.keys()); segs = []
for nm in names:
    if nm in ('root', 'hips'): continue
    a = np.array(J[nm][1], float)
    if nm in ends: segs.append((nm, a, np.array(ends[nm], float)))
    else: segs.append((nm, a, np.array(J['c%d' % (int(nm[1:]) + 1)][1], float)))
segs.append(('head', np.array([0, 0.84, 0.0]), np.array([0, 0.9, -0.08]))); segs.append(('head', np.array([0, 0.78, 0.1]), np.array([0, 0.8, 0.2])))
neckv = body & (vb > 0.03) & (y < 0.712) & (vrad < 0.15) & (z < 0.19)
jawv = np.zeros(len(V), bool); jawv[M.F[:len(jawF)][jawF].ravel()] = True; jawv &= body
mand = jawv | (body & (z > 0.14) & (z < 0.215) & (y > 0.688) & (y < 0.748) & (np.abs(x) > 0.028) & (np.abs(x) < 0.095) & ~neckv)
def vis_of(nm, dist):
    if nm == 'jaw': return jawv
    if nm == 'head': return body & ~neckv & ~jawv
    if nm[0] == 'c': return neckv
    return np.zeros(len(V), bool)
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, nm): W[mask] = 0; W[mask, ix[nm]] = 1
# the jaw: all of the lower jaw in front of the hinge, fading out toward it
wj = np.clip((z - 0.152) / 0.055, 0, 1); wj = wj * wj * (3 - 2 * wj); mk = mand & body
W[mk] = W[mk] * (1 - wj[mk])[:, None]; W[mk, ix['jaw']] = 0; W[mk] /= np.maximum(W[mk].sum(1, keepdims=True), 1e-9); W[mk] *= (1 - wj[mk])[:, None]; W[mk, ix['jaw']] = wj[mk]
force(is_('floor'), 'jaw'); force(is_('roof'), 'head')
W[lipLow, ix['head']] = 0; W[lipLow, ix['jaw']] = np.maximum(W[lipLow, ix['jaw']], 1e-3)
hv = body & ~mk & ~neckv; W[hv, ix['jaw']] = 0
# the built body: each point shared between the two joints it lies between
built = is_('tube', 'spike'); bb = np.zeros(len(V)); nt = len(Vt); i_t = np.nonzero(is_('tube'))[0]; assert len(i_t) == nt; bb[i_t] = Bt
i_s = np.nonzero(is_('spike'))[0]; o = 0
for sb, cnt in SPK: bb[i_s[o:o + cnt]] = sb; o += cnt
kf = np.clip(bb[built] / STEP, 0, NB - 1); k0 = np.minimum(NB - 2, kf.astype(int)); f = np.clip(kf - k0, 0, 1); bi = np.nonzero(built)[0]
W[bi] = 0; W[bi, np.array([ix['c%d' % k] for k in k0])] = 1 - f; W[bi, np.array([ix['c%d' % (k + 1)] for k in k0])] += f
# glow masks: the cracks along the body (the page weights them by how violet the texel is), the inside of the mouth, the eyes
EYE = {}
for sg, s in ((1, 'L'), (-1, 'R')):
    ek = body & (b_ - g_ > 40) & (r_ - g_ > 10) & (y > 0.78) & (z > 0.15) & (x * sg > 0); EYE[s] = V[ek].mean(0); print('eye', s, EYE[s].round(3), int(ek.sum()))
eyev = body & ((np.linalg.norm(V - EYE['L'], axis=1) < 0.035) | (np.linalg.norm(V - EYE['R'], axis=1) < 0.035))
glowA = (built | neckv).astype(float); glowB = is_('roof', 'floor').astype(float); glowC = eyev.astype(float)
from scipy.spatial import ConvexHull
hk = body & ~neckv & ~jawv; hp_ = V[hk]; hull = hp_[ConvexHull(hp_).vertices]; jk = jawv & (z > 0.2); jp_ = V[jk]; jhull = jp_[ConvexHull(jp_).vertices]
extra = {'chain': {'n': NB, 'step': STEP, 'pivot': Hp.tolist(), 'dir': d.tolist(), 'back': n0.tolist(), 'cut': BCUT, 'end': BEND, 'radius': [R(STEP * k) for k in range(NB)] + [R(BEND)],
                   'rad': [[round(b_i, 4), round(R(b_i), 4)] for b_i in np.arange(0.0, 2.03, 0.02)]},
         'mouth': {'hinge': HING.tolist(), 'cornL': cornL.tolist(), 'cornR': cornR.tolist(), 'front': PP[np.argmax(PP[:, 2])].tolist()},
         'eyes': {s: EYE[s].tolist() for s in EYE}, 'headHull': hull.round(4).tolist(), 'jawHull': jhull.round(4).tolist(), 'snout': [0, 0.74, 0.37], 'crown': [0, float(V[hk][:, 1].max()), -0.03]}
finish(M, J, ends, W, names, out, [glowA, glowB, glowC], fallback='head', extra=extra)
