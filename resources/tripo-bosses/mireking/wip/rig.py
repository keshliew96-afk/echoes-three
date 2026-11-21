# The Mire King's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# The model is one piece: mouth shut, crown fused to the head, legs folded against the body. This slits the mouth open along its
# groove and builds the inside of the mouth (a roof and a floor that meet at the hinge), cuts the crown free and closes the head
# under it, adds a tongue as its own piece, then skins the lot. The folded legs stay joined to the body and are skinned in place.
import sys, json; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, loops_of, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); n0v = len(M.V)

def fcol(M):
    g = face_graph(M); fc = g['fc']; ftc = M.tc[M.F].mean(1).astype(float); return g, fc, ftc
def flat_uv(vmask, q):
    """the texture spot of a vertex in vmask whose colour sits at luminance quantile q, where the texture is flat around it"""
    idx = np.nonzero(vmask)[0]; lum = M.tc[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:80]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0), 'spread', round(best[0], 1)); return best[1]

# ---- new colours: the model has no mouth, so its texture has none for it. Find an empty patch of the texture and paint
# two little ramps there: the maw (deep violet at the throat, lighter at the lips) and the tongue (root to pad).
def paint_swatches():
    from PIL import Image, ImageDraw
    Rr = 1024; im = Image.new('L', (Rr, Rr), 0); d = ImageDraw.Draw(im); uv = M.UV % 1.0
    for f in M.F: d.polygon([(uv[i][0] * Rr, (1 - uv[i][1]) * Rr) for i in f], fill=255, outline=255)
    used = np.asarray(im) > 0; I = np.zeros((Rr + 1, Rr + 1), int); I[1:, 1:] = used.cumsum(0).cumsum(1)
    w, h = 40, 24; best = None  # in 1024 texels: a free block w x h, twice
    free = (I[h:, w:] - I[:-h, w:] - I[h:, :-w] + I[:-h, :-w]) == 0; ys, xs = np.nonzero(free)
    if not len(ys): raise SystemExit('no free texture patch')
    spots = [(ys[0], xs[0])]
    for yy, xx in zip(ys, xs):
        if abs(yy - spots[0][0]) >= h or abs(xx - spots[0][1]) >= w: spots.append((yy, xx)); break
    tex = M.tex.copy(); TH, TW = tex.shape[:2]; k = TW // Rr; out_ = []
    ramps = [((34, 20, 60), (96, 62, 156)), ((112, 72, 122), (166, 122, 160))]
    for (yy, xx), (c0, c1) in zip(spots, ramps):
        X0, Y0, Wd, Hd = xx * k, yy * k, w * k, h * k; t = np.linspace(0, 1, Wd)[None, :, None]
        tex[Y0:Y0 + Hd, X0:X0 + Wd] = (np.array(c0) * (1 - t) + np.array(c1) * t).astype(int)
        out_.append(lambda q, X0=X0, Y0=Y0, Wd=Wd, Hd=Hd: np.array([(X0 + Wd * (0.15 + 0.7 * q)) / (TW - 1), 1 - (Y0 + Hd / 2) / (TH - 1)]))
    M.tex = tex; M.m.visual.material.baseColorTexture = Image.fromarray(tex.astype(np.uint8)); print('painted two ramps at', spots); return out_
uv_mawq, uv_tgq = paint_swatches()

# ---- colours (the texture's own values)
tc = M.tc.astype(float); r_, g_, b_ = tc.T; lum = tc.sum(1); x, y, z = M.V.T
v_viol = (b_ - g_ > 25) & (r_ - g_ > 5); v_lilac = (b_ - g_ > 6) & (r_ - g_ > 4) & (lum > 400) & (y < 0.7); v_teal = (g_ - r_ > 18)
v_rust = (r_ > g_ + 6) & (g_ > b_ - 4) & (lum < 330)
uv_skin, uv_rust = flat_uv(v_teal & (y > 0.7) & (y < 0.75), 0.5), flat_uv(v_rust & (y > 0.76), 0.4)

