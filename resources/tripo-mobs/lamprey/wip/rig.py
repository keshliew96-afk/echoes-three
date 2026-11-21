# The Bog Lamprey's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A spine of eleven bones laid down the eel's centre line: hips mid-body, forward through the body bone, the bend at the
# foot of the reared neck, up the neck to the head and the oral disc; back down four tail bones to the fin. Weights by heat
# diffusion from each bone's stretch of the centre line, so the body bends smoothly along its length.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); V = M.V
x, y, z = V.T; ax = np.abs(x); lum = M.tc.sum(1)
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.09, -0.05]),
     'body': ('hips', [0, 0.085, 0.07]), 'neck1': ('body', [0, 0.09, 0.2]), 'neck2': ('neck1', [0, 0.21, 0.29]), 'head': ('neck2', [0, 0.33, 0.35]),
     'disc': ('head', [0, 0.37, 0.455]),
     'tail1': ('hips', [0, 0.085, -0.17]), 'tail2': ('tail1', [0, 0.07, -0.28]), 'tail3': ('tail2', [0, 0.058, -0.38]), 'tail4': ('tail3', [0, 0.052, -0.45])}
ends = {'disc': [0, 0.37, 0.5], 'tail4': [0, 0.045, -0.5]}
P = {k: np.array(v[1], float) for k, v in J.items()}
segs = [('hips', P['tail1'], P['body']), ('body', P['body'], P['neck1']), ('neck1', P['neck1'], P['neck2']), ('neck2', P['neck2'], P['head']),
        ('head', P['head'], P['disc']), ('disc', P['disc'], np.array(ends['disc'])),
        ('tail1', P['tail1'], P['tail2']), ('tail2', P['tail2'], P['tail3']), ('tail3', P['tail3'], P['tail4']), ('tail4', P['tail4'], np.array(ends['tail4']))]
lip = (z > 0.455) & (y > 0.26)
def vis(n, d):
    if n == 'disc': return lip
    if n == 'head': return (y > 0.22) & ~lip
    if n in ('neck2',): return (z > 0.17)
    return d < 0.25
W, names, ix = skin(M, J, segs, vis)
eye = lum > 600
gills = (lum < 150) & (ax > 0.07) & (y > 0.31) & (y < 0.39) & (z > 0.28) & (z < 0.44)
print({'lip': int(lip.sum()), 'eye': int(eye.sum()), 'gills': int(gills.sum())})
z0 = np.zeros(len(V), bool)
finish(M, J, ends, W, names, out, [gills, z0, eye], fallback='hips')
