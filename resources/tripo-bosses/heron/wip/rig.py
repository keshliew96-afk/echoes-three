# The Drowned Heron's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# The model's wings are folded and fused to the body, and its bill is closed. This cuts each wing and the lower bill free
# along their grooves, closes the holes, adds eleven flight feathers under each wing, then skins the lot.
import sys, json; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); n0v = len(M.V); th0 = np.load(sys.argv[3])
g = face_graph(M); fc = g['fc']; fx, fy, fz = fc.T; fax = np.abs(fx); ftc = M.tc[M.F].mean(1); flum = ftc.sum(1); fr, fg_, fb = ftc.T

# ---- the folded wings: a cut between the wing's outer face and the rest of the body, run along the grooves
fviol = (fb - fg_ > 14) & (fr - fg_ > 0) & (fy < 0.47) & (fy > 0.2)
wseed = (fax > 0.112) & (fy > 0.44) & (fy < 0.62)
bseed = ((fax < 0.028) | (fy < 0.355) | (fy > 0.70) | ((flum > 430) & (fz > 0.03)) | ((fy < 0.45) & (fax < 0.085) & (fz > -0.075)) | (fz > 0.1)) & ~fviol
wing = groove_cut(M, wseed, bseed); wingL = wing & (fx > 0); wingR = wing & (fx < 0)
# ---- the lower bill: below the bill's centre line, in front of the gape
cl = 0.87 - (fz - 0.12) * 0.394
jseed = (fz > 0.135) & (fy < cl - 0.007) & (fy > 0.78); useed = ((fz > 0.135) & (fy > cl + 0.004)) | (fz < 0.088) | (fy > 0.9) | (fy < 0.77)
jaw = groove_cut(M, jseed, useed)
print('faces: wingL', wingL.sum(), 'wingR', wingR.sum(), 'jaw', jaw.sum(), 'jaw seeds', jseed.sum())
jp = M.V[M.F[jaw]].reshape(-1, 3); print('jaw bbox', jp.min(0).round(3), jp.max(0).round(3))

def flat_uv(vmask, q):
    """the texture spot of a vertex in vmask whose colour sits at luminance quantile q, where the texture is flat around it"""
    idx = np.nonzero(vmask)[0]; lum = M.tc[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0), 'spread', round(best[0], 1)); return best[1]
vw = np.zeros(n0v, bool); vw[M.F[wing].ravel()] = True; vviol = (M.tc[:, 2] - M.tc[:, 1] > 14) & (M.tc[:, 0] - M.tc[:, 1] > 0); vshell = vw & ~vviol
vbill = np.zeros(n0v, bool); vbill[M.F[jaw].ravel()] = True
uv_flank, uv_under, uv_fa, uv_fb, uv_mouth = flat_uv(vshell, 0.2), flat_uv(vshell, 0.75), flat_uv(vshell, 0.4), flat_uv(vshell, 0.12), flat_uv(vbill, 0.1)

E_ = Editor(M)
rimL = E_.split(wingL, 'wingL', uv_flank, uv_under, grid=0.028); rimR = E_.split(wingR, 'wingR', uv_flank, uv_under, grid=0.028)
rimJ = E_.split(jaw, 'jaw', uv_mouth, uv_mouth)

# ---- the wing's own frame, measured on the left wing and mirrored for the right
P = max(rimL, key=len); c = P.mean(0); _, sv, Vt = np.linalg.svd(P - c); n0 = Vt[2] * np.sign(Vt[2][0]); print('rim plane: off-plane spread', sv[2] / np.sqrt(len(P)), 'normal', n0.round(3))
SH = M.V[:n0v][vshell & (M.V[:n0v, 0] > 0)]; Q = SH - c; Q = Q - np.outer(Q @ n0, n0); _, _, Vq = np.linalg.svd(Q - Q.mean(0)); a0 = Vq[0]; a0 *= np.sign(a0 @ np.array([0, -1, -1.0])); a0 -= n0 * (a0 @ n0); a0 /= np.linalg.norm(a0); c0 = np.cross(n0, a0)
s_sh = (SH - c) @ a0; s_rim = (P - c) @ a0; c_rim = (P - c) @ c0; c_sh = (SH - c) @ c0
top = s_rim < s_rim.min() + 0.07
Sj = c + a0 * (s_rim.min() + 0.035) + c0 * c_rim[top].mean()
print('a0', a0.round(3), 'c0', c0.round(3), 'joint', Sj.round(3), 'shell along', (s_sh.min() - s_rim.min() - 0.035).round(3), (s_sh.max() - s_rim.min() - 0.035).round(3), 'rim along', 0, (s_rim.max() - s_rim.min()).round(3), 'rim across', c_rim.min().round(3), c_rim.max().round(3), 'shell across', c_sh.min().round(3), c_sh.max().round(3))
for sg, rim in ((1, rimL), (-1, rimR)):
    Pr = max(rim, key=len) * [sg, 1, 1]; print('  side', sg, 'rim to plane', ((Pr - c) @ n0).mean().round(4), 'spread', ((Pr - c) @ n0).std().round(4))
