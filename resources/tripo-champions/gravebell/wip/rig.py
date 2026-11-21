import os
import scipy.sparse as sp, scipy.sparse.csgraph as cg
# The Gravebell Ringer's rig. usage: python3 -I rig.py <gravebell.glb> <outdir> <kit dir> [stage]
# A tall hooded ringer in a ragged robe: one welded piece. He carries a staff over his left shoulder with both hands on it,
# and a cracked bell hangs from the staff's top behind him. Tripo made the staff in two tubes that lie side by side on the
# shoulder, both welded to it: the lower one from the butt through the hands, the upper one from the shoulder to the top.
# Both are cut free of the shoulder so the staff can be lifted and planted, and the bell is cut free of the rope so it can
# swing and toll. Both hands stay closed on the staff.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); STOP = sys.argv[4] if len(sys.argv) > 4 else ''
N0 = len(M.F)
XS, ZS = 0.032, -0.03                        # he stands to his right of the model's middle and ahead of it: bring the hips over the root
M.V[:, 0] += XS; M.V[:, 2] += ZS; M.reindex()

# ---- 1. the bell leaves the rope, the two staff tubes leave the shoulder
UA = np.array([-0.022, 0.524, 0.136]); UB = np.array([0.105, 0.988, -0.124]); UL = np.linalg.norm(UB - UA); UD = (UB - UA) / UL    # the upper tube's line
LA = np.array([-0.027, 0.536, 0.146]); LB = np.array([0.067, 0.81, 0.014]); LL = np.linalg.norm(LB - LA); LD = (LB - LA) / LL      # the lower tube: butt to stub
BX, BZ = 0.132, -0.134                       # the bell's own axis
g = face_graph(M); fc = g['fc']; X, Y, Z = fc.T
d = segdist(fc, UA - UD * 0.04, UB + UD * 0.04); t = (fc - UA) @ UD / UL; rb = np.hypot(X - BX, Z - BZ)
d2 = segdist(fc, LA - LD * 0.03, LB + LD * 0.03); t2 = (fc - LA) @ LD / LL
tcf = (M.tc.astype(float)[:, :3] / 255)[M.F].mean(1); wood = tcf[:, 0] - tcf[:, 2] > 0.04
KB = groove_cut(M, (rb < 0.05) & (Y > 0.70) & (Y < 0.86), ((rb > 0.105) & (Y < 0.9)) | (Y > 0.915) | (d < 0.011) | (Y < 0.56))
KS = groove_cut(M, ((d < 0.02) & (t > 0.52) & wood & ~KB) | ((Y > 0.905) & ~KB) | KB, ((d < 0.02) & (t < 0.47)) | ((d > 0.05) & (Y < 0.87) & ~KB & (rb > 0.1)) | (Y < 0.5)) & ~KB
KL = groove_cut(M, wood & ~KS & ~KB & (t2 > 0.78) & (d2 < 0.02), ((t2 < 0.72) & (d2 < 0.02) & wood) | (d2 > 0.06)) & ~KS & ~KB
Vw = g['Vw']; uvw = np.zeros((M.nw, 2)); uvw[M.inv] = M.UV
def vmask0(A): v = np.zeros(len(M.V), bool); v[M.F[A].ravel()] = True; return v
def uv_near(P, A):                           # the texture point of the vertex of face set A nearest to P
    v = np.nonzero(vmask0(A))[0]; return M.UV[v[np.argmin(np.linalg.norm(M.V[v] - P, axis=1))]]
E = Editor(M); added = 0
def free(A, name, capped):
    """split A off; close only the rims capped(rim) says to: 'both', 'part' or None"""
    global added
    rims = E.split(A, name, None, None, caps=False)
    for P in rims:
        how = capped(P); c = P.mean(0); print('  %s rim of %d at %s: %s' % (name, len(P), c.round(3), how or 'left open (it stays inside the part)'))
        if not how: continue
        pts, tris = cap_loop(P)
        if how == 'both': E.add(pts, uv_near(c, ~(KB | KS | KL)), tris, name + '.hole'); added += len(tris)
        E.add(pts, uv_near(c, A), tris, name + '.lid', flip=True); added += len(tris)
