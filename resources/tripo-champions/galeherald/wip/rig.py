# The Gale Herald's rig. usage: python3 -I rig.py <galeherald.glb> <outdir> <thick.npy> <kit dir>
# One welded stone statue: a robe to the floor with two feet under it, two arms (the right fist grips a long horn that
# lies over the right shoulder), two folded wings on its back, a helmet with a weathervane. The wings, the horn and the
# vane are cut free where Tripo fused them, so the wings can open, the horn can leave the shoulder and the vane can spin.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3])
STOP = sys.argv[5] if len(sys.argv) > 5 else ''

def split(M, A, lp, th):
    """The faces A leave the body along the welded rim lp. Both sides get their own rim vertices and a cap. The rim runs
    the way A's faces run, so the body's cap runs that way too and the part's cap the other way (hollowchoir/wip/rig.py)."""
    g = face_graph(M); Vw = g['Vw']; nV = len(M.V); F = M.F.copy()
    pts, tris = cap_loop(Vw[lp]); away = np.cross(pts[tris[:, 1]] - pts[tris[:, 0]], pts[tris[:, 2]] - pts[tris[:, 0]]).sum(0); away /= np.linalg.norm(away) + 1e-12; nud = 3e-4 * away
    fa = np.nonzero(A)[0]; used = np.unique(F[fa]); on = used[np.isin(M.inv[used], lp)]
    remap = np.arange(nV); remap[on] = nV + np.arange(len(on)); F[fa] = remap[F[fa]]
    aV, aN, aUV, aT, aF, aA = [M.V[on] + nud], [M.N[on]], [M.UV[on]], [th[on]], [], []
    base = nV + len(on); dk = on[np.argmin(M.tc[on].astype(float)[:, :3].sum(1))]      # the caps take the rim's darkest colour, so they read as shadow
    for part in (0, 1):
        q = pts + (nud if part else 0); t = tris[:, ::-1] if part else tris; nrm = -away if part else away
        aV.append(q); aN.append(np.tile(nrm, (len(q), 1))); aUV.append(np.tile(M.UV[dk], (len(q), 1))); aT.append(np.full(len(q), 0.2)); aF.append(t + base); aA.append(np.full(len(t), bool(part))); base += len(q)
    M.V = np.vstack([M.V] + aV); M.N = np.vstack([M.N] + aN); M.UV = np.vstack([M.UV] + aUV); M.F = np.vstack([F] + aF); M.reindex()
    return np.concatenate([th] + aT), np.r_[A, np.concatenate(aA)]

TAG = np.zeros(len(M.V), int); NAMES = ['body']
def free(A, name, th, only=None):
    """cut the face set A off along every rim it has (or only the rims `only` picks), and tag its vertices"""
    global TAG
    n = 0
    while True:
        g = face_graph(M); L = [l for l in loops_of(M, A) if len(l) >= 3 and (only is None or only(g['Vw'][l].mean(0)))]
        if not L or n > 6: break
        lp = L[0]; print('  ', name, 'cut a rim of', len(lp), 'at', g['Vw'][lp].mean(0).round(3), 'size', np.ptp(g['Vw'][lp], axis=0).round(3)); th, A = split(M, A, lp, th); n += 1
    TAG = np.r_[TAG, np.zeros(len(M.V) - len(TAG), int)]
    if name not in NAMES: NAMES.append(name)
    TAG[np.unique(M.F[A])] = NAMES.index(name)
    return th, A
fcs = lambda: face_graph(M)['fc'].T
def tagged(*names): return np.isin(TAG, [NAMES.index(n) for n in names])
def faces_of(*names): return tagged(*names)[M.F].all(1)

# ---- 1. the horn: it lies on the right shoulder and is fused there. Cut that contact; the tube stays in the fist.
X, Y, Z = fcs()
H = groove_cut(M, (X < -0.11) & (Y > 0.8), (X > -0.02) | (Y < 0.62))
g = face_graph(M); HL = {('fist' if g['Vw'][l].mean(0)[2] > 0 else 'rest'): g['Vw'][l] for l in loops_of(M, H)}; FISTRIM = HL['fist']
th, H = free(H, 'horn', th)
# ---- 2. the wings: each hangs from a root at the shoulder blade and touches the ornament down the spine. Cut both.
for s, sg in (('L', 1), ('R', -1)):
    X, Y, Z = fcs(); hornf = faces_of('horn')
    Wg = groove_cut(M, (X * sg > 0.09) & (Z < -0.06) & (Y > 0.4) & (Y < 0.7), (Z > 0.0) | (X * sg < 0.0) | (Y > 0.86) | (Y < 0.25) | hornf)
    v = np.zeros(len(M.V), bool); v[M.F[Wg].ravel()] = True; print('wing', s, 'faces', int(Wg.sum()), 'bbox', M.V[v].min(0).round(3), M.V[v].max(0).round(3))
    th, Wg = free(Wg, 'wing' + s, th)
