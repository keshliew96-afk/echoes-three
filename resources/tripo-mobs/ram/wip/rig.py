# The Barrow Ram's rig (from the Thorn Boar's). usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A heavy mossy ram, a bone skull under two huge curled horns hung with iron rings, short stout legs on dark hooves;
# nose to +z. Trunk: hips, spine, chest, neck and head (the head carries both horns); a tail tuft. The legs are the
# boar's four-bone legs (upper, fore, cannon, hoof and thigh, shin, cannon, hoof). Mask x: the horns (the indigo guard
# tell). The eyes are painted in the texture only, so no mask holds them.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.5, -0.3]), 'spine': ('hips', [0, 0.55, -0.1]), 'chest': ('spine', [0, 0.55, 0.08]),
 'neck1': ('chest', [0, 0.62, 0.17]), 'head': ('neck1', [0, 0.72, 0.25]),
 'tail1': ('hips', [0, 0.62, -0.44]),
}
ends = {'head': [0, 0.62, 0.5], 'tail1': [0, 0.44, -0.5]}
for s, sg in (('L', 1), ('R', -1)):
    J['fUpper' + s] = ('chest', [0.11 * sg, 0.40, 0.04]); J['fFore' + s] = ('fUpper' + s, [0.105 * sg, 0.26, 0.035]); J['fCannon' + s] = ('fFore' + s, [0.12 * sg, 0.13, 0.06]); J['fHoof' + s] = ('fCannon' + s, [0.125 * sg, 0.045, 0.075]); ends['fHoof' + s] = [0.125 * sg, 0, 0.17]
    J['hThigh' + s] = ('hips', [0.11 * sg, 0.44, -0.30]); J['hShin' + s] = ('hThigh' + s, [0.10 * sg, 0.28, -0.36]); J['hCannon' + s] = ('hShin' + s, [0.09 * sg, 0.17, -0.40]); J['hHoof' + s] = ('hCannon' + s, [0.11 * sg, 0.045, -0.37]); ends['hHoof' + s] = [0.11 * sg, 0, -0.29]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith(('fUpper', 'hThigh')) and k != 'tail1']
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.12, -0.14]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck1'][1], float))); segs.append((n, a, a + [0, -0.18, 0.1]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float))); segs.append((n, a, a + [0, -0.2, 0]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

horn = (r < 140) & (r > g + 8) & (g > b) & (y > 0.5) & (ax > 0.1) & (z > 0.08)
headm = (y > 0.5) & ((z > 0.27) | ((ax > 0.15) & (z > 0.1)) | ((ax > 0.1) & (z > 0.06) & horn)) | ((y > 0.42) & (z > 0.33))
horn &= headm
tail = (z < -0.42) & (y > 0.42) & (ax < 0.12)
fleg = (y < 0.29) & (ax > 0.03) & (z > -0.12) & (z < 0.25)
hleg = (y < 0.29) & (ax > 0.02) & (z < -0.2)
print({k: int(v.sum()) for k, v in dict(horn=horn, head=headm, tail=tail, fleg=fleg, hleg=hleg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'head': return headm
    if n.startswith('tail'): return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    if n.startswith('fUpper'): return side & ~fleg & ~headm & (ax > 0.03) & (d < 0.1) & (y < 0.46) & (z > -0.1) & (z < 0.22)
    if n.startswith('hThigh'): return side & ~hleg & ~tail & (ax > 0.03) & (d < 0.1) & (y < 0.48) & (z < -0.18)
    ok = ~(headm | tail | fleg | hleg)
    if n == 'neck1': ok = (ok & (z > 0.1)) | (headm & (z < 0.3) & ~horn)
    if n == 'hips': ok = ok & (z < -0.1)
    if n == 'chest': ok = ok & (z > -0.1)
    if n == 'spine': ok = ok & (z < 0.16) & (z > -0.34)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(horn | (headm & (z > 0.3)), 'head')
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    force((fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)) & (y < 0.035), n)
finish(M, J, ends, W, names, out, [horn, np.zeros(len(V), bool), np.zeros(len(V), bool)])
