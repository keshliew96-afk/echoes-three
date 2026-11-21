# The Furnace Knight's rig. usage: python3 -I rig.py <furnace_knight.glb> <outdir> <thick.npy> <kit dir> [stage]
# A squat knight of riveted kiln iron: a pot helm with a chimney, a furnace grate in the breastplate, a belt with a cloth apron
# front and back, two legs in heavy boots. A sledge rests on his right shoulder, its haft in his right fist. One welded piece:
# Tripo welded the haft through the fist and the sledge's head onto the shoulder plate. The sledge is cut free (it rides on
# its own joint in the right hand), and the left hand can take the haft for two-handed swings.
import sys, os; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop, Editor
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3]); STOP = sys.argv[5] if len(sys.argv) > 5 else ''
N0 = len(M.F)
HA = np.array([-0.298, 0.647, 0.158]); HU = np.array([0.518, 0.557, -0.649]); HU /= np.linalg.norm(HU)     # the haft: pommel end and its way up
HB = HA + HU * 0.33                                                                                        # where the haft meets the head
g = face_graph(M); fc = g['fc']; X, Y, Z = fc.T
d = segdist(fc, HA - HU * 0.03, HB); t = (fc - HA) @ HU; r = np.linalg.norm((fc - HA) - np.outer(t, HU), axis=1)
HC = np.array([-0.11, 0.868, -0.096]); HX = np.array([[0.261, -0.884, -0.388], [0.646, -0.138, 0.75], [0.717, 0.446, -0.535]]); HE = np.array([0.135, 0.095, 0.06])   # the head: a block
q = np.abs((fc - HC) @ HX.T) / HE; qm = q.max(1)
headseed = qm < 0.7
seed = ((d < 0.03) & (t > -0.02) & (t < 0.06)) | ((d < 0.03) & (t > 0.2) & (t < 0.31)) | headseed
lip = (Y < 0.80) & (X > -0.1) & (Z > -0.135) & (Z < 0.0) & (t > 0.28)          # the shoulder plate's raised inner edge and the collar run up under the head
sink = ((r > 0.035) & (t < 0.31)) | ((qm > 1.35) & (r > 0.035)) | (t < -0.05) | lip
KH = groove_cut(M, seed & ~sink, sink)
def uv_near(P, A):
    vv = np.unique(M.F[A].ravel()); return M.UV[vv[np.argmin(np.linalg.norm(M.V[vv] - P, axis=1))]]
E = Editor(M)
for name, A in (('sledge', KH),):
    print(name, 'faces', int(A.sum()), 'bbox', M.V[np.unique(M.F[A])].min(0).round(3), M.V[np.unique(M.F[A])].max(0).round(3))
    rims = E.split(A, name, None, None, caps=False)
    for P in rims:
        c = P.mean(0); pts, tris = cap_loop(P)
        print('  %s rim of %d at %s size %s: %d cap tris each side' % (name, len(P), c.round(3), np.ptp(P, axis=0).round(3), len(tris)))
        if STOP == 'cut': continue
        E.add(pts, uv_near(c, ~A), tris, name + '.hole'); E.add(pts, uv_near(c, A), tris, name + '.lid', flip=True)
M = E.done(); TAG, TAGS = M.tag, M.tags
print('tris now', len(M.F), 'added', len(M.F) - N0, 'pieces', M.nc)
tg = lambda *n: np.isin(TAG, [TAGS[k] for k in n if k in TAGS])
if STOP == 'cut':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import dbgglb
    M0 = Mesh(src); dbgglb.write(M0, [(KH, (230, 40, 40))], out + '/cut.glb'); sys.exit()

