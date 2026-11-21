# Cut the lantern (with its chain) free of the chest it is welded to, so it can swing without dragging the body.
# usage: python3 -I cut.py <in.glb> <out.glb> <kit dir>. The hole it leaves on the chest is capped in the body's blue,
# the lantern's back in its iron grey.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, trimesh
from rigkit import Mesh, Editor
from scipy.spatial import cKDTree
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc.astype(int); x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T
grey = (b - r) < 50
lamp = grey & (z > 0.045) & (y < 0.6) & (ax < 0.08)
dl = cKDTree(V[lamp]).query(V)[0]
lamp |= (dl < 0.02) & (z > 0.075) & (y < 0.55) & (y > 0.35) & (ax < 0.075)
A = lamp[M.F].all(1)
print('lamp faces', A.sum(), 'of', len(M.F))
E = Editor(M); bodyuv = M.UV[(~lamp) & (np.abs(y - 0.47) < 0.03) & (z > 0.02)][0]; lampuv = M.UV[lamp & (r < 80)][0]
E.split(A, 'lamp', bodyuv, lampuv); M = E.done()
tn = {v: k for k, v in M.tags.items()}; hole = np.array([tn[t] == 'lamp.hole' for t in M.tag]); lid = np.array([tn[t] == 'lamp.lid' for t in M.tag])
# caps face out: the hole forward off the chest, the lid back into it
M.N[hole] = [0, 0, 1]; M.N[lid] = [0, 0, -1]
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0.0, roughnessFactor=1.0)
out = trimesh.Trimesh(M.V, M.F, vertex_normals=M.N, visual=trimesh.visual.TextureVisuals(uv=M.UV, material=mat), process=False)
np.save(sys.argv[2][:-4] + '.lamp.npy', np.array([tn[t] in ('lamp', 'lamp.lid') for t in M.tag]))  # who rides the lantern
out.export(sys.argv[2]); print('wrote', sys.argv[2], 'verts', len(M.V), 'tris', len(M.F))
