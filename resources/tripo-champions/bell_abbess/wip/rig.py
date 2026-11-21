# The Bell Abbess's rig. usage: python3 -I rig.py <bell_abbess.glb> <outdir> <kit dir> [stage]
# A tall abbess in a black and cream habit with a hood over a mitre, standing on an ornate round plinth: one welded piece,
# no legs (the habit runs down onto the plinth). Her right hand holds a crozier whose foot stands on the floor in front of
# the plinth; a bell hangs in its crook. Her left hand is raised in blessing out of a wide sleeve. Tripo welded the crozier's
# foot to the plinth's lip, its shaft through her right fist, and the bell's neck into the crook's hook. The crozier is cut
# free of the plinth and of the fist (it rides on its own joint in that hand) and the bell is cut free of the hook so it
# can swing and toll. The plinth stays on the floor with the root: she glides on it.
import sys, os; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); STOP = sys.argv[4] if len(sys.argv) > 4 else ''
N0 = len(M.F)
SA = np.array([-0.162, 0.0, 0.13]); SB = np.array([-0.183, 0.8, 0.13])     # the crozier's shaft, foot to crook
BX, BZ = -0.131, 0.100                                                      # the bell's own axis
g = face_graph(M); fc = g['fc']; X, Y, Z = fc.T
d = segdist(fc, SA, SB); rb = np.hypot(X - BX, Z - BZ)
bellseed = (rb < 0.03) & (Y > 0.79) & (Y < 0.875)
KB = groove_cut(M, bellseed, (Y > 0.915) | (rb > 0.07) | (Y < 0.74) | (d < 0.012))
crook = (Y > 0.8) & (X < -0.08) & (Z > 0.03) & ~KB & ~((rb < 0.035) & (Y < 0.9))
seed = ((d < 0.013) & (Y > 0.17) & (Y < 0.56)) | ((d < 0.011) & (Y < 0.11)) | ((d < 0.013) & (Y > 0.745) & (Y < 0.79)) | crook
sink = ((Y < 0.17) & (d > 0.03)) | ((d > 0.032) & (Y > 0.4) & (Y < 0.79)) | KB
KS = groove_cut(M, seed & ~sink, sink) & ~KB
def uv_near(P, A):
    vv = np.unique(M.F[A].ravel()); return M.UV[vv[np.argmin(np.linalg.norm(M.V[vv] - P, axis=1))]]
E = Editor(M); added = 0
NONE = np.zeros(len(KB), bool)
for name, A, other in (('staff', KS | KB, NONE), ('bell', KB, KS)):       # the crozier with its bell leaves the body, then the bell leaves the crook
    print(name, 'faces', int(A.sum()), 'bbox', M.V[np.unique(M.F[A])].min(0).round(3), M.V[np.unique(M.F[A])].max(0).round(3))
    rims = E.split(A, name, None, None, caps=False)
    for P in rims:
        c = P.mean(0); pts, tris = cap_loop(P)
        E.add(pts, uv_near(c, (other if other.any() else ~A)), tris, name + '.hole'); E.add(pts, uv_near(c, A), tris, name + '.lid', flip=True); added += 2 * len(tris)
        print('  %s rim of %d at %s size %s: %d cap tris each side' % (name, len(P), c.round(3), np.ptp(P, axis=0).round(3), len(tris)))
M = E.done(); TAG, TAGS = M.tag, M.tags
print('tris now', len(M.F), 'added', len(M.F) - N0, 'pieces', M.nc)
tg = lambda *n: np.isin(TAG, [TAGS[k] for k in n if k in TAGS])
if STOP == 'cut': sys.exit()

