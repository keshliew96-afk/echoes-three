# The Hollow Choir's rig. usage: python3 -I rig.py <hollowchoir.glb> <outdir> <thick.npy> <kit dir>
# One welded crystal figure with three faces on one head, two arms, a stole (two front strips), a cape, and no legs:
# the body runs down into a pillar and a cluster of crystals. It hovers, so nothing is planted.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3])

def split(M, A, lp, th, part_uv=None):
    """The faces A leave the body along the welded rim lp. Both sides get their own rim vertices and a cap, so the part can
    turn freely on the body. The rim runs the way A's faces run, so the body's cap runs that way too and the part's cap the
    other way. Returns the new thickness array and A with its cap."""
    g = face_graph(M); Vw = g['Vw']; nV = len(M.V); F = M.F.copy()
    pts, tris = cap_loop(Vw[lp]); away = np.cross(pts[tris[:, 1]] - pts[tris[:, 0]], pts[tris[:, 2]] - pts[tris[:, 0]]).sum(0); away /= np.linalg.norm(away) + 1e-12; nud = 3e-4 * away
    fa = np.nonzero(A)[0]; used = np.unique(F[fa]); on = used[np.isin(M.inv[used], lp)]
    remap = np.arange(nV); remap[on] = nV + np.arange(len(on)); F[fa] = remap[F[fa]]
    aV, aN, aUV, aT, aF, aA = [M.V[on] + nud], [M.N[on]], [M.UV[on]], [th[on]], [], []
    base = nV + len(on); dk = on[np.argmin(M.tc[on].astype(float)[:, :3].sum(1))]      # the caps take the rim's darkest colour, so they read as shadow
    for part in (0, 1):
        q = pts + (nud if part else 0); t = tris[:, ::-1] if part else tris; nrm = -away if part else away
        aV.append(q); aN.append(np.tile(nrm, (len(q), 1))); aUV.append(np.tile(M.UV[part_uv if (part and part_uv is not None) else dk], (len(q), 1))); aT.append(np.full(len(q), 0.2)); aF.append(t + base); aA.append(np.full(len(t), bool(part))); base += len(q)
    M.V = np.vstack([M.V] + aV); M.N = np.vstack([M.N] + aN); M.UV = np.vstack([M.UV] + aUV); M.F = np.vstack([F] + aF); M.reindex()
    return np.concatenate([th] + aT), np.r_[A, np.concatenate(aA)]

# ---- 1. the head is cut free at the neck, so it can spin all the way round without wringing the neck
g = face_graph(M); fc = g['fc']
H = groove_cut(M, fc[:, 1] > 0.84, fc[:, 1] < 0.75); lp = max(loops_of(M, H), key=len); NECK = g['Vw'][lp].mean(0)
print('head: faces', int(H.sum()), 'neck rim', len(lp), 'at', NECK.round(3), 'size', np.ptp(g['Vw'][lp], axis=0).round(3))
th, H = split(M, H, lp, th); headv = np.zeros(len(M.V), bool); headv[M.F[H].ravel()] = True

# ---- 2. the arms leave the body at a clean ring of 15 under each shoulder plate and touch nothing else. The seeds are the forearm
# and the front of the upper arm: the cape hangs right behind the elbows and carries the same light texels there, so it must not seed
def colours(M):
    tc = M.tc.astype(float); tc = (tc / 255 if tc.max() > 1.5 else tc)[:, :3]; r_, g_, b_ = tc.T
    return (tc.mean(1) < 0.42) & (g_ < 0.3), r_ > b_ + 0.08
def arm_faces(M, sg):
    g = face_graph(M); fc = g['fc']; purple, gold = colours(M); clf = (purple | gold)[M.F].all(1)
    seed = ((fc[:, 0] * sg > 0.13) & (fc[:, 1] > 0.5) & (fc[:, 1] < 0.6)) | ((fc[:, 0] * sg > 0.075) & (fc[:, 1] > 0.58) & (fc[:, 1] < 0.66) & (fc[:, 2] > -0.035) & ~clf)
    sink = (fc[:, 0] * sg < 0.055) | (fc[:, 1] > 0.74) | (fc[:, 1] < 0.46) | (clf & (fc[:, 1] < 0.6))
    return groove_cut(M, seed & ~sink, sink)
