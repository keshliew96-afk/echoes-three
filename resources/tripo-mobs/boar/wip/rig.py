# The Thorn Boar's rig (from the Gloam Wolf's). usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T; lum = tc.sum(1)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.36, -0.22]), 'spine': ('hips', [0, 0.38, -0.06]), 'chest': ('spine', [0, 0.38, 0.10]),
 'neck1': ('chest', [0, 0.39, 0.21]), 'head': ('neck1', [0, 0.37, 0.29]),
 'earL': ('head', [0.11, 0.49, 0.33]), 'earR': ('head', [-0.11, 0.49, 0.33]),
 'tail1': ('hips', [0, 0.40, -0.38]), 'tail2': ('tail1', [0, 0.30, -0.43]),
 'crestF': ('chest', [0, 0.56, 0.10]), 'crestR': ('spine', [0, 0.52, -0.14]),
}
ends = {'head': [0, 0.27, 0.50], 'earL': [0.18, 0.55, 0.31], 'earR': [-0.18, 0.55, 0.31], 'tail2': [0, 0.17, -0.465],
        'crestF': [0, 0.70, 0.06], 'crestR': [0, 0.63, -0.22]}
for s, sg in (('L', 1), ('R', -1)):
    J['fUpper' + s] = ('chest', [0.12 * sg, 0.29, 0.13]); J['fFore' + s] = ('fUpper' + s, [0.125 * sg, 0.17, 0.105]); J['fCannon' + s] = ('fFore' + s, [0.125 * sg, 0.085, 0.112]); J['fHoof' + s] = ('fCannon' + s, [0.125 * sg, 0.035, 0.12]); ends['fHoof' + s] = [0.125 * sg, 0, 0.17]
    J['hThigh' + s] = ('hips', [0.11 * sg, 0.31, -0.26]); J['hShin' + s] = ('hThigh' + s, [0.11 * sg, 0.19, -0.215]); J['hCannon' + s] = ('hShin' + s, [0.105 * sg, 0.10, -0.30]); J['hHoof' + s] = ('hCannon' + s, [0.105 * sg, 0.035, -0.29]); ends['hHoof' + s] = [0.105 * sg, 0, -0.24]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith(('crest', 'ear', 'fUpper', 'hThigh')) and k != 'tail1']
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.02, -0.12]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck1'][1], float))); segs.append((n, a, a + [0, -0.12, 0.04]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

def big(mask, least):
    lab = M.comps(mask); o = np.zeros(len(V), bool)
    for c in np.unique(lab[lab >= 0]):
        k = lab == c
        if k.sum() >= least: o |= k
    return o
olive = (g > r - 25) & (g > b + 40) & (r > 90)
crest = olive & (y > 0.42) & (ax < 0.11)
ear = big((th < 0.08) & (y > 0.44) & (z > 0.22) & (z < 0.37) & (ax > 0.05) & ~olive, 8)
tusk = (lum > 430) & (z > 0.36) & (y < 0.37)
eye = (r > 190) & (g > 100) & (b < 80) & (r - g > 40) & (z > 0.3)
snout = (z > 0.40) & (y < 0.36)
tail = (z < -0.37) & (ax < 0.07) & (y < 0.43)
headm = ((z > 0.285) & (y > 0.17)) | snout | tusk
headm &= ~ear & ~crest
fleg = (y < 0.155) & (ax > 0.045) & (z > 0.0) & (z < 0.24)
hleg = (y < 0.19) & (ax > 0.035) & (z < -0.16) & (z > -0.37) & ~tail
print({k: int(v.sum()) for k, v in dict(crest=crest, ear=ear, tusk=tusk, eye=eye, head=headm, tail=tail, fleg=fleg, hleg=hleg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' and n[0] in 'fhe' else np.ones(len(V), bool)
    if n.startswith('ear'): return ear & side
    if n == 'crestF': return crest & (z > -0.02)
    if n == 'crestR': return crest & (z <= 0.02)
    if n == 'head': return headm
    if n.startswith('tail'): return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    if n.startswith('fUpper'): return side & ~fleg & ~headm & ~crest & (ax > 0.05) & (d < 0.09) & (y < 0.36) & (z > 0.02) & (z < 0.26)
    if n.startswith('hThigh'): return side & ~hleg & ~tail & ~crest & (ax > 0.04) & (d < 0.1) & (y < 0.4) & (z < -0.14)
    ok = ~(ear | crest | headm | tail | fleg | hleg)
    if n == 'neck1': ok = (ok & (z > 0.12)) | (headm & (z < 0.31) & ~tusk & ~snout)
    if n == 'hips': ok = ok & (z < -0.1)
    if n == 'chest': ok = ok & (z > -0.08)
    if n == 'spine': ok = ok & (z < 0.14) & (z > -0.32)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
W[~crest, ix['crestF']] = 0; W[~crest, ix['crestR']] = 0  # only the thorns ride the crest joints
force(eye | tusk | snout, 'head'); force(headm & (z > 0.34), 'head')
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    force((fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)) & (y < 0.03), n)
finish(M, J, ends, W, names, out, [crest, tusk, eye])
