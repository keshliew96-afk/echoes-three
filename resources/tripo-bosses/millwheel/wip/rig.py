# The Millwheel's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# The model came face-on (axle along z) and 9% narrower than tall. This makes it round, turns it so the axle lies along x and it
# rolls toward +z as the game's wheel does, cuts the two bracket arms free of the axle so they can hang, and writes a rigid skin:
# the wheel on one joint, each arm on its own. It also measures the peg ends (the corners the wheel rolls over) and a hull of
# points the clips use to rest the wheel on the floor when it falls.
import sys, json; sys.path.insert(0, sys.argv[3])
import numpy as np
from scipy.spatial import ConvexHull
from rigkit import Mesh, finish, groove_cut, face_graph, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src)
V = M.V; r0 = np.hypot(V[:, 0], V[:, 1] - 0.5); a0 = np.degrees(np.arctan2(V[:, 1] - 0.5, V[:, 0])) % 360
near = lambda a: np.abs(((a0 - a + 180) % 360) - 180) < 2
kx = np.mean([r0[near(90)].max(), r0[near(270)].max()]) / np.mean([r0[near(0)].max(), r0[near(180)].max()])
print('the wheel is %.1f%% narrower than tall; x scaled by %.4f' % ((1 - 1 / kx) * 100, kx))
# round, then a quarter turn about y: old +z (the face Tripo calls front) becomes its left side, old -x becomes forward
V2 = np.c_[V[:, 2], V[:, 1], -V[:, 0] * kx]; N = M.N.copy(); N[:, 0] /= kx; N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12; N2 = np.c_[N[:, 2], N[:, 1], -N[:, 0]]
M.V = V2; M.N = N2; M.reindex(); n0v = len(M.V)
V = M.V; x, y, z = V.T; ax = np.abs(x); rr = np.hypot(y - 0.5, z)
ang = np.degrees(np.arctan2(z, -(y - 0.5))) % 360  # 0 straight down, + toward the front
tips = [rr[np.abs(((ang - k * 30 + 180) % 360) - 180) < 3].max() for k in range(12)]; print('peg tip radius', np.round(tips, 4))
R = float(np.mean(tips)); k0 = (np.abs(((ang + 180) % 360) - 180) < 8) & (y < 0.5 - R + 0.012)
w = float(z[k0].max() - z[k0].min()); pegx = float(x[k0].max() - x[k0].min()); print('peg end: width along the roll %.4f, across %.4f, R %.4f' % (w, pegx, R))

g = face_graph(M); fc = g['fc']; fx, fy, fz = fc.T; fax = np.abs(fx); frr = np.hypot(fy - 0.5, fz)
aseed = (fax > 0.135) & (fy < 0.445); bseed = (fax < 0.125) | ((fax > 0.182) & (frr < 0.02))
arm = groove_cut(M, aseed, bseed); armL = arm & (fx > 0); armR = arm & (fx < 0)
for nm, A in (('armL', armL), ('armR', armR)):
    P = M.V[M.F[A]].reshape(-1, 3); print(nm, 'faces', A.sum(), 'bbox', P.min(0).round(3), P.max(0).round(3))
def flat_uv(vmask, q):
    idx = np.nonzero(vmask)[0]; lum = M.tc[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0)); return best[1]
va = np.zeros(n0v, bool); va[M.F[arm].ravel()] = True; uv_iron = flat_uv(va, 0.3)
E_ = Editor(M); rimL = E_.split(armL, 'armL', uv_iron, uv_iron); rimR = E_.split(armR, 'armR', uv_iron, uv_iron)
for nm, rim in (('armL', rimL), ('armR', rimR)):
    for P in rim: print('  ', nm, 'rim', len(P), 'centre', P.mean(0).round(3), 'radius from the axle', np.hypot(P[:, 1] - 0.5, P[:, 2]).mean().round(3))
M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); rr = np.hypot(y - 0.5, z); tc = M.tc; tag = M.tag; T = M.tags
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])