# ---- 3. the weathervane on the helmet: cut at its rod, so it can turn
X, Y, Z = fcs()
VN = groove_cut(M, Y > 0.925, Y < 0.875)
v = np.zeros(len(M.V), bool); v[M.F[VN].ravel()] = True; print('vane faces', int(VN.sum()), 'bbox', M.V[v].min(0).round(3), M.V[v].max(0).round(3))
g = face_graph(M); VANE = g['Vw'][max(loops_of(M, VN), key=len)].mean(0)
th, VN = free(VN, 'vane', th)
print('pieces now', M.nc, sorted(M.cnt.tolist(), reverse=True)[:8], 'tris', len(M.F), {n: int((TAG == i).sum()) for i, n in enumerate(NAMES)})
if STOP == 'cuts':
    import trimesh
    col = np.array([[200, 200, 200, 255], [230, 160, 40, 255], [60, 120, 230, 255], [230, 60, 60, 255], [60, 200, 90, 255]])[TAG]
    trimesh.Trimesh(M.V, M.F, vertex_colors=col, process=False).export(out + '/cuts.glb'); sys.exit()

def rep(name, A):
    g = face_graph(M); L = loops_of(M, A); v = np.zeros(len(M.V), bool); v[M.F[A].ravel()] = True
    print(name, 'faces', int(A.sum()), 'bbox', M.V[v].min(0).round(3), M.V[v].max(0).round(3))
    for l in sorted(L, key=len, reverse=True)[:6]: print('   loop', len(l), g['Vw'][l].mean(0).round(3), 'size', np.ptp(g['Vw'][l], axis=0).round(3))
if STOP == 'arms':
    X, Y, Z = fcs(); other = faces_of('horn', 'wingL', 'wingR', 'vane')
    rep('head', groove_cut(M, ((Y > 0.9) | ((Y > 0.84) & (np.abs(X) < 0.03) & (Z > 0.02))) & ~other, (Y < 0.76) | other))
    rep('foreL', groove_cut(M, (X > 0.13) & (Y > 0.45) & (Y < 0.6) & (Z > 0.0), (X < 0.05) | (Y > 0.8) | (Y < 0.35) | other))
    rep('armL', groove_cut(M, ((X > 0.13) & (Y > 0.45) & (Y < 0.6) & (Z > 0.0)) | ((X > 0.095) & (Y > 0.62) & (Y < 0.7) & (Z > -0.03) & (Z < 0.04)), (X < 0.04) | (Y > 0.8) | (Y < 0.35) | other))
    rep('foreR', groove_cut(M, (X < -0.115) & (Y > 0.6) & (Y < 0.7) & (Z > 0.0), (X > -0.04) | (Y > 0.8) | (Y < 0.45) | other))
    rep('fistR', groove_cut(M, faces_of('horn') , (X > -0.02) | (Y < 0.7) | faces_of('wingL', 'wingR', 'vane') | (Y > 0.9)))
    x, y, z = M.V.T; b = tagged('body')
    for y0 in np.arange(0.44, 0.84, 0.03):
        for sg in (1, -1):
            m = b & (y >= y0) & (y < y0 + 0.03) & (x * sg > 0.06)
            if m.sum(): print('y %.2f side %+d n %3d x [%.3f %.3f] z [%.3f %.3f] mean %s' % (y0, sg, m.sum(), x[m].min(), x[m].max(), z[m].min(), z[m].max(), M.V[m].mean(0).round(3)))
    sys.exit()

