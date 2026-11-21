# The Cinderback's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# The model is one piece: a long low salamander, mouth shut, legs sprawled, three rows of coals down its back, six gill stalks.
# Front is +z, length 1 (head at z 0.5, tail tip at z -0.5). This slits the mouth open along the line where the black head meets
# the pale chin, builds the inside of the mouth (a roof and a floor that meet at the hinge), then skins the lot: a spine of
# hips, spine, chest, neck, head and jaw, a tail of five bones, a bone for each side's gills, and four sprawled legs of four bones.
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

# ---- the mouth has no colour in the texture: paint one ramp in a free patch (deep soot red at the throat to ember at the lips)
def paint_swatch():
    from PIL import Image, ImageDraw
    Rr = 1024; im = Image.new('L', (Rr, Rr), 0); d = ImageDraw.Draw(im); uv = M.UV % 1.0
    for f in M.F: d.polygon([(uv[i][0] * Rr, (1 - uv[i][1]) * Rr) for i in f], fill=255, outline=255)
    used = np.asarray(im) > 0; I = np.zeros((Rr + 1, Rr + 1), int); I[1:, 1:] = used.cumsum(0).cumsum(1)
    w, h = 40, 24
    free = (I[h:, w:] - I[:-h, w:] - I[h:, :-w] + I[:-h, :-w]) == 0; ys, xs = np.nonzero(free)
    if not len(ys): raise SystemExit('no free texture patch')
    yy, xx = ys[0], xs[0]; tex = M.tex.copy(); TH, TW = tex.shape[:2]; k = TW // Rr
    c0, c1 = (30, 10, 8), (128, 40, 18)
    X0, Y0, Wd, Hd = xx * k, yy * k, w * k, h * k; t = np.linspace(0, 1, Wd)[None, :, None]
    tex[Y0:Y0 + Hd, X0:X0 + Wd] = (np.array(c0) * (1 - t) + np.array(c1) * t).astype(int)
    M.tex = tex; M.m.visual.material.baseColorTexture = Image.fromarray(tex.astype(np.uint8)); print('painted the maw ramp at', (yy, xx))
    return lambda q: np.array([(X0 + Wd * (0.15 + 0.7 * q)) / (TW - 1), 1 - (Y0 + Hd / 2) / (TH - 1)])
uv_mawq = paint_swatch()

# ---- the mouth: the line where the black head meets the pale chin, from one corner round the snout to the other
g, fc, ftc = fcol(M); fx, fy, fz = fc.T; fr, fg, fb = ftc.T; flum = ftc.sum(1)
fwhite = (flum > 380) & (np.abs(fr - fb) < 30); fdark = flum < 250
jawA = groove_cut(M, fwhite & (fz > 0.40) & (fy > 0.125), (fdark & (fy > 0.162) & (fz > 0.36)) | (fz < 0.3) | (fy < 0.09) | (fwhite & (fz < 0.37) & (fy > 0.16)))
CORN = np.array([0.072, 0.159, 0.401])
def mouth_run(A):
    lp = max(loops_of(M, A), key=len); L = g['Vw'][lp]; n = len(lp); i0 = int(np.argmax(L[:, 2]))
    ca = int(np.argmin(np.linalg.norm(L - CORN, axis=1))); cb = int(np.argmin(np.linalg.norm(L - CORN * [-1, 1, 1], axis=1)))
    fw = [lp[(ca + k) % n] for k in range(((cb - ca) % n) + 1)]; bw = [lp[(cb + k) % n] for k in range(((ca - cb) % n) + 1)][::-1]
    return fw if lp[i0] in fw else bw
path = mouth_run(jawA); PP = g['Vw'][path]
if PP[0, 0] < PP[-1, 0]: path = path[::-1]; PP = PP[::-1]  # from its left corner (+x) round the snout to its right corner
from scipy.ndimage import uniform_filter1d, median_filter
ysm = uniform_filter1d(median_filter(PP[:, 1], 7, mode='nearest'), 7, mode='nearest'); ysm[:3] = PP[:3, 1]; ysm[-3:] = PP[-3:, 1]
for i_, wid in enumerate(path): M.V[M.inv == wid, 1] = ysm[i_]
PP = PP.copy(); PP[:, 1] = ysm
print('mouth line', len(path), 'points; corners', PP[0].round(3), PP[-1].round(3), 'front', PP[np.argmax(PP[:, 2])].round(3))
cornL, cornR = PP[0].copy(), PP[-1].copy(); HING = (cornL + cornR) / 2; HING[0] = 0; HING[1] -= 0.006
inner = set(path[1:-1]); GAP = 0.0004
dup = {}; newV, newUV, newN = [], [], []
for fi in np.nonzero(jawA)[0]:
    for c in range(3):
        vi = M.F[fi, c]
        if M.inv[vi] in inner:
            if vi not in dup: dup[vi] = len(M.V) + len(newV); newV.append(M.V[vi] - [0, GAP, 0]); newUV.append(M.UV[vi]); newN.append(M.N[vi])
            M.F[fi, c] = dup[vi]
