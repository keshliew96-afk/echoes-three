# The Bone Reeve's rig. usage: python3 -I rig.py <bonereeve.glb> <outdir> <thick.npy> <kit dir>
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3])
XS, ZS = -0.01, 0.015                        # the model stands a little to its left and behind its own middle: bring the hips over the root
M.V[:, 0] += XS; M.V[:, 2] += ZS; M.reindex()
def bone_colour(M): tc = M.tc.astype(float); tc = (tc / 255 if tc.max() > 1.5 else tc)[:, :3]; return (tc.mean(1) > 0.5) & (tc.max(1) - tc.min(1) < 0.3)

# ---- 1. Tripo grew a second right forearm and hand, hanging from the same elbow as the one on the scythe: take it off and close the holes
V = M.V; bc = bone_colour(M); g = face_graph(M); fc = g['fc']
seed = bc & (V[:, 0] < -0.07) & (V[:, 0] > -0.125) & (V[:, 1] > 0.38) & (V[:, 1] < 0.53) & (V[:, 2] < 0.06)
lo = np.array([-0.11, 0.403, 0.029]); hi = np.array([-0.103, 0.52, 0.006]); ax = (hi - lo) / np.linalg.norm(hi - lo)
d = segdist(fc, lo, hi + ax * 0.06); sink = (d > 0.045) | (fc[:, 1] > 0.58)
A = groove_cut(M, seed[M.F].all(1) & ~sink, sink); k = np.zeros(len(V), bool); k[M.F[A].ravel()] = True
print('extra arm: faces', int(A.sum()), 'from', V[k].min(0).round(3), 'to', V[k].max(0).round(3))
F = M.F[~A]; restv = np.unique(F); aV, aN, aUV, aT, aF = [M.V], [M.N], [M.UV], [th], [F]; base = len(M.V); c_arm = fc[A].mean(0)
for lp in loops_of(M, A):
    P = g['Vw'][lp]; pts, tris = cap_loop(P); n = np.cross(pts[tris[:, 1]] - pts[tris[:, 0]], pts[tris[:, 2]] - pts[tris[:, 0]]).sum(0)
    if n @ (c_arm - P.mean(0)) < 0: tris = tris[:, ::-1]; n = -n
    n /= np.linalg.norm(n) + 1e-12; v0 = restv[np.isin(M.inv[restv], lp)][0]
    aV.append(pts); aN.append(np.tile(n, (len(pts), 1))); aUV.append(np.tile(M.UV[v0], (len(pts), 1))); aT.append(np.full(len(pts), 0.05)); aF.append(tris + base); base += len(pts)
    print('  closed a hole of', len(lp), 'at', P.mean(0).round(3))
Vn, Nn, UVn, th, F = np.vstack(aV), np.vstack(aN), np.vstack(aUV), np.concatenate(aT), np.vstack(aF)
used = np.unique(F); remap = np.full(len(Vn), -1); remap[used] = np.arange(len(used))
M.V, M.N, M.UV, th, M.F = Vn[used], Nn[used], UVn[used], th[used], remap[F]; M.reindex()

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.56, 0.0]), 'spine': ('hips', [0, 0.62, 0.0]), 'chest': ('spine', [0, 0.68, 0.0]), 'head': ('chest', [0, 0.775, -0.01]),
 'upperarmL': ('chest', [0.085, 0.735, -0.01]), 'forearmL': ('upperarmL', [0.125, 0.575, -0.005]),
 'upperarmR': ('chest', [-0.085, 0.735, -0.01]), 'forearmR': ('upperarmR', [-0.089, 0.57, -0.012]), 'handR': ('forearmR', [-0.131, 0.614, 0.054]),
 'skF': ('hips', [0, 0.56, 0.05]), 'skF2': ('skF', [0, 0.3, 0.0]), 'skB': ('hips', [0, 0.56, -0.06]), 'skB2': ('skB', [0, 0.3, 0.0]),
}
ends = {'head': [0, 0.9, 0.0], 'forearmL': [0.135, 0.39, 0.0], 'handR': [-0.143, 0.62, 0.103], 'skF2': [0, 0.1, 0.0], 'skB2': [0, 0.1, 0.0]}
for s, sg in (('L', 1), ('R', -1)):
    J['thigh' + s] = ('hips', [0.072 * sg, 0.53, 0.0]); J['shin' + s] = ('thigh' + s, [0.072 * sg, 0.29, 0.005]); J['foot' + s] = ('shin' + s, [0.072 * sg, 0.04, 0.0]); ends['foot' + s] = [0.072 * sg, 0, 0.085]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, -0.04, 0])); segs.append((n, a + [-0.06, 0, 0], a + [0.06, 0, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.07, 0.05, 0], a + [0.07, 0.05, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float)))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
    if n.startswith('foot'): segs.append((n, a, a + [0, -0.03, -0.035]))

