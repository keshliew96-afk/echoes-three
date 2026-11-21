# The Thornmother's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); warm = tc[:, 0] - tc[:, 2]; bright = tc.sum(1) > 450
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.36, -0.25]), 'spine': ('hips', [0, 0.36, -0.10]), 'chest': ('spine', [0, 0.37, 0.04]),
 'neck': ('chest', [0, 0.40, 0.16]), 'head': ('neck', [0, 0.41, 0.26]),
 'earL': ('head', [0.15, 0.475, 0.18]), 'earR': ('head', [-0.15, 0.475, 0.18]),
 'tail1': ('hips', [0, 0.43, -0.395]), 'tail2': ('tail1', [0, 0.31, -0.445]),
 'hump1': ('chest', [0, 0.52, 0.06]), 'hump2': ('spine', [0, 0.50, -0.19]),
}
ends = {'head': [0, 0.30, 0.49], 'earL': [0.265, 0.455, 0.04], 'earR': [-0.265, 0.455, 0.04], 'tail2': [0, 0.18, -0.49],
        'hump1': [0, 0.60, 0.06], 'hump2': [0, 0.56, -0.19]}
# thorn blades: front, middle, side, rear on each side (measured from the thin parts of the saddle)
BL = {'F': ([0.117, 0.677, 0.146], [0.182, 0.857, -0.025], 'hump1'), 'M': ([0.118, 0.68, 0.015], [0.169, 0.82, -0.195], 'hump1'),
      'S': ([0.153, 0.585, -0.045], [0.22, 0.716, -0.237], 'hump2'), 'R': ([0.142, 0.567, -0.177], [0.153, 0.598, -0.273], 'hump2')}
for k, (a, b, par) in BL.items():
    a = np.array(a); b = np.array(b); d = (b - a) / np.linalg.norm(b - a); a = a - d * 0.03
    for s, sg in (('L', 1), ('R', -1)): J['blade' + k + s] = (par, list(a * [sg, 1, 1])); ends['blade' + k + s] = list(b * [sg, 1, 1])
# seed pods: the joint sits where the pod meets the saddle, so a pod can shrink into it and grow back
PODS = {'podL': ([0.206, 0.56, 0.103], [0.175, 0.525, 0.10], 'hump1'), 'podR': ([-0.2, 0.559, 0.132], [-0.17, 0.525, 0.13], 'hump1'),
        'podC': ([-0.003, 0.617, -0.193], [0, 0.585, -0.19], 'hump2'), 'podB': ([-0.002, 0.555, -0.284], [0, 0.525, -0.275], 'hump2')}
for k, (c, b, par) in PODS.items(): J[k] = (par, b); ends[k] = c
for s, sg in (('L', 1), ('R', -1)):
    J['fUpper' + s] = ('chest', [0.115 * sg, 0.31, 0.10]); J['fFore' + s] = ('fUpper' + s, [0.115 * sg, 0.205, 0.045]); J['fCannon' + s] = ('fFore' + s, [0.115 * sg, 0.115, 0.09]); J['fHoof' + s] = ('fCannon' + s, [0.115 * sg, 0.045, 0.085]); ends['fHoof' + s] = [0.115 * sg, 0, 0.145]
    J['hThigh' + s] = ('hips', [0.11 * sg, 0.36, -0.30]); J['hShin' + s] = ('hThigh' + s, [0.12 * sg, 0.25, -0.25]); J['hCannon' + s] = ('hShin' + s, [0.11 * sg, 0.135, -0.355]); J['hHoof' + s] = ('hCannon' + s, [0.11 * sg, 0.045, -0.335]); ends['hHoof' + s] = [0.115 * sg, 0, -0.26]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.02, -0.08]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck'][1], float))); segs.append((n, a, a + [0, -0.1, 0.05]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

# regions
pod = bright & (y > 0.5) & (z < 0.2)
saddle = ((warm > -6) | pod) & (y > 0.40) & (z > -0.43) & (z < 0.23)
thin = th < 0.045
bl = M.comps(saddle & thin & ~pod & (y > 0.56)); blade = np.zeros(len(V), bool)
for c in np.unique(bl[bl >= 0]):
    k = bl == c
    if k.sum() >= 50: blade |= k
ear = thin & ~saddle & (ax > 0.14) & (y > 0.36) & (y < 0.53) & (z > -0.03) & (z < 0.24)
el = M.comps(ear); ear = np.zeros(len(V), bool)
for c in np.unique(el[el >= 0]):
    k = el == c
    if k.sum() >= 40: ear |= k
tail = ((ax < 0.06) & (z < -0.385) & (y < 0.47) & (th < 0.08)) | (z < -0.42)
tusk = bright & (z > 0.25) & (y < 0.42) & (y > 0.2)
eye = (tc[:, 2] - tc[:, 1] > 45) & (tc[:, 0] > 110) & (z > 0.25)
headm = (z > 0.21) & ~saddle & ~ear
fleg = (((y < 0.185) & (ax > 0.055) & (z > -0.02) & (z < 0.2)) | ((y < 0.12) & (z > -0.06))) & ~tail
hleg = (((y < 0.21) & (ax > 0.045) & (z < -0.19)) | ((y < 0.12) & (z < -0.15))) & ~tail
print({k: int(v.sum()) for k, v in dict(pod=pod, saddle=saddle, blade=blade, ear=ear, tail=tail, tusk=tusk, eye=eye, head=headm, fleg=fleg, hleg=hleg).items()})
podof = {}
for k, (c, b, par) in PODS.items(): podof[k] = pod & (np.linalg.norm(V - np.array(c), axis=1) < 0.07)

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' and (n[0] in 'fhe' or n.startswith('blade')) else np.ones(len(V), bool)
    if n.startswith('ear'): return ear & side
    if n.startswith('blade'): return blade & side & (d < 0.07)
    if n.startswith('pod'): return podof[n]
    if n.startswith('hump'): return saddle & ~blade & ~pod
    if n == 'head': return headm
    if n.startswith('tail'): return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    if n.startswith('fUpper'): return side & ~fleg & ~headm & ~saddle & ~ear & (ax > 0.05) & (d < 0.09) & (y < 0.36) & (z > -0.02)
    if n.startswith('hThigh'): return side & ~hleg & ~tail & ~saddle & (ax > 0.04) & (d < 0.1) & (y < 0.42) & (z < -0.17)
    ok = ~(ear | saddle | headm | tail | fleg | hleg)
    if n == 'neck': ok = (ok | (headm & (z < 0.27))) & (z > 0.06)
    if n == 'hips': ok = ok & (z < -0.1)
    if n == 'chest': ok = ok & (z > -0.1)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
for k in PODS: force(podof[k], k)
force(tusk | eye, 'head'); force(headm & (z > 0.33), 'head')
# a blade is hard from a little above its root
for n in names:
    if n.startswith('blade'):
        a = np.array(J[n][1]); b = np.array(ends[n]); t = ((V - a) @ (b - a)) / ((b - a) @ (b - a)); sg = 1 if n[-1] == 'L' else -1
        force(blade & (np.sign(x) == sg) & (np.argmin(np.stack([np.linalg.norm(V - (np.array(J[m][1]) + np.array(ends[m])) / 2, axis=1) for m in names if m.startswith('blade')]), 0) == [m for m in names if m.startswith('blade')].index(n)) & (t > 0.3), n)
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    force((fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)) & (y < 0.035), n)
finish(M, J, ends, W, names, out, [blade, pod, eye])