M.V = np.vstack([M.V, newV]); M.UV = np.vstack([M.UV, newUV]); M.N = np.vstack([M.N, newN]); lipLow = np.zeros(len(M.V), bool); lipLow[n0v:] = True
M.reindex(); print('slit: doubled', len(newV), 'lip points')

# ---- the inside of the mouth: a roof under the head and a floor on the chin, from the lip line back to the corners' line
E_ = Editor(M)
m_ = 5; n = len(PP); seg = np.linalg.norm(np.diff(PP, axis=0), axis=1); u = np.r_[0, np.cumsum(seg)] / seg.sum()
BACK = cornL[None] + np.outer(u, cornR - cornL) + np.outer(np.sin(np.pi * u), [0, -0.004, -0.02])
wgt = np.sin(np.pi * u) ** 0.5
def pocket(rim, h):
    P = []
    for j in range(m_ + 1):
        s = j / m_; P.append(rim * (1 - s) + BACK * s + np.outer(wgt * h * np.sin(np.pi * s) ** 0.8, [0, 1, 0]))
    P = np.vstack(P); T = []
    for j in range(m_):
        for i in range(n - 1):
            a0, b0, c0, d0 = j * n + i, j * n + i + 1, (j + 1) * n + i, (j + 1) * n + i + 1; T += [(a0, b0, c0), (b0, d0, c0)]
    T = np.array(T); ar = np.linalg.norm(np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]), axis=1); T = T[ar > 1e-10]
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]).sum(0); uvp = np.vstack([np.tile(uv_mawq(1 - (j / m_) ** 0.7), (n, 1)) for j in range(m_ + 1)]); return P, T, fn[1], uvp
Pr, Tr, ny, uvp = pocket(PP, 0.03); E_.add(Pr, uvp, Tr, 'roof', flip=ny > 0)   # the roof faces down
Pf, Tf, ny, uvp = pocket(PP - [0, GAP, 0], -0.02); E_.add(Pf, uvp, Tf, 'floor', flip=ny < 0)  # the floor faces up
print('mouth inside: roof', len(Tr), 'floor', len(Tf), 'tris; hinge', HING.round(3))

M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r_, g_, b_ = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
lipLow = np.r_[lipLow, np.zeros(len(V) - len(lipLow), bool)]
print('after the cut:', len(V), 'verts', len(M.F), 'tris', T)
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
body = tag == 0
jawv = np.zeros(len(V), bool); jawv[M.F[:len(jawA)][jawA].ravel()] = True; jawv &= body

# ---- joints (model units; front +z)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.1, -0.04]), 'spine': ('hips', [0, 0.11, 0.08]), 'chest': ('spine', [0, 0.115, 0.22]),
 'neck': ('chest', [0, 0.13, 0.33]), 'head': ('neck', [0, 0.15, 0.375]), 'jaw': ('head', HING.tolist()),
 'gillL': ('head', [0.07, 0.18, 0.36]), 'gillR': ('head', [-0.07, 0.18, 0.36]),
 't1': ('hips', [0, 0.088, -0.13]), 't2': ('t1', [0, 0.072, -0.22]), 't3': ('t2', [0, 0.06, -0.3]), 't4': ('t3', [0, 0.049, -0.37]), 't5': ('t4', [0, 0.041, -0.44]),
}
ends = {'head': [0, 0.17, 0.5], 'jaw': [0, 0.14, 0.495], 'gillL': [0.11, 0.2, 0.36], 'gillR': [-0.11, 0.2, 0.36], 't5': [0, 0.033, -0.5]}
for sg, s in ((1, 'L'), (-1, 'R')):
    J['fUp' + s] = ('chest', [0.075 * sg, 0.125, 0.265]); J['fLo' + s] = ('fUp' + s, [0.118 * sg, 0.072, 0.255]); J['fHand' + s] = ('fLo' + s, [0.108 * sg, 0.028, 0.272]); J['fFing' + s] = ('fHand' + s, [0.105 * sg, 0.012, 0.302]); ends['fFing' + s] = [0.105 * sg, 0.0015, 0.352]
    J['hTh' + s] = ('hips', [0.07 * sg, 0.11, -0.04]); J['hSh' + s] = ('hTh' + s, [0.126 * sg, 0.088, -0.04]); J['hFt' + s] = ('hSh' + s, [0.118 * sg, 0.03, -0.05]); J['hToe' + s] = ('hFt' + s, [0.142 * sg, 0.017, -0.05]); ends['hToe' + s] = [0.172 * sg, 0.0115, -0.04]
names = list(J.keys())
NEXT = {'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head', 't1': 't2', 't2': 't3', 't3': 't4', 't4': 't5'}
for s in 'LR': NEXT.update({'fUp' + s: 'fLo' + s, 'fLo' + s: 'fHand' + s, 'fHand' + s: 'fFing' + s, 'hTh' + s: 'hSh' + s, 'hSh' + s: 'hFt' + s, 'hFt' + s: 'hToe' + s})
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float)
    segs.append((nm, a, np.array(ends[nm] if nm in ends else J[NEXT[nm]][1], float)))
