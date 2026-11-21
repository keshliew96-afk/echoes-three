# paintmask.py <glb> <kit> <regions.npz> <out.glb> names...: paint faces whose corners all lie in a region, one colour per region
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np, trimesh
from PIL import ImageDraw
from rigkit import Mesh
M = Mesh(sys.argv[1]); R = np.load(sys.argv[3]); tex = M.m.visual.material.baseColorTexture.convert('RGB').copy(); W, H = tex.size; d = ImageDraw.Draw(tex)
pal = [(255,0,0),(0,200,0),(0,80,255),(255,220,0),(255,0,255),(0,230,230)]
# repaint every face (so islands shared with other regions keep their texture elsewhere): duplicate UVs per face onto a fresh strip
F = M.F; nf = len(F); UV = np.zeros((nf * 3, 2)); V = M.V[F].reshape(-1, 3); N = M.N[F].reshape(-1, 3)
cols = np.full((nf, 3), -1)
for i, n in enumerate(sys.argv[5:]): cols[R[n][F].all(1)] = pal[i]
# faces keep their own UVs unless coloured: coloured faces map to a solid pixel block added at the texture's corner
from PIL import Image
big = Image.new('RGB', (W, H + 64)); big.paste(tex, (0, 0)); bd = ImageDraw.Draw(big)
for i, c in enumerate(pal): bd.rectangle([i * 64, H, i * 64 + 63, H + 63], fill=c)
for f in range(nf):
    for k in range(3):
        if cols[f][0] < 0: u, v = M.UV[F[f][k]]; UV[f * 3 + k] = [u, (v * H + 64) / (H + 64)]
        else:
            i = pal.index(tuple(cols[f])); UV[f * 3 + k] = [(i * 64 + 32) / W, 32 / (H + 64)]
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=big, metallicFactor=0.0, roughnessFactor=1.0)
trimesh.Trimesh(V, np.arange(nf * 3).reshape(-1, 3), vertex_normals=N, visual=trimesh.visual.TextureVisuals(uv=UV, material=mat), process=False).export(sys.argv[4])
