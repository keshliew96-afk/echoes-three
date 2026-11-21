# Quadruped boss rig: joints and skin weights for the Tripo Hollow Stag.
# usage: python3 -I rig.py <in.glb> <outdir>
# Writes skel.json, b_*.bin (positions, normals, uvs, indices, joints, weights), body_tex.jpg, dbg_w.glb.
import sys, json
import trimesh, numpy as np, scipy.sparse as sp, scipy.sparse.linalg as spl, scipy.sparse.csgraph as cg
src, out = sys.argv[1], sys.argv[2]
m = trimesh.load(src, force='mesh', process=False)
V = np.asarray(m.vertices, float); F = np.asarray(m.faces); N = np.asarray(m.vertex_normals, float); UV = np.asarray(m.visual.uv, float)
tex = np.asarray(m.visual.material.baseColorTexture.convert('RGB')).astype(int); TH, TW = tex.shape[:2]
tc = tex[np.clip(((1 - UV[:, 1] % 1) * (TH - 1)).astype(int), 0, TH - 1), np.clip(((UV[:, 0] % 1) * (TW - 1)).astype(int), 0, TW - 1)]
XC = 0.013  # the body's centre line (the model sits a little to its left)
# name: (parent, joint position). Identity bind rotations: a joint is only an offset from its parent.
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [XC, 0.455, -0.235]),
 'spine': ('hips', [XC, 0.44, -0.085]),
 'chest': ('spine', [XC, 0.44, 0.055]),
 'neck1': ('chest', [XC, 0.495, 0.15]),
 'neck2': ('neck1', [XC + 0.004, 0.595, 0.195]),
 'head': ('neck2', [XC + 0.008, 0.685, 0.215]),
 'earL': ('head', [0.066, 0.715, 0.19]), 'earR': ('head', [-0.040, 0.715, 0.205]),
 'crown': ('head', [0.032, 0.81, 0.241]),
 'tail1': ('hips', [0.02, 0.45, -0.285]), 'tail2': ('tail1', [0.05, 0.468, -0.325]),
 # front legs: shoulder, elbow, knee (carpus), fetlock
 'fUpperL': ('chest', [0.083, 0.42, 0.15]), 'fForeL': ('fUpperL', [0.064, 0.31, 0.122]), 'fCannonL': ('fForeL', [0.058, 0.20, 0.128]), 'fHoofL': ('fCannonL', [0.054, 0.065, 0.124]),
 'fUpperR': ('chest', [-0.057, 0.42, 0.15]), 'fForeR': ('fUpperR', [-0.038, 0.31, 0.124]), 'fCannonR': ('fForeR', [-0.031, 0.20, 0.129]), 'fHoofR': ('fCannonR', [-0.025, 0.065, 0.125]),
 # hind legs: hip, stifle, hock, fetlock
 'hThighL': ('hips', [0.075, 0.47, -0.255]), 'hShinL': ('hThighL', [0.07, 0.345, -0.175]), 'hCannonL': ('hShinL', [0.067, 0.225, -0.32]), 'hHoofL': ('hCannonL', [0.066, 0.068, -0.333]),
 'hThighR': ('hips', [-0.06, 0.47, -0.25]), 'hShinR': ('hThighR', [-0.058, 0.345, -0.165]), 'hCannonR': ('hShinR', [-0.049, 0.212, -0.282]), 'hHoofR': ('hCannonR', [-0.051, 0.066, -0.258]),
}
ends = {'head': [0.062, 0.625, 0.355], 'earL': [0.14, 0.73, 0.15], 'earR': [-0.10, 0.725, 0.21], 'tail2': [0.098, 0.505, -0.358],
        'fHoofL': [0.062, 0.0, 0.158], 'fHoofR': [-0.034, 0.0, 0.158], 'hHoofL': [0.068, 0.0, -0.298], 'hHoofR': [-0.055, 0.0, -0.215], 'crown': [0.032, 0.84, 0.241]}
names = list(J.keys()); nb = len(names); ix = {n: i for i, n in enumerate(names)}
segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float)
    kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.02, -0.05]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck1'][1], float))); segs.append((n, a, a + [0, -0.08, 0.06]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
def segdist(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1); c = a + np.outer(t, ab); return np.linalg.norm(P - c, axis=1)

