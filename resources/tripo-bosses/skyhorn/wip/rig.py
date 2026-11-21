# The Skyhorn's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# One welded piece. The head faces straight (mid-x within 1 mm along the face). Horns and skull rigid on the head,
# hooves rigid under the fetlock, the throat bell rigid on its own swinging joint, the beard and ears on springs.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src)
V = M.V; x, y, z = V.T; ax = np.abs(x); r, g, b = M.tc.T.astype(int); lum = r + g + b
brown = (r > b + 25) & (r > g + 8)

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.44, -0.22]), 'spine': ('hips', [0, 0.47, -0.1]), 'chest': ('spine', [0, 0.47, 0.02]),
 'neck1': ('chest', [0, 0.52, 0.12]), 'neck2': ('neck1', [0, 0.6, 0.19]), 'head': ('neck2', [0, 0.68, 0.25]),
 'earL': ('head', [0.085, 0.7, 0.215]), 'earR': ('head', [-0.085, 0.7, 0.215]),
 'beard': ('head', [0, 0.575, 0.34]),
 'bell': ('chest', [0, 0.43, 0.285]),
 'tail1': ('hips', [0, 0.43, -0.32]), 'tail2': ('tail1', [0, 0.42, -0.37]),
}
ends = {'head': [0, 0.58, 0.41], 'earL': [0.145, 0.705, 0.225], 'earR': [-0.145, 0.705, 0.225], 'beard': [0, 0.47, 0.35],
        'bell': [0, 0.345, 0.29], 'tail2': [0, 0.43, -0.42]}
for s, sg in (('L', 1), ('R', -1)):
    J['fUpper' + s] = ('chest', [0.09 * sg, 0.43, 0.13]); J['fFore' + s] = ('fUpper' + s, [0.08 * sg, 0.29, 0.085])
    J['fCannon' + s] = ('fFore' + s, [0.077 * sg, 0.19, 0.1]); J['fHoof' + s] = ('fCannon' + s, [0.075 * sg, 0.065, 0.11]); ends['fHoof' + s] = [0.075 * sg, 0, 0.165]
    J['hThigh' + s] = ('hips', [0.095 * sg, 0.42, -0.25]); J['hShin' + s] = ('hThigh' + s, [0.088 * sg, 0.3, -0.2])
    J['hCannon' + s] = ('hShin' + s, [0.08 * sg, 0.21, -0.295]); J['hHoof' + s] = ('hCannon' + s, [0.08 * sg, 0.065, -0.275]); ends['hHoof' + s] = [0.08 * sg, 0, -0.215]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and k[:3] not in ('ear', 'bea', 'bel')]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, 0.05, -0.08]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck1'][1], float))); segs.append((n, a, a + [0, -0.12, 0.12]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

horn = (y > 0.735) | (brown & (y > 0.72) & (ax < 0.1))
bellm = brown & (y > 0.335) & (y < 0.415) & (ax < 0.04) & (z > 0.255)
eye = np.zeros(len(V), bool)
for s in (1, -1): eye |= np.linalg.norm(V - [0.046 * s, 0.647, 0.318], axis=1) < 0.012
ear = (ax > 0.095) & (y > 0.665) & (y < 0.73) & (z > 0.17) & (z < 0.26) & ~horn
beard = (z > 0.305) & (y < 0.575) & (y > 0.44) & (ax < 0.05)
headm = horn | ear | eye | ((y > 0.625) & (z > 0.215)) | ((z > 0.3) & (y > 0.575))
tail = (z < -0.315) & (y > 0.35) & (ax < 0.07)
fleg = (y < 0.3) & (z > -0.02) & (ax > 0.025)
hleg = (y < 0.31) & (z < -0.12) & (ax > 0.025)
print({k: int(v.sum()) for k, v in dict(horn=horn, bell=bellm, eye=eye, ear=ear, beard=beard, head=headm, tail=tail, fleg=fleg, hleg=hleg).items()})

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'head': return headm & ~ear
    if n.startswith('ear'): return ear & side
    if n == 'beard': return beard
    if n == 'bell': return bellm
    if n.startswith('tail'): return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    body = ~(headm | beard | bellm | tail | fleg | hleg)
    if n.startswith('fUpper'): return body & side & (ax > 0.05) & (d < 0.05) & (y < 0.45) & (z > 0.04)
    if n.startswith('hThigh'): return body & side & (ax > 0.05) & (d < 0.06) & (y < 0.43) & (z < -0.14)
    if n == 'neck2': return body & (z > 0.12) & (y > 0.55)
    if n == 'neck1': return body & (z > 0.06) & (y > 0.47)
    if n == 'hips': return body & (z < -0.12)
    if n == 'spine': return body & (z < 0.0) & (z > -0.22) & (y > 0.3)
    if n == 'chest': return body & (z > -0.1)
    return body
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
# the lower legs may not reach along the belly (diffusion leaked them into it; the belly stretched 15 times in the walk)
for s_ in ('L', 'R'):
    ramp = lambda v, a, b: np.clip((v - a) / (b - a), 0, 1)
    for n in ('fFore', 'fCannon', 'fHoof'): W[:, ix[n + s_]] *= ramp(z, -0.005, 0.045) * ramp(ax, 0.02, 0.032)
    for n in ('hShin', 'hCannon', 'hHoof'): W[:, ix[n + s_]] *= ramp(-z, 0.09, 0.14) * ramp(ax, 0.02, 0.032)
force(horn, 'head'); force(eye, 'head'); force(headm & ~ear & ((z > 0.24) | (y > 0.7)), 'head'); force(bellm, 'bell')
for s in ('L', 'R'): force(ear & (np.sign(x) == (1 if s == 'L' else -1)) & (ax > 0.11), 'ear' + s)
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    m = (fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)); c = n.replace('Hoof', 'Cannon')
    force(m & (y < 0.044), n)
    # across the fetlock the hoof hands over to the cannon over 3 cm, so a hoof folded under (a rear) does not tear the heel
    band = m & (y >= 0.044) & (y < 0.074); h = 1 - (y[band] - 0.044) / 0.03
    W[band] = 0; W[band, ix[n]] = h; W[band, ix[c]] = 1 - h
finish(M, J, ends, W, names, out, [horn, bellm, eye], fallback='chest')
