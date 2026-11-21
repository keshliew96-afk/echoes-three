# Step 2: the main model plus the simplified copied legs, one mesh, one texture. usage: merge.py main.glb legs.glb out.glb
import sys, numpy as np, trimesh
A = trimesh.load(sys.argv[1], force='mesh', process=False); B = trimesh.load(sys.argv[2], force='mesh', process=False)
V = np.vstack([A.vertices, B.vertices]); F = np.vstack([A.faces, B.faces + len(A.vertices)]); UV = np.vstack([A.visual.uv, B.visual.uv])
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=A.visual.material.baseColorTexture, metallicFactor=0, roughnessFactor=0.9)
m = trimesh.Trimesh(V, F, process=False, visual=trimesh.visual.TextureVisuals(uv=UV, material=mat))
m.export(sys.argv[3]); print('tris', len(F), 'verts', len(V), 'bounds', m.bounds.round(3).tolist())