# weld and components
key = np.round(V, 5); uq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel(); nw = len(uq)
E_ = np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]); E_ = inv[E_]; E_ = E_[E_[:, 0] != E_[:, 1]]
A = sp.coo_matrix((np.ones(2 * len(E_)), (np.r_[E_[:, 0], E_[:, 1]], np.r_[E_[:, 1], E_[:, 0]])), shape=(nw, nw)).tocsr(); A.data[:] = 1.0
nc, lab = cg.connected_components(A, directed=False); cnt = np.bincount(lab); main = cnt.argmax(); comp = lab[inv]
print('verts', len(V), 'tris', len(F), 'welded', nw, 'pieces', nc, sorted(cnt.tolist(), reverse=True)[:6])

x = V[:, 0] - XC; ax = np.abs(x); y = V[:, 1]; z = V[:, 2]
hide = (tc[:, 1] - tc[:, 0] > 3) & (tc.sum(1) < 330)       # slate hide (antlers are warmer and darker)
star = np.zeros(len(V), bool)
for c in range(nc):
    k = comp == c
    if c != main and V[k, 1].mean() < 0.88 and np.abs(V[k, 0]).max() < 0.1: star |= k
antler = (y > 0.745) & ~star & ~((y < 0.765) & hide)
antler |= (comp != main) & ~star
ear = (y > 0.675) & (y < 0.775) & hide & ~antler & (((x > 0.058) & (z < 0.245)) | (x < -0.048))
headm = ((y > 0.585) & (z > 0.215 + (0.685 - y) * 0.2)) | (y > 0.70)
headm &= ~ear & ~star
tail = (z < -0.292) & (y > 0.385) & (y < 0.56)
# lower legs: clear of the belly. The front legs leave the chest at y 0.29, the hind legs leave the groin at y 0.36.
fleg = (y < 0.292) & (z > 0.06)
hleg = (z < -0.10) & (y < np.interp(z, [-0.36, -0.26, -0.16, -0.10], [0.40, 0.365, 0.355, 0.30])) & ~tail
print('star', int(star.sum()), 'antler', int(antler.sum()), 'ear', int(ear.sum()), 'head', int(headm.sum()), 'tail', int(tail.sum()), 'fleg', int(fleg.sum()), 'hleg', int(hleg.sum()))

D = np.full((len(V), nb), np.inf); vis = np.zeros((len(V), nb), bool)
for n, a, b in segs:
    d = segdist(V, a, b); j = ix[n]
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' and n[0] in 'fhe' else np.ones(len(V), bool)
    if n.startswith('ear'): ok = ear & side
    elif n == 'crown': ok = star
    elif n == 'head': ok = headm | antler
    elif n.startswith('tail'): ok = tail
    elif n[:5] in ('fFore', 'fCann', 'fHoof'): ok = fleg & side
    elif n[:5] in ('hShin', 'hCann', 'hHoof'): ok = hleg & side
    elif n.startswith('fUpper'): ok = side & ~fleg & ~headm & (ax > 0.035) & (d < 0.075) & (y < 0.47) & (z > 0.04)
    elif n.startswith('hThigh'): ok = side & ~hleg & ~tail & (ax > 0.03) & (d < 0.085) & (y < 0.52) & (z < -0.12)
    else: ok = ~(ear | star | antler | headm | tail | fleg | hleg)
    if n in ('neck1', 'neck2'): ok = ok & (z > 0.02)
    if n in ('hips',): ok = ok & (z < 0.0)
    if n in ('chest',): ok = ok & (z > -0.12)
    better = d < D[:, j]; D[better, j] = d[better]; vis[better, j] = ok[better]
# the lower legs belong to the leg bones only
lower = [ix[n] for n in names if n[:5] in ('fFore', 'fCann', 'fHoof', 'hShin', 'hCann', 'hHoof')]
anyl = vis[:, lower].any(1)
for n in ('hips', 'spine', 'chest', 'neck1', 'neck2', 'head'): vis[anyl, ix[n]] = False

L = sp.diags(np.asarray(A.sum(1)).ravel()) - A
Dw = np.full((nw, nb), np.inf); Dm = np.where(vis, D, np.inf); np.minimum.at(Dw, inv, Dm)
near = Dw.argmin(1); dn = Dw.min(1); has = np.isfinite(dn)
print('verts without a bone in sight', int((~has).sum()), 'of', nw)
Hc = np.where(has, 0.0015 / (dn ** 2 + 1e-6), 0)
Mx = (L + sp.diags(Hc) + sp.eye(nw) * 1e-9).tocsc(); solve = spl.factorized(Mx)
Ww = np.zeros((nw, nb))
for j in range(nb):
    p = Hc * (near == j)
    if p.any(): Ww[:, j] = solve(p)
