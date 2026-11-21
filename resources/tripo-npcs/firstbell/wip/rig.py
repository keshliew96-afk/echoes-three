# The First Bell's rig (the Wandering Spirit). usage: python3 -I rig.py <in.glb> <outdir> <kit dir>
# A ghost mouse in pale blue: big round ears, a kind face with whiskers and a tuft of hair, a hooded cape with a vine
# border over a robe, both hands clasped round a small bell at the chest, a satchel with a cross at the hip, a long
# thin tail curling behind, and the robe fading into a ghostly wisp instead of feet. Nose to +z.
# The game moves the spirit as one rigid shape (it floats, bobs, turns and swirls up), so the whole model rides the
# hips (the head on its own bone, still with it); the root stays on the floor under it. Mask x, y: none.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.45, 0]), 'head': ('hips', [0, 0.64, 0.02])}
J['earL'] = ('head', [0.12, 0.8, 0.0]); J['earR'] = ('head', [-0.12, 0.8, 0.0])  # spare: the kit packs four weights a point, so it needs five bones or more
ends = {'head': [0, 0.95, 0.02], 'earL': [0.18, 0.92, 0.0], 'earR': [-0.18, 0.92, 0.0]}
names = list(J.keys())
W = np.zeros((len(V), len(names))); y = V[:, 1]; k = np.clip((y - 0.6) / 0.06, 0, 1); W[:, 1] = 1 - k; W[:, 2] = k  # the head rides along (the game turns the spirit whole)
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [z0, z0, z0], fallback='hips')
