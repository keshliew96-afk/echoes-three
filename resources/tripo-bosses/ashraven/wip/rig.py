# The Ash Raven's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# The model stands with its wings folded and fused to the body, and its beak closed. This cuts each wing and the lower
# beak free along their grooves, closes the holes, adds fourteen flight feathers under each wing, then skins the lot.
import sys, json; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); n0v = len(M.V)
g = face_graph(M); fc = g['fc']; fx, fy, fz = fc.T; fax = np.abs(fx); ftc = M.tc[M.F].mean(1); flum = ftc.sum(1)

# ---- the folded wings: the outer shell from the shoulder to the tips of the primaries
wseed = ((fax > 0.168) & (fy > 0.43) & (fy < 0.6) & (fz > -0.07) & (fz < 0.1)) | ((fz < -0.13) & (fax > 0.085) & (fy > 0.1) & (fy < 0.38))
bseed = (fax < 0.022) | (fy > 0.74) | ((fy > 0.655) & (fz < -0.03) & (fax < 0.1)) | ((fz > 0.175) & (fax < 0.1)) | ((fy < 0.34) & (fz > -0.085)) | (fy < 0.085) | ((fax < 0.05) & (fz < -0.1) & (fy < 0.3))
wing = groove_cut(M, wseed, bseed)
import scipy.sparse as sp, scipy.sparse.csgraph as cg
def tidy(A):
    """keep the largest piece of the face set A and give it the small islands of other faces that it encloses"""
    nF = len(M.F); ea, eb = g['a'], g['b']
    def comp(mask):
        k = mask[ea] & mask[eb]; G = sp.coo_matrix((np.ones(k.sum()), (ea[k], eb[k])), shape=(nF, nF)).tocsr(); _, lab = cg.connected_components(G, directed=False); return lab
    lab = comp(A); cnt = np.bincount(lab[A]); A = A & (lab == cnt.argmax())
    lab = comp(~A); cnt = np.bincount(lab[~A], minlength=lab.max() + 1); small = (cnt[lab] < 400) & ~A; print('   tidy: islands taken', int(small.sum()), 'faces')
    return A | small
wingL = tidy(wing & (fx > 0))
# the right wing's own cut came out ragged: take the left wing's cut, mirrored, face by nearest face
from scipy.spatial import cKDTree
li = np.nonzero(fx > 0)[0]; ri = np.nonzero(fx < 0)[0]; dd, nn = cKDTree(fc[li]).query(fc[ri] * [-1, 1, 1]); wR = np.zeros(len(M.F), bool); wR[ri] = wingL[li[nn]] & (dd < 0.02)
print('   mirrored cut: faces', int(wR.sum()), 'own cut', int((wing & (fx < 0)).sum()), 'far matches', int((dd > 0.01).sum()))
wingR = tidy(wR); wing = wingL | wingR
# ---- the lower beak: the dark mandible under the bone mask
fpale = flum > 520
jseed = (fz > 0.2) & (fy < 0.835) & (fy > 0.77) & ~fpale & (fax < 0.045) & (flum < 400)
useed = fpale | (fz < 0.15) | (fy > 0.86)
jaw = groove_cut(M, jseed, useed)
jp = M.V[M.F[jaw]].reshape(-1, 3); print('faces: wingL', wingL.sum(), 'wingR', wingR.sum(), 'jaw', jaw.sum(), 'jaw bbox', jp.min(0).round(3), jp.max(0).round(3))

def flat_uv(vmask, q):
    """the texture spot of a vertex in vmask whose colour sits at luminance quantile q, where the texture is flat around it"""
    idx = np.nonzero(vmask)[0]; lum = M.tc[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0), 'spread', round(best[0], 1)); return best[1]
vshell = np.zeros(n0v, bool); vshell[M.F[wing].ravel()] = True
vbill = np.zeros(n0v, bool); vbill[M.F[jaw].ravel()] = True
uv_flank, uv_under, uv_fa, uv_fb, uv_mouth = flat_uv(vshell, 0.25), flat_uv(vshell, 0.5), flat_uv(vshell, 0.35), flat_uv(vshell, 0.85), flat_uv(vbill, 0.1)

