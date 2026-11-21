# write a face-coloured debug glb: dbgglb.write(M, {mask: rgb}, path)
import numpy as np, trimesh
def write(M, cols, path, base=(150, 150, 150)):
    F = M.F; V = M.V[F.reshape(-1)]; FF = np.arange(len(V)).reshape(-1, 3)
    C = np.tile(np.array(base + (255,), np.uint8), (len(F), 1))
    tc = M.tc.astype(float)[:, :3]; tc = tc / 255 if tc.max() > 1.5 else tc
    C[:, :3] = (tc[F].mean(1) * 140 + 60).astype(np.uint8)
    for m, c in cols: C[m, :3] = c
    vc = np.repeat(C, 3, axis=0)
    trimesh.Trimesh(V, FF, vertex_colors=vc, process=False).export(path)
