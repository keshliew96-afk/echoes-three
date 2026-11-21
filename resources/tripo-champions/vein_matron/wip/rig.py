# The Vein Matron's rig. usage: python3 -I rig.py <vein_matron.glb> <outdir> <kit dir> [stage]
# A tall crowned woman whose gown is a mass of roots spread on the floor: no legs. Her arms hang free of the body in an
# A-pose from the shoulders down. Thin pink veins hang from her hands: one long vein from the fingers of each hand to the
# floor (with a short branch), and one shorter from each wrist to the hip of the gown. Tripo welded each vein's ends to the
# hand and to the roots or the gown, so the veins are cut free at both ends and hang from the hand on their own joints:
# they are her whips. A loose 7-point splinter inside the gown is dropped. Hair, collar and crown are one with the body.
import sys, os; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); STOP = sys.argv[4] if len(sys.argv) > 4 else ''
# ---- 0. drop the splinter
keepF = M.comp[M.F[:, 0]] == M.main; used = np.zeros(len(M.V), bool); used[M.F[keepF].ravel()] = True
remap = np.cumsum(used) - 1; M.F = remap[M.F[keepF]]; M.V = M.V[used]; M.N = M.N[used]; M.UV = M.UV[used]; M.reindex()
N0 = len(M.F)

# ---- 1. the veins
g = face_graph(M); fc = g['fc']; Vw = g['Vw']; x, y, z = M.V.T
tc = M.tc.astype(float)[:, :3] / 255; fcol = tc[M.F].mean(1); pinkv = fcol[:, 0] + fcol[:, 2] - 2 * fcol[:, 1]
VEIN = {}
for s, sg in (('L', 1), ('R', -1)):
    # the long vein: everything outside the gown's column below the hand, less the dark root spur it touches at the bottom
    m0 = (x * sg > 0.115) & (y > 0.085) & (y < 0.62); lab = M.comps(m0)
    tip = np.argmin(np.where(m0 & (y > 0.4) & (z > 0.03), np.abs(y - 0.46) + np.abs(x * sg - 0.155), 9))
    PF = (lab == lab[tip])[M.F].all(1)
    srcA = PF & (pinkv > 0.45) & (fc[:, 0] * sg > 0.13) & (fc[:, 1] > 0.25) & (fc[:, 1] < 0.42)
    sinkA = (fc[:, 0] * sg < 0.11) | (PF & (fcol.mean(1) < 0.36) & (fc[:, 1] < 0.21)) | (fc[:, 1] > 0.447) | ~PF & (fc[:, 1] < 0.44) & (fc[:, 0] * sg < 0.125)
    A = groove_cut(M, srcA & ~sinkA, sinkA)
    # the short vein from the wrist to the gown's hip
    srcB = (pinkv > 0.4) & (fc[:, 0] * sg > 0.093) & (fc[:, 0] * sg < 0.118) & (fc[:, 1] > 0.3) & (fc[:, 1] < 0.44) & (fc[:, 2] > 0.02) & ~A
    sinkB = (fc[:, 0] * sg < 0.085) | (fc[:, 1] > 0.5) | A | (fc[:, 1] < 0.15) | (fc[:, 2] < -0.01)
    B = groove_cut(M, srcB & ~sinkB, sinkB) & ~A
    VEIN['whip' + s] = A; VEIN['teth' + s] = B
    print(s, 'long vein faces', int(A.sum()), 'short vein faces', int(B.sum()))
allv = np.zeros(len(M.F), bool)
for v in VEIN.values(): allv |= v
uvw = M.UV
def uv_near(P, A):
    vv = np.unique(M.F[A].ravel()); return M.UV[vv[np.argmin(np.linalg.norm(M.V[vv] - P, axis=1))]]
