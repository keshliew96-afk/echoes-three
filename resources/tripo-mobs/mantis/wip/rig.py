# The Spitting Mantis's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# Hips are the mid thorax, where the four walking legs and the wings sit; the pronotum (the long neck-thorax) and the
# head go forward and up from it; the abdomen hangs back as two extras. The raptorial forelegs hang from the pronotum
# as coxa, femur and tibia (extras); the walking legs are 'limb' legs: femur, tibia, tarsus, claw.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.45, 0.07]), 'pron': ('hips', [0, 0.55, 0.19]), 'head': ('pron', [0, 0.785, 0.375]),
 'abd1': ('hips', [0, 0.46, -0.04]), 'abd2': ('abd1', [0, 0.43, -0.25]),
 'antL': ('head', [0.03, 0.88, 0.405]), 'antR': ('head', [-0.03, 0.88, 0.405]),
 'wingL': ('hips', [0.025, 0.585, 0.12]), 'wingR': ('hips', [-0.025, 0.585, 0.12]),
}
ends = {'head': [0, 0.72, 0.45], 'abd2': [0, 0.385, -0.49], 'antL': [0.12, 0.965, 0.37], 'antR': [-0.12, 0.965, 0.37],
        'wingL': [0.03, 0.42, -0.49], 'wingR': [-0.03, 0.42, -0.49]}
for s, sg in (('L', 1), ('R', -1)):
    J['rCoxa' + s] = ('pron', [0.06 * sg, 0.70, 0.315]); J['rFemur' + s] = ('rCoxa' + s, [0.075 * sg, 0.50, 0.325]); J['rTibia' + s] = ('rFemur' + s, [0.11 * sg, 0.72, 0.455]); ends['rTibia' + s] = [0.11 * sg, 0.40, 0.43]
    J['mFemur' + s] = ('hips', [0.055 * sg, 0.375, 0.11]); J['mTibia' + s] = ('mFemur' + s, [0.13 * sg, 0.445, 0.29]); J['mTarsus' + s] = ('mTibia' + s, [0.172 * sg, 0.215, 0.388]); J['mClaw' + s] = ('mTarsus' + s, [0.186 * sg, 0.032, 0.43]); ends['mClaw' + s] = [0.205 * sg, 0, 0.475]
    J['hFemur' + s] = ('hips', [0.085 * sg, 0.38, 0.0]); J['hTibia' + s] = ('hFemur' + s, [0.172 * sg, 0.455, -0.142]); J['hTarsus' + s] = ('hTibia' + s, [0.245 * sg, 0.225, -0.243]); J['hClaw' + s] = ('hTarsus' + s, [0.258 * sg, 0.034, -0.31]); ends['hClaw' + s] = [0.29 * sg, 0, -0.355]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith(('ant', 'wing', 'rCoxa', 'mFemur', 'hFemur', 'abd1'))]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['abd1'][1], float))); segs.append((n, a, np.array(J['pron'][1], float)))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

def big(mask, least):
    lab = M.comps(mask); o = np.zeros(len(V), bool)
    for c in np.unique(lab[lab >= 0]):
        k = lab == c
        if k.sum() >= least: o |= k
    return o
thin = th < 0.035
wing = big(thin & (y > 0.36) & (z < 0.13) & (ax < 0.115) & (y > 0.30 + 0.2 * (z + 0.5)), 40)
ant = (y > 0.872) | big(thin & (y > 0.85) & (ax < 0.05), 4)
eye = (r > 170) & (g > 150) & (b < 90) & (y > 0.76) & (z > 0.34)
headm = ((y > 0.735) & (z > 0.355)) | ((y > 0.70) & (z > 0.40) & (ax < 0.05))
headm &= ~ant
# the walking legs: the thin pieces below the body plus their femurs (verts close to the femur segment)
legL = {}
for k, s, sg in [(k, s, sg) for s, sg in (('L', 1), ('R', -1)) for k in ('m', 'h')]:
    a = np.array(J[k + 'Femur' + s][1]); kn = np.array(J[k + 'Tibia' + s][1])
    ab = kn - a; t = np.clip(((V - a) @ ab) / (ab @ ab), 0, 1); d = np.linalg.norm(V - (a + np.outer(t, ab)), axis=1)
    side = np.sign(x) == sg
    fem = side & (d < 0.03) & (t > 0.2)
    piece = big(thin & side & (y < 0.47) & ((z > 0.08) if k == 'm' else (z < 0.03)) & (z > -0.4) & ((ax > 0.07) | (y < 0.3)), 30)
    legL[k + s] = fem | piece
leg = np.zeros(len(V), bool)
for v in legL.values(): leg |= v
# the raptorial forelegs: in front of the thorax, below the head, off the midline
rap = (z > 0.27) & (y < 0.755) & (y > 0.38) & (ax > 0.025) & ~headm & ~leg
rap &= ~((z < 0.36) & (y > 0.62) & (ax < 0.075))  # the pronotum's own sides
print({k: int(v.sum()) for k, v in dict(wing=wing, ant=ant, eye=eye, head=headm, leg=leg, rap=rap).items()})

def vis_of(n, d):
    s = n[-1]; side = (np.sign(x) == (1 if s == 'L' else -1)) if s in 'LR' else np.ones(len(V), bool)
    if n.startswith('wing'): return wing & side
    if n.startswith('ant'): return ant & side
    if n == 'head': return headm
    if n[0] in 'mh' and n[1:6] in ('Femur', 'Tibia', 'Tarsu') or n[1:5] == 'Claw': return legL[n[0] + s]
    if n.startswith('r') and n[1:5] in ('Coxa', 'Femu', 'Tibi'): return rap & side
    ok = ~(wing | ant | headm | leg | rap)
    if n == 'pron': ok = ok & (z > 0.12)
    if n == 'hips': ok = ok & (z > -0.12) & (z < 0.26)
    if n == 'abd1': ok = ok & (z < 0.08)
    if n == 'abd2': ok = ok & (z < -0.12)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(headm & (y > 0.75), 'head'); force(eye, 'head')
for s, sg in (('L', 1), ('R', -1)):
    force(legL['m' + s] & (y < 0.045), 'mClaw' + s); force(legL['h' + s] & (y < 0.045), 'hClaw' + s)
finish(M, J, ends, W, names, out, [wing, ant, eye], fallback='hips')
