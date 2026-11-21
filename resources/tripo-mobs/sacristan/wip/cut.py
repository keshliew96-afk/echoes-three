# Cut the hand bell (its bronze body and wooden handle) off the robe it is welded to, so it can swing out with the hands
# without dragging the robe after it. The seam is left open: it sits behind the bell, where the robe touched it.
# usage: python3 -I cut.py <in.glb> <out.glb> <kit dir>. Writes <out>.parts.npz: bell (a vertex mask).
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, trimesh
from rigkit import Mesh, Editor
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc.astype(int); x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T
bell = (y > 0.39) & (y < 0.59) & (z > 0.04) & (ax < 0.078) & (r < 150) & ~((r > 140) & (g > 125) & (b > 105))
handle = ((y > 0.655) | (y < 0.6)) & (y > 0.55) & (y < 0.71) & (ax < 0.022) & (z > 0.06) & (r > g + 10) & (g > b)  # above and below the clasped hands
part = bell | handle
robeuv = M.UV[(r > 150) & (g > 140) & (y > 0.3) & (y < 0.4) & (z > 0.05)][0]; belluv = M.UV[bell & (y > 0.45) & (y < 0.5) & (z > 0.14)][0]
E = Editor(M)
A = part[M.F].sum(1) == 3; print('bell faces', int(A.sum()))  # only whole bell faces: a face that reaches the robe stays on it
E.split(A, 'bell', robeuv, belluv, caps=False)  # no caps: the rim runs round the hands and the robe both, and a flat lid pokes through the bell
M = E.done()
tn = {v: k for k, v in M.tags.items()}; T = np.array([tn[t] for t in M.tag])
parts = {'bell': np.isin(T, ['bell', 'bell.lid'])}
np.savez(sys.argv[2][:-4] + '.parts.npz', **parts)
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0.0, roughnessFactor=1.0)
trimesh.Trimesh(M.V, M.F, vertex_normals=M.N, visual=trimesh.visual.TextureVisuals(uv=M.UV, material=mat), process=False).export(sys.argv[2])
print('wrote', sys.argv[2], 'verts', len(M.V), 'tris', len(M.F), {k: int(v.sum()) for k, v in parts.items()})