E_ = Editor(M)
rimL = E_.split(wingL, 'wingL', uv_flank, uv_under, grid=0.03); rimR = E_.split(wingR, 'wingR', uv_flank, uv_under, grid=0.03)
rimJ = E_.split(jaw, 'jaw', uv_mouth, uv_mouth)
print('rims: wingL', [len(r) for r in rimL], 'wingR', [len(r) for r in rimR], 'jaw', [len(r) for r in rimJ])

# ---- the wing's own frame, measured on the left wing and mirrored for the right
P = max(rimL, key=len); c = P.mean(0); _, sv, Vt = np.linalg.svd(P - c); n0 = Vt[2] * np.sign(Vt[2][0]); print('rim plane: off-plane spread', sv[2] / np.sqrt(len(P)), 'normal', n0.round(3))
SH = M.V[:n0v][vshell & (M.V[:n0v, 0] > 0)]; Q = SH - c; Q = Q - np.outer(Q @ n0, n0); _, _, Vq = np.linalg.svd(Q - Q.mean(0)); a0 = Vq[0]; a0 *= np.sign(a0 @ np.array([0, -1, -1.0])); a0 -= n0 * (a0 @ n0); a0 /= np.linalg.norm(a0); c0 = np.cross(n0, a0)
s_sh = (SH - c) @ a0; s_rim = (P - c) @ a0; c_rim = (P - c) @ c0; c_sh = (SH - c) @ c0
top = s_rim < s_rim.min() + 0.08
Sj = c + a0 * (s_rim.min() + 0.04) + c0 * c_rim[top].mean()
tipS = float(s_sh.max() - s_rim.min() - 0.04)
print('a0', a0.round(3), 'c0', c0.round(3), 'joint', Sj.round(3), 'shell along', (s_sh.min() - s_rim.min() - 0.04).round(3), round(tipS, 3), 'rim along', 0, (s_rim.max() - s_rim.min()).round(3), 'rim across', c_rim.min().round(3), c_rim.max().round(3), 'shell across', c_sh.min().round(3), c_sh.max().round(3), 'shell out', ((SH - c) @ n0).min().round(3), ((SH - c) @ n0).max().round(3))
for sg, rim in ((1, rimL), (-1, rimR)):
    Pr = max(rim, key=len) * [sg, 1, 1]; print('  side', sg, 'rim to plane', ((Pr - c) @ n0).mean().round(4), 'spread', ((Pr - c) @ n0).std().round(4))
mir = np.array([-1, 1, 1.0])

# ---- flight feathers: a ridged blade each, lying along the folded wing from its own hinge (bind pose), hidden small
FEATH = []  # (hinge along, across, open angle deg, length, half width)
for i in range(7): FEATH.append((tipS * (0.06 + 0.055 * i), -0.01, 98 - 3.0 * i, 0.31 + 0.012 * i, 0.046))
for i in range(7): FEATH.append((tipS * (0.46 + 0.045 * i), -0.008 + 0.003 * i, 76 - 11.0 * i, 0.43 - 0.016 * max(0, i - 3), 0.038 - 0.001 * i))
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
        pts, tris = feather(L, w); h = Sj + a0 * hs + c0 * hc + n0 * (0.008 + 0.0012 * (len(FEATH) - i))
        W3 = h + np.outer(pts[:, 0], a0) + np.outer(pts[:, 1], c0) + np.outer(pts[:, 2], n0)
        if sg < 0: W3 = W3 * mir
        E_.add(W3, uv_fa if i % 2 == 0 else uv_fb, tris, 'f%s%d' % (s, i), flip=sg < 0); hinges['f%s%d' % (s, i)] = (h * (mir if sg < 0 else 1)).tolist()
