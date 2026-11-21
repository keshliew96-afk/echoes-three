# The Vein Weaver's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir> <legs.json>
# A spider: a low cephalothorax (the thorax bone) with a head, two fangs and eight legs, and the crystal abdomen on its own
# bone at the waist with the spinnerets at its tip (where her thread leaves). Tripo gave six legs; the back pair is a copy of
# her third pair swung back about its hip (build/legs4s.glb, merged in build/weaver8.glb). Each leg: femur up to the knee,
# tibia down and out to the crystal cap, tarsus straight down to the crystal tip, and a tip bone. Crystal is rigid.
import sys, json; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); LJ = json.load(open(sys.argv[4]))
V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r, g, b = tc.T; lum = tc.sum(1)
viol = (r > g + 25) & (b > g + 40)
lab = M.comps((ax > 0.19) & (y < 0.5))
pieceMain = M.comp == M.main

J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.3, 0.1]), 'head': ('hips', [0, 0.3, 0.25]),
     'fangL': ('head', [0.04, 0.22, 0.32]), 'fangR': ('head', [-0.04, 0.22, 0.32]),
     'abdomen': ('hips', [0, 0.31, -0.03]), 'spinner': ('abdomen', [0, 0.26, -0.39])}
ends = {'head': [0, 0.26, 0.42], 'fangL': [0.05, 0.12, 0.36], 'fangR': [-0.05, 0.12, 0.36], 'abdomen': [0, 0.3, -0.43], 'spinner': [0, 0.24, -0.46]}
legid = {}
for o in LJ:
    s = 'L' if o['tip'][0] > 0 else 'R'; same = sorted([q for q in LJ if (q['tip'][0] > 0) == (s == 'L')], key=lambda q: -q['tip'][2]); k = same.index(o) + 1
    hip = np.array(o['hip']); hip[0] = 0.15 * np.sign(hip[0])  # the hip sits inside the thorax
    tip = np.array(o['tip']); ball = tip + [0, 0.05, 0]; tip[1] = 0.0
    J['fem%d%s' % (k, s)] = ('hips', hip.tolist()); J['tib%d%s' % (k, s)] = ('fem%d%s' % (k, s), o['knee'])
    J['tar%d%s' % (k, s)] = ('tib%d%s' % (k, s), o['ankle']); J['tip%d%s' % (k, s)] = ('tar%d%s' % (k, s), ball.tolist()); ends['tip%d%s' % (k, s)] = tip.tolist()
    # which mesh piece is this leg: the leg-mask label at its tip
    ti = np.argmin(np.linalg.norm(V - np.array(o['tip']), axis=1)); legid[(k, s)] = lab[ti]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [c for c in names if J[c][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a + [0, 0, -0.12], a + [0, 0, 0.14]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

legs = {}
for (k, s), i in legid.items():
    m = lab == i
    # a copied leg is its own piece, stub and all
    ti = np.argmin(np.where(m, 0, 1) + 0)  # any vertex of it
    cp = M.comp[np.where(m)[0][0]]
    if cp != M.main: m = m | (M.comp == cp)
    legs[(k, s)] = m
anyleg = np.zeros(len(V), bool)
for m in legs.values(): anyleg |= m
body = ~anyleg
abd = body & (z < -0.03)
spin = abd & (z < -0.37) & (y < 0.3) & viol
head = body & (z > 0.21)
fang = body & (ax < 0.1) & (z > 0.29) & (y < 0.24) & ~viol
eye = body & viol & (z > 0.25) & (y > 0.2)
spire = abd & viol & (y > 0.46)
print({k: int(v.sum()) for k, v in dict(anyleg=anyleg, abd=abd, spin=spin, head=head, fang=fang, eye=eye, spire=spire).items()})
print('abdomen lum', np.percentile(lum[abd & viol], [5, 25, 50, 75, 95]).round(0))

def vis_of(n, d):
    if n.startswith(('fem', 'tib', 'tar', 'tip')):
        k, s = int(n[3]), n[4]; m = legs[(k, s)]
        if n.startswith("fem"): return m | (body & (d < 0.05) & (ax > 0.15))
        return m
    if n == 'abdomen': return abd | (body & (z < 0.03))
    if n == 'spinner': return spin
    if n == 'head': return head | (body & (z > 0.15))
    if n.startswith('fang'): return fang & (np.sign(x) == (1 if n[-1] == 'L' else -1))
    return body
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(abd & (z < -0.07), 'abdomen'); force(spin, 'spinner')
for s, sg in (('L', 1), ('R', -1)): force(fang & (np.sign(x) == sg), 'fang' + s)
force(eye, 'head')
for (k, s), m in legs.items():
    o = J['tar%d%s' % (k, s)][1]; t = np.array(ends['tip%d%s' % (k, s)])
    dpl = np.linalg.norm(V[:, [0, 2]] - t[[0, 2]], axis=1)
    force(m & (dpl < 0.06) & (y < o[1] - 0.03), 'tar%d%s' % (k, s))  # the tarsus and its crystal tip are one rigid piece
    if M.comp[np.where(m)[0][0]] != M.main: force(m & (ax < 0.2), 'fem%d%s' % (k, s))  # the copied leg's hidden stub
# masks: x the eyes; y the abdomen's veins (its lighter streaks); z crystal kinds (abdomen spires 1, leg caps and tips 0.75, spinnerets 0.5)
vein = abd & viol & (lum > np.percentile(lum[abd & viol], 70)) & ~spire
legc = anyleg & viol
gz = np.where(spire, 1.0, np.where(legc, 0.75, np.where(spin, 0.5, 0.0)))
finish(M, J, ends, W, names, out, [eye, vein, gz], fallback='hips')