Ww = np.clip(Ww, 0, None)
W = Ww[inv]
# rigid parts: antlers and the skull's top with the head, the star with its own joint
def force(mask, n):
    W[mask] = 0; W[mask, ix[n]] = 1
force(antler, 'head'); force(star, 'crown')
skull = headm & (y > 0.64) & (z > 0.24)
force(skull, 'head')
for mk, sfx, grp in ((fleg, None, None),):
    pass
# hooves stay hard: under the fetlock a hoof moves as one piece
for n in ('fHoofL', 'fHoofR', 'hHoofL', 'hHoofR'):
    a = np.array(J[n][1]); k = (fleg if n[0] == 'f' else hleg) & (np.sign(x) == (1 if n[-1] == 'L' else -1)) & (y < 0.045)
    force(k, n)
W[W.sum(1) == 0, ix['spine']] = 1
idx = np.argsort(-W, axis=1)[:, :4]; val = np.take_along_axis(W, idx, 1); val[val < 0.02 * val[:, :1]] = 0; val /= val.sum(1, keepdims=True)
print('dominant:', {names[j]: int((idx[:, 0] == j).sum()) for j in range(nb)})
json.dump({'names': names, 'parents': [J[n][0] for n in names], 'pos': [J[n][1] for n in names], 'ends': ends, 'xc': XC}, open(out + '/skel.json', 'w'))
V.astype('<f4').tofile(out + '/b_pos.bin'); N.astype('<f4').tofile(out + '/b_nrm.bin'); UV.astype('<f4').tofile(out + '/b_uv.bin'); F.astype('<u4').tofile(out + '/b_idx.bin')
idx.astype('<u2').tofile(out + '/b_ji.bin'); val.astype('<f4').tofile(out + '/b_jw.bin')
violet = (tc[:, 2] - tc[:, 1] > 45) & (tc[:, 0] > 110)   # the crystals down the neck and back
np.c_[antler.astype(float), violet.astype(float), star.astype(float)].astype('<f4').tofile(out + '/b_mask.bin')
print('glow masks: antler', int(antler.sum()), 'crystal', int(violet.sum()), 'star', int(star.sum()))
m.visual.material.baseColorTexture.convert('RGB').save(out + '/body_tex.jpg', quality=90)
rng = np.random.RandomState(5); pal = (rng.rand(nb, 3) * 200 + 55)
vc = np.clip((val[:, :, None] * pal[idx]).sum(1), 0, 255).astype(np.uint8); vc = np.c_[vc, np.full(len(V), 255, np.uint8)]
trimesh.Trimesh(V, F, vertex_colors=vc, process=False).export(out + '/dbg_w.glb')
# joint overlay for checking
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
fig, axs = plt.subplots(1, 3, figsize=(30, 12))
for a, (nm, k, sgn) in zip(axs, (('left', V[:, 0] > XC, 1), ('right', V[:, 0] < XC, -1), ('front', V[:, 2] > -10, 0))):
    h = 0 if sgn == 0 else 2
    a.scatter(V[k, h], V[k, 1], s=1, c=vc[k, :3] / 255)
    for n in names:
        if n == 'root': continue
        if sgn and n[-1] in 'LR' and n[0] in 'fhe' and (1 if n[-1] == 'L' else -1) != sgn: continue
        p = np.array(J[n][1]); q = np.array(J[J[n][0]][1]) if J[n][0] != 'root' else p
        a.plot([q[h], p[h]], [q[1], p[1]], 'k-', lw=1.5); a.plot(p[h], p[1], 'ro', ms=5)
        if n in ends: e = np.array(ends[n]); a.plot([p[h], e[h]], [p[1], e[1]], 'k--', lw=1)
    a.set_aspect('equal'); a.set_title(nm); a.grid(True, lw=0.3); a.set_xticks(np.arange(-0.4, 0.41, 0.05)); a.set_yticks(np.arange(0, 1.01, 0.05))
plt.tight_layout(); plt.savefig(out + '/rig_overlay.png', dpi=70)