E = Editor(M); added = 0
for name, A in VEIN.items():
    rims = E.split(A, name, None, None, caps=False)
    for P in rims:
        c = P.mean(0); pts, tris = cap_loop(P)
        E.add(pts, uv_near(c, ~allv & (np.linalg.norm(fc - c, axis=1) < 0.03)), tris, name + '.hole'); E.add(pts, uv_near(c, A), tris, name + '.lid', flip=True); added += 2 * len(tris)
        print('  %s rim of %d at %s: %d cap tris each side' % (name, len(P), c.round(3), len(tris)))
M = E.done(); TAG, TAGS = M.tag, M.tags
print('tris now', len(M.F), 'added', len(M.F) - N0, 'pieces', M.nc)
tg = lambda *n: np.isin(TAG, [TAGS[k] for k in n if k in TAGS])
vein = {k: tg(k, k + '.lid') for k in VEIN}
if STOP == 'cut': sys.exit()

# ---- 2. regions
V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float)[:, :3] / 255; pk = tc[:, 0] + tc[:, 2] - 2 * tc[:, 1]
anyvein = vein['whipL'] | vein['whipR'] | vein['tethL'] | vein['tethR']
armv = {}
for s, sg in (('L', 1), ('R', -1)):
    lab = M.comps((x * sg > 0.073) & (y > 0.43) & (y < 0.75) & ~anyvein)
    k = np.nonzero(lab >= 0)[0]; P = np.array([0.135 * sg, 0.49, 0.05]); i = lab[k[np.argmin(np.linalg.norm(V[k] - P, axis=1))]]
    armv[s] = lab == i
    print('arm', s, int(armv[s].sum()), V[armv[s]].min(0).round(3), V[armv[s]].max(0).round(3))
arm = armv['L'] | armv['R']
headm = (y > 0.848) & (ax < 0.075) & ~arm
crystal = (pk > 0.42) & (((y > 0.9)) | ((y > 0.74) & (y < 0.87) & (ax > 0.035)))      # the crown and the collar
heart = (pk > 0.3) & (z > 0.05) & (ax < 0.05) & (y > 0.62) & (y < 0.77)
eyes = headm & (y > 0.86) & (y < 0.9) & (z > 0.04) & (ax < 0.04)
body = ~(arm | anyvein)
for y0 in (0.06, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95):
    m = (np.abs(y - y0) < 0.015) & body; print('  body at y %.2f x [%.3f %.3f] z [%.3f %.3f]' % (y0, x[m].min(), x[m].max(), z[m].min(), z[m].max()))
print({k: int(v.sum()) for k, v in dict(head=headm, crystal=crystal, heart=heart, eyes=eyes).items()}, 'heart', V[heart].min(0).round(3), V[heart].max(0).round(3), 'eyes', V[eyes].min(0).round(3), V[eyes].max(0).round(3))
for k, m in vein.items(): print(k, int(m.sum()), V[m].min(0).round(3), V[m].max(0).round(3))
if STOP == 'regions': sys.exit()