print('bell: faces', int(KB.sum())); free(KB, 'bell', lambda P: 'part' if len(P) >= 6 else None)
print('upper staff: faces', int(KS.sum())); free(KS, 'staff', lambda P: 'both' if (len(P) >= 12 and P[:, 1].mean() < 0.86) else None)
print('lower staff stub: faces', int(KL.sum())); free(KL, 'stub', lambda P: 'both' if abs((P.mean(0) - LA) @ LD / LL - 0.75) > 0.05 or len(P) > 10 else None)
M = E.done(); TAG, TAGS = M.tag, M.tags
print('tris now', len(M.F), 'added', len(M.F) - N0, 'pieces', M.nc)
tg = lambda *n: np.isin(TAG, [TAGS[k] for k in n if k in TAGS])
bell = tg('bell', 'bell.lid'); upper = tg('staff', 'staff.lid'); stub = tg('stub', 'stub.lid')
print('bell bbox', M.V[bell].min(0).round(3), M.V[bell].max(0).round(3))
if STOP == 'cut': sys.exit()

# ---- 2. regions
V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float)[:, :3] / 255; pale = tc.min(1) > 0.5
vd2 = segdist(V, LA - LD * 0.03, LB + LD * 0.03); vt2 = (V - LA) @ LD / LL; vwood = tc[:, 0] - tc[:, 2] > 0.04
HR = np.array([0.012, 0.652, 0.105]); HL = np.array([0.03, 0.725, 0.072])                 # the middle of each fist on the staff
lab = M.comps(pale & (y > 0.52) & (y < 0.77) & (z > -0.02) & ~bell & ~upper & ~stub)
def piece_at(P):
    k = np.nonzero(lab >= 0)[0]; i = lab[k[np.argmin(np.linalg.norm(V[k] - P, axis=1))]]; return lab == i
armR = piece_at(HR); armL = piece_at(HL)                                                 # each bandaged forearm with its fist, out of the sleeve
tube = vwood & (vd2 < 0.03) & (vt2 > -0.12) & (vt2 < 0.8) & ~armR & ~armL & ~bell & ~upper & (z > -0.02) | stub
staff = upper | tube
fistR = armR & (np.linalg.norm(V - HR, axis=1) < 0.042); fistL = armL & (np.linalg.norm(V - HL, axis=1) < 0.042)
print({k: int(v.sum()) for k, v in dict(armR=armR, armL=armL, fistR=fistR, fistL=fistL, tube=tube, upper=upper, stub=stub, bell=bell).items()})
print('lower tube', V[tube].min(0).round(3), V[tube].max(0).round(3), 'butt', V[tube & (vt2 < 0.02)].mean(0).round(3))
held = staff | bell | armR | armL
headm = (y > 0.79) & ~held & (ax < 0.1)
leg = pale & (y < 0.16) & ~held
for s, sg in (('L', 1), ('R', -1)):
    b = leg & (x * sg > 0) & (y < 0.05); f = b & (z > z[b].max() - 0.03); h = b & (z < z[b].min() + 0.03)
    print('foot', s, 'x %.3f..%.3f z %.3f..%.3f top %.3f' % (x[b].min(), x[b].max(), z[b].min(), z[b].max(), y[leg & (x * sg > 0)].max()), 'toes turn out %.1f deg' % np.degrees(np.arctan2((x[f].mean() - x[h].mean()) * sg, z[f].mean() - z[h].mean())))
