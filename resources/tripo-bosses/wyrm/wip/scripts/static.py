import sys, numpy as np, trimesh
from PIL import Image
d = sys.argv[1]
V = np.fromfile(d + '/b_pos.bin', '<f4').reshape(-1, 3); F = np.fromfile(d + '/b_idx.bin', '<u4').reshape(-1, 3); UV = np.fromfile(d + '/b_uv.bin', '<f4').reshape(-1, 2); N = np.fromfile(d + '/b_nrm.bin', '<f4').reshape(-1, 3)
im = Image.open(d + '/body_tex.jpg')
m = trimesh.Trimesh(V, F, vertex_normals=N, visual=trimesh.visual.TextureVisuals(uv=UV, material=trimesh.visual.material.PBRMaterial(baseColorTexture=im, metallicFactor=0.0, roughnessFactor=0.9)), process=False)
m.export(sys.argv[2])
