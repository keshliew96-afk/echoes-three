# The Heart Censer's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A pendulum hung from the chain's top: hips at the top of the bone ring is the pivot (the game swings the whole censer
# about the chain's top), three chain bones down the links (c1..c3, each link riding one bone, so a link never bends),
# then the pot bone at the crown (its yaw is the game's pot spin), sq at the pot's middle (the game's squash) carrying
# the bowl, the heart and the spike. Masks: the coal windows, the heart.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; th = np.load(sys.argv[3]); tc = M.tc
x, y, z = V.T; r, g, b = tc.T.astype(int)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 1.0, 0]), 'c1': ('hips', [0, 0.86, 0]), 'c2': ('c1', [0, 0.74, 0]),
     'c3': ('c2', [0, 0.63, 0]), 'pot': ('c3', [0, 0.53, 0]), 'sq': ('pot', [0, 0.25, 0])}
ends = {'sq': [0, 0.0, 0]}
names = list(J.keys())
pur = (r > 120) & (b > 150) & (g < 90)
heart = pur & (y > 0.44)
coal = pur & (y < 0.44)
segs = [('hips', np.array([0, 1.0, 0.]), np.array([0, 0.86, 0.]))]
def vis_of(n, d): return np.ones(len(V), bool)
W, names, ix = skin(M, J, segs, vis_of)
W[:] = 0
# hard bands down the chain, blended over 1 cm at each join so a link rides one bone
H = [(2.0, 'hips'), (0.875, 'hips'), (0.855, 'c1'), (0.745, 'c1'), (0.725, 'c2'), (0.635, 'c2'), (0.615, 'c3'), (0.545, 'c3'), (0.525, 'pot'), (0.43, 'pot'), (0.40, 'sq'), (-1.0, 'sq')]
for i in range(len(V)):
    yy = y[i]
    for k in range(len(H) - 1):
        if H[k + 1][0] <= yy <= H[k][0]:
            f = (H[k][0] - yy) / (H[k][0] - H[k + 1][0]); W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f; break
W[heart] = 0; W[heart, ix['pot']] = 1
print({'heart': int(heart.sum()), 'coal': int(coal.sum())})
finish(M, J, ends, W, names, out, [coal, heart, np.zeros(len(V), bool)], fallback='sq')