# ---- 2. regions
V = M.V; x, y, z = V.T; ax = np.abs(x)
sl = tg('sledge', 'sledge.lid'); slF = sl[M.F].all(1)
th = np.r_[th, np.full(len(V) - len(th), 0.2)] if len(th) < len(V) else th
SH = {'L': np.array([0.18, 0.72, -0.01]), 'R': np.array([-0.185, 0.72, -0.01])}
EL = {'L': np.array([0.238, 0.565, -0.005]), 'R': np.array([-0.265, 0.585, 0.02])}
WR = {'L': np.array([0.262, 0.45, 0.03]), 'R': np.array([-0.245, 0.69, 0.06])}
HE_ = {'L': np.array([0.27, 0.33, 0.05]), 'R': np.array([-0.235, 0.745, 0.12])}
g2 = face_graph(M); fc2 = g2['fc']; FX, FY, FZ = fc2.T
AF = {}
for s_, sg in (('L', 1), ('R', -1)):
    da = np.minimum(np.minimum(segdist(fc2, EL[s_], WR[s_]), segdist(fc2, WR[s_], HE_[s_])), segdist(fc2, EL[s_] + (SH[s_] - EL[s_]) * 0.4, EL[s_]))
    seed = (da < 0.035) & (FX * sg > 0.2) & ~slF
    sink = (FX * sg < 0.13) | (FY > 0.79) | (FY < 0.3) | slF
    A = groove_cut(M, seed & ~sink, sink) & ~slF; AF[s_] = A
    print('arm', s_, 'faces', int(A.sum()), 'joins', [(len(l), g2['Vw'][l].mean(0).round(3).tolist()) for l in loops_of(M, A)])
armlow = {}
for s_ in 'LR':
    k = np.zeros(len(V), bool); k[M.F[AF[s_]].ravel()] = True; armlow[s_] = k & ~sl
arml = armlow['L'] | armlow['R']
thin = th < 0.025
headm = (((y > 0.775) & (ax < 0.13)) | (y > 0.9)) & ~sl
armup = (ax > 0.15) & (y > 0.56) & (y < 0.8) & ~headm & ~sl & ~arml
low = (y < 0.5) & ~arml & ~sl
panelF = low & (z > 0.05) & (ax < 0.105) & (y > 0.15) & (y < 0.48) & (thin | (y > 0.4))
panelB = low & (z < -0.05) & (ax < 0.12) & (y > 0.15) & (y < 0.48) & (thin | (y > 0.4))
tatter = low & thin & ~panelF & ~panelB & (y > 0.18) & (ax > 0.1)
leg = low & ~panelF & ~panelB & ~tatter & (y < 0.4)
visor = headm & (z > 0.04) & (y > 0.8) & (y < 0.87)
grate = (z > 0.07) & (ax < 0.1) & (y > 0.565) & (y < 0.705) & ~sl
print({k: int(v.sum()) for k, v in dict(head=headm, armL=armlow['L'], armR=armlow['R'], armup=armup, panelF=panelF, panelB=panelB, tatter=tatter, leg=leg, visor=visor, grate=grate, sledge=sl).items()})
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.42, 0.0]), 'spine': ('hips', [0, 0.53, 0.0]), 'chest': ('spine', [0, 0.62, 0.0]), 'head': ('chest', [0, 0.785, -0.01]),
 'skF': ('hips', [0, 0.47, 0.095]), 'skB': ('hips', [0, 0.47, -0.1]),
}
ends = {'head': [0, 0.98, -0.02], 'skF': [0, 0.17, 0.13], 'skB': [0, 0.2, -0.14]}
for s_ in 'LR':
    J['upperarm' + s_] = ('chest', SH[s_].tolist()); J['forearm' + s_] = ('upperarm' + s_, EL[s_].tolist()); J['hand' + s_] = ('forearm' + s_, WR[s_].tolist()); ends['hand' + s_] = HE_[s_].tolist()
