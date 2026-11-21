# paint.py <glb> <kit> <out.glb> ids...: repaint the texture under the given UV islands in distinct flat colours (to see them in renders)
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np, trimesh
from PIL import Image, ImageDraw
from rigkit import Mesh
M = Mesh(sys.argv[1]); lab = np.load('islands.npy'); ids = [int(a) for a in sys.argv[4:]]
tex = M.m.visual.material.baseColorTexture.convert('RGB').copy(); W, H = tex.size; d = ImageDraw.Draw(tex)
pal = [(255,0,0),(0,200,0),(0,80,255),(255,220,0),(255,0,255),(0,230,230),(255,128,0),(128,0,255),(0,0,0),(255,255,255),(128,64,0),(0,128,64)]
for i, l in enumerate(ids):
    for f in M.F[lab[M.F[:, 0]] == l]:
        d.polygon([(M.UV[v][0] * W, (1 - M.UV[v][1]) * H) for v in f], fill=pal[i % len(pal)])
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=tex, metallicFactor=0.0, roughnessFactor=1.0)
trimesh.Trimesh(M.V, M.F, vertex_normals=M.N, visual=trimesh.visual.TextureVisuals(uv=M.UV, material=mat), process=False).export(sys.argv[3])
for i, l in enumerate(ids): print(l, pal[i % len(pal)])