# ---- 3. joints
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.5, 0.015]), 'spine': ('hips', [0, 0.6, 0.015]), 'chest': ('spine', [0, 0.7, 0.01]), 'head': ('chest', [0, 0.835, 0.01]),
 'skirt1': ('hips', [0, 0.36, 0.015]), 'skirt2': ('skirt1', [0, 0.2, 0.01]),
}
ends = {'head': [0, 1.0, 0.0], 'skirt2': [0, 0.07, 0.0]}
for s, sg in (('L', 1), ('R', -1)):
    J['upperarm' + s] = ('chest', [0.079 * sg, 0.745, 0.005]); J['forearm' + s] = ('upperarm' + s, [0.091 * sg, 0.61, 0.025]); J['hand' + s] = ('forearm' + s, [0.127 * sg, 0.505, 0.045]); ends['hand' + s] = [0.155 * sg, 0.44, 0.058]
    W0 = V[vein['whip' + s]]; top = W0[W0[:, 1] > W0[:, 1].max() - 0.02].mean(0)
    J['whip1' + s] = ('hand' + s, [0.152 * sg, 0.43, top[2]]); J['whip2' + s] = ('whip1' + s, [0.153 * sg, 0.32, 0.045]); J['whip3' + s] = ('whip2' + s, [0.156 * sg, 0.2, 0.052]); ends['whip3' + s] = [0.157 * sg, 0.09, 0.06]
    J['teth1' + s] = ('forearm' + s, [0.097 * sg, 0.48, 0.035]); J['teth2' + s] = ('teth1' + s, [0.104 * sg, 0.35, 0.035]); ends['teth2' + s] = [0.11 * sg, 0.22, 0.04]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not (k.startswith('teth') and n.startswith('forearm'))]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, 0.05, 0])); segs.append((n, a + [-0.07, 0, 0], a + [0.07, 0, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.1, 0.07, 0], a + [0.1, 0.07, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float)))
    elif n == 'skirt1': segs.append((n, a, np.array(J['skirt2'][1], float))); segs.append((n, a + [-0.1, -0.06, 0], a + [0.1, -0.06, 0]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
segs.append(('skirt2', np.array([-0.15, 0.12, 0]), np.array([0.15, 0.12, 0]))); segs.append(('skirt2', np.array([0, 0.12, -0.15]), np.array([0, 0.12, 0.15])))
segs.append(('root', np.array([-0.2, 0.0, 0]), np.array([0.2, 0.0, 0]))); segs.append(('root', np.array([0, 0.0, -0.19]), np.array([0, 0.0, 0.17])))

def vis_of(n, d):
    s = n[-1]
    if n.startswith('whip'): return vein['whip' + s]
    if n.startswith('teth'): return vein['teth' + s]
    if n.startswith('upperarm'): return armv[s] & (y > 0.59)
    if n.startswith('forearm'): return armv[s] & (y < 0.64) & (y > 0.47)
    if n.startswith('hand'): return armv[s] & (y < 0.53)
    if n == 'head': return headm
    if n == 'root': return body & (y < 0.07)
    if n == 'skirt2': return body & (y < 0.27)
    if n == 'skirt1': return body & (y < 0.45) & (y > 0.15)
    if n == 'hips': return body & (y < 0.6) & (y > 0.36)
    if n == 'spine': return body & (y > 0.5) & (y < 0.72)
    if n == 'chest': return body & (y > 0.6) & ~headm
    return body
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(headm & (y > 0.87), 'head'); force(body & (y < 0.03), 'root')
# the welded skin runs across the cuts: keep the veins' bones off the body and the body's bones off the veins
vb = [ix[n] for n in names if n[:4] in ('whip', 'teth')]
def only(mask, allowed, fb):
    keep = np.zeros(len(names), bool); keep[allowed] = True; Wm = W[mask] * keep; sm = Wm.sum(1, keepdims=True)
    Wm = np.where(sm > 1e-9, Wm / np.maximum(sm, 1e-9), 0); Wm[sm[:, 0] <= 1e-9, fb] = 1; W[mask] = Wm
only(~anyvein, [i for i in range(len(names)) if i not in vb], ix['skirt1'])
for s in 'LR':
    only(vein['whip' + s], [ix['whip1' + s], ix['whip2' + s], ix['whip3' + s], ix['hand' + s]], ix['whip2' + s])
    only(vein['teth' + s], [ix['teth1' + s], ix['teth2' + s], ix['forearm' + s]], ix['teth2' + s])
for s in 'LR':
    # the top of each vein goes with the hand or the forearm it hangs from, so the cut where it left them stays closed
    w = vein['whip' + s]; force(w & (y > V[w][:, 1].max() - 0.012), 'hand' + s)
    t = vein['teth' + s]; force(t & (y > V[t][:, 1].max() - 0.015), 'forearm' + s)
finish(M, J, ends, W, names, out, [eyes, heart, crystal], fallback='spine', extra={})
print('bones', len(names) - 1, 'tris', len(M.F))
