# The Geode Colossus's rig. usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# One welded piece and one loose crystal. A knuckle-walker: the fists are feet as much as the legs are, so arms and legs
# are both 'limb' chains (two bones to the wrist or ankle, a hand or foot that rocks about its knuckles or ball).
# Rock is rigid: the head, the fists, the feet, the crystal spires and the heart each go to one bone.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src)
V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r, g, b = tc.T; lum = tc.sum(1)
comp = M.comp[M.inv] if len(M.comp) != len(V) else M.comp
loose = comp != np.argmax(M.cnt)
viol = (r > g + 25) & (b > g + 40)

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.27, -0.15]), 'spine': ('hips', [0, 0.40, -0.10]), 'chest': ('spine', [0, 0.53, -0.05]),
 'neck': ('chest', [0, 0.55, 0.07]), 'head': ('neck', [0, 0.55, 0.14]),
 'heart': ('spine', [0, 0.366, 0.055]),
}
ends = {'head': [0, 0.6, 0.33], 'heart': [0, 0.366, 0.12]}
for s, sg in (('L', 1), ('R', -1)):
    J['arm' + s] = ('chest', [0.29 * sg, 0.555, 0.0]); J['fore' + s] = ('arm' + s, [0.355 * sg, 0.37, -0.03])
    J['fist' + s] = ('fore' + s, [0.37 * sg, 0.17, 0.11]); J['knuck' + s] = ('fist' + s, [0.36 * sg, 0.012, 0.12]); ends['knuck' + s] = [0.36 * sg, 0.0, 0.21]
    J['thigh' + s] = ('hips', [0.12 * sg, 0.24, -0.17]); J['shin' + s] = ('thigh' + s, [0.135 * sg, 0.14, -0.15])
    J['foot' + s] = ('shin' + s, [0.14 * sg, 0.065, -0.2]); J['toe' + s] = ('foot' + s, [0.145 * sg, 0.012, -0.13]); ends['toe' + s] = [0.145 * sg, 0.0, -0.09]
names = list(J.keys())
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n and k != 'heart']
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.05, -0.12]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck'][1], float))); segs.append((n, a, a + [0, 0.18, -0.1])); segs.append((n, a, a + [0, -0.05, -0.22]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float))); segs.append((n, a, a + [0, 0, 0.22]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

arm = (ax > 0.238) & (y < 0.67)
fist = arm & (y < 0.16) & (z > -0.01)
leg = (ax < 0.238) & (ax > 0.03) & (z < -0.03) & (y < 0.2)
foot = leg & (y < 0.07)
head = (((z > 0.115) & (y > 0.478)) | ((z > 0.2) & (y > 0.455))) & (ax < 0.115) & ~arm
spire = (viol & (y > 0.6) & (z < 0.12) & ~head) | loose
heart = (ax < 0.065) & (y > 0.33) & (y < 0.43) & (z > 0.045) & (z < 0.08) & (lum > 420)
lining = viol & (z > 0.04) & (y > 0.19) & (y < 0.52) & (ax < 0.24) & ~heart
crack = viol & (z < 0.04) & (y < 0.67) & ~spire
eye = viol & head & (y > 0.55)
print({k: int(v.sum()) for k, v in dict(arm=arm, fist=fist, leg=leg, foot=foot, head=head, spire=spire, heart=heart, lining=lining, crack=crack, eye=eye, loose=loose).items()})
for k, m in dict(heart=heart, eye=eye, crack=crack).items():
    if m.any(): print(' ', k, V[m].min(0).round(3), V[m].max(0).round(3))

def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'head': return head
    if n == 'heart': return heart
    if n.startswith('fist') or n.startswith('knuck'): return fist & side
    if n.startswith('fore'): return arm & side & (y < 0.43) & ~fist
    if n.startswith('arm'): return arm & side & (y > 0.3) & (d < 0.12)
    if n.startswith('foot') or n.startswith('toe'): return foot & side
    if n.startswith('shin'): return leg & side & ~foot
    body = ~(head | heart | arm | spire)
    if n.startswith('thigh'): return body & side & (z < -0.03) & (y < 0.3) & (ax > 0.03) & ~foot
    if n == 'neck': return body & (z > 0.02) & (y > 0.48) & (ax < 0.14)
    if n == 'hips': return body & (y < 0.36) & ~foot
    if n == 'spine': return body & (y > 0.2) & (y < 0.52)
    if n == 'chest': return (body | spire) & (y > 0.38)
    return body
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(head & ((z > 0.15) | (y > 0.6)), 'head'); force(spire, 'chest'); force(heart, 'heart')
# the small crystal on top of each shoulder sits on the shoulder rock, so it goes with the arm
for s_, sg_ in (('L', 1), ('R', -1)): force(spire & (np.sign(x) == sg_) & (ax > 0.265) & (y < 0.72), 'arm' + s_)
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    force(fist & sd & (y < 0.13), 'fist' + s); force(foot & sd & (y < 0.055), 'foot' + s)
    # ahead of the knuckles and the ball the fist and the foot are their own rigid piece, so a rolled fist or a lifted heel
    # pivots there and never pushes its front into the floor
    force(fist & sd & (y < 0.13) & (z > 0.135), 'knuck' + s); force(foot & sd & (y < 0.055) & (z > -0.125), 'toe' + s)
# masks: x the eyes, y the heart, z glow kinds (spires 1, the geode's lining 0.5, the cracks 0.75)
gz = np.where(spire, 1.0, np.where(crack, 0.75, np.where(lining, 0.5, 0.0)))
finish(M, J, ends, W, names, out, [eye, heart, gz], fallback='chest')