armreg = (ax > 0.06) & (y > 0.43) & (y < 0.8) & ~held & ~headm
low = (y < 0.55) & ~armreg & ~held
skirt = low & ~leg
panelF = skirt & (z > 0.04) & (ax < 0.06) & (y >= 0.27); panelB = skirt & (z < -0.045) & (ax < 0.07) & (y >= 0.27)
lowF = skirt & (z > 0.0) & (y < 0.33); lowB = skirt & (z <= 0.0) & (y < 0.33)
eyes = headm & (y > 0.795) & (y < 0.85) & (z > 0.05) & (ax < 0.05)
print({k: int(v.sum()) for k, v in dict(head=headm, leg=leg, skirt=skirt, panelF=panelF, panelB=panelB, lowF=lowF, lowB=lowB, armreg=armreg, eyes=eyes).items()})
for y0 in (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85):
    m = (np.abs(y - y0) < 0.02) & ~held; print('  body at y %.2f x [%.3f %.3f] z [%.3f %.3f]' % (y0, x[m].min(), x[m].max(), z[m].min(), z[m].max()))
m = headm & pale & (y > 0.79) & (y < 0.87); print('face', V[m].min(0).round(3), V[m].max(0).round(3), 'hood top', y[headm].max().round(3))
if STOP == 'regions': sys.exit()

# ---- 3. joints
GRIP = (LA + LD * LL * 0.42); PIVOT = np.array([0.118, 0.886, -0.139])                   # the staff turns about the lower fist; the bell hangs from the top of its shackle
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.53, 0.0]), 'spine': ('hips', [0, 0.6, 0.0]), 'chest': ('spine', [0, 0.68, 0.0]), 'head': ('chest', [0, 0.775, 0.02]),
 'staff': ('chest', GRIP.tolist()), 'bell': ('staff', PIVOT.tolist()),
 'upperarmL': ('chest', [0.08, 0.765, -0.01]), 'forearmL': ('upperarmL', [0.105, 0.625, -0.005]), 'handL': ('forearmL', [0.05, 0.7, 0.075]),
 'upperarmR': ('chest', [-0.08, 0.765, -0.01]), 'forearmR': ('upperarmR', [-0.105, 0.615, -0.005]), 'handR': ('forearmR', [-0.02, 0.64, 0.09]),
 'skF': ('hips', [0, 0.53, 0.05]), 'skF2': ('skF', [0, 0.29, 0.0]), 'skB': ('hips', [0, 0.53, -0.06]), 'skB2': ('skB', [0, 0.29, 0.0]),
}
ends = {'head': [0, 0.89, 0.06], 'staff': UB.tolist(), 'bell': [BX, 0.705, BZ], 'handL': HL.tolist(), 'handR': HR.tolist(), 'skF2': [0, 0.08, 0.0], 'skB2': [0, 0.08, 0.0]}
for s, sg in (('L', 1), ('R', -1)):
    J['thigh' + s] = ('hips', [0.0775 * sg, 0.5, 0.0]); J['shin' + s] = ('thigh' + s, [0.0775 * sg, 0.275, 0.005]); J['foot' + s] = ('shin' + s, [0.0775 * sg, 0.045, 0.0]); ends['foot' + s] = [0.0775 * sg, 0, 0.09]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, -0.04, 0])); segs.append((n, a + [-0.07, 0, 0], a + [0.07, 0, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.08, 0.06, 0], a + [0.08, 0.06, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float)))
    else: segs.append((n, a, np.array(J[[k for k in kids if k != 'staff'][0]][1], float)))
    if n.startswith('foot'): segs.append((n, a, a + [0, -0.03, -0.04]))

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'staff': return staff
    if n == 'bell': return bell
    if n == 'handL': return fistL
    if n == 'handR': return fistR
    if n == 'forearmL': return (armL & ~fistL) | (armreg & side & (y < 0.67))
    if n == 'forearmR': return (armR & ~fistR) | (armreg & side & (y < 0.66))
    if n.startswith('upperarm'): return side & armreg & (y > 0.58) & (d < 0.16)
    if n == 'head': return headm
    if n == 'skF': return panelF
    if n == 'skB': return panelB
    if n == 'skF2': return lowF
    if n == 'skB2': return lowB
    if n[:4] in ('shin', 'foot'): return leg & side
    if n[:4] == 'thig': return side & (skirt | leg) & (y < 0.52) & (y > 0.27) & (ax > 0.015)
    ok = ~(headm | leg | held)
    if n == 'hips': ok = ok & (y < 0.6) & ~armreg
    if n == 'spine': ok = ok & (y > 0.52) & (y < 0.7)
    if n == 'chest': ok = ok & (y > 0.62)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(staff, 'staff'); force(bell, 'bell'); force(fistL, 'handL'); force(fistR, 'handR')