mir = np.array([-1, 1, 1.0])

# ---- flight feathers: a ridged blade each, lying along the folded wing from its own hinge (bind pose), hidden small
FEATH = []  # (hinge along, across, open angle deg, length, half width)
for i in range(6): FEATH.append((0.03 + 0.034 * i, -0.012, 100 - 4.5 * i, 0.2 + 0.0125 * i, 0.034))
for i in range(6): FEATH.append((0.235 + 0.006 * i, -0.008 + 0.004 * i, 70 - 13.5 * i, 0.28 + 0.02 * min(i, 3) - 0.012 * max(0, i - 4), 0.027 - 0.001 * i))
US = np.array([0, 0.12, 0.38, 0.68, 0.88]); WS = np.array([0.3, 0.75, 1.0, 0.9, 0.58])
def feather(L, w):
    pts = []; tris = []
    for u, k in zip(US, WS): pts += [(u * L, -w * k, 0), (u * L, 0, 0.0045 * (0.4 + k * 0.6)), (u * L, w * k, 0)]
    pts.append((L, 0, 0.001)); tip = len(pts) - 1
    for j in range(len(US) - 1):
        a, b = 3 * j, 3 * j + 3; tris += [(a, b, a + 1), (a + 1, b, b + 1), (a + 1, b + 1, a + 2), (a + 2, b + 1, b + 2)]
    e = 3 * (len(US) - 1); tris += [(e, tip, e + 1), (e + 1, tip, e + 2)]
    nb = len(pts)  # underside: the two edges only, flat
    for u, k in zip(US, WS): pts += [(u * L, -w * k, -0.0015), (u * L, w * k, -0.0015)]
    pts.append((L, 0, -0.0005)); tb = len(pts) - 1
    for j in range(len(US) - 1):
        a, b = nb + 2 * j, nb + 2 * j + 2; tris += [(a, a + 1, b), (a + 1, b + 1, b)]
    e = nb + 2 * (len(US) - 1); tris += [(e, e + 1, tb)]
    return np.array(pts, float), np.array(tris)
hinges = {}
for sg, s in ((1, 'L'), (-1, 'R')):
    for i, (hs, hc, ang, L, w) in enumerate(FEATH):
        pts, tris = feather(L, w); h = Sj + a0 * hs + c0 * hc + n0 * (0.007 + 0.0012 * (len(FEATH) - i))
        W3 = h + np.outer(pts[:, 0], a0) + np.outer(pts[:, 1], c0) + np.outer(pts[:, 2], n0)
        if sg < 0: W3 = W3 * mir
        E_.add(W3, uv_fa if i % 2 == 0 else uv_fb, tris, 'f%s%d' % (s, i), flip=sg < 0); hinges['f%s%d' % (s, i)] = (h * (mir if sg < 0 else 1)).tolist()
M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc; r, g_, b = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
th = np.r_[th0, np.full(len(V) - n0v, 0.05)]; th[n0v:n0v + 0] = 0
print('after the cuts:', len(V), 'verts', len(M.F), 'tris', T)
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
part = tag != 0

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.50, -0.03]), 'chest': ('hips', [0, 0.575, 0.05]),
 'neck1': ('chest', [0, 0.675, 0.105]), 'neck2': ('neck1', [0, 0.73, 0.112]), 'neck3': ('neck2', [0, 0.775, 0.055]), 'neck4': ('neck3', [0, 0.82, 0.018]),
 'head': ('neck4', [0, 0.865, 0.012]), 'jaw': ('head', [0, 0.86, 0.10]),
 'crest1': ('head', [0, 0.928, -0.025]), 'crest2': ('crest1', [0, 0.955, -0.085]),
 'plume1': ('chest', [0, 0.5, 0.115]), 'plume2': ('plume1', [0, 0.45, 0.09]),
 'tail1': ('hips', [0, 0.47, -0.13]), 'tail2': ('tail1', [0, 0.34, -0.205]),
}
ends = {'head': [0, 0.81, 0.282], 'jaw': [0, 0.803, 0.28], 'crest2': [0, 0.99, -0.14], 'plume2': [0, 0.40, 0.082], 'tail2': [0, 0.2, -0.28]}
tipS = s_sh.max() - s_rim.min() - 0.035
for sg, s in ((1, 'L'), (-1, 'R')):
    m = mir if sg < 0 else 1
    J['wing' + s] = ('chest', (Sj * m).tolist()); ends['wing' + s] = ((Sj + a0 * tipS) * m).tolist()
    for i, (hs, hc, ang, L, w) in enumerate(FEATH): n = 'f%s%d' % (s, i); J[n] = ('wing' + s, hinges[n]); ends[n] = (np.array(hinges[n]) + a0 * m * L).tolist()
    J['weed' + s] = ('wing' + s, [0.105 * sg, 0.43, -0.105]); ends['weed' + s] = [0.11 * sg, 0.29, -0.1]
    J['thigh' + s] = ('hips', [0.05 * sg, 0.50, -0.07]); J['shin' + s] = ('thigh' + s, [0.05 * sg, 0.42, -0.02]); J['tarsus' + s] = ('shin' + s, [0.043 * sg, 0.26, -0.075]); J['foot' + s] = ('tarsus' + s, [0.068 * sg, 0.03, -0.02]); ends['foot' + s] = [0.075 * sg, 0, 0.085]