if STOP == 'fist':
    X, Y, Z = fcs(); other = faces_of('wingL', 'wingR', 'vane'); hornf = faces_of('horn')
    tc = M.tc.astype(float)[:, :3] / 255; goldv = (tc[:, 0] > tc[:, 2] + 0.15); goldf = goldv[M.F].all(1); print('gold verts', int(goldv.sum()))
    for ylim in (0.70, 0.72, 0.735):
        rep('fist+horn sink y<%.3f' % ylim, groove_cut(M, hornf, (Y < ylim) | (X > -0.03) | other | (Y > 0.9)))
    x, y, z = M.V.T; b = tagged('body')
    box = b & (x < -0.03) & (x > -0.13) & (y > 0.62) & (y < 0.80) & (z > 0.0)
    for y0 in np.arange(0.62, 0.80, 0.02):
        m = box & (y >= y0) & (y < y0 + 0.02)
        for nm, mm in (('gold', m & goldv), ('white', m & ~goldv)):
            if mm.sum(): print('y %.2f %-5s n %3d x [%.3f %.3f] z [%.3f %.3f] mean %s' % (y0, nm, mm.sum(), x[mm].min(), x[mm].max(), z[mm].min(), z[mm].max(), M.V[mm].mean(0).round(3)))
    sys.exit()

if STOP == 'geo':
    x, y, z = M.V.T
    for nm in ('wingL', 'wingR'):
        w = tagged(nm)
        for y0 in np.arange(0.28, 0.82, 0.06):
            m = w & (y >= y0) & (y < y0 + 0.06)
            if m.sum(): print(nm, 'y %.2f n %3d x [%.3f %.3f] z [%.3f %.3f] mean %s' % (y0, m.sum(), x[m].min(), x[m].max(), z[m].min(), z[m].max(), M.V[m].mean(0).round(3)))
    h = tagged('horn'); P = M.V[h]; c = P.mean(0); u, sv, vt = np.linalg.svd(P - c); d = vt[0] * np.sign(vt[0][1]); t = (P - c) @ d
    print('horn: centre', c.round(3), 'axis', d.round(3), 'from', (c + d * t.min()).round(3), 'to', (c + d * t.max()).round(3), 'fist rim centre', FISTRIM.mean(0).round(3), 'bell radius', np.linalg.norm((P - c) - np.outer(t, d), axis=1).max().round(3))
    b = tagged('body'); lowm = b & (y < 0.07)
    for y0 in np.arange(0.0, 0.07, 0.01):
        for sg in (1, -1):
            m = lowm & (y >= y0) & (y < y0 + 0.01) & (x * sg > 0)
            if m.sum(): print('low y %.2f side %+d n %3d x [%.3f %.3f] z [%.3f %.3f]' % (y0, sg, m.sum(), x[m].min(), x[m].max(), z[m].min(), z[m].max()))
    tc = M.tc.astype(float)[:, :3] / 255; r_, g_, b_ = tc.T
    cy = b & (b_ > r_ + 0.15) & (g_ > r_ + 0.05) & (y > 0.8); print('cyan eye verts', int(cy.sum()), M.V[cy].min(0).round(3) if cy.sum() else '', M.V[cy].max(0).round(3) if cy.sum() else '')
    hm = b & (y > 0.83) & (y < 0.9); print('helmet/face band', M.V[hm].min(0).round(3), M.V[hm].max(0).round(3))
    sys.exit()

# ---- 4. regions
V = M.V; x, y, z = V.T; ax_ = np.abs(x); X, Y, Z = fcs()
body = tagged('body'); horn = tagged('horn'); wing = {'L': tagged('wingL'), 'R': tagged('wingR')}; vane = tagged('vane'); other = faces_of('horn', 'wingL', 'wingR', 'vane')
def vmask(A): v = np.zeros(len(V), bool); v[M.F[A].ravel()] = True; return v
headv = vmask(groove_cut(M, ((Y > 0.9) | ((Y > 0.84) & (np.abs(X) < 0.03) & (Z > 0.02))) & ~other, (Y < 0.76) | other)) & body
seedL = (X > 0.13) & (Y > 0.45) & (Y < 0.6) & (Z > 0.0)
foreL = vmask(groove_cut(M, seedL, (X < 0.05) | (Y > 0.8) | (Y < 0.35) | other)) & body             # the left forearm and hand, from the mouth of the sleeve
armL = vmask(groove_cut(M, seedL | ((X > 0.095) & (Y > 0.62) & (Y < 0.7) & (Z > -0.03) & (Z < 0.04)), (X < 0.04) | (Y > 0.8) | (Y < 0.35) | other)) & body & ~foreL   # the upper arm and its sleeve: carved against the flank
armR = vmask(groove_cut(M, (X < -0.115) & (Y > 0.6) & (Y < 0.7) & (Z > 0.0), (X > -0.04) | (Y > 0.8) | (Y < 0.45) | other)) & body      # the right arm, folded up to the fist at the shoulder, with the horn's hooked tail
arms = foreL | armL | armR
low = body & (y < 0.57) & ~arms
foot = low & ((y < 0.03) | ((y < 0.055) & (z > 0.05)))
face = headv & (y > 0.812) & (y < 0.87) & (z > 0.04) & (ax_ < 0.04)        # the eye glow is drawn in the texture: the page lights only the cyan texels of this patch
print({k: int(v.sum()) for k, v in dict(head=headv, foreL=foreL, armL=armL, armR=armR, low=low, foot=foot, face=face, horn=horn, wingL=wing['L'], wingR=wing['R'], vane=vane).items()})