force(headm & (y > 0.83), 'head')
for s, sg in (('L', 1), ('R', -1)): force(leg & (y < 0.035) & (x * sg > 0), 'foot' + s)
# The robe, the sleeves, the hair, the rope belt, the fists and the lower staff are one welded shell: there is no arm inside a
# sleeve to lift and nothing between a fist and the hair behind it. So the fists are one piece with the staff, and the shell
# round them goes with the staff less and less over RF of surface (measured along the mesh, so the hair behind a fist is
# far and the cuff it comes out of is near). The arm bones carry no skin; the moves keep the fists near where he carries them.
RF = float(os.environ.get('RF', 0.08))
ARMB = {s: [ix['upperarm' + s], ix['forearm' + s], ix['hand' + s]] for s in 'LR'}; allarm = ARMB['L'] + ARMB['R']
core = staff | fistL | fistR; part = bell | upper | stub
Fb = M.F[~part[M.F].any(1)]; ee = np.vstack([Fb[:, [0, 1]], Fb[:, [1, 2]], Fb[:, [2, 0]]]); ln = np.linalg.norm(V[ee[:, 0]] - V[ee[:, 1]], axis=1); ew = M.inv[ee]
G = sp.coo_matrix((np.r_[ln, ln] + 1e-9, (np.r_[ew[:, 0], ew[:, 1]], np.r_[ew[:, 1], ew[:, 0]])), shape=(M.nw, M.nw)).tocsr()
srcw = np.unique(M.inv[core & ~part]); dg = cg.dijkstra(G, directed=False, indices=srcw, min_only=True)[M.inv]
cw = np.zeros(M.nw); dw = cg.dijkstra(G, directed=False, indices=srcw, min_only=True); cw = np.clip(1 - dw / RF, 0, 1); cw = cw * cw * (3 - 2 * cw)
Au = (G > 0).astype(float); deg = np.maximum(np.asarray(Au.sum(1)).ravel(), 1)     # even it out over neighbours, so no one point is pulled alone
for _ in range(int(os.environ.get('SM', 10))): cw = 0.5 * cw + 0.5 * (Au @ cw) / deg; cw[srcw] = 1
soft = ~core & ~bell; c = cw[M.inv][soft]; c[c < 0.01] = 0
Wt = W[soft].copy(); Wt[:, allarm] = 0; Wt[:, ix['staff']] = 0; Wt[:, ix['bell']] = 0
st_ = Wt.sum(1, keepdims=True); Wt = np.where(st_ > 1e-9, Wt / np.maximum(st_, 1e-9), 0); Wt[st_[:, 0] <= 1e-9, ix['chest']] = 1
Wt *= (1 - c[:, None]); Wt[:, ix['staff']] += c; W[soft] = Wt
print('shell verts that go part of the way with the staff', int((c > 0.02).sum()), 'of them hair', int(((c > 0.02) & (pale & (y > 0.56))[soft]).sum()))
finish(M, J, ends, W, names, out, [eyes, bell, staff], fallback='spine', extra={'zshift': ZS, 'xshift': XS, 'grip': GRIP.tolist(), 'butt': V[tube & (vt2 < 0.02)].mean(0).tolist(), 'bellAxis': [BX, BZ], 'fists': [HL.tolist(), HR.tolist()]})
print('bones', len(names) - 1, 'tris', len(M.F))