# ---- the mouth: the groove between the cream lip and the head above it
g, fc, ftc = fcol(M); fx, fy, fz = fc.T; fax = np.abs(fx); fr, fg, fb = ftc.T; flum = ftc.sum(1)
fcream = (flum > 480) & (fr - fb > 12) & (np.abs(fr - fg) < 14); fteal = (fg - fr > 18); eyezone = (fy > 0.63) & (fax > 0.08)
jawA = groove_cut(M, fcream & (fy > 0.47) & (fz > 0.1) & ~eyezone, (fteal & (fy > 0.67)) | (fz < 0.0) | (fy < 0.3) | eyezone)
def mouth_run(A):
    lp = max(loops_of(M, A), key=len); L = g['Vw'][lp]; n = len(lp); i0 = int(np.argmax(L[:, 2]))
    ca = int(np.argmin(np.linalg.norm(L - [0.206, 0.567, 0.197], axis=1))); cb = int(np.argmin(np.linalg.norm(L - [-0.206, 0.567, 0.197], axis=1)))
    fw = [lp[(ca + k) % n] for k in range(((cb - ca) % n) + 1)]; bw = [lp[(cb + k) % n] for k in range(((ca - cb) % n) + 1)][::-1]
    return fw if lp[i0] in fw else bw
# the groove jogs up the little ticks between the lip plates; take those out: near the line, a face belongs to the jaw if it lies under the smoothed line
path = mouth_run(jawA); PP = g['Vw'][path]; ys = PP[:, 1].copy()
from scipy.ndimage import median_filter, uniform_filter1d
ys = uniform_filter1d(median_filter(ys, 15, mode='nearest'), 7, mode='nearest')
dd = np.linalg.norm(fc[:, None, :] - PP[None, ::2, :], axis=2); near = dd.min(1) < 0.035; idx = dd.argmin(1) * 2
band = near & (fz > 0.2)
jawA = np.where(band, fy < ys[np.clip(idx, 0, len(ys) - 1)], jawA)
lp = max(loops_of(M, jawA), key=len); L = g['Vw'][lp]; n = len(lp)
path = mouth_run(jawA); PP = g['Vw'][path]
if PP[0, 0] < PP[-1, 0]: path = path[::-1]; PP = PP[::-1]  # from its left corner (+x) round the front to its right corner
ysm = uniform_filter1d(median_filter(PP[:, 1], 9, mode='nearest'), 9, mode='nearest'); ysm[:4] = PP[:4, 1]; ysm[-4:] = PP[-4:, 1]
for i_, wid in enumerate(path): M.V[M.inv == wid, 1] = ysm[i_]
print('lip line snapped: moved by up to %.4f' % np.abs(ysm - PP[:, 1]).max()); PP = PP.copy(); PP[:, 1] = ysm
print('mouth line', len(path), 'points; corners', PP[0].round(3), PP[-1].round(3), 'front', PP[np.argmax(PP[:, 2])].round(3))
cornL, cornR = PP[0].copy(), PP[-1].copy(); HING = (cornL + cornR) / 2; HING[0] = 0
inner = set(path[1:-1]); GAP = 0.0004
dup = {}; newV, newUV, newN = [], [], []
Fj = M.F[jawA]
for fi in np.nonzero(jawA)[0]:
    for c in range(3):
        vi = M.F[fi, c]
        if M.inv[vi] in inner:
            if vi not in dup: dup[vi] = len(M.V) + len(newV); newV.append(M.V[vi] - [0, GAP, 0]); newUV.append(M.UV[vi]); newN.append(M.N[vi])
            M.F[fi, c] = dup[vi]
M.V = np.vstack([M.V, newV]); M.UV = np.vstack([M.UV, newUV]); M.N = np.vstack([M.N, newN]); lipLow = np.zeros(len(M.V), bool); lipLow[n0v:] = True
M.reindex(); print('slit: doubled', len(newV), 'lip points')

