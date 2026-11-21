# Cut the crystal free of the altar's top, so it can float and spin as the game's shard does.
# usage: python3 -I cut.py <in.glb> <out.glb> <kit dir>. The hole it leaves on the slab is capped in the stone's grey,
# the crystal's foot in its violet.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, trimesh
from rigkit import Mesh, Editor
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc.astype(int); x, y, z = V.T; r, g, b = tc.T
pu = (b > g + 25) & (r > g + 5)
cry = pu & (y > 0.535) & (np.hypot(x + 0.02, z + 0.01) < 0.16)
A = cry[M.F].all(1)
print('crystal faces', A.sum(), 'of', len(M.F))
E = Editor(M); stone = M.UV[(~pu) & (np.abs(y - 0.505) < 0.01) & (np.abs(x) < 0.2)][0]; vio = M.UV[cry][0]
E.split(A, 'cry', stone, vio); M = E.done()
tn = {v: k for k, v in M.tags.items()}; hole = np.array([tn[t] == 'cry.hole' for t in M.tag]); lid = np.array([tn[t] == 'cry.lid' for t in M.tag])
M.N[hole] = [0, 1, 0]; M.N[lid] = [0, -1, 0]
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0.0, roughnessFactor=1.0)
out = trimesh.Trimesh(M.V, M.F, vertex_normals=M.N, visual=trimesh.visual.TextureVisuals(uv=M.UV, material=mat), process=False)
np.save(sys.argv[2][:-4] + '.cry.npy', np.array([tn[t] in ('cry', 'cry.lid') for t in M.tag]))
out.export(sys.argv[2]); print('wrote', sys.argv[2], 'verts', len(M.V), 'tris', len(M.F))