M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc; r, g_, b = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
print('after the cuts:', len(V), 'verts', len(M.F), 'tris', T)
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
part = tag != 0

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.42, -0.03]), 'chest': ('hips', [0, 0.56, 0.045]),
 'neck1': ('chest', [0, 0.715, 0.06]), 'neck2': ('neck1', [0, 0.79, 0.065]),
 'head': ('neck2', [0, 0.865, 0.06]), 'jaw': ('head', [0, 0.838, 0.155]),
 'hackle': ('chest', [0, 0.75, -0.055]),
 'tail1': ('hips', [0, 0.335, -0.14]), 'tail2': ('tail1', [0, 0.2, -0.225]),
}
ends = {'head': [0, 0.79, 0.316], 'jaw': [0, 0.795, 0.3], 'hackle': [0, 0.655, -0.14], 'tail2': [0, 0.06, -0.31]}
for sg, s in ((1, 'L'), (-1, 'R')):
    m = mir if sg < 0 else 1
    J['wing' + s] = ('chest', (Sj * m).tolist()); ends['wing' + s] = ((Sj + a0 * tipS) * m).tolist()
    for i, (hs, hc, ang, L, w) in enumerate(FEATH): n = 'f%s%d' % (s, i); J[n] = ('wing' + s, hinges[n]); ends[n] = (np.array(hinges[n]) + a0 * m * L).tolist()
    J['thigh' + s] = ('hips', [0.075 * sg, 0.41, -0.03]); J['shin' + s] = ('thigh' + s, [0.082 * sg, 0.33, 0.03]); J['tarsus' + s] = ('shin' + s, [0.086 * sg, 0.19, -0.012]); J['foot' + s] = ('tarsus' + s, [0.097 * sg, 0.035, 0.03]); ends['foot' + s] = [0.125 * sg, 0, 0.165]
names = list(J.keys())
NEXT = {'neck1': 'neck2', 'neck2': 'head', 'tail1': 'tail2'}
for s in 'LR': NEXT.update({'thigh' + s: 'shin' + s, 'shin' + s: 'tarsus' + s, 'tarsus' + s: 'foot' + s})
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float)
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, -0.06, -0.05]))
    elif n == 'chest': segs.append((n, a, a + [0, -0.06, 0.05])); segs.append((n, a, a + [0, 0.1, 0.0]))
    else: segs.append((n, a, np.array(J[NEXT[n]][1], float)))

