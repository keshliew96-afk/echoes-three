# The Glassblower's rig. usage: python3 -I rig.py <glassblower.glb> <outdir> <thick.npy> <kit dir> [stage]
# A lanky glassblower in goggles, a shirt with rolled sleeves, a long scorched leather apron over loose trousers, tall boots.
# His right fist holds a long blowpipe upright, its foot on the floor beside his right boot and a molten gather glowing on
# its top above his head. His left arm hangs in a long glove. One welded piece: Tripo welded the pipe through the right
# fist. The pipe is cut free (it rides on its own joint), so the right fist can swing it and the left hand can take it too.
import sys, os; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3]); STOP = sys.argv[5] if len(sys.argv) > 5 else ''
N0 = len(M.F)
PA = np.array([-0.1482, 0.0, 0.101]); PU = np.array([0.037, 0.9991, -0.0194]); PU /= np.linalg.norm(PU)     # the pipe: its foot and its way up
g = face_graph(M); fc = g['fc']; X, Y, Z = fc.T
t = (fc - PA) @ PU; r = np.linalg.norm((fc - PA) - np.outer(t, PU), axis=1)
FIST = (t > 0.655) & (t < 0.795)
seed = ((r < 0.015) & ~FIST & (t < 0.86)) | ((t > 0.86) & (r < 0.045)) | (FIST & (r < 0.007))
sink = (FIST & (r > 0.017)) | (r > 0.05)
KP = groove_cut(M, seed & ~sink, sink)
def uv_near(P, A):
    vv = np.unique(M.F[A].ravel()); return M.UV[vv[np.argmin(np.linalg.norm(M.V[vv] - P, axis=1))]]
E = Editor(M)
for name, A in (('pipe', KP),):
    print(name, 'faces', int(A.sum()), 'bbox', M.V[np.unique(M.F[A])].min(0).round(3), M.V[np.unique(M.F[A])].max(0).round(3))
    rims = E.split(A, name, None, None, caps=False)
    for P in rims:
        c = P.mean(0); pts, tris = cap_loop(P)
        print('  %s rim of %d at %s size %s: %d cap tris on the fist' % (name, len(P), c.round(3), np.ptp(P, axis=0).round(3), len(tris)))
        if STOP == 'cut': continue
        E.add(pts, uv_near(c, ~A), tris, name + '.hole')
    # Tripo left no pipe inside the fist: the two rims, one above the fist and one below, are joined by a short tube, so the
    # pipe is whole when a hand slides along it
    if STOP != 'cut' and len(rims) == 2:
        def ring(P):
            c = P.mean(0); e1 = np.cross(PU, [1.0, 0, 0]); e1 /= np.linalg.norm(e1); e2 = np.cross(PU, e1)
            a = np.arctan2((P - c) @ e2, (P - c) @ e1); o = np.argsort(a); return P[o], a[o]
        (P1, a1), (P2, a2) = ring(rims[0]), ring(rims[1]); n1, n2 = len(P1), len(P2)
        i = j = 0; tris = []
        while i < n1 or j < n2:
            ni, nj = a1[(i + 1) % n1] + (2 * np.pi if i + 1 >= n1 else 0), a2[(j + 1) % n2] + (2 * np.pi if j + 1 >= n2 else 0)
            if j >= n2 or (i < n1 and ni <= nj): tris.append([i % n1, (i + 1) % n1, n1 + j % n2]); i += 1
            else: tris.append([i % n1, n1 + (j + 1) % n2, n1 + j % n2]); j += 1
        pts = np.r_[P1, P2]; tris = np.array(tris)
        t0 = tris[0]; nrm = np.cross(pts[t0[1]] - pts[t0[0]], pts[t0[2]] - pts[t0[0]]); cc = pts[t0].mean(0); rad = (cc - PA) - PU * ((cc - PA) @ PU)
        E.add(pts, uv_near(rims[0].mean(0), A), tris, name + '.lid', flip=bool(nrm @ rad < 0)); print('  the tube inside the fist:', len(tris), 'tris')
M = E.done(); TAG, TAGS = M.tag, M.tags
print('tris now', len(M.F), 'added', len(M.F) - N0, 'pieces', M.nc)
tg = lambda *n: np.isin(TAG, [TAGS[k] for k in n if k in TAGS])
if STOP == 'cut':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import dbgglb
    M0 = Mesh(src); dbgglb.write(M0, [(KP, (230, 40, 40))], out + '/cut.glb'); sys.exit()