# ---- 3. regions
V = M.V; x, y, z = V.T; ax_ = np.abs(x); g = face_graph(M); fc = g['fc']
purple, gold = colours(M); cloth = (purple | gold) & ~headv; armv = {}
for s, sg in (('L', 1), ('R', -1)):
    A = arm_faces(M, sg); v = np.zeros(len(V), bool); v[M.F[A].ravel()] = True; armv[s] = v
    print('arm', s, 'faces', int(A.sum()), 'joins', [(len(l), g['Vw'][l].mean(0).round(3).tolist()) for l in loops_of(M, A)])
arm = armv['L'] | armv['R']
hang = cloth & (y < 0.60) & ~arm                    # the cloth that hangs free: the two front strips of the stole and the cape behind and at the sides
stole = hang & (z > 0.015); cape = hang & ~stole
body = ~(headv | arm | hang)
star = body & (z > 0.03) & (ax_ < 0.035) & (y > 0.62) & (y < 0.74)       # the mark on its chest: the heart shows through here
crystal = ~cloth
print({k: int(v.sum()) for k, v in dict(head=headv, armL=armv['L'], armR=armv['R'], stole=stole, cape=cape, body=body, star=star, cloth=cloth).items()})

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.46, -0.012]), 'spine': ('hips', [0, 0.56, -0.012]), 'chest': ('spine', [0, 0.65, -0.012]), 'head': ('chest', [float(NECK[0]), float(NECK[1]), float(NECK[2])]),
 'tail1': ('hips', [0, 0.40, -0.01]), 'tail2': ('tail1', [0, 0.22, 0.0]),
 'capeB': ('chest', [0, 0.62, -0.07]), 'capeB2': ('capeB', [0, 0.46, -0.095]),
}
ends = {'head': [0, 0.95, -0.02], 'tail2': [0, 0.0, 0.0], 'capeB2': [0, 0.29, -0.105]}
for s, sg in (('L', 1), ('R', -1)):
    J['upperarm' + s] = ('chest', [0.082 * sg, 0.69, -0.015]); J['forearm' + s] = ('upperarm' + s, [0.105 * sg, 0.592, -0.028]); J['hand' + s] = ('forearm' + s, [0.148 * sg, 0.54, 0.062]); ends['hand' + s] = [0.19 * sg, 0.52, 0.115]
    J['stole' + s] = ('chest', [0.05 * sg, 0.58, 0.045]); ends['stole' + s] = [0.05 * sg, 0.31, 0.062]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, 0.05, 0])); segs.append((n, a, a + [0, -0.05, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float)))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.09, 0.07, 0], a + [0.09, 0.07, 0])); segs.append((n, a + [0, 0.1, -0.08], a + [0, 0.02, -0.08]))
    elif n == 'tail1': segs.append((n, a, np.array(J['tail2'][1], float)))
    elif n == 'capeB': segs.append((n, a, np.array(J['capeB2'][1], float))); segs.append((n, a + [-0.09, -0.08, 0.04], a + [0.09, -0.08, 0.04]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
segs.append(('capeB2', np.array([-0.1, 0.44, -0.04]), np.array([-0.1, 0.3, -0.05]))); segs.append(('capeB2', np.array([0.1, 0.44, -0.04]), np.array([0.1, 0.3, -0.05])))

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'head': return headv
    if n.startswith('upperarm'): return armv[n[-1]] & (y > 0.57)
    if n.startswith('forearm'): return armv[n[-1]] & (y < 0.63) & (z < 0.08)
    if n.startswith('hand'): return armv[n[-1]] & (z > 0.05)
    if n.startswith('stole'): return stole & side
    if n == 'capeB': return cape & (y > 0.42)
    if n == 'capeB2': return cape & (y < 0.5)
    ok = body
    if n == 'tail2': return ok & (y < 0.27)
    if n == 'tail1': return ok & (y > 0.17) & (y < 0.45)
    if n == 'hips': return ok & (y > 0.36) & (y < 0.54)
    if n == 'spine': return ok & (y > 0.48) & (y < 0.66)
    if n == 'chest': return ok & (y > 0.58)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(headv, 'head')
force(body & (y > 0.70), 'chest')
force(body & (y < 0.12), 'tail2')
finish(M, J, ends, W, names, out, [headv, star, crystal], fallback='spine', extra={'neck': list(map(float, NECK))})
