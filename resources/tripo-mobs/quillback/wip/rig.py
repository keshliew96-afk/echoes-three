# The Quillback's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips and sq sit at the ball's centre and hold no skin: hips leans and carries the legs (they never roll), sq squashes
# (the game scales its body: coil, launch, thud), ball spins for the roll; chest and rump curl the coat round, the head tucks.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T
C = [0, 0.37, -0.03]
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', C), 'sq': ('hips', C), 'ball': ('sq', [0, 0.29, 0.015]),
 'chest': ('ball', [0, 0.36, 0.08]), 'head': ('chest', [0, 0.30, 0.25]),
 'rump': ('ball', [0, 0.36, -0.13]),
}
ends = {'head': [0, 0.28, 0.50], 'rump': [0, 0.24, -0.46]}
for s, sg in (('L', 1), ('R', -1)):
    J['fThigh' + s] = ('hips', [0.17 * sg, 0.175, 0.13]); J['fShin' + s] = ('fThigh' + s, [0.185 * sg, 0.10, 0.12]); J['fFoot' + s] = ('fShin' + s, [0.185 * sg, 0.032, 0.165]); J['fToe' + s] = ('fFoot' + s, [0.185 * sg, 0.012, 0.21]); ends['fToe' + s] = [0.185 * sg, 0, 0.255]
    J['hThigh' + s] = ('hips', [0.17 * sg, 0.175, -0.175]); J['hShin' + s] = ('hThigh' + s, [0.185 * sg, 0.10, -0.16]); J['hFoot' + s] = ('hShin' + s, [0.185 * sg, 0.032, -0.195]); J['hToe' + s] = ('hFoot' + s, [0.185 * sg, 0.012, -0.15]); ends['hToe' + s] = [0.185 * sg, 0, -0.10]
names = list(J.keys())
segs = []
for n in names:
    if n in ('root', 'hips', 'sq'): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and k not in ('rump', 'chest') or (n == 'chest' and k == 'head')]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'ball': c = np.array(C, float); segs.append((n, c + [0, 0, -0.08], c + [0, 0, 0.08])); segs.append((n, c, c + [0, 0.2, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a, a + [0, 0.25, 0.05]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

headm = (z > 0.27) & (y < 0.53) & (y > 0.08)
headm |= (z > 0.36) & (y < 0.56)
claw = (y < 0.026) & (ax > 0.1)
fleg = (y < 0.15) & (ax > 0.095) & (z > 0.04) & (z < 0.3)
hleg = (y < 0.15) & (ax > 0.095) & (z < -0.04) & (z > -0.3)
print({k: int(v.sum()) for k, v in dict(head=headm, fleg=fleg, hleg=hleg, claw=claw).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'head': return headm
    if n[1:] in ('ShinL', 'ShinR', 'FootL', 'FootR', 'ToeL', 'ToeR'): return (fleg if n[0] == 'f' else hleg) & side
    if n[1:6] == 'Thigh': return side & ~headm & ~(fleg | hleg) & (ax > 0.08) & (d < 0.07) & (y < 0.24)
    ok = ~(headm | fleg | hleg)
    if n == 'chest': ok = ok & (z > -0.06)
    if n == 'rump': ok = ok & (z < -0.0)
    if n == 'ball': ok = ok & (z > -0.24) & (z < 0.2)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(headm & (z > 0.33), 'head')
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    force(fleg & sd & claw, 'fToe' + s); force(hleg & sd & claw, 'hToe' + s)
tip = (r > 215) & (g > 185) & (b > 120) & (y > 0.3)  # the pale quill tips: the game's indigo tell glows on them
finish(M, J, ends, W, names, out, [tip, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='ball')