# ---- the crown: rust and gems above the head, with the rust floor inside its ring
g, fc, ftc = fcol(M); fx, fy, fz = fc.T; fr, fg, fb = ftc.T; flum = ftc.sum(1); fteal = (fg - fr > 18)
frust = (fr > fg + 6) & (fg > fb - 4) & (flum < 330); fviol = (fb - fg > 25) & (fr - fg > 5)
crownA = groove_cut(M, ((frust | fviol) & (fy > 0.76)) | ((fy > 0.74) & (np.hypot(fx, fz - 0.13) < 0.1)), (fteal & (fy < 0.745)) | (fy < 0.6))
E_ = Editor(M); rimC = E_.split(crownA, 'crown', uv_skin, uv_rust, caps=False)
crim = max(rimC, key=len); cc_ = crim.mean(0); print('crown rim', len(crim), 'centre', cc_.round(3))
# the head under the crown: a shallow dish (it must stay under the crown's own floor); the crown's underside: a flat lid
nr = len(crim); ring2 = crim * 0.55 + (cc_ - [0, 0.05, 0]) * 0.45
fanT = [(i, (i + 1) % nr, nr + i) for i in range(nr)] + [((i + 1) % nr, nr + (i + 1) % nr, nr + i) for i in range(nr)] + [(nr + i, nr + (i + 1) % nr, 2 * nr) for i in range(nr)]
dish = np.vstack([crim, ring2, cc_ - [0, 0.075, 0]]); fnY = np.cross(dish[fanT[0][1]] - dish[fanT[0][0]], dish[fanT[0][2]] - dish[fanT[0][0]])[1]
E_.add(dish, uv_skin, np.array(fanT), 'crown.hole', flip=fnY < 0)
lidT = [(i, (i + 1) % nr, nr) for i in range(nr)]; lid = np.vstack([crim, cc_ - [0, 0.004, 0]])
E_.add(lid, uv_rust, np.array(lidT), 'crown.lid', flip=fnY > 0)

# ---- the inside of the mouth: a roof under the head and a floor on the jaw, both from the lip line back to the hinge
m_ = 5; n = len(PP); seg = np.linalg.norm(np.diff(PP, axis=0), axis=1); u = np.r_[0, np.cumsum(seg)] / seg.sum()
BACK = cornL[None] + np.outer(u, cornR - cornL) + np.outer(np.sin(np.pi * u), [0, -0.01, -0.055])
wgt = np.sin(np.pi * u) ** 0.5
def pocket(rim, h):
    P = []
    for j in range(m_ + 1):
        s = j / m_; P.append(rim * (1 - s) + BACK * s + np.outer(wgt * h * np.sin(np.pi * s) ** 0.8, [0, 1, 0]))
    P = np.vstack(P); T = []
    for j in range(m_):
        for i in range(n - 1):
            a0, b0, c0, d0 = j * n + i, j * n + i + 1, (j + 1) * n + i, (j + 1) * n + i + 1; T += [(a0, b0, c0), (b0, d0, c0)]
    T = np.array(T); ar = np.linalg.norm(np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]), axis=1); T = T[ar > 1e-9]
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]).sum(0); uvp = np.vstack([np.tile(uv_mawq(1 - (j / m_) ** 0.7), (n, 1)) for j in range(m_ + 1)]); return P, T, fn[1], uvp
Pr, Tr, ny, uvp = pocket(PP, 0.055); E_.add(Pr, uvp, Tr, 'roof', flip=ny > 0)   # the roof faces down
Pf, Tf, ny, uvp = pocket(PP - [0, GAP, 0], -0.075); E_.add(Pf, uvp, Tf, 'floor', flip=ny < 0)  # the floor faces up
print('mouth inside: roof', len(Tr), 'floor', len(Tf), 'tris; hinge', HING.round(3))

# ---- the tongue: a tube of rings, one ring to a joint, with a pad on its end. Built stretched out along +z; every pose draws it in.
NT, DT = 8, 0.05; TG0 = np.array([0, 0.535, 0.275]); RS = 10
rad = [0.034, 0.033, 0.031, 0.029, 0.027, 0.026, 0.027, 0.032]
tp, tt = [], []
for k in range(NT):
    for q in range(RS):
        a_ = 2 * np.pi * q / RS; tp.append(TG0 + [rad[k] * np.cos(a_) * 1.35, rad[k] * np.sin(a_) * 0.75, DT * k])
