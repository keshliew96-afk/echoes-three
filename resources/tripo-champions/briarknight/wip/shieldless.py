# Takes the round shield off the Briar Knight's left arm: the shield fused into the outer half of his left forearm, so the whole left arm
# below the pauldron is replaced by a mirror of his right (sword) arm, whose fist is closed where the sword grip ran through.
# usage: python3 -I shieldless.py <kit dir> <in.glb> <out.glb>   (reads wip/AL.npy, wip/L.npy, wip/R.npy from cutL.py and forearms.py)
import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, trimesh, scipy.sparse as sp, scipy.sparse.csgraph as cg
from rigkit import Mesh, face_graph, loops_of, cap_loop
M = Mesh(sys.argv[2]); V = M.V; F = M.F; UV = M.UV; N = M.N; g = face_graph(M); fc = g['fc']; Vw = g['Vw']
A = np.load('wip/AL.npy'); L = np.load('wip/L.npy') | A; R = np.load('wip/R.npy')
st = R & (fc[:, 2] > 0.0) & (fc[:, 1] > 0.5) & (fc[:, 1] < 0.57)          # the sword grip's stub through the right fist
Rm = R & ~st
keep = ~L
a, b = g['a'], g['b']; ok = keep[a] & keep[b]
G0 = sp.coo_matrix((np.ones(ok.sum()), (a[ok], b[ok])), shape=(len(F), len(F))).tocsr(); nc0, lab0 = cg.connected_components(G0, directed=False)
cnt = np.bincount(lab0[keep], minlength=nc0); isl = keep & (cnt[lab0] < 80) & (fc[:, 0] > 0.1) & (fc[:, 1] > 0.33)
print('shield faces', int(A.sum()), 'left arm faces removed', int(L.sum()), 'floating bits dropped', int(isl.sum())); keep &= ~isl
one = np.zeros(M.nw, int); one[M.inv] = np.arange(len(V))             # a vertex for each welded id (its uv)
def cap(lp, mirror):
    P = Vw[lp]; pts, tris = cap_loop(P); u0 = UV[one[lp[0]]]
    if mirror: pts = pts * [-1, 1, 1]; tris = tris[:, ::-1]
    return pts, np.tile(u0, (len(pts), 1)), tris
parts = [(V, UV, N, F[keep])]
# the mirrored right arm
vid = np.unique(F[Rm]); rm = np.full(len(V), -1); rm[vid] = np.arange(len(vid))
parts.append((V[vid] * [-1, 1, 1], UV[vid], N[vid] * [-1, 1, 1], rm[F[Rm]][:, ::-1]))
for lp in loops_of(M, st):
    p, u, t = cap(lp, True); n_ = np.cross(p[t[:, 1]] - p[t[:, 0]], p[t[:, 2]] - p[t[:, 0]]).sum(0); parts.append((p, u, np.tile(n_ / np.linalg.norm(n_), (len(p), 1)), t)); print('fist hole closed', len(lp))
for lp in sorted(loops_of(M, L), key=len, reverse=True)[1:]:
    p, u, t = cap(lp, False); n_ = np.cross(p[t[:, 1]] - p[t[:, 0]], p[t[:, 2]] - p[t[:, 0]]).sum(0); parts.append((p, u, np.tile(n_ / np.linalg.norm(n_), (len(p), 1)), t)); print('small hole closed', len(lp), Vw[lp].mean(0).round(3))
Vn, UVn, Nn, Fn = [], [], [], []; base = 0
for p, u, n_, t in parts: Vn.append(p); UVn.append(u); Nn.append(n_); Fn.append(t + base); base += len(p)
Vn, UVn, Nn, Fn = np.vstack(Vn), np.vstack(UVn), np.vstack(Nn), np.vstack(Fn)
used = np.zeros(len(Vn), bool); used[Fn.ravel()] = True; remap = np.cumsum(used) - 1; Vn, UVn, Nn = Vn[used], UVn[used], Nn[used]; Fn = remap[Fn]
m = trimesh.Trimesh(Vn, Fn, process=False); m.visual = trimesh.visual.TextureVisuals(uv=UVn, material=M.m.visual.material); m.vertex_normals = Nn
m.export(sys.argv[3]); print('out', sys.argv[3], 'verts', len(Vn), 'tris', len(Fn))