# ---- 2. regions
V = M.V; x, y, z = V.T; ax = np.abs(x)
pp = tg('pipe', 'pipe.lid'); ppF = pp[M.F].all(1)
th = np.r_[th, np.full(len(V) - len(th), 0.2)] if len(th) < len(V) else th
SH = {'L': np.array([0.09, 0.75, -0.02]), 'R': np.array([-0.09, 0.75, -0.02])}
EL = {'L': np.array([0.12, 0.61, -0.04]), 'R': np.array([-0.128, 0.62, -0.05])}
WR = {'L': np.array([0.14, 0.485, -0.01]), 'R': np.array([-0.135, 0.67, 0.045])}
HE_ = {'L': np.array([0.145, 0.39, 0.0]), 'R': np.array([-0.12, 0.765, 0.1])}
g2 = face_graph(M); fc2 = g2['fc']; FX, FY, FZ = fc2.T
AF = {}
for s_, sg in (('L', 1), ('R', -1)):
    da = np.minimum(np.minimum(segdist(fc2, EL[s_], WR[s_]), segdist(fc2, WR[s_], HE_[s_])), segdist(fc2, EL[s_] + (SH[s_] - EL[s_]) * 0.35, EL[s_]))
    seed = (da < 0.03) & (FX * sg > 0.095) & ~ppF
    sink = (FX * sg < 0.07) | (FY > 0.775) | (FY < 0.33) | ppF
    A = groove_cut(M, seed & ~sink, sink) & ~ppF; AF[s_] = A
    print('arm', s_, 'faces', int(A.sum()), 'joins', [(len(l), g2['Vw'][l].mean(0).round(3).tolist()) for l in loops_of(M, A)])
armlow = {}
for s_ in 'LR':
    k = np.zeros(len(V), bool); k[M.F[AF[s_]].ravel()] = True; armlow[s_] = k & ~pp
arml = armlow['L'] | armlow['R']
thin = th < 0.02
headm = (((y > 0.815) & (ax < 0.075)) | (y > 0.87) | ((y > 0.74) & (z < -0.055) & (ax < 0.03) & thin)) & ~pp
armup = (ax > 0.07) & (y > 0.58) & (y < 0.79) & ~headm & ~pp & ~arml
low = (y < 0.5) & ~arml & ~pp
panelF = low & (z > 0.03) & (ax < 0.095) & (y > 0.14) & (y < 0.47)
panelB = low & (z < -0.06) & (ax < 0.1) & (y > 0.2) & (y < 0.47)
tatter = low & thin & ~panelF & ~panelB & (y > 0.18) & (ax > 0.085)
leg = low & ~panelF & ~panelB & ~tatter & (y < 0.47)
lens = headm & (z > 0.03) & (y > 0.86) & (y < 0.92)
gather = pp & (y > 0.86)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.49, 0.0]), 'spine': ('hips', [0, 0.58, 0.0]), 'chest': ('spine', [0, 0.68, -0.01]), 'head': ('chest', [0, 0.815, -0.01]),
 'skF': ('hips', [0, 0.48, 0.055]), 'skB': ('hips', [0, 0.48, -0.07]),
}
ends = {'head': [0, 0.98, -0.01], 'skF': [0, 0.15, 0.075], 'skB': [0, 0.22, -0.1]}
for s_ in 'LR':
    J['upperarm' + s_] = ('chest', SH[s_].tolist()); J['forearm' + s_] = ('upperarm' + s_, EL[s_].tolist()); J['hand' + s_] = ('forearm' + s_, WR[s_].tolist()); ends['hand' + s_] = HE_[s_].tolist()
