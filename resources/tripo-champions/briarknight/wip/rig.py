# The Briar Knight's rig. usage: python3 -I rig.py <shieldless.glb> <outdir> <thick.npy> <kit dir>
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3])
ZS = 0.05                                    # the model stands 0.05 behind its own middle: bring the hips over the root
M.V[:, 2] += ZS; M.reindex(); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x)
_lo = np.where(M.comp != M.main, V[:, 1], 9).argmin(); swordm = M.comp == M.comp[_lo]   # the sword came loose from the hand when the shield went: its own piece (the left arm is another)
SEAT = np.array([0.0, 0.012, -0.03]); M.V[swordm] += SEAT; V = M.V; x, y, z = V.T; ax = np.abs(x)   # the guard only touched the fist's front corner: seat the sword into the fist, or a gap opens when the hand turns
sv = V[swordm]; tip = sv[sv[:, 1].argmin()]; print('sword verts', int(swordm.sum()), 'tip', tip.round(3), 'top', sv[:, 1].max().round(3))
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.42, 0.0]), 'spine': ('hips', [0, 0.52, 0.0]), 'chest': ('spine', [0, 0.63, 0.0]), 'head': ('chest', [0, 0.80, 0.0]),
 'upperarmL': ('chest', [0.175, 0.745, 0.005]), 'forearmL': ('upperarmL', [0.2, 0.60, -0.035]),
 'upperarmR': ('chest', [-0.175, 0.745, 0.005]), 'forearmR': ('upperarmR', [-0.2, 0.60, -0.035]), 'handR': ('forearmR', [-0.215, 0.485, 0.03]),
 'sword': ('handR', [-0.215, 0.467, 0.07]),
 'tabF1': ('hips', [0, 0.45, 0.10]), 'tabF2': ('tabF1', [0, 0.30, 0.105]),
 'tabB1': ('hips', [0, 0.47, -0.09]), 'tabB2': ('tabB1', [0, 0.30, -0.10]),
}
ends = {'head': [0, 0.93, 0.01], 'forearmL': [0.215, 0.45, 0.09], 'handR': [-0.215, 0.45, 0.09], 'sword': list(map(float, tip)),
        'tabF2': [0, 0.13, 0.10], 'tabB2': [0, 0.13, -0.115]}
for s, sg in (('L', 1), ('R', -1)):
    J['thigh' + s] = ('hips', [0.09 * sg, 0.40, 0.005]); J['shin' + s] = ('thigh' + s, [0.122 * sg, 0.225, -0.02]); J['foot' + s] = ('shin' + s, [0.135 * sg, 0.07, -0.03]); ends['foot' + s] = [0.15 * sg, 0, 0.105]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, -0.04, 0])); segs.append((n, a + [-0.08, 0, 0], a + [0.08, 0, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.12, 0.08, 0], a + [0.12, 0.08, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float)))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
    if n.startswith('foot'): segs.append((n, a, a + [0, -0.05, -0.05]))
# ---- regions
shield = np.zeros(len(V), bool)            # no shield since V3: the left arm is a mirror of the right, with an empty fist
thin = th < 0.028
green = (tc[:, 1] > tc[:, 0] + 4) & (tc[:, 1] > tc[:, 2] + 12)
clothF = (((ax < 0.105) & (z > 0.072) & (y > 0.10) & (y < 0.44)) | (thin & green & (z > 0.045) & (ax < 0.17) & (y > 0.08) & (y < 0.47))) & ~swordm
clothB = (((ax < 0.07) & (z < -0.075) & (y > 0.10) & (y < 0.47)) | (thin & green & (z < -0.075) & (ax < 0.19) & (y > 0.08) & (y < 0.50))) & ~swordm
cloth = clothF | clothB
headm = ((y > 0.80) & (ax < 0.088)) | (y > 0.89)
leg = (y < 0.37) & (ax > 0.055) & ~cloth & ~swordm & ~shield
# an arm below the armpit: the cheapest cut between the arm's core and the body's core, so the hip plates,
# rags and the vines that bridge from arm to hip stay on the body
from rigkit import groove_cut, face_graph, segdist
g = face_graph(M); fc = g['fc']; armlow = np.zeros(len(V), bool); fsw = swordm[M.F].any(1)
for sg in (1, -1):
    sh = np.array([0.175 * sg, 0.745, 0.005]); el = np.array([0.2 * sg, 0.60, -0.035]); wr = np.array([0.215 * sg, 0.47, 0.035])
    da = np.minimum(segdist(fc, el, wr), segdist(fc, el + (sh - el) * 0.25, el))
    src = (da < 0.035) & (fc[:, 1] < 0.64)
    sink = (np.abs(fc[:, 0]) < 0.105) | (fc[:, 1] > 0.70) | (fc[:, 1] < 0.34) | (fc[:, 0] * sg < 0) | fsw
    A = groove_cut(M, src & ~sink, sink); k = np.zeros(len(V), bool); k[M.F[A].ravel()] = True; armlow |= k
    print('arm', 'L' if sg > 0 else 'R', 'faces', int(A.sum()), 'verts', int(k.sum()), 'y', V[k, 1].min().round(3), V[k, 1].max().round(3), 'x', np.abs(V[k, 0]).min().round(3))
armlow |= shield; leg &= ~armlow; cloth &= ~armlow; clothF &= ~armlow; clothB &= ~armlow
armup = (ax > 0.118) & (y > 0.56) & (y < 0.89) & ~headm & ~swordm
visor = (tc[:, 0] > 150) & (tc[:, 1] > 150) & (tc[:, 2] < 120) & (y > 0.8) & (z > 0.03)
print({k: int(v.sum()) for k, v in dict(shield=shield, clothF=clothF, clothB=clothB, head=headm, leg=leg, armlow=armlow, armup=armup, visor=visor).items()})
def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'sword': return swordm
    if n.startswith('tabF'): return clothF
    if n.startswith('tabB'): return clothB
    if n == 'head': return headm & ~swordm
    if n[:4] in ('thig', 'shin', 'foot'): return leg & side if n[:4] != 'thig' else side & ~cloth & ~swordm & ~armlow & (y < 0.46) & (ax > 0.03) & (d < 0.12)
    if n.startswith('forearm') or n.startswith('hand'): return armlow & side
    if n.startswith('upperarm'): return side & (armup | (armlow & (y > 0.56))) & (d < 0.13)
    ok = ~(cloth | headm | leg | armlow | swordm)
    if n == 'hips': ok = ok & (y < 0.58)
    if n == 'chest': ok = ok & (y > 0.5)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(swordm, 'sword')
force(headm & (y > 0.825), 'head')
force(leg & (y < 0.05) & (x > 0), 'footL'); force(leg & (y < 0.05) & (x < 0), 'footR')
# the fist only: the cuff's thorns behind the wrist stay with the forearm, or they swing like a second blade when the hand turns
fist = armlow & (x < 0) & (segdist(V, np.array([-0.215, 0.485, 0.03]), np.array([-0.215, 0.45, 0.095])) < 0.05) & (y < 0.505)
print('fist', int(fist.sum())); force(fist, 'handR'); force(armlow & (x < 0) & (y < 0.50) & ~fist, 'forearmR')
finish(M, J, ends, W, names, out, [visor, swordm, shield], fallback='spine', extra={'zshift': ZS})