segs.append(('head', np.array([0, 0.19, 0.4]), np.array([0, 0.18, 0.47])))

# ---- regions
coal = (r_ > 150) & (r_ - g_ > 60) & (g_ < 140); gold = (r_ > 150) & (g_ > 120) & (b_ < 90); violet = (b_ - g_ > 40) & (r_ - g_ > 10)
eyes = (r_ > 140) & (r_ - g_ > 50) & (z > 0.4) & (y > 0.16) & (ax > 0.03)
white = (lum > 380) & (np.abs(r_ - b_) < 30)
# gill stalks: the gold tips and the dark stalks under them, round the back of the head
gillc = {}
for sg, s in ((1, 'L'), (-1, 'R')):
    gillc[s] = body & (x * sg > 0.062) & (z > 0.33) & (z < 0.39) & (y > 0.14) & (np.hypot(x - 0.072 * sg, 0) > -1) & ((gold | (ax > 0.075)) & (y > 0.142))
fleg = body & (ax > 0.074) & (z > 0.2) & (z < 0.37) & (y < 0.13) & ~white
hleg = body & (ax > 0.074) & (z > -0.1) & (z < 0.035) & (y < 0.125) & ~white
headv = body & (z > 0.365) & ~jawv & ~gillc['L'] & ~gillc['R']
print({k: int(v.sum()) for k, v in dict(coal=coal, gold=gold, violet=violet, eyes=eyes, jaw=jawv, fleg=fleg, hleg=hleg, gillL=gillc['L'], gillR=gillc['R'], head=headv).items()})
limbs = fleg | hleg
tailz = [(-0.09, -0.17), (-0.17, -0.26), (-0.26, -0.335), (-0.335, -0.405), (-0.405, -0.6)]

def vis_of(nm, d):
    side = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith('gill'): return gillc[nm[-1]]
    if nm == 'jaw': return jawv | is_('floor')
    if nm == 'head': return headv | is_('roof')
    if nm.startswith('fFing'): return fleg & side & (y < 0.03) & (z > 0.29)
    if nm.startswith('fHand'): return fleg & side & (y < 0.045) & (z <= 0.31)
    if nm.startswith('fLo'): return fleg & side & (y < 0.1) & (y > 0.02)
    if nm.startswith('fUp'): return fleg & side & (y > 0.06)
    if nm.startswith('hToe'): return hleg & side & (y < 0.035) & (ax > 0.132)
    if nm.startswith('hFt'): return hleg & side & (y < 0.045) & (ax <= 0.142)
    if nm.startswith('hSh'): return hleg & side & (ax > 0.1) & (y > 0.02) & (y < 0.105)
    if nm.startswith('hTh'): return hleg & side & (y > 0.07)
    ok = body & ~limbs & ~jawv & ~gillc['L'] & ~gillc['R']
    if nm[0] == 't' and nm[1:].isdigit(): a, b = tailz[int(nm[1:]) - 1]; return ok & (z < a + 0.03) & (z > b)
    if nm == 'hips': return ok & (z < 0.06) & (z > -0.15)
    if nm == 'spine': return ok & (z > -0.05) & (z < 0.2)
    if nm == 'chest': return ok & (z > 0.1) & (z < 0.36)
    if nm == 'neck': return ok & (z > 0.28) & (z < 0.42) & ~headv | (ok & (z > 0.3) & (z < 0.39) & (y < 0.15))
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, nm): W[mask] = 0; W[mask, ix[nm]] = 1
# the doubled lip points move with the jaw side of the slit; the head's own lip points take no jaw
W[lipLow, ix['head']] = 0; W[lipLow, ix['neck']] = 0
up = body & ~lipLow & np.isin(M.inv, list(set(M.inv[lipLow]))) ; W[up, ix['jaw']] = 0
force(is_('roof'), 'head'); force(is_('floor'), 'jaw')
for s in 'LR': force(gillc[s] & gold, 'gill' + s)
# masks: x the coals (and the eyes), y the throat (the inside of the mouth and the pale chin and throat under the head), z kinds
glowA = (coal & ~eyes).astype(float) + 0.6 * eyes
glowB = is_('roof', 'floor').astype(float) + 0.5 * (white & (z > 0.3) & (y > 0.08)).astype(float)
glowC = np.where(violet, 1.0, np.where(gold, 0.5, 0.0))
extra = {'mouth': {'hinge': HING.tolist(), 'cornL': cornL.tolist(), 'cornR': cornR.tolist(), 'front': PP[np.argmax(PP[:, 2])].tolist()},
         'throat': [0, 0.13, 0.45], 'snout': PP[np.argmax(PP[:, 2])].tolist()}
for nm_, k_ in (('handsLow', fleg), ('feetLow', hleg)): extra[nm_] = float(V[k_][:, 1].min())
finish(M, J, ends, W, names, out, [glowA, glowB, glowC], fallback='spine', extra=extra)