# ---- 2. regions
V = M.V; x, y, z = V.T; tc = M.tc.astype(float)[:, :3] / 255
staffp = tg('staff', 'staff.lid'); bellp = tg('bell', 'bell.lid'); held = staffp | bellp
CX = 0.008                                                                  # her middle sits a little to her left of the model's
ax = np.abs(x - CX)
plinth = (y < 0.128) & ~held
headm = (y > 0.79) & ~held & (ax < 0.1)
sidev = lambda sg: (x - CX) * sg > 0
# the arms: each hand with its forearm and the cream sleeve that hangs from it is cut out along the cheapest groove (the black
# over-sleeve behind it, the capelet and the robe stay with the body); only the upper arm under the capelet is shared
g2 = face_graph(M); fc2 = g2['fc']; fcol = tc[M.F].mean(1); FX, FY, FZ = fc2.T
skinF = (fcol[:, 0] - fcol[:, 2] > 0.1) & (fcol[:, 0] > 0.6); creamF = (fcol.min(1) > 0.48) & ~skinF
heldF = held[M.F].all(1)
dF = segdist(fc2, SA, SB + [0, 0.2, 0])
armreg, sidev, AF = {}, (lambda sg: (x - CX) * sg > 0), {}
for s, sg in (('L', 1), ('R', -1)):
    axF = (FX - CX) * sg
    seed = (skinF & (axF > 0.11) & (FY > 0.6) & (FY < 0.8) & (dF > 0.02)) | (creamF & (axF > 0.14) & (FY > 0.42) & (FY < 0.6))
    sink = (axF < 0.075) | (FY < 0.32) | (FY > 0.8) | heldF
    A = groove_cut(M, seed & ~sink & ~heldF, sink) & ~heldF; AF[s] = A; v = np.zeros(len(V), bool); v[M.F[A].ravel()] = True; armreg[s] = v & ~held
    print('arm', s, 'faces', int(A.sum()), 'bbox', V[armreg[s]].min(0).round(3), V[armreg[s]].max(0).round(3))
# Besides its seam under the capelet, the left sleeve's inner edge is welded to the robe at the belt by a few points: raise the
# arm and that weld drags a strip of robe up with it. The sleeve is cut free there (no caps: the cut lies in the fold).
weldL = np.zeros(len(V), bool); weldB = np.zeros(len(V), bool)
for s in 'LR':
    for lp in loops_of(M, AF[s]):
        c = g2['Vw'][lp].mean(0)
        if len(lp) > 10 or c[1] > 0.58: continue
        As = AF[s] & (np.linalg.norm(fc2 - c, axis=1) < 0.035)
        ua = np.zeros(len(V), bool); ua[M.F[As].ravel()] = True; uo = np.zeros(len(V), bool); uo[M.F[~As].ravel()] = True; sh = np.nonzero(ua & uo)[0]
        E2 = Editor(M); E2.split(As, 'weld', None, None, caps=False); M = E2.done()
        ext = lambda m: np.r_[m, m[sh]]
        staffp, bellp, held, plinth, headm = ext(staffp), ext(bellp), ext(held), ext(plinth), ext(headm)
        armreg = {k: ext(v) for k, v in armreg.items()}; armreg[s][sh] = False; armreg[s][-len(sh):] = True
        weldL = np.r_[weldL, np.zeros(len(sh), bool)]; weldL[-len(sh):] = True; weldB = np.r_[weldB, np.zeros(len(sh), bool)]; weldB[sh] = True
        V = M.V; x, y, z = V.T; tc = M.tc.astype(float)[:, :3] / 255; ax = np.abs(x - CX)
        print('  sleeve', s, 'cut free of the robe at', c.round(3), 'rim', len(lp), 'split verts', len(sh))
skinV = (tc[:, 0] - tc[:, 2] > 0.1) & (tc[:, 0] > 0.6)
handv = {s: armreg[s] & skinV & (y > 0.6) for s in 'LR'}
sleeve = {s: armreg[s] & (y < 0.585) & ~handv[s] for s in 'LR'}
shoulder = {s: sidev(sg) & (ax > 0.055) & (y > 0.6) & (y < 0.79) & ~armreg[s] & ~headm & ~held for s, sg in (('L', 1), ('R', -1))}
eyes = headm & (z > 0.0) & (y > 0.845) & (y < 0.9) & (ax < 0.05)                   # the face round the closed eyes: the page lights only the pale blue texels
gold = (tc[:, 0] - tc[:, 2] > 0.14) & (tc.max(1) > 0.35) & ~held & (y > 0.45) & (y < 0.7) & (ax < 0.13) & ~armreg['L'] & ~armreg['R']   # the belt of bells and the hand-bell at her breast
print({k: int(v.sum()) for k, v in dict(staff=staffp, bell=bellp, plinth=plinth, head=headm, armL=armreg['L'], armR=armreg['R'], handL=handv['L'], handR=handv['R'], sleeveL=sleeve['L'], sleeveR=sleeve['R'], shL=shoulder['L'], shR=shoulder['R'], eyes=eyes, gold=gold).items()})
if STOP == 'regions': sys.exit()

