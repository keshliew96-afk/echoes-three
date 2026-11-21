# Cut the coal sack (with its coals and the fold over the shoulder) free of the shoulder, back and head it is welded to,
# so it can be heaved and hurled without dragging the body. The sack's faces are whole UV islands (picked by painting
# them), so the cut runs along the texture seams. usage: python3 -I cut.py <in.glb> <out.glb> <kit dir> <islands.npy>
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np, trimesh
from rigkit import Mesh, Editor
M = Mesh(sys.argv[1]); lab = np.load(sys.argv[4]); V = M.V; x, y, z = V.T
SACK = [0, 1, 2, 4, 9, 19, 43]; COAL = [6, 18, 36, 42]
sack = np.isin(lab, SACK + COAL)
A = sack[M.F].all(1)
print('sack faces', A.sum(), 'of', len(M.F), 'mixed', (sack[M.F].any(1) & ~A).sum())
E = Editor(M)
bodyuv = M.UV[(lab == 5)][0]  # the upper arm's skin
UV_VEST = M.UV[(lab == 11)][len(M.UV[lab == 11]) // 2]  # the vest's leather, for the big cap
sackuv = M.UV[(lab == 0)][len(M.UV[lab == 0]) // 2]
E.split(A, 'sack', bodyuv, sackuv); M = E.done()
tn = {v: k for k, v in M.tags.items()}
# the body's big cap is a jagged flat sheet where the sack sat on the back (there is no back under the sack): refan it
# from a point a little inside its middle so it reads as a shallow hollow, painted the vest's leather, smooth shaded
hole = np.array([tn[t] == 'sack.hole' for t in M.tag]); CF = hole[M.F].all(1)
from collections import Counter
cnt = Counter(); own = {}
for f in M.F[CF]:
    for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])): cnt[frozenset((a, b))] += 1; own[frozenset((a, b))] = (a, b)
rim = [own[e] for e, c in cnt.items() if c == 1]
nxt = {a: b for a, b in rim}; loops = []; seen = set()
for a in nxt:
    if a in seen: continue
    L = [a]; seen.add(a); b = nxt[a]
    while b != a and b not in seen: L.append(b); seen.add(b); b = nxt[b]
    loops.append(L)
L = max(loops, key=len); Ls = set(L)
fn = np.cross(M.V[M.F[CF][:, 1]] - M.V[M.F[CF][:, 0]], M.V[M.F[CF][:, 2]] - M.V[M.F[CF][:, 0]])
bigF = np.array([set(f) <= Ls for f in M.F[CF]]); nout = fn[bigF].sum(0); nout /= np.linalg.norm(nout)
cen = M.V[L].mean(0); C = cen - 0.03 * nout; ci = len(M.V)
vest = M.UV[ci - 1] if False else UV_VEST
M.V = np.vstack([M.V, C]); M.UV = np.vstack([M.UV, vest]); M.N = np.vstack([M.N, nout]); M.tag = np.append(M.tag, M.tags['sack.hole'])
drop = np.zeros(len(M.F), bool); drop[np.nonzero(CF)[0][bigF]] = True
M.F = np.vstack([M.F[~drop], np.array([[L[k], L[(k + 1) % len(L)], ci] for k in range(len(L))])])
# each fan face keeps its rim edge's direction from the old cap, so it faces the same way
capv = np.array(L + [ci]); M.N[capv] = nout; M.UV[capv] = vest
print('refanned the big cap: rim', len(L), 'normal', nout.round(2))
rides = np.array([tn[t] in ('sack', 'sack.lid') for t in M.tag])
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0.0, roughnessFactor=1.0)
out = trimesh.Trimesh(M.V, M.F, vertex_normals=M.N, visual=trimesh.visual.TextureVisuals(uv=M.UV, material=mat), process=False)
np.save(sys.argv[2][:-4] + '.sack.npy', rides)
out.export(sys.argv[2]); print('wrote', sys.argv[2], 'verts', len(M.V), 'tris', len(M.F), 'sack verts', rides.sum(),
  'hole', sum(tn[t] == 'sack.hole' for t in M.tag), 'lid', sum(tn[t] == 'sack.lid' for t in M.tag))
