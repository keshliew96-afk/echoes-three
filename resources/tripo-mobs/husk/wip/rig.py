# The Hollow Husk's rig (a hound: from the Gloam Wolf's). usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T; lum = tc.sum(1)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.42, -0.27]), 'spine': ('hips', [0, 0.45, -0.08]), 'chest': ('spine', [0, 0.43, 0.08]),
 'neck1': ('chest', [0, 0.45, 0.17]), 'neck2': ('neck1', [0, 0.48, 0.22]), 'head': ('neck2', [0, 0.50, 0.27]),
 'jaw': ('head', [0, 0.457, 0.372]),
 'earL': ('head', [0.05, 0.565, 0.255]), 'earR': ('head', [-0.05, 0.565, 0.255]),
 'tail1': ('hips', [0, 0.45, -0.38]), 'tail2': ('tail1', [0, 0.36, -0.44]), 'tail3': ('tail2', [0, 0.27, -0.47]),
}
ends = {'head': [0, 0.45, 0.50], 'jaw': [0, 0.405, 0.47], 'earL': [0.085, 0.64, 0.265], 'earR': [-0.085, 0.64, 0.265], 'tail3': [0, 0.17, -0.50]}
for s, sg in (('L', 1), ('R', -1)):
    J['fUpper' + s] = ('chest', [0.075 * sg, 0.38, 0.08]); J['fFore' + s] = ('fUpper' + s, [0.075 * sg, 0.25, 0.075]); J['fCannon' + s] = ('fFore' + s, [0.075 * sg, 0.11, 0.105]); J['fHoof' + s] = ('fCannon' + s, [0.078 * sg, 0.035, 0.15]); ends['fHoof' + s] = [0.08 * sg, 0, 0.215]
    J['hThigh' + s] = ('hips', [0.075 * sg, 0.40, -0.29]); J['hShin' + s] = ('hThigh' + s, [0.08 * sg, 0.29, -0.25]); J['hCannon' + s] = ('hShin' + s, [0.08 * sg, 0.21, -0.345]); J['hHoof' + s] = ('hCannon' + s, [0.08 * sg, 0.035, -0.34]); ends['hHoof' + s] = [0.08 * sg, 0, -0.285]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith(('ear', 'fUpper', 'hThigh', 'jaw')) and k != 'tail1']
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
viol = (b - g > 30) & (b > 100)
ear = big((th < 0.035) & (y > 0.54) & (z > 0.2) & (z < 0.33) & (ax > 0.03), 10)
tail = (((z < -0.385) & (ax < 0.07) & (y < 0.47)) | (z < -0.43)) & (y > 0.1)
eye = viol & (z > 0.3) & (y > 0.47)
headm = (((z > 0.27) & (y > 0.38)) | ((z > 0.24) & (y > 0.47))) & ~ear
gape = 0.468 - (z - 0.375) * 0.65
jawm = headm & (z > 0.372) & (y < gape)
fleg = (y < 0.30) & (ax > 0.025) & (z > 0.0) & (z < 0.25) & ~tail
hleg = (y < 0.30) & (ax > 0.025) & (z < -0.19) & (z > -0.40) & ~tail
print({k: int(v.sum()) for k, v in dict(viol=viol, ear=ear, tail=tail, eye=eye, head=headm, jaw=jawm, fleg=fleg, hleg=hleg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' and n[0] in 'fhe' else np.ones(len(V), bool)
    if n.startswith('ear'): return ear & side
    if n == 'jaw': return jawm
    if n == 'head': return headm & ~jawm
    if n.startswith('tail'): return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    if n.startswith('fUpper'): return side & ~fleg & ~headm & (ax > 0.04) & (d < 0.08) & (y < 0.42) & (z > 0.0) & (z < 0.2)
    if n.startswith('hThigh'): return side & ~hleg & ~tail & (ax > 0.035) & (d < 0.09) & (y < 0.45) & (z < -0.18)
    ok = ~(ear | headm | tail | fleg | hleg)
    if n == 'neck2': ok = (ok & (z > 0.16) & (y > 0.38)) | (headm & ~jawm & (z < 0.30))
    if n == 'neck1': ok = ok & (z > 0.08)
    if n == 'hips': ok = ok & (z < -0.1)
    if n == 'chest': ok = ok & (z > -0.12)
    if n == 'spine': ok = ok & (z < 0.12) & (z > -0.35)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(eye, 'head'); force(headm & ~jawm & (z > 0.34), 'head'); force(jawm & (z > 0.40), 'jaw')
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    force((fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)) & (y < 0.03), n)
finish(M, J, ends, W, names, out, [viol, jawm, eye])