# ---- 3. joints
GRIP = np.array([-0.179, 0.688, 0.13]); PIVOT = np.array([-0.142, 0.905, 0.10])
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [CX, 0.42, 0.0]), 'spine': ('hips', [CX, 0.56, 0.0]), 'chest': ('spine', [CX, 0.665, -0.005]), 'head': ('chest', [CX, 0.78, -0.005]),
 'skirt1': ('hips', [CX, 0.34, 0.0]), 'skirt2': ('skirt1', [CX, 0.23, 0.0]),
 'upperarmL': ('chest', [0.093, 0.715, -0.01]), 'forearmL': ('upperarmL', [0.145, 0.57, 0.0]), 'handL': ('forearmL', [0.155, 0.655, 0.07]), 'sleeveL': ('forearmL', [0.152, 0.6, 0.02]),
 'upperarmR': ('chest', [-0.077, 0.715, -0.01]), 'forearmR': ('upperarmR', [-0.14, 0.57, 0.0]), 'handR': ('forearmR', [-0.16, 0.665, 0.09]), 'sleeveR': ('forearmR', [-0.152, 0.6, 0.02]),
 'staff': ('handR', GRIP.tolist()), 'bell': ('staff', PIVOT.tolist()),
}
ends = {'head': [CX, 0.99, 0.0], 'skirt2': [CX, 0.13, 0.0], 'handL': [0.175, 0.77, 0.1], 'handR': [-0.185, 0.695, 0.15], 'sleeveL': [0.16, 0.36, 0.0], 'sleeveR': [-0.16, 0.38, 0.0],
        'staff': SB.tolist(), 'bell': [BX, 0.78, BZ]}
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith('sleeve') and k not in ('staff', 'skirt1')]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, 0.05, 0])); segs.append((n, a + [-0.1, 0, 0], a + [0.1, 0, 0]))
    elif n == 'skirt1': segs.append((n, a, np.array(J['skirt2'][1], float))); segs.append((n, a + [-0.12, -0.03, 0], a + [0.12, -0.03, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.08, 0.04, 0], a + [0.08, 0.04, 0]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
segs.append(('skirt2', np.array([CX - 0.15, 0.2, 0]), np.array([CX + 0.15, 0.2, 0])))

def vis_of(n, d):
    s = n[-1]
    if n == 'staff': return staffp
    if n == 'bell': return bellp
    if n == 'head': return headm
    if n.startswith('sleeve'): return sleeve[s]
    if n.startswith('hand'): return handv[s]
    if n.startswith('forearm'): return armreg[s] & ~handv[s]
    if n.startswith('upperarm'): return (shoulder[s] | (armreg[s] & (y > 0.55) & ~handv[s])) & (d < 0.12)
    ok = ~(headm | held | armreg['L'] | armreg['R'])
    if n == 'skirt2': return ok & (y < 0.3)
    if n == 'skirt1': return ok & (y < 0.42) & (y > 0.18)
    if n == 'hips': return ok & (y < 0.56) & (y > 0.3)
    if n == 'spine': return ok & (y > 0.46) & (y < 0.7)
    if n == 'chest': return ok & (y > 0.58)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def only(mask, allowed, fb):
    keep = np.zeros(len(names), bool); keep[allowed] = True; Wm = W[mask] * keep; sm = Wm.sum(1, keepdims=True)
    Wm = np.where(sm > 1e-9, Wm / np.maximum(sm, 1e-9), 0); Wm[sm[:, 0] <= 1e-9, fb] = 1; W[mask] = Wm
armb = [ix[n] for n in names if n[:-1] in ('upperarm', 'forearm', 'hand', 'sleeve')]
only(weldL, [ix['upperarmL'], ix['forearmL'], ix['sleeveL']], ix['sleeveL'])
near = np.zeros(len(V), bool)
if weldB.any(): near = (np.linalg.norm(V - V[weldB].mean(0), axis=1) < 0.05) & ~armreg['L'] & ~armreg['R'] & ~held
only(near, [i for i in range(len(names)) if i not in armb], ix['hips'])
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(staffp, 'staff'); force(bellp, 'bell'); force(plinth, 'root'); force(headm & (y > 0.84), 'head')
force(handv['L'] & (y > 0.68), 'handL'); force(handv['R'] & (y > 0.66), 'handR')
finish(M, J, ends, W, names, out, [eyes, bellp, gold], fallback='spine', extra={'grip': GRIP.tolist(), 'pivot': PIVOT.tolist(), 'foot': SA.tolist(), 'cx': CX})
print('bones', len(names) - 1, 'tris', len(M.F))