GRIP = PA + PU * 0.742; TOP = PA + PU * 1.0
J['pipe'] = ('chest', GRIP.tolist()); ends['pipe'] = TOP.tolist()       # on the chest, not the hand: the fists close on it (grips), so the arms follow it
LEGJ = {'L': ([0.058, 0.47, 0.0], [0.058, 0.265, -0.005], [0.057, 0.075, -0.03], [0.062, 0, 0.07]), 'R': ([-0.058, 0.47, 0.0], [-0.058, 0.265, -0.005], [-0.057, 0.075, -0.03], [-0.062, 0, 0.07])}
for s_, (a_, b_, c_, d_) in LEGJ.items():
    J['thigh' + s_] = ('hips', a_); J['shin' + s_] = ('thigh' + s_, b_); J['foot' + s_] = ('shin' + s_, c_); ends['foot' + s_] = d_
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a_ = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a_, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a_, a_ + [0, -0.05, 0])); segs.append((n, a_ + [-0.08, 0, 0], a_ + [0.08, 0, 0]))
    elif n == 'chest': segs.append((n, a_, np.array(J['head'][1], float))); segs.append((n, a_ + [-0.08, 0.06, 0], a_ + [0.08, 0.06, 0]))
    elif n == 'spine': segs.append((n, a_, np.array(J['chest'][1], float))); segs.append((n, a_ + [-0.07, 0, 0], a_ + [0.07, 0, 0]))
    else: segs.append((n, a_, np.array(J[kids[0]][1], float)))
    if n.startswith('foot'): segs.append((n, a_, a_ + [0, -0.05, -0.04]))
print({k: int(v.sum()) for k, v in dict(head=headm, armL=armlow['L'], armR=armlow['R'], armup=armup, panelF=panelF, panelB=panelB, tatter=tatter, leg=leg, lens=lens, gather=gather, pipe=pp).items()})
if STOP == 'regions':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import dbgglb
    F_ = lambda m: m[M.F].all(1)
    dbgglb.write(M, [(ppF, (230, 40, 40)), (F_(armlow['L']), (40, 200, 60)), (F_(armlow['R']), (40, 90, 230)), (F_(headm), (240, 220, 60)), (F_(armup), (0, 200, 200)),
        (F_(panelF), (250, 140, 200)), (F_(panelB), (160, 60, 160)), (F_(tatter), (255, 150, 30)), (F_(leg), (120, 60, 20)), (F_(lens), (255, 255, 255))], out + '/reg.glb'); sys.exit()

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'pipe': return pp
    if n == 'skF': return panelF
    if n == 'skB': return panelB
    if n == 'head': return headm
    if n.startswith('hand'): return armlow[n[-1]] & (d < 0.09)
    if n.startswith('forearm'): return armlow[n[-1]]
    if n.startswith('upperarm'): return side & (armup | armlow[n[-1]]) & (d < 0.1)
    if n.startswith('foot'): return leg & side & (y < 0.14)
    if n.startswith('shin'): return leg & side & (y < 0.34)
    if n.startswith('thigh'): return side & (leg | tatter | (low & ~panelF & ~panelB)) & (y < 0.5) & (ax > 0.01)
    ok = ~(headm | leg | arml | pp | panelF | panelB | tatter)
    if n == 'hips': return ok & (y < 0.6)
    if n == 'spine': return ok & (y > 0.48) & (y < 0.72)
    if n == 'chest': return ok & (y > 0.58)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(pp, 'pipe')
# the welded solve runs across the cut (the rim copies share a welded id): the body keeps none of the pipe
W[~pp, ix['pipe']] = 0; lost = ~pp & (W.sum(1) < 1e-6); print('verts left with no weight after taking the pipe off:', int(lost.sum()))
W[lost & (x < 0) & arml, ix['handR']] = 1; W[lost & ~((x < 0) & arml), ix['chest']] = 1
force(headm, 'head')
# the arms: below the armpit the body keeps none of the arm; over the shoulder the arm's share grows with the distance from
# his middle, so the shirt there stretches evenly
sstep = lambda a, b, v: np.clip((v - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((v - a) / (b - a), 0, 1))
flank = ~(arml | armup | pp) & (y < 0.62)
ramp = sstep(0.06, 0.095, ax); share = np.where(arml, 1.0, ramp); share[flank] = 0
for n in ('upperarmL', 'forearmL', 'handL', 'upperarmR', 'forearmR', 'handR'): gone = W[:, ix[n]] * (1 - share); W[:, ix[n]] -= gone; W[:, ix['chest']] += gone
force(leg & (y < 0.04) & (x > 0), 'footL'); force(leg & (y < 0.04) & (x < 0), 'footR')
W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
print('tris', len(M.F))
finish(M, J, ends, W, names, out, [lens, gather, pp], fallback='spine', extra={'grip': GRIP.tolist(), 'pipeTop': TOP.tolist()})
