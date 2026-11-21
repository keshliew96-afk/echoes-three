# Thickness of the mesh under every vertex: the distance a ray travels from the vertex inward before it leaves the mesh.
# Thin parts (ears, fins, blades, tails) come out small. usage: python3 -I thick.py <in.glb> <out.npy>
import sys, trimesh, numpy as np
m = trimesh.load(sys.argv[1], force='mesh', process=False)
V = np.asarray(m.vertices, float); F = np.asarray(m.faces); N = np.asarray(m.vertex_normals, float)
A = V[F[:, 0]]; E1 = V[F[:, 1]] - A; E2 = V[F[:, 2]] - A
out = np.full(len(V), 9.0)
O = V - N * 1e-4; D = -N
CH = 64
for s in range(0, len(V), CH):
    o = O[s:s + CH][:, None, :]; d = D[s:s + CH][:, None, :]
    P = np.cross(d, E2[None]); det = (E1[None] * P).sum(-1)
    ok = np.abs(det) > 1e-12; inv = np.where(ok, 1 / np.where(ok, det, 1), 0)
    T = o - A[None]; u = (T * P).sum(-1) * inv
    Q = np.cross(T, E1[None]); v = (d * Q).sum(-1) * inv; t = (E2[None] * Q).sum(-1) * inv
    hit = ok & (u >= -1e-6) & (v >= -1e-6) & (u + v <= 1 + 1e-6) & (t > 2e-4)
    t = np.where(hit, t, 9.0); out[s:s + CH] = t.min(1)
np.save(sys.argv[2], out)
print('thickness percentiles', np.percentile(out, [5, 25, 50, 75, 95]).round(3))