for k in range(NT - 1):
    for q in range(RS):
        a0, b0, c0, d0 = k * RS + q, k * RS + (q + 1) % RS, (k + 1) * RS + q, (k + 1) * RS + (q + 1) % RS; tt += [(a0, c0, b0), (b0, c0, d0)]
# the pad: three more rings swelling then closing, all on the last joint
base = (NT - 1) * RS; pads = [(0.02, 0.046), (0.045, 0.05), (0.066, 0.034)]
for (dz, rr) in pads:
    for q in range(RS): a_ = 2 * np.pi * q / RS; tp.append(TG0 + [rr * np.cos(a_) * 1.3, rr * np.sin(a_) * 0.8, DT * (NT - 1) + dz])
for k in range(len(pads)):
    r0 = base + k * RS; r1 = base + (k + 1) * RS
    for q in range(RS): a0, b0, c0, d0 = r0 + q, r0 + (q + 1) % RS, r1 + q, r1 + (q + 1) % RS; tt += [(a0, c0, b0), (b0, c0, d0)]
tipi = len(tp); tp.append(TG0 + [0, 0, DT * (NT - 1) + 0.078]); r1 = base + len(pads) * RS
for q in range(RS): tt.append((r1 + q, tipi, r1 + (q + 1) % RS))
rooti = len(tp); tp.append(TG0 + [0, 0, -0.01])
for q in range(RS): tt.append((q, (q + 1) % RS, rooti))
tp = np.array(tp); tt = np.array(tt); tuv = np.array([uv_tgq(np.clip((p_[2] - TG0[2]) / (DT * (NT - 1) + 0.078), 0, 1)) for p_ in tp])
fn = np.cross(tp[tt[:, 1]] - tp[tt[:, 0]], tp[tt[:, 2]] - tp[tt[:, 0]]); outw = ((tp[tt].mean(1) - (TG0 + [0, 0, 0.2])) * fn)[:, :2].sum()
t0i = E_.add(tp, tuv, tt, 'tongue', flip=outw < 0); tring = np.r_[np.repeat(np.arange(NT), RS), np.full(len(tp) - NT * RS, NT - 1)]; tring[-1] = 0

M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r_, g_, b_ = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
lipLow = np.r_[lipLow, np.zeros(len(V) - len(lipLow), bool)]
print('after the cuts:', len(V), 'verts', len(M.F), 'tris', T)
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
body = tag == 0

# ---- joints
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.27, -0.24]), 'chest': ('hips', [0, 0.36, -0.02]),
 'head': ('chest', HING.tolist()), 'jaw': ('head', (HING - [0, 0.004, 0]).tolist()),
 'sac': ('jaw', [0, 0.47, 0.25]), 'belly': ('hips', [0, 0.26, -0.06]),
 'crown': ('head', [0, 0.752, 0.135]),
 'weed1': ('hips', [0, 0.335, -0.405]), 'weed2': ('weed1', [0, 0.21, -0.44]),
}
ends = {'head': [0, 0.66, 0.40], 'jaw': [0, 0.585, 0.40], 'sac': [0, 0.43, 0.34], 'belly': [0, 0.12, -0.02], 'crown': [0, 0.95, 0.135], 'weed2': [0, 0.08, -0.45]}
for k in range(NT):
    J['tg%d' % k] = ('jaw' if k == 0 else 'tg%d' % (k - 1), (TG0 + [0, 0, DT * k]).tolist())