# ---- 2. regions
V = M.V; x, y, z = V.T; ax_ = np.abs(x); bc = bone_colour(M); g = face_graph(M); fc = g['fc']
SA = np.array([-0.143, 0.0, 0.103]); SB = np.array([-0.143, 0.95, 0.103]); d = segdist(fc, SA, SB)
bladef = (fc[:, 1] > 0.84) & (fc[:, 2] > 0.07); ribf = (fc[:, 2] > 0.07) & (fc[:, 1] > 0.78) & (fc[:, 0] < -0.09)
SC = groove_cut(M, (d < 0.012) | bladef, (d > 0.07) & ~bladef & ~ribf & (fc[:, 1] < 0.8)); scy = np.zeros(len(V), bool); scy[M.F[SC].ravel()] = True
print('scythe: faces', int(SC.sum()), 'verts', int(scy.sum()), 'from', V[scy].min(0).round(3), 'to', V[scy].max(0).round(3), 'joins', [(len(l), g['Vw'][l].mean(0).round(3).tolist()) for l in loops_of(M, SC)])
hb = bc & (x > -0.18) & (x < -0.1) & (y > 0.58) & (y < 0.68) & (z > -0.01) & (z < 0.14) & ~scy
for z0 in np.arange(0.0, 0.13, 0.015):
    kk = hb & (np.abs(z - z0) < 0.0075)
    if kk.sum(): print('  right forearm and hand at z', round(z0, 3), 'n', int(kk.sum()), 'centre', V[kk].mean(0).round(3), 'x', V[kk][:, 0].min().round(3), V[kk][:, 0].max().round(3), 'y', V[kk][:, 1].min().round(3), V[kk][:, 1].max().round(3))
hand = hb & (z > 0.05); grip = scy | hand
tipv = V[scy & (y < 0.02)]; butt = tipv.mean(0); print('staff butt', butt.round(3), 'scythe top', V[scy][:, 1].max().round(3))
bl = scy & (y > 0.84) & ~((np.hypot(x + 0.143, z - 0.103) < 0.02)); print('blade verts', int(bl.sum()), 'tip', V[bl][np.argmax(np.linalg.norm(V[bl] - [-0.143, 0.93, 0.103], axis=1))].round(3))
headm = (y > 0.775) & ~grip & (ax_ < 0.075) & (z < 0.075)
pouch = (x < 0) & (z > 0.045) & (y < 0.62)
armreg = (ax_ > 0.085) & (y > 0.40) & (y < 0.79) & ~grip & ~pouch
low = (y < 0.56) & ~armreg & ~grip
leg = low & (y < 0.15) & bc
skirt = low & ~leg
# the robe: from the knee down its front half hangs from the front joint and its back half from the back joint, so it can lie on the floor
# when he kneels; above the knee the sides go with the thighs and only the middle strips hang free
panelF = skirt & (z > 0.035) & (ax_ < 0.05) & (y >= 0.27); panelB = skirt & (z < -0.045) & (ax_ < 0.06) & (y >= 0.27)
lowF = skirt & (z > 0.0) & (y < 0.33); lowB = skirt & (z <= 0.0) & (y < 0.33)     # the two lower joints sit on the line between the halves, so each half folds up and never down
eyes = headm & (y > 0.795) & (y < 0.86) & (z > 0.02) & (ax_ < 0.04)       # the eye glow is drawn in the texture: the page lights only the violet texels of this patch
blade = bl
print({k: int(v.sum()) for k, v in dict(head=headm, leg=leg, skirt=skirt, panelF=panelF, panelB=panelB, arm=armreg, grip=grip, hand=hand, eyes=eyes, blade=blade).items()})
EL = {'L': np.array(J['forearmL'][1]), 'R': np.array(J['forearmR'][1])}
def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'handR': return grip
    if n == 'skF': return panelF
    if n == 'skB': return panelB
    if n == 'skF2': return lowF
    if n == 'skB2': return lowB
    if n == 'head': return headm
    if n[:4] in ('shin', 'foot'): return leg & side
    if n[:4] == 'thig': return side & (skirt | leg) & (y < 0.54) & (y > 0.27) & (ax_ > 0.012)
    if n == 'forearmL': return armreg & side & (y < 0.6)
    if n == 'forearmR': return armreg & side & (d < 0.035) & bc
    if n.startswith('upperarm'): return side & armreg & (d < 0.2)
    ok = ~(headm | leg | armreg | grip)
    if n == 'hips': ok = ok & (y < 0.6)
    if n == 'spine': ok = ok & (y > 0.54) & (y < 0.68)
    if n == 'chest': ok = ok & (y > 0.62)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(grip, 'handR')
force(headm & (y > 0.8), 'head')
force(leg & (y < 0.03) & (x > 0), 'footL'); force(leg & (y < 0.03) & (x < 0), 'footR')
finish(M, J, ends, W, names, out, [eyes, blade, scy], fallback='spine', extra={'zshift': ZS, 'xshift': XS, 'staffButt': list(map(float, butt))})
