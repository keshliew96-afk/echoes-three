# The Thornling's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips carry the two root legs; sq on them squashes the body (the game's sx, sy); the bramble body bends at spine; the
# big head on its own bone; the crown (the bud's stem) and the bud (the game's tell, which blooms) on top; two thin
# root arms with claws.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x)
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.2, 0.04]), 'sq': ('hips', [0, 0.2, 0.04]),
 'spine': ('sq', [0, 0.3, 0.03]), 'head': ('spine', [0, 0.47, 0.02]), 'crown': ('head', [0, 0.78, -0.01]), 'bud': ('crown', [0.02, 0.87, -0.02]),
}
ends = {'bud': [0.04, 1.0, -0.03]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('spine', m([0.11, 0.39, 0.04])); J['fore' + s] = ('arm' + s, m([0.19, 0.31, 0.02])); J['hand' + s] = ('fore' + s, m([0.24, 0.22, 0.045])); ends['hand' + s] = m([0.255, 0.15, 0.06])
    J['thigh' + s] = ('hips', m([0.07, 0.15, 0.04])); J['shin' + s] = ('thigh' + s, m([0.09, 0.085, 0.05])); J['foot' + s] = ('shin' + s, m([0.1, 0.03, 0.045])); J['toe' + s] = ('foot' + s, m([0.105, 0.012, 0.11])); ends['toe' + s] = m([0.11, 0, 0.16])
names = list(J.keys())
segs = []
for n in names:
    if n in ('root', 'hips', 'sq'): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and not k.startswith(('arm', 'thigh'))]
    segs.append((n, a, np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)))
lab = M.comps(th < 0.025)
arm = np.zeros(len(V), bool)
for c in np.unique(lab[th < 0.025]):
    k = lab == c; P = V[k]
    if k.sum() > 50 and np.abs(P[:, 0]).max() > 0.24 and P[:, 1].max() < 0.45 and P[:, 1].min() > 0.12: arm |= k
arm |= (ax > 0.2) & (y > 0.12) & (y < 0.42)
budm = (y > 0.86)
crownm = (y > 0.77) & (ax < 0.07) & (np.abs(z + 0.01) < 0.08) & ~budm
headm = (y > 0.5) & ~arm & ~budm & ~crownm
leg = (y < 0.13) & ~arm
print({k: int(v.sum()) for k, v in dict(arm=arm, bud=budm, crown=crownm, head=headm, leg=leg).items()})
def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'bud': return budm
    if n == 'crown': return crownm
    if n == 'head': return headm | ((y > 0.44) & ~arm)
    if n.startswith(('arm', 'fore', 'hand')): return arm & side
    if n.startswith(('shin', 'foot', 'toe')): return leg & side
    if n.startswith('thigh'): return side & ~arm & (y < 0.2) & (ax > 0.02)
    ok = ~(arm | budm | crownm | headm)
    if n == 'spine': ok = ok & (y > 0.18)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(budm, 'bud'); force(crownm & (y > 0.8), 'crown'); force(headm & (y > 0.53), 'head')
# the body: spine above, sq below, blended by height; the neck blends into the head
body = ~(arm | budm | crownm) & (y >= 0.13) & (y <= 0.53)
hw = np.clip((y - 0.46) / 0.07, 0, 1); sw = np.clip((y - 0.18) / 0.14, 0, 1)
W[body] = 0; W[body, ix['head']] = hw[body]; W[body, ix['spine']] = ((1 - hw) * sw)[body]; W[body, ix['sq']] = ((1 - hw) * (1 - sw))[body]
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    force(leg & sd & (y < 0.05) & (z < 0.1), 'foot' + s); force(leg & sd & (y < 0.05) & (z >= 0.1), 'toe' + s)
finish(M, J, ends, W, names, out, [budm, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='spine')
