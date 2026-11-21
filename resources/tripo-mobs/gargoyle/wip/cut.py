# Cut the extra tail (the one curling to the gargoyle's right, -x) and close the hole it leaves.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, trimesh
from rigkit import Mesh, Editor
M = Mesh(sys.argv[1]); V = M.V
ZB = np.array([-0.42, -0.36, -0.30, -0.24, -0.18, -0.12, -0.06, 0.0, 0.06, 0.10, 0.16])
XB = np.array([ 0.035, 0.035, 0.05,  0.08,  0.12,  0.19,  0.22, 0.25, 0.28, 0.30, 0.30])
YT = float(sys.argv[4]) if len(sys.argv) > 4 else 0.17
def inreg(P):
    return (P[:, 0] < 0) & (P[:, 1] < YT) & (-P[:, 0] > np.interp(P[:, 2], ZB, XB)) & (P[:, 2] < 0.16)
C = V[M.F].mean(1)
A = inreg(C) & inreg(V[M.F[:, 0]]) & inreg(V[M.F[:, 1]]) & inreg(V[M.F[:, 2]])
# keep only the largest connected piece of the selection (the tail itself)
print('faces in region', A.sum())
E = Editor(M); E.split(A, 'xtail', M.UV[0] * 0 + np.array([0.5, 0.5]), np.array([0.5, 0.5]))
M = E.done()
tn = {v: k for k, v in M.tags.items()}
drop = np.array([tn[t].startswith('xtail') and not tn[t].endswith('.hole') for t in M.tag])
keepF = ~drop[M.F].any(1)
F = M.F[keepF]; used = np.unique(F); remap = -np.ones(len(M.V), int); remap[used] = np.arange(len(used))
V2 = M.V[used]; UV2 = M.UV[used]; F2 = remap[F]
# the hole cap took a flat uv: give it the uv of its nearest kept body vertex
hole = np.array([tn[t] == 'xtail.hole' for t in M.tag])[used]
N2 = M.N[used].copy()
if hole.any():
    from scipy.spatial import cKDTree
    body = ~hole; tr = cKDTree(V2[body]); _, j = tr.query(V2[hole].mean(0)); UV2[hole] = UV2[body][j]
    # one stone texel for the whole cap; normals point away from the body's centre line
    n = V2[hole] - np.array([0, 0.1, -0.1]); N2[hole] = n / np.linalg.norm(n, axis=1, keepdims=True)
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0.0, roughnessFactor=1.0)
out = trimesh.Trimesh(V2, F2, vertex_normals=N2, visual=trimesh.visual.TextureVisuals(uv=UV2, material=mat), process=False)
out.export(sys.argv[2]); print('wrote', sys.argv[2], 'tris', len(F2), 'removed', len(M.F) - len(F2))