ends['tg%d' % (NT - 1)] = (TG0 + [0, 0, DT * (NT - 1) + 0.078]).tolist()
EYE = {}
for sg, s in ((1, 'L'), (-1, 'R')):
    ek = body & (lum > 500) & (y > 0.64) & (y < 0.74) & (z > 0.17) & (x * sg > 0.1); ec = V[ek].mean(0); EYE[s] = ec; print('eye', s, 'centre', ec.round(3), int(ek.sum()))
    J['eye' + s] = ('head', (ec + [-0.012 * sg, -0.02, -0.03]).tolist()); ends['eye' + s] = (ec + [0.01 * sg, 0.005, 0.02]).tolist()
    J['fUp' + s] = ('chest', [0.225 * sg, 0.45, 0.08]); J['fLo' + s] = ('fUp' + s, [0.275 * sg, 0.235, 0.055]); J['fHand' + s] = ('fLo' + s, [0.205 * sg, 0.105, 0.165]); J['fFing' + s] = ('fHand' + s, [0.2 * sg, 0.05, 0.225]); ends['fFing' + s] = [0.2 * sg, 0.0005, 0.305]
    J['hTh' + s] = ('hips', [0.16 * sg, 0.265, -0.275]); J['hSh' + s] = ('hTh' + s, [0.335 * sg, 0.235, -0.045]); J['hFt' + s] = ('hSh' + s, [0.2 * sg, 0.105, -0.325]); J['hToe' + s] = ('hFt' + s, [0.255 * sg, 0.075, -0.15]); ends['hToe' + s] = [0.31 * sg, 0.0452, -0.01]
names = list(J.keys())
NEXT = {'weed1': 'weed2'}
for s in 'LR': NEXT.update({'fUp' + s: 'fLo' + s, 'fLo' + s: 'fHand' + s, 'fHand' + s: 'fFing' + s, 'hTh' + s: 'hSh' + s, 'hSh' + s: 'hFt' + s, 'hFt' + s: 'hToe' + s})
for k in range(NT - 1): NEXT['tg%d' % k] = 'tg%d' % (k + 1)
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float)
    if nm in ends: segs.append((nm, a, np.array(ends[nm], float)))
    elif nm == 'hips': segs.append((nm, a, a + [0, 0.02, 0.1])); segs.append((nm, a + [0, 0.1, -0.05], a + [0, 0.12, 0.05]))
    elif nm == 'chest': segs.append((nm, a, a + [0, 0.08, 0.12])); segs.append((nm, a + [0, 0.2, -0.06], a + [0, 0.24, 0.02]))
    else: segs.append((nm, a, np.array(J[NEXT[nm]][1], float)))
segs.append(('head', np.array([0, 0.66, 0.2]), np.array([0, 0.7, 0.3])))

# ---- regions
teal = (g_ - r_ > 18); cream = (lum > 480) & (r_ - b_ > 12) & (np.abs(r_ - g_) < 14)
lilac = body & (b_ - g_ > 6) & (r_ - g_ > 4) & (lum > 400) & (y < 0.62) & (y > 0.33) & (z > 0.1)
gem = is_('crown') & (b_ - g_ > 25) & (r_ - g_ > 5)
weed = body & (lum < 250) & (z < -0.36) & (y < 0.37) & (ax < 0.1)
jawv = np.zeros(len(V), bool); jawv[M.F[:len(jawA)][jawA].ravel()] = True; jawv &= body
eyeb = np.zeros(len(V), bool)
for sg, s in ((1, 'L'), (-1, 'R')): eyeb |= body & (np.linalg.norm(V - EYE[s], axis=1) < 0.05) & ~(g_ - r_ > 12) & (x * sg > 0)
foot = body & teal & (y < 0.118) & (z < 0.03) & (ax > 0.08)
hand = body & (y < 0.125) & (z > 0.07) & (ax > 0.02)
shinline = 0.185 + np.clip(z + 0.28, -0.1, 0.2) * 0.42
hleg = body & ~foot & (ax > 0.175) & (y < 0.335) & (z < 0.01) & (z > -0.41) & ~weed
shin = hleg & ((y < shinline) | (z < -0.3)) & (y < 0.26)
arm = body & ~hand & (ax > 0.15) & (z > -0.02) & (z < 0.2) & (y < 0.5) & (y > 0.1) & ~hleg
fore = arm & (y < 0.25)
headv = body & ~jawv & (z > 0.08) & (y > 0.56) & ~eyeb
print({k: int(v.sum()) for k, v in dict(lilac=lilac, gem=gem, weed=weed, jaw=jawv, eye=eyeb, foot=foot, hand=hand, hleg=hleg, shin=shin, arm=arm, fore=fore, head=headv).items()})
limbs = foot | hand | hleg | arm