HAX = np.array([-0.437, 0.505, -0.744]); FIST = FISTRIM.mean(0) - 0.012 * HAX            # the horn turns about the middle of the fist that grips it
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.5, -0.005]), 'spine': ('hips', [0, 0.6, -0.005]), 'chest': ('spine', [0, 0.69, -0.005]), 'head': ('chest', [-0.005, 0.813, 0.019]),
 'vane': ('head', [float(VANE[0]), float(VANE[1]), float(VANE[2])]),
 'upperarmL': ('chest', [0.075, 0.75, 0.0]), 'forearmL': ('upperarmL', [0.099, 0.588, 0.015]),
 'upperarmR': ('chest', [-0.085, 0.755, 0.0]), 'horn': ('upperarmR', FIST.tolist()),
}
ends = {'head': [-0.005, 0.9, 0.03], 'vane': [float(VANE[0]), 1.0, float(VANE[2])], 'forearmL': [0.181, 0.5, 0.06], 'upperarmR': [-0.1, 0.6, 0.0], 'horn': (FIST + 0.17 * HAX).tolist()}
for s, sg in (('L', 1), ('R', -1)):
    J['wing' + s] = ('chest', [0.03 * sg, 0.735, -0.045]); J['wing' + s + '2'] = ('wing' + s, [0.092 * sg, 0.53, -0.076]); ends['wing' + s + '2'] = [0.104 * sg, 0.29, -0.062]
    J['thigh' + s] = ('hips', [0.045 * sg, 0.49, 0.0]); J['shin' + s] = ('thigh' + s, [0.045 * sg, 0.27, 0.01]); J['foot' + s] = ('shin' + s, [0.045 * sg, 0.05, 0.0]); ends['foot' + s] = [0.045 * sg, 0, 0.1]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, 0.05, 0])); segs.append((n, a + [-0.06, 0.03, 0], a + [0.06, 0.03, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float)))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.07, 0.06, 0], a + [0.07, 0.06, 0]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
    if n.startswith('foot'): segs.append((n, a, a + [0, -0.04, -0.03]))
    if n in ('wingL', 'wingR'): sg = 1 if n[-1] == 'L' else -1; segs.append((n, a, a + [0.04 * sg, 0.06, 0.0]))

def vis_of(n, d):
    sgn = (1 if n.rstrip('2')[-1] == 'L' else -1) if n.rstrip('2')[-1] in 'LR' else 0
    if n == 'head': return headv
    if n == 'vane': return vane
    if n == 'horn': return horn
    if n == 'upperarmL': return armL
    if n == 'forearmL': return foreL
    if n == 'upperarmR': return armR
    if n in ('wingL', 'wingR'): return wing[n[-1]] & (y > 0.48)
    if n in ('wingL2', 'wingR2'): return wing[n[-2]] & (y < 0.58)
    if n.startswith('foot'): return foot & (x * sgn > 0)
    if n.startswith('thigh'): return low & ~foot & (x * sgn > -0.025) & (y > 0.2)
    if n.startswith('shin'): return low & ~foot & (x * sgn > -0.025) & (y < 0.34)
    core = body & ~arms & ~headv
    if n == 'hips': return core & (y > 0.44) & (y < 0.62)
    if n == 'spine': return core & (y > 0.54) & (y < 0.71)
    if n == 'chest': return core & (y > 0.64)
    return core
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(headv, 'head'); force(vane, 'vane'); force(horn, 'horn')
for s, sg in (('L', 1), ('R', -1)): force(foot & (x * sg > 0), 'foot' + s)
finish(M, J, ends, W, names, out, [face, horn, wing['L'] | wing['R']], fallback='spine', extra={'vane': list(map(float, VANE)), 'fist': FIST.tolist(), 'hornAxis': HAX.tolist()})
