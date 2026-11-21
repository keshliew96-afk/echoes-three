# The Briar Wasp's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# hips at the thorax carry the hover and the lean; sq on them squashes the body (the game's sx, sy, sz); the head and its
# two antennae; the abdomen in three bones and the stinger on its own (the game's curl, hook, sting and ext); four wings
# from their roots (beat, raise, sweep); four legs a side in two bones each, hanging.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.29, 0.15]), 'sq': ('hips', [0, 0.29, 0.15]), 'head': ('sq', [0, 0.31, 0.31]),
 'g0': ('sq', [0, 0.25, 0.045]), 'g1': ('g0', [0, 0.228, -0.07]), 'g2': ('g1', [0, 0.215, -0.175]), 'gs': ('g2', [0, 0.205, -0.268]),
}
ends = {'head': [0, 0.3, 0.5], 'gs': [0, 0.182, -0.49]}
# legs measured on the right side (thin pieces traced foot to body): hip, knee, foot
LEGS = [((0.045, 0.195, 0.255), (0.08, 0.14, 0.31), (0.07, 0.01, 0.315)),
        ((0.095, 0.212, 0.232), (0.135, 0.14, 0.241), (0.13, 0.0, 0.245)),
        ((0.092, 0.195, 0.165), (0.142, 0.135, 0.118), (0.127, 0.0, 0.11)),
        ((0.083, 0.195, 0.105), (0.10, 0.13, 0.035), (0.077, 0.0, 0.02))]
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['ant' + s] = ('head', m([0.035, 0.37, 0.41])); ends['ant' + s] = m([0.13, 0.45, 0.335])
    J['wf' + s] = ('sq', m([0.065, 0.317, 0.227])); ends['wf' + s] = m([0.489, 0.48, -0.105])
    J['wh' + s] = ('sq', m([0.07, 0.30, 0.123])); ends['wh' + s] = m([0.396, 0.375, -0.245])
    for i, (h, k, f) in enumerate(LEGS):
        J[f'l{i+1}{s}'] = ('sq', m(h)); J[f'k{i+1}{s}'] = (f'l{i+1}{s}', m(k)); ends[f'k{i+1}{s}'] = m(f)
names = list(J.keys())
lab = M.comps(th < 0.03)
thin = th < 0.03
def comp_mask(lo_x, hi_x, lo_y, lo_z, hi_z, nmin):
    k = np.zeros(len(V), bool)
    for c in np.unique(lab[thin]):
        kc = lab == c
        if kc.sum() < nmin: continue
        P = V[kc]
        if P[:, 0].min() >= lo_x and P[:, 0].max() <= hi_x and P[:, 1].min() >= lo_y and P[:, 2].min() >= lo_z and P[:, 2].max() <= hi_z: k |= kc
    return k
# wings: the big thin pieces above y 0.24 reaching past x 0.3
wing = np.zeros(len(V), bool); fore = np.zeros(len(V), bool)
for c in np.unique(lab[thin]):
    kc = lab == c; P = V[kc]
    if kc.sum() > 150 and np.abs(P[:, 0]).max() > 0.3 and P[:, 1].min() > 0.22:
        wing |= kc
        if P[:, 1].max() > 0.45: fore |= kc
ant = np.zeros(len(V), bool)
for c in np.unique(lab[thin]):
    kc = lab == c; P = V[kc]
    if kc.sum() < 80 and P[:, 1].min() > 0.33 and P[:, 2].min() > 0.3: ant |= kc
# legs: nearest leg polyline below the belly
def segd(P, a, b):
    a = np.array(a); b = np.array(b); d = b - a; t = np.clip(((P - a) @ d) / (d @ d), 0, 1); return np.linalg.norm(P - (a + t[:, None] * d), axis=1), t
LD = []; 
for s, sg in (('L', 1), ('R', -1)):
    for i, (h, k, f) in enumerate(LEGS):
        h2, k2, f2 = [np.array([p[0] * sg, p[1], p[2]]) for p in (h, k, f)]
        d1, t1 = segd(V, h2, k2); d2, t2 = segd(V, k2, f2)
        LD.append((f'{i+1}{s}', np.minimum(d1, d2), d1, d2))
Dm = np.stack([l[1] for l in LD], 1); near = Dm.argmin(1); dn = Dm.min(1)
legm = (dn < 0.032) & (y < 0.2) & ~wing & (z > -0.03)
head = (z > 0.305) & ~ant & ~legm & ~wing
gas = (z < 0.06) & ~legm & ~wing & (y > 0.11)
sting = gas & (z < -0.27)
print({k: int(v.sum()) for k, v in dict(wing=wing, fore=fore, ant=ant, leg=legm, head=head, gas=gas, sting=sting).items()})
segs = []
for n in names:
    if n in ('root', 'hips'): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and (n != 'sq' or k == 'head')]
    if n == 'sq': segs.append((n, np.array([0, 0.29, 0.06]), np.array([0, 0.30, 0.28]))); continue
    segs.append((n, a, np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)))
def vis_of(n, d):
    if n.startswith(('wf', 'wh')): return wing & (fore if n.startswith('wf') else ~fore) & (np.sign(x) == (1 if n[-1] == 'L' else -1))
    if n.startswith('ant'): return ant & (np.sign(x) == (1 if n[-1] == 'L' else -1))
    if n[0] in 'lk' and n[1].isdigit(): return legm
    if n == 'head': return head
    if n in ('g0', 'g1', 'g2'): return gas & ~sting
    if n == 'gs': return sting | (gas & (z < -0.22))
    if n == 'sq': return ~(wing | ant | legm | head | sting) & (z > -0.02)
    return np.zeros(len(V), bool)
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    force(wing & fore & sd, 'wf' + s); force(wing & ~fore & sd, 'wh' + s); force(ant & sd, 'ant' + s)
# legs: femur above the knee, tibia below, blended 0.02 round the knee; the top of the femur blends into the body
for j, (nm, dmin, d1, d2) in enumerate(LD):
    k = legm & (near == j)
    if not k.any(): continue
    w2 = np.clip((d1[k] - d2[k]) / 0.02 + 0.5, 0, 1)
    hy = J['l' + nm][1][1]; wb = np.clip((y[k] - (hy - 0.03)) / 0.03, 0, 1)  # near the hip: body
    W[k] = 0; W[k, ix['k' + nm]] = w2 * (1 - wb); W[k, ix['l' + nm]] = (1 - w2) * (1 - wb); W[k, ix['sq']] = wb
force(sting & (z < -0.3), 'gs')
mask_tell = sting & (z < -0.3)
finish(M, J, ends, W, names, out, [mask_tell, np.zeros(len(V), bool), np.zeros(len(V), bool)], fallback='sq')
