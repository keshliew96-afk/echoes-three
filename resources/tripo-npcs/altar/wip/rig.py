# The Corrupted Altar's rig (the Hollow Voice's altar). usage: python3 -I rig.py <cut.glb> <outdir> <kit dir>
# A grey stone altar: a thick carved slab with an eye in its front on two carved legs, cracked, with violet veins running
# over the top and down the legs and violet crystal shards at the feet, two melted candles and a cracked bowl on top,
# and a violet crystal cluster at its middle. Rig the cut model (cut.py frees the crystal from the slab). The stone
# stays still on the hips; the crystal floats, spins and shrinks on its own bone, from its middle; two spare candle
# bones do nothing (the kit needs five bones). Mask x: the crystal. Mask y: the violet veins on the stone.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V; tc = M.tc; x, y, z = V.T; r, g, b = tc.T.astype(int)
C = [-0.02, 0.68, -0.01]
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.25, 0]), 'crystal': ('root', C),
     'candleL': ('hips', [0.27, 0.55, 0.0]), 'candleR': ('hips', [-0.27, 0.55, 0.0])}
ends = {'crystal': [C[0], 0.92, C[2]], 'candleL': [0.27, 0.62, 0.0], 'candleR': [-0.27, 0.62, 0.0]}
names = list(J.keys())
cry = np.load(src[:-4] + '.cry.npy')
pu = (b > g + 25) & (r > g + 5)
veins = pu & ~cry
print({'crystal': int(cry.sum()), 'veins': int(veins.sum())})
W = np.zeros((len(V), len(names))); W[:, 1] = 1; W[cry] = 0; W[cry, 2] = 1
finish(M, J, ends, W, names, out, [cry, veins, np.zeros(len(V), bool)], fallback='hips')