def vis_of(nm, d):
    side = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    no = np.zeros(len(V), bool)
    if nm.startswith('tg') or nm == 'crown' or nm.startswith('eye'): return no
    if nm.startswith('weed'): return weed
    if nm == 'sac': return lilac & (y < 0.52)
    if nm == 'jaw': return (jawv & (y > 0.5) & ~lilac) | is_('floor')
    if nm == 'head': return headv | is_('roof') | is_('crown.hole')
    if nm.startswith('hToe'): return foot & side & (z > -0.17)
    if nm.startswith('hFt'): return foot & side & (z <= -0.13)
    if nm.startswith('hSh'): return shin & side
    if nm.startswith('hTh'): return hleg & ~shin & side
    if nm.startswith('fFing'): return hand & side & (z > 0.2)
    if nm.startswith('fHand'): return hand & side & (z <= 0.23)
    if nm.startswith('fLo'): return fore & side
    if nm.startswith('fUp'): return arm & ~fore & side
    ok = body & ~(limbs | weed | lilac | eyeb | headv) & ~(jawv & (y > 0.5))
    if nm == 'belly': return ok & (y < 0.4) & (z > -0.3) & (z < 0.2)
    if nm == 'hips': return ok & (z < -0.05)
    if nm == 'chest': return ok & (z > -0.2)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, nm): W[mask] = 0; W[mask, ix[nm]] = 1
force(is_('crown', 'crown.lid'), 'crown')
for sg, s in ((1, 'L'), (-1, 'R')): force(eyeb & (x * sg > 0), 'eye' + s)
ti = np.nonzero(is_('tongue'))[0]
for k in range(NT): force(ti[tring == k], 'tg%d' % k)
# the doubled lip points move with the jaw side of the slit; the head's own lip points must not take any jaw
W[lipLow, ix['head']] = 0; W[lipLow, ix['eyeL']] = 0; W[lipLow, ix['eyeR']] = 0
print('lip: jaw share on the jaw side %.2f, on the head side %.2f' % (W[lipLow, ix['jaw']].sum() / W[lipLow].sum(), 0))
glowA = lilac.astype(float)                       # the throat sac
glowB = is_('roof', 'floor', 'tongue').astype(float)  # the maw and the tongue
glowC = (gem | (eyeb & (lum > 430))).astype(float)  # crown gems and the eyes (rage)
extra = {'mouth': {'hinge': HING.tolist(), 'cornL': cornL.tolist(), 'cornR': cornR.tolist(), 'front': PP[np.argmax(PP[:, 2])].tolist()}, 'tongue': {'n': NT, 'd': DT, 'root': TG0.tolist(), 'tip': 0.078},
         'eyes': {s: EYE[s].tolist() for s in EYE}, 'crownRim': crim.mean(0).tolist()}
from scipy.spatial import ConvexHull
dom = np.argmax(W, axis=1); core = np.isin(dom, [ix[n_] for n_ in ('hips', 'chest', 'head', 'belly', 'jaw', 'sac', 'eyeL', 'eyeR')]) & body
hp_ = V[core]; hv_ = hp_[ConvexHull(hp_).vertices]; extra['hull'] = hv_.round(4).tolist()
ck = is_('crown'); cp_ = V[ck]; extra['crownHull'] = cp_[ConvexHull(cp_).vertices].round(4).tolist(); print('hull points', len(hv_), 'crown', len(extra['crownHull']))
for nm_, k_ in (('hands', hand), ('feet', foot)): extra[nm_ + 'Low'] = float(V[k_][:, 1].min())
finish(M, J, ends, W, names, out, [glowA, glowB, glowC], fallback='chest', extra=extra)