GRIP = HA + HU * 0.13
J['sledge'] = ('chest', GRIP.tolist()); ends['sledge'] = HC.tolist()       # on the chest, not the hand: the fists close on it (grips), so the arms follow it
LEGJ = {'L': ([0.105, 0.38, 0.0], [0.135, 0.25, 0.005], [0.147, 0.085, -0.01], [0.165, 0, 0.14]), 'R': ([-0.1, 0.38, 0.0], [-0.115, 0.25, 0.005], [-0.117, 0.085, -0.01], [-0.13, 0, 0.14])}
for s_, (a_, b_, c_, d_) in LEGJ.items():
    J['thigh' + s_] = ('hips', a_); J['shin' + s_] = ('thigh' + s_, b_); J['foot' + s_] = ('shin' + s_, c_); ends['foot' + s_] = d_
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a_ = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a_, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a_, a_ + [0, -0.05, 0])); segs.append((n, a_ + [-0.12, 0, 0], a_ + [0.12, 0, 0]))
    elif n == 'chest': segs.append((n, a_, np.array(J['head'][1], float))); segs.append((n, a_ + [-0.15, 0.1, 0], a_ + [0.15, 0.1, 0]))
    elif n == 'spine': segs.append((n, a_, np.array(J['chest'][1], float))); segs.append((n, a_ + [-0.13, 0, 0], a_ + [0.13, 0, 0]))
    else: segs.append((n, a_, np.array(J[kids[0]][1], float)))
    if n.startswith('foot'): segs.append((n, a_, a_ + [0, -0.06, -0.08]))
if STOP == 'regions':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import dbgglb
    F_ = lambda m: m[M.F].all(1)
    dbgglb.write(M, [(slF, (230, 40, 40)), (F_(armlow['L']), (40, 200, 60)), (F_(armlow['R']), (40, 90, 230)), (F_(headm), (240, 220, 60)), (F_(armup), (0, 200, 200)),
        (F_(panelF), (250, 140, 200)), (F_(panelB), (160, 60, 160)), (F_(tatter), (255, 150, 30)), (F_(leg), (120, 60, 20)), (F_(visor), (255, 255, 255)), (F_(grate), (255, 0, 255))], out + '/reg.glb'); sys.exit()

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'sledge': return sl
    if n == 'skF': return panelF
    if n == 'skB': return panelB
    if n == 'head': return headm
    if n.startswith('hand'): return armlow[n[-1]] & (d < 0.1)
    if n.startswith('forearm'): return armlow[n[-1]]
    if n.startswith('upperarm'): return side & (armup | armlow[n[-1]]) & (d < 0.14)
    if n.startswith('foot'): return leg & side & (y < 0.16)
    if n.startswith('shin'): return leg & side & (y < 0.33)
    if n.startswith('thigh'): return side & (leg | tatter | (low & ~panelF & ~panelB)) & (y < 0.47) & (ax > 0.02)
    ok = ~(headm | leg | arml | sl | panelF | panelB | tatter)
    if n == 'hips': return ok & (y < 0.56)
    if n == 'spine': return ok & (y > 0.44) & (y < 0.66)
    if n == 'chest': return ok & (y > 0.52)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(sl, 'sledge')
# the welded solve runs across the cut (the rim copies share a welded id): the body keeps none of the sledge
W[~sl, ix['sledge']] = 0; lost = ~sl & (W.sum(1) < 1e-6); print('verts left with no weight after taking the sledge off:', int(lost.sum()))
W[lost & (x < 0) & arml, ix['handR']] = 1; W[lost & ~((x < 0) & arml), ix['chest']] = 1
force(headm, 'head')
# the arms: below the armpit the body keeps none of the arm; over the shoulder the arm's share grows with the distance from
# his middle, so the plate there stretches evenly (the Sluice Warden's rule)
sstep = lambda a, b, v: np.clip((v - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((v - a) / (b - a), 0, 1))
flank = ~(arml | armup | sl) & (y < 0.6)
ramp = sstep(0.14, 0.2, ax); share = np.where(arml, 1.0, ramp); share[flank] = 0
for n in ('upperarmL', 'forearmL', 'handL', 'upperarmR', 'forearmR', 'handR'): gone = W[:, ix[n]] * (1 - share); W[:, ix[n]] -= gone; W[:, ix['chest']] += gone
torso = ~(headm | arml | armup | sl) & (y > 0.56) & (ax < 0.15); force(torso, 'chest')        # the furnace is one iron box: he bends at the belt
force(leg & (y < 0.05) & (x > 0), 'footL'); force(leg & (y < 0.05) & (x < 0), 'footR')
W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
print('tris', len(M.F))
finish(M, J, ends, W, names, out, [visor, grate, sl], fallback='spine', extra={'grip': GRIP.tolist(), 'sledgeHead': HC.tolist()})
