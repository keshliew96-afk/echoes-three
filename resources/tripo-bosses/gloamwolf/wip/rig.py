# The Gloam Wolf's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T; lum = tc.sum(1)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.50, -0.27]), 'spine': ('hips', [0, 0.50, -0.10]), 'chest': ('spine', [0, 0.49, 0.06]),
 'neck1': ('chest', [0, 0.56, 0.18]), 'neck2': ('neck1', [0, 0.63, 0.26]), 'head': ('neck2', [0, 0.66, 0.32]),
 'jaw': ('head', [0, 0.605, 0.365]),
 'earL': ('head', [0.055, 0.73, 0.31]), 'earR': ('head', [-0.055, 0.73, 0.31]),
 'tail1': ('hips', [0, 0.49, -0.40]), 'tail2': ('tail1', [0, 0.36, -0.44]), 'tail3': ('tail2', [0, 0.22, -0.455]),
 'maneF': ('chest', [0, 0.635, 0.13]), 'maneR': ('chest', [0, 0.595, 0.0]),
}
ends = {'head': [0, 0.60, 0.50], 'jaw': [0, 0.578, 0.47], 'earL': [0.065, 0.86, 0.345], 'earR': [-0.065, 0.86, 0.345], 'tail3': [0, 0.08, -0.47],
        'maneF': [0, 0.76, 0.10], 'maneR': [0, 0.72, -0.04]}
for s, sg in (('L', 1), ('R', -1)):
    J['fUpper' + s] = ('chest', [0.08 * sg, 0.47, 0.15]); J['fFore' + s] = ('fUpper' + s, [0.075 * sg, 0.335, 0.085]); J['fCannon' + s] = ('fFore' + s, [0.068 * sg, 0.115, 0.122]); J['fHoof' + s] = ('fCannon' + s, [0.07 * sg, 0.035, 0.14]); ends['fHoof' + s] = [0.08 * sg, 0, 0.205]
    J['hThigh' + s] = ('hips', [0.09 * sg, 0.50, -0.30]); J['hShin' + s] = ('hThigh' + s, [0.10 * sg, 0.355, -0.225]); J['hCannon' + s] = ('hShin' + s, [0.105 * sg, 0.20, -0.365]); J['hHoof' + s] = ('hCannon' + s, [0.105 * sg, 0.04, -0.335]); ends['hHoof' + s] = [0.11 * sg, 0, -0.265]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.02, -0.1]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck1'][1], float))); segs.append((n, a, a + [0, -0.1, 0.06]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

def big(mask, least):
    lab = M.comps(mask); o = np.zeros(len(V), bool)
    for c in np.unique(lab[lab >= 0]):
        k = lab == c
        if k.sum() >= least: o |= k
    return o
bud = (b - g > 12) & (b > r + 6)
backline = 0.592 + np.clip(z - 0.05, 0, 1) * 0.82
mane = big(((th < 0.03) | bud) & (y > backline) & (z > -0.11) & (z < 0.225) & (y > 0.6), 25)
ear = big((th < 0.05) & (y > 0.735) & (z > 0.27) & (z < 0.38) & (ax > 0.02), 30)
tail = ((z < -0.385) & (ax < 0.07) & (y < 0.5)) | (z < -0.43)
mouth = bud & (z > 0.3) & (y < 0.62) & (y > 0.5)
eye = (lum > 520) & (y > 0.6) & (z > 0.3)
claw = (lum > 470) & (y < 0.04)
headm = (z > 0.285) & (y > 0.545 + (z - 0.285) * 0.1) & ~mane
jawm = headm & (z > 0.372) & (y < 0.593) & (lum < 470)
fleg = (y < 0.315) & (ax > 0.025) & (z > 0.02) & (z < 0.26) & ~tail
hleg = (y < 0.34) & (ax > 0.04) & (z < -0.17) & ~tail
print({k: int(v.sum()) for k, v in dict(bud=bud, mane=mane, ear=ear, tail=tail, mouth=mouth, eye=eye, claw=claw, head=headm, jaw=jawm, fleg=fleg, hleg=hleg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' and n[0] in 'fhe' else np.ones(len(V), bool)
    if n.startswith('ear'): return ear & side
    if n == 'maneF': return mane & (z > 0.04)
    if n == 'maneR': return mane & (z <= 0.08)
    if n == 'jaw': return jawm
    if n == 'head': return headm & ~jawm & ~ear
    if n.startswith('tail'): return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    if n.startswith('fUpper'): return side & ~fleg & ~headm & ~mane & (ax > 0.045) & (d < 0.085) & (y < 0.5) & (z > 0.03) & (z < 0.24)
    if n.startswith('hThigh'): return side & ~hleg & ~tail & (ax > 0.04) & (d < 0.1) & (y < 0.52) & (z < -0.17)
    ok = ~(ear | mane | headm | tail | fleg | hleg)
    if n == 'neck2': ok = (ok & (z > 0.17) & (y > 0.5)) | (headm & ~jawm & ~ear & (z < 0.31))
    if n == 'neck1': ok = ok & (z > 0.08)
    if n == 'hips': ok = ok & (z < -0.1)
    if n == 'chest': ok = ok & (z > -0.12)
    if n == 'spine': ok = ok & (z < 0.1) & (z > -0.35)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(eye, 'head'); force(headm & ~jawm & (z > 0.36), 'head'); force(jawm & (z > 0.40), 'jaw')
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    force((fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)) & (y < 0.03), n)
finish(M, J, ends, W, names, out, [mane & bud, mouth, eye])
