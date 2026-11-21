# Step 1: copy each rear leg (the third pair), swing it back about its hip, and write the two copies as one GLB.
# usage: python3 -I leg4.py <in.glb> <kit> <out legs.glb> <angle deg> <shift z>
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np, trimesh
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; x, y, z = V.T; ax = np.abs(x)
ang = np.radians(float(sys.argv[4])); dz = float(sys.argv[5])
lab = M.comps((ax > 0.17) & (y < 0.5))
Vs, Fs, UVs = [], [], []; off = 0
for sg in (1, -1):
    seed = np.argmin(np.where((ax > 0.4) & (np.abs(z + 0.02) < 0.03) & (np.sign(x) == sg), y, 9))
    m = lab == lab[seed]; F = M.F[m[M.F].all(1)]
    used = np.unique(F); remap = -np.ones(len(V), int); remap[used] = np.arange(len(used))
    P = V[used].copy(); piv = np.array([0.2 * sg, 0, 0.02])
    d = P - piv; c, s = np.cos(ang), np.sin(ang)
    # swing back: rotate about the vertical axis through the hip, the tip turning toward -z
    a = ang * sg
    rx = d[:, 0] * np.cos(a) + d[:, 2] * np.sin(a); rz = -d[:, 0] * np.sin(a) + d[:, 2] * np.cos(a)
    P = np.c_[piv[0] + rx, P[:, 1], piv[2] + rz + dz]
    Vs.append(P); Fs.append(remap[F] + off); UVs.append(M.UV[used]); off += len(used)
    tip = P[P[:, 1].argmin()]; knee = P[P[:, 1].argmax()]
    print('side', sg, 'verts', len(used), 'faces', len(F), 'tip', tip.round(3), 'knee', knee.round(3))
V2 = np.vstack(Vs); F2 = np.vstack(Fs); UV2 = np.vstack(UVs)
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0, roughnessFactor=0.9)
tm = trimesh.Trimesh(V2, F2, process=False, visual=trimesh.visual.TextureVisuals(uv=UV2, material=mat))
tm.export(sys.argv[3]); print('wrote', sys.argv[3], len(F2))
