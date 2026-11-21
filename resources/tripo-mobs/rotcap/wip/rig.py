# The Rotcap's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the foot of the stalk carry the two root legs; sq above them squashes the body (the game's sx, sy); the stalk
# bends at spine and chest (the face is on the stalk); the cap rides its own bone (nod, tilt, spin, swell). Two root arms.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.26, 0.05]), 'sq': ('hips', [0, 0.26, 0.05]),
 'spine': ('sq', [0, 0.32, 0.06]), 'chest': ('spine', [0, 0.42, 0.06]), 'cap': ('chest', [0, 0.55, 0.03]),
}
ends = {'cap': [0, 1.0, 0.0]}
for s, sg in (('L', 1), ('R', -1)):
    J['arm' + s] = ('chest', [0.16 * sg, 0.34, 0.11]); J['fore' + s] = ('arm' + s, [0.25 * sg, 0.29, 0.15]); J['hand' + s] = ('fore' + s, [0.31 * sg, 0.25, 0.17]); ends['hand' + s] = [0.35 * sg, 0.17, 0.2]
    J['thigh' + s] = ('hips', [0.12 * sg, 0.27, 0.05]); J['shin' + s] = ('thigh' + s, [0.155 * sg, 0.15, 0.10]); J['foot' + s] = ('shin' + s, [0.155 * sg, 0.03, 0.05]); J['toe' + s] = ('foot' + s, [0.16 * sg, 0.012, 0.13]); ends['toe' + s] = [0.16 * sg, 0, 0.24]
names = list(J.keys())
segs = []
for n in names:
    if n in ('root', 'hips', 'sq'): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith(('arm', 'thigh'))]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
lab = M.comps(np.ones(len(V), bool)); sizes = np.bincount(lab); main = lab == np.argmax(sizes)
baby = ~main
rr = np.hypot(x, z - 0.06)
capm = ((y > 0.52) | ((y > 0.36) & (rr > 0.21))) & ~baby
spot = (r > 170) & (g > 140) & (b < 110) & (y > 0.55) & (np.abs(r - g) < 70)
arm = (ax > 0.185) & (y > 0.15) & (y < 0.38) & ~capm & (z > 0.0)
leg = (y < 0.12) & ~baby
print({k: int(v.sum()) for k, v in dict(cap=capm, arm=arm, leg=leg, baby=baby, spot=spot).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'cap': return capm
    if n[:4] in ('arm', 'fore', 'hand') or n.startswith(('arm', 'fore', 'hand')): return arm & side
    if n.startswith(('shin', 'foot', 'toe')): return (leg | baby) & side
    if n.startswith('thigh'): return side & ~capm & ~arm & (y < 0.3) & (ax > 0.03)
    ok = ~(capm | arm | baby)
    if n == 'spine': ok = ok & (y < 0.42)
    if n == 'chest': ok = ok & (y > 0.3)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(capm & (y > 0.56), 'cap')
# the stalk: the diffusion lets the cap's many vertices swamp its few, so it is laid by height: spine low, chest up to the
# face, blending into the cap just under the gills
stalk = ~capm & ~arm & ~baby & (y > 0.3)
cw = np.clip((y - 0.46) / 0.08, 0, 1); hw = np.clip((y - 0.30) / 0.12, 0, 1)
W[stalk] = 0; W[stalk, ix['cap']] = cw[stalk]; W[stalk, ix['chest']] = ((1 - cw) * hw)[stalk]; W[stalk, ix['spine']] = ((1 - cw) * (1 - hw))[stalk]
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    force(baby & sd, 'foot' + s); force(leg & sd & (y < 0.075) & (z < 0.12), 'foot' + s); force(leg & sd & (y < 0.075) & (z >= 0.12), 'toe' + s)
finish(M, J, ends, W, names, out, [spot, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
