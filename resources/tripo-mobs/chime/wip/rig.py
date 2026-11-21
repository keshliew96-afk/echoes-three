# The Chime Wraith's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# The Ash Wraith's frame: hips at the waist carry the ragged skirt (three bones down to its tail) and sq, which squashes
# the body; the body bends at spine and chest; the hood (with the eyes) on the head bone; two bandaged arms (upper arm,
# forearm, the clawed hand). Added: the bell in the chest opening on its own bone (hung from its hanger, it swings),
# and the rope belt's hanging end on two bones. The body's weights run linearly by height between its joints; the
# bell, the rope and the arms are found by colour (warm against the cool grey shroud).
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.42, 0.02]), 'sq': ('hips', [0, 0.42, 0.02]),
     'spine': ('sq', [0, 0.5, 0.02]), 'chest': ('spine', [0, 0.62, 0.01]), 'head': ('chest', [0, 0.73, 0.0]),
     'sk1': ('hips', [0, 0.36, 0.03]), 'sk2': ('sk1', [0, 0.24, 0.03]), 'sk3': ('sk2', [0, 0.12, 0.02]),
     'bell': ('chest', [0, 0.765, 0.055]), 'rope1': ('spine', [0, 0.51, 0.12]), 'rope2': ('rope1', [0, 0.38, 0.12])}
ends = {'head': [0, 1.0, 0.01], 'sk3': [0, 0.0, 0.0], 'bell': [0, 0.565, 0.08], 'rope2': [0, 0.24, 0.11]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['arm' + s] = ('chest', m([0.11, 0.63, 0.01])); J['fore' + s] = ('arm' + s, m([0.155, 0.54, 0.03])); J['hand' + s] = ('fore' + s, m([0.195, 0.46, 0.05])); ends['hand' + s] = m([0.205, 0.36, 0.06])
names = list(J.keys())
warm = (r - b) > 8
arm = warm & (ax > 0.1) & (y > 0.33) & (y < 0.67)
bell = warm & (ax < 0.06) & (y > 0.555) & (y < 0.785) & (z > 0.03)
rope = warm & (ax < 0.07) & (y < 0.53) & (z > 0.05) & ~arm
headm = (y > 0.735) & ~arm & ~bell
eye = (r > 195) & (g > 185) & (y > 0.8) & (z > 0.05)
print({k: int(v.sum()) for k, v in dict(arm=arm, bell=bell, rope=rope, head=headm, eye=eye).items()})
segs = []
for n in names:
    if not n.startswith(('arm', 'fore', 'hand')): continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    segs.append((n, a, np.array(ends[n], float) if n in ends else np.array(J[kids[0]][1], float)))
def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1))
    return arm & side
W, names, ix = skin(M, J, segs, vis_of)
body = ~arm
H = [(0.0, 'sk3'), (0.12, 'sk3'), (0.24, 'sk2'), (0.36, 'sk1'), (0.42, 'hips'), (0.46, 'sq'), (0.5, 'spine'), (0.62, 'chest'), (0.73, 'head'), (2.0, 'head')]
W[body] = 0
for i in np.nonzero(body)[0]:
    yy = y[i]
    for k in range(len(H) - 1):
        if H[k][0] <= yy <= H[k + 1][0]:
            f = (yy - H[k][0]) / (H[k + 1][0] - H[k][0]); W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f; break
    else: W[i, ix['sk3']] = 1
W[headm] = 0; W[headm, ix['head']] = 1
W[bell] = 0; W[bell, ix['bell']] = 1
ra = np.clip((0.5 - y[rope]) / 0.13, 0, 1); ri = np.nonzero(rope)[0]
W[ri] = 0; W[ri, ix['rope1']] = 1 - np.clip((0.38 - y[ri]) / 0.04, 0, 1); W[ri, ix['rope2']] = np.clip((0.38 - y[ri]) / 0.04, 0, 1)
top = ri[y[ri] > 0.48]; W[top] = 0; W[top, ix['spine']] = 1
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg; hm = arm & sd & (y < 0.45); W[hm] = 0; W[hm, ix['hand' + s]] = 1
finish(M, J, ends, W, names, out, [bell, eye, np.zeros(len(V), bool)], fallback='spine')