pale = lum > 520
jawm = is_('jaw', 'jaw.lid')
headm = ((~part) & ((y > 0.865) | pale | ((z > 0.15) & (y > 0.775)))) | is_('jaw.hole')
eye = (~part) & ~pale & (np.sqrt((ax - 0.055) ** 2 + (y - 0.895) ** 2 + (z - 0.14) ** 2) < 0.045)
hackle = (~part) & ~headm & (y > 0.63) & (y < 0.79) & (z < -0.02)
tail = (~part) & (z < -0.095) & (y < 0.33)
leg = (~part) & ~tail & (y < 0.345) & (z > -0.09) & (z < 0.2)
print({k: int(v.sum()) for k, v in dict(head=headm, jaw=jawm, eye=eye, hackle=hackle, tail=tail, leg=leg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n.startswith('wing') or (n[0] == 'f' and n[1] in 'LR' and n[2:].isdigit()) or n == 'jaw': return np.zeros(len(V), bool)
    if n == 'hackle': return hackle
    if n.startswith('tail'): return tail
    if n == 'head': return headm & ~jawm
    if n[:-1] in ('shin', 'tarsus', 'foot'): return leg & side
    if n.startswith('thigh'): return side & ~part & ~leg & ~tail & (y < 0.44) & (y > 0.33) & (ax > 0.02) & (ax < 0.13) & (z > -0.08) & (z < 0.09)
    ok = ~(part | hackle | tail | leg | headm)
    if n == 'hips': return (ok & (y < 0.56)) | (hackle & False)
    if n == 'chest': return (ok & (y > 0.44) & (y < 0.78)) | hackle
    if n == 'neck1': return (ok & (y > 0.69)) | (hackle & (y > 0.7))
    if n == 'neck2': return (ok & (y > 0.765)) | (headm & ~jawm & ~pale & (y < 0.85))
    return ok
W, names, ix = skin(M, J, segs, vis_of)
FORCED = np.zeros(len(W), bool)
def force(mask, n):
    global FORCED
    W[mask] = 0; W[mask, ix[n]] = 1; FORCED = FORCED | mask
for s in 'LR':
    force(is_('wing' + s, 'wing' + s + '.lid'), 'wing' + s)
    for i in range(len(FEATH)): force(is_('f%s%d' % (s, i)), 'f%s%d' % (s, i))
    force(leg & (np.sign(x) == (1 if s == 'L' else -1)) & ((y < 0.03) | ((z < -0.005) & (y < 0.065)) | ((z > 0.065) & (y < 0.075))), 'foot' + s)  # the back toe and the knuckles of the front toes go with the foot
force(jawm, 'jaw'); force(eye, 'head'); force(headm & ~jawm & (pale | ((z > 0.16) & (y > 0.8))), 'head'); force(is_('jaw.hole'), 'head')
# the body under each wing (the hole the cut left) follows the trunk by height, never the hackles or the neck
from scipy.spatial import cKDTree as _KD
hole = is_('wingL.hole', 'wingR.hole'); kk = np.clip((y - 0.42) / 0.2, 0, 1); kk = kk * kk * (3 - 2 * kk)
W[hole] = 0; W[hole, ix['hips']] = 1 - kk[hole]; W[hole, ix['chest']] = kk[hole]
# the hackles hang from the nape: below it the back stays with the chest
hk_ = np.clip((0.66 - y) / 0.05, 0, 1); W[:, ix['chest']] += W[:, ix['hackle']] * hk_; W[:, ix['hackle']] *= 1 - hk_
# the belly between the legs stays with the hips: a thigh that swings out does not drag the middle of the belly with it
cen = (~part) & ~leg & ~tail & (ax < 0.05) & (y > 0.3) & (y < 0.46)
for s_ in 'LR':
    for n_ in ('thigh' + s_, 'shin' + s_):
        g = np.clip((0.05 - ax) / 0.035, 0, 1) * cen; W[:, ix['hips']] += W[:, ix[n_]] * g; W[:, ix[n_]] *= 1 - g
# points that sit on top of each other (a seam in the texture, the rim of the skull plate) share one set of weights, so they
# never part: only skin of the body itself (the cut parts and their lids keep their own)
body = (tag == 0) | hole
bi = np.nonzero(body)[0]; tr = _KD(V[bi]); prs = tr.query_pairs(0.0015, output_type='ndarray')
Fb = FORCED[bi]
for _ in range(3):
    Wb = W[bi]; acc = Wb.copy(); cnt = np.ones(len(bi))
    np.add.at(acc, prs[:, 0], Wb[prs[:, 1]]); np.add.at(acc, prs[:, 1], Wb[prs[:, 0]]); np.add.at(cnt, prs[:, 0], 1); np.add.at(cnt, prs[:, 1], 1)
    Wn = acc / cnt[:, None]; Wn[Fb] = Wb[Fb]
    # a point beside a pinned one (the skull plate, a foot) takes the pinned weights outright
    for a_, b_ in ((0, 1), (1, 0)):
        m_ = Fb[prs[:, a_]] & ~Fb[prs[:, b_]]; Wn[prs[m_, b_]] = Wb[prs[m_, a_]]
    W[bi] = Wn
print('seam pairs shared', len(prs))
mouth = is_('jaw.hole', 'jaw.lid')
extra = {'wing': {'a0': a0.tolist(), 'n0': n0.tolist(), 'c0': c0.tolist(), 'S': Sj.tolist(), 'feathers': [[hs, hc, ang, L, w] for hs, hc, ang, L, w in FEATH], 'tip': tipS}}
finish(M, J, ends, W, names, out, [eye, mouth, hackle], fallback='chest', extra=extra)