J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.5, 0])}; ends = {'hips': [0, 0.5 - R, 0]}
for s, sg in (('L', 1), ('R', -1)):
    k = is_('arm' + s, 'arm' + s + '.lid'); top = k & (y > 0.47); xc = float(x[top].mean()) if top.any() else 0.16 * sg
    lowest = V[k][np.argmin(V[k][:, 1])]; J['arm' + s] = ('hips', [xc, 0.5, 0]); ends['arm' + s] = [float(lowest[0]), float(lowest[1]), float(lowest[2])]
    print('arm' + s, 'pivot x %.3f' % xc, 'hangs to', np.round(lowest, 3), 'verts', int(k.sum()))
# the twelve planks: what stands out of the rim on each peg line gets a joint of its own at the rim's face, so a move can take a
# plank off the wheel (the joint shrinks it into its socket) and grow a new one
ang = np.degrees(np.arctan2(z, -(y - 0.5))) % 360; offp = np.abs(((ang + 15) % 30) - 15)
RIMR = float(np.quantile(rr[(offp > 9) & (ax < 0.1)], 0.999)); pegv = (rr > RIMR + 0.002) & (offp < 7.5) & ~is_('armL', 'armR', 'armL.lid', 'armR.lid'); pegk = (np.round(ang / 30).astype(int)) % 12
print('rim outer radius %.4f; plank verts %d' % (RIMR, int(pegv.sum())), [int((pegv & (pegk == k)).sum()) for k in range(12)])
for k in range(12):
    a = np.radians(k * 30); J['peg%d' % k] = ('hips', [0, 0.5 - RIMR * np.cos(a), RIMR * np.sin(a)]); ends['peg%d' % k] = [0, 0.5 - R * np.cos(a), R * np.sin(a)]
names = list(J.keys()); ix = {n: i for i, n in enumerate(names)}
W = np.zeros((len(V), len(names))); W[:, ix['hips']] = 1
for s in 'LR':
    k = is_('arm' + s, 'arm' + s + '.lid'); W[k] = 0; W[k, ix['arm' + s]] = 1
for k in range(12):
    m = pegv & (pegk == k); W[m] = 0; W[m, ix['peg%d' % k]] = 1
# what glows: the hub plates with their lights, and the iron cog ring inside the rim
hub = (rr < 0.135) & (ax > 0.055) & ~is_('armL', 'armR', 'armL.lid', 'armR.lid')
cog = (rr > 0.262) & (rr < 0.322) & (ax < 0.062)
print('glow verts: hub', int(hub.sum()), 'cog ring', int(cog.sum()))
# a hull of points for resting on the floor: [bone index, x, y, z] (the planks count as the wheel's own)
hull = []
for n in ('hips', 'armL', 'armR'):
    k = np.nonzero((W[:, ix[n]] > 0.5) | ((n == 'hips') & pegv))[0]; h = ConvexHull(V[k]); pts = V[k][h.vertices]
    if len(pts) > 400: pts = pts[np.random.RandomState(3).choice(len(pts), 400, replace=False)]
    hull += [[ix[n]] + p.round(5).tolist() for p in pts]
print('hull points', len(hull))
Rc = float(np.hypot(R, w / 2)); dl = float(np.degrees(np.arctan2(w / 2, R)))
extra = {'wheel': {'R': R, 'w': w, 'Rc': Rc, 'delta': dl, 'pegs': 12, 'hull': hull, 'kx': float(kx), 'rim': RIMR, 'pegHalf': [float(np.abs(x[pegv]).max()), float((RIMR + 0.01) * np.sin(np.radians(np.quantile(offp[pegv & (rr < RIMR + 0.02)], 0.98))))]}}
print('rolling corners: radius %.4f, %.2f degrees either side of each peg; ground per peg %.4f' % (Rc, dl, w + 2 * Rc * np.sin(np.radians(15 - dl))))
finish(M, J, ends, W, names, out, [hub, cog, np.zeros(len(V), bool)], fallback='hips', extra=extra)