names = list(J.keys())
NEXT = {'neck1': 'neck2', 'neck2': 'neck3', 'neck3': 'neck4', 'neck4': 'head', 'crest1': 'crest2', 'plume1': 'plume2', 'tail1': 'tail2'}
for s in 'LR': NEXT.update({'thigh' + s: 'shin' + s, 'shin' + s: 'tarsus' + s, 'tarsus' + s: 'foot' + s})
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float)
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, -0.03, -0.09]))
    elif n == 'chest': segs.append((n, a, a + [0, -0.05, 0.03])); segs.append((n, a, a + [0, 0.05, 0.0]))
    else: segs.append((n, a, np.array(J[NEXT[n]][1], float)))

def big(mask, least):
    lab = M.comps(mask); o = np.zeros(len(V), bool)
    for c_ in np.unique(lab[lab >= 0]):
        k = lab == c_
        if k.sum() >= least: o |= k
    return o
viol = (b - g_ > 14) & (r - g_ > 0)
weed = is_('wingL', 'wingR') & viol & (y < 0.47)
crest = (~part) & (y > 0.905) & (z < -0.012) & (th < 0.03)
headm = (~part | is_('jaw', 'jaw.hole', 'jaw.lid')) & (y > 0.795) & ((z > 0.03) | (y > 0.85)) & ~crest
jawm = is_('jaw', 'jaw.lid')
eye = viol & (y > 0.85) & (z > 0.03) & (z < 0.13) & ~part
plume = (~part) & (lum > 430) & (z > 0.05) & (y < 0.5) & (y > 0.37) & (th < 0.022)  # the free tips of the breast plumes only
tail = (~part) & (((z < -0.15) & (ax < 0.075) & (y < 0.47)) | (y < 0.36) & (z < -0.12))
leg = (~part) & (y < 0.40) & (z > -0.11) & (z < 0.1) & ~tail & ~plume & ((y < 0.36) | (ax > 0.02))
print({k: int(v.sum()) for k, v in dict(weed=weed, crest=crest, head=headm, jaw=jawm, eye=eye, plume=plume, tail=tail, leg=leg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n.startswith(('wing', 'weed')) or (n[0] == 'f' and n[1] in 'LR' and n[2:].isdigit()) or n == 'jaw': return np.zeros(len(V), bool)
    if n.startswith('crest'): return crest
    if n.startswith('plume'): return plume
    if n.startswith('tail'): return tail
    if n == 'head': return headm & ~jawm
    if n[:-1] in ('shin', 'tarsus', 'foot'): return leg & side
    if n.startswith('thigh'): return side & ~part & ~leg & ~tail & (y < 0.47) & (y > 0.38) & (ax > 0.015) & (ax < 0.085) & (z > -0.09) & (z < 0.03)
    ok = ~(part | crest | plume | tail | leg | headm)
    if n == 'hips': return ok & (z < 0.03) & (y < 0.66)
    if n == 'chest': return ok & (z > -0.06) & (y < 0.70)
    if n == 'neck1': return ok & (y > 0.655) & (z > 0.03)
    if n == 'neck2': return ok & (y > 0.70)
    if n == 'neck3': return ok & (y > 0.74)
    if n == 'neck4': return (ok & (y > 0.785)) | (headm & ~jawm & (y < 0.84) & (z < 0.05))
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
for s in 'LR':
    force(is_('wing' + s, 'wing' + s + '.lid') & ~weed, 'wing' + s); force(weed & is_('wing' + s), 'weed' + s)
    for i in range(len(FEATH)): force(is_('f%s%d' % (s, i)), 'f%s%d' % (s, i))
    force(leg & (np.sign(x) == (1 if s == 'L' else -1)) & (y < 0.028), 'foot' + s)
force(jawm, 'jaw'); force(eye, 'head'); force(headm & ~jawm & (z > 0.06), 'head'); force(is_('jaw.hole'), 'head')
mouth = is_('jaw.hole', 'jaw.lid')
extra = {'wing': {'a0': a0.tolist(), 'n0': n0.tolist(), 'c0': c0.tolist(), 'S': Sj.tolist(), 'feathers': [[hs, hc, ang, L, w] for hs, hc, ang, L, w in FEATH], 'tip': float(tipS)}}
finish(M, J, ends, W, names, out, [weed, mouth, eye], fallback='chest', extra=extra)
