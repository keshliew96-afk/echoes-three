# The Lich Ram's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A skeleton in one welded piece. The lower jaw is fused to the skull along the teeth and at the hinge: it is cut free
# along its grooves and both sides are closed, so it can gape. Horns and skull are rigid on the head, hooves under the fetlock.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); n0v = len(M.V)
g = face_graph(M); fc = g['fc']; fx, fy, fz = fc.T; fax = np.abs(fx); ftc = M.tc[M.F].mean(1); flum = ftc.sum(1)

# ---- the lower jaw: under the tooth line, in front of the hinge, and the two branches that rise to the hinge
cl = np.interp(fz, [0.168, 0.187, 0.238, 0.304, 0.33], [0.746, 0.697, 0.682, 0.647, 0.636])
fhorn = flum < 330
jseed = (((fz > 0.185) & (fy < cl - 0.012) & (fy > 0.6)) | ((fz > 0.132) & (fz <= 0.185) & (fy > 0.685) & (fy < 0.725) & (fax > 0.022))) & (fax < 0.09) & ~fhorn
useed = ((fz > 0.172) & (fy > cl + 0.012)) | (fy > 0.775) | (fz < 0.112) | fhorn | (fy < 0.6) | ((fax < 0.016) & (fz < 0.165) & (fy > 0.7))
jaw = groove_cut(M, jseed, useed)
jp = M.V[M.F[jaw]].reshape(-1, 3); print('jaw faces', int(jaw.sum()), 'seeds', int(jseed.sum()), 'bbox', jp.min(0).round(3), jp.max(0).round(3))

def flat_uv(vmask, q):
    idx = np.nonzero(vmask)[0]; lum = M.tc[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0), 'spread', round(best[0], 1)); return best[1]
vj = np.zeros(n0v, bool); vj[M.F[jaw].ravel()] = True
uv_mouth = flat_uv(vj, 0.04)
E_ = Editor(M); rims = E_.split(jaw, 'jaw', uv_mouth, uv_mouth)
print('jaw rims', [len(r) for r in rims], [r.mean(0).round(3).tolist() for r in rims])
M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc; r, g_, b = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
print('after the cut:', len(V), 'verts', len(M.F), 'tris', T)

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.47, -0.19]), 'spine': ('hips', [0, 0.535, -0.09]), 'chest': ('spine', [0, 0.575, 0.0]),
 'neck1': ('chest', [0, 0.62, 0.05]), 'neck2': ('neck1', [0, 0.675, 0.085]), 'head': ('neck2', [0, 0.735, 0.115]),
 'jaw': ('head', [0, 0.752, 0.148]),
 'heart': ('chest', [0, 0.47, 0.065]),
 'tail1': ('hips', [0, 0.455, -0.245]), 'tail2': ('tail1', [0, 0.45, -0.295]),
}
ends = {'head': [0, 0.66, 0.32], 'jaw': [0, 0.625, 0.315], 'heart': [0, 0.42, 0.065], 'tail2': [0, 0.525, -0.32]}
for s, sg in (('L', 1), ('R', -1)):
    J['fUpper' + s] = ('chest', [0.113 * sg, 0.425, 0.16]); J['fFore' + s] = ('fUpper' + s, [0.113 * sg, 0.345, 0.10]); J['fCannon' + s] = ('fFore' + s, [0.113 * sg, 0.215, 0.11]); J['fHoof' + s] = ('fCannon' + s, [0.113 * sg, 0.07, 0.112]); ends['fHoof' + s] = [0.113 * sg, 0, 0.17]
    J['hThigh' + s] = ('hips', [0.105 * sg, 0.42, -0.205]); J['hShin' + s] = ('hThigh' + s, [0.115 * sg, 0.275, -0.145]); J['hCannon' + s] = ('hShin' + s, [0.098 * sg, 0.213, -0.225]); J['hHoof' + s] = ('hCannon' + s, [0.098 * sg, 0.075, -0.2]); ends['hHoof' + s] = [0.103 * sg, 0, -0.13]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.06, -0.05]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck1'][1], float))); segs.append((n, a, a + [0, -0.2, 0.1]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

dark = lum < 330; viol = (b > g_ + 40) & (r > g_ + 10)
horn = dark & (y > 0.66)
jawm = is_('jaw', 'jaw.lid')
headm = horn | ((y > 0.745) & (z > 0.06)) | ((z > 0.11) & (y > 0.69)) | ((z > 0.17) & (y > 0.6) & (ax < 0.09)) | is_('jaw.hole')
headm &= ~jawm
eye = viol & (y > 0.7) & (z > 0.17) & (ax < 0.09)
horn = horn & ~eye; headm = headm | eye
heart = viol & (y > 0.38) & (y < 0.56) & (ax < 0.085) & (z > -0.01) & (z < 0.15)
tail = (z < -0.262) & (y > 0.4) & (ax < 0.06)
fleg = (y < 0.318) & (ax > 0.06) & (z > 0.04)
hleg = (y < 0.288) & (ax > 0.045) & (z < -0.08)
print({k: int(v.sum()) for k, v in dict(horn=horn, jaw=jawm, head=headm, eye=eye, heart=heart, tail=tail, fleg=fleg, hleg=hleg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' and n[0] in 'fh' and n not in ('head', 'heart', 'hips') else np.ones(len(V), bool)
    if n == 'jaw': return jawm
    if n == 'head': return headm
    if n == 'heart': return heart
    if n.startswith('tail'): return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    body = ~(headm | jawm | heart | tail | fleg | hleg)
    if n.startswith('fUpper'): return body & side & (ax > 0.078) & (d < 0.036) & (y < 0.44) & (z > 0.06)
    if n.startswith('hThigh'): return body & side & (ax > 0.07) & (d < 0.045) & (y < 0.415) & (z < -0.1)
    if n == 'neck2': return body & (z > 0.045) & (y > 0.645) & (ax < 0.06)
    if n == 'neck1': return body & (z > 0.02) & (y > 0.6) & (ax < 0.06)
    if n == 'hips': return body & (z < -0.13)
    if n == 'spine': return body & (z < -0.03) & (z > -0.2) & (y > 0.45) & (ax < 0.07)
    if n == 'chest': return body & (z > -0.1)
    return body
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(horn, 'head'); force(eye, 'head'); force(headm & ((z > 0.13) | (y > 0.76)), 'head'); force(jawm, 'jaw'); force(heart, 'heart')
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    force((fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)) & (y < 0.062), n)
mouth = is_('jaw.hole', 'jaw.lid')
finish(M, J, ends, W, names, out, [horn, heart, eye, mouth][:3], fallback='chest')
np.save(out + '/mouth.npy', mouth)
