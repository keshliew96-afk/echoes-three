# Cut the rope's end (the knot at the left wrist, the rope down through the fist, the tassel) off the sash it is welded
# to, so the knot rides the hand and the tassel can hang from the fist. (The arms stay welded to the coat: cut free they
# leave holes in its sides, so they only ever move a little.)
# usage: python3 -I cut.py <in.glb> <out.glb> <kit dir>. Writes <out>.parts.npz: tas (a vertex mask).
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, trimesh
from rigkit import Mesh, Editor
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc.astype(int); x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T; lum = (r + g + b) / 3; warm = (r - b) > 8
tas = (x > 0.06) & (y > 0.27) & (y < 0.555) & (z > 0.0) & (warm & (lum > 90) | (lum < 120) & (r > 85) & ((r - b) > 25)) & ~((y > 0.42) & (y < 0.5) & (x > 0.122))
tas &= ~((y < 0.36) & (lum < 70) & ((r - b) < 15))
xb = np.interp(y, [0.36, 0.5, 0.6, 0.7, 0.76, 0.8], [0.085, 0.09, 0.1, 0.095, 0.08, 0.07])
sleeve = ((ax > xb) & (y > 0.48) | (ax > 0.112) & (y > 0.43)) & (y < 0.8)  # the cuffs flare out past the wrists
hand = (y > 0.33) & (y <= 0.5) & (ax > 0.075) & (lum > 95)
arm = (sleeve | hand) & ~tas
coat = M.UV[(lum < 60) & (y > 0.55) & (ax < 0.06)][0]; ropeuv = M.UV[tas & (y > 0.45) & (y < 0.5)][0]
E = Editor(M)
A = tas[M.F].sum(1) >= 2; print('rope end faces', int(A.sum()))  # a face goes with the part most of its corners are in
E.split(A, 'tas', ropeuv, ropeuv, caps=False)  # no caps: its rims run along the hand and the coat both
M = E.done()
tn = {v: k for k, v in M.tags.items()}; T = np.array([tn[t] for t in M.tag])
parts = {p: np.isin(T, [p, p + '.lid']) for p in ('tas',)}
np.savez(sys.argv[2][:-4] + '.parts.npz', **parts)
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0.0, roughnessFactor=1.0)
trimesh.Trimesh(M.V, M.F, vertex_normals=M.N, visual=trimesh.visual.TextureVisuals(uv=M.UV, material=mat), process=False).export(sys.argv[2])
print('wrote', sys.argv[2], 'verts', len(M.V), 'tris', len(M.F), {k: int(v.sum()) for k, v in parts.items()})
