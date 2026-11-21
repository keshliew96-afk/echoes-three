# The Moss Hart's rig. usage: python3 -I rig.py <mosshart.glb> <outdir> <kit dir> [stage]
# A four-legged stag under a coat of moss: antlers with strands of hanging moss, ears out to the sides, a short tail,
# mushrooms and flowers on its back. One welded piece plus one loose antler shard (floating 8 cm in front of the right
# antler: removed). Legs as the Hollow Stag's: shoulder, elbow, knee, fetlock in front; hip, stifle, hock, fetlock behind.
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); STOP = sys.argv[4] if len(sys.argv) > 4 else ''

# ---- 1. the loose shard goes
keepF = (M.comp == M.main)[M.F].all(1); print('faces removed with the loose shard', int((~keepF).sum()))
used = np.unique(M.F[keepF]); remap = -np.ones(len(M.V), int); remap[used] = np.arange(len(used))
M.V, M.N, M.UV, M.F = M.V[used], M.N[used], M.UV[used], remap[M.F[keepF]]; M.reindex()

# ---- 2. regions
V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(int)[:, :3]; r, g, b = tc.T; grn = (g > r + 4) & (g - b > 45)
Fc = V[M.F].mean(1); X, Y, Z = Fc.T
def vmask(A): v = np.zeros(len(V), bool); v[M.F[A].ravel()] = True; return v
headv = vmask(groove_cut(M, (Y > 0.9) | ((Z > 0.3) & (Y > 0.66)), Y < 0.62))             # the head with the antlers, cut at the throat
STRAND_TOP, STRAND_LEN = 0.815, 0.09
strand = headv & grn & (ax > 0.1) & (y < STRAND_TOP)                                         # the moss that hangs from the antler beams
ear = headv & ~grn & (ax > 0.048) & (ax < 0.112) & (y > 0.728) & (y < 0.80) & (z > 0.15) & (z < 0.26)
skull = headv & ~strand & ~ear & ((y > 0.745) | (z > 0.245))
tail = (z < -0.298) & (y > 0.375) & (y < 0.5) & (ax < 0.035)
fleg = (y < 0.30) & (z > 0.03) & (ax < 0.12) & ~headv
hleg = (z < -0.12) & (y < np.interp(z, [-0.33, -0.27, -0.2, -0.12], [0.38, 0.36, 0.33, 0.29])) & ~tail & ~(grn & (y > 0.27))
face = headv & (z > 0.235) & (y > 0.72) & (y < 0.82) & (ax < 0.07)
antler = headv & ~strand & ~ear & ((y > 0.84) | (ax > 0.09))
print({k: int(v.sum()) for k, v in dict(head=headv, strand=strand, ear=ear, skull=skull, tail=tail, fleg=fleg, hleg=hleg, face=face, antler=antler).items()})
if STOP == 'head':
    hb = headv & (y < 0.8) & (ax < 0.1) & ~strand
    for y0 in np.arange(0.6, 0.8, 0.02):
        m = hb & (y >= y0) & (y < y0 + 0.02)
        if m.sum(): print('head y %.2f n %3d x [%.3f %.3f] z [%.3f %.3f]' % (y0, m.sum(), x[m].min(), x[m].max(), z[m].min(), z[m].max()))
    for nm, mk in (('ear', ear), ('strand', strand)):
        for sg in (1, -1):
            m = mk & (x * sg > 0); print(nm, sg, int(m.sum()), V[m].min(0).round(3), V[m].max(0).round(3), V[m].mean(0).round(3))
    eye = headv & (r > 150) & (g > 120) & (b < 90) & (z > 0.23) & (y > 0.74) & (y < 0.82); print('eye-coloured verts', int(eye.sum()), V[eye].round(3)[:6], tc[eye][:6])
    sys.exit()

# ---- 3. joints
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.5, -0.2]), 'spine': ('hips', [0, 0.5, -0.06]), 'chest': ('spine', [0, 0.5, 0.07]),
 'neck1': ('chest', [0, 0.57, 0.165]), 'neck2': ('neck1', [0, 0.66, 0.19]), 'head': ('neck2', [0, 0.75, 0.205]),
 'tail': ('hips', [0, 0.47, -0.3]),
}
ends = {'head': [0, 0.70, 0.32], 'tail': [0, 0.39, -0.312]}
LEGJ = {
 'L': dict(f=[[0.075, 0.43, 0.13], [0.052, 0.315, 0.10], [0.055, 0.205, 0.09], [0.058, 0.068, 0.085], [0.067, 0, 0.125]],
           h=[[0.06, 0.5, -0.24], [0.05, 0.365, -0.17], [0.04, 0.245, -0.275], [0.044, 0.068, -0.293], [0.051, 0, -0.262]]),
 'R': dict(f=[[-0.075, 0.43, 0.13], [-0.045, 0.315, 0.10], [-0.046, 0.205, 0.106], [-0.05, 0.068, 0.105], [-0.059, 0, 0.15]],
           h=[[-0.06, 0.5, -0.24], [-0.048, 0.365, -0.165], [-0.033, 0.245, -0.275], [-0.038, 0.068, -0.293], [-0.045, 0, -0.262]]),
}
for s, sg in (('L', 1), ('R', -1)):
    J['ear' + s] = ('head', [0.048 * sg, 0.768, 0.195]); ends['ear' + s] = [0.1 * sg, 0.772, 0.18]
    J['moss' + s] = ('head', [0.165 * sg, 0.82, 0.05]); ends['moss' + s] = [0.165 * sg, 0.69, 0.05]
    f, h = LEGJ[s]['f'], LEGJ[s]['h']
    J['fUpper' + s] = ('chest', f[0]); J['fFore' + s] = ('fUpper' + s, f[1]); J['fCannon' + s] = ('fFore' + s, f[2]); J['fHoof' + s] = ('fCannon' + s, f[3]); ends['fHoof' + s] = f[4]
    J['hThigh' + s] = ('hips', h[0]); J['hShin' + s] = ('hThigh' + s, h[1]); J['hCannon' + s] = ('hShin' + s, h[2]); J['hHoof' + s] = ('hCannon' + s, h[3]); ends['hHoof' + s] = h[4]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, np.array(J['spine'][1], float))); segs.append((n, a, a + [0, -0.02, -0.07]))
    elif n == 'chest': segs.append((n, a, np.array(J['neck1'][1], float))); segs.append((n, a, a + [0, -0.08, 0.1]))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))

def vis_of(n, d):
    side = (x * (1 if n[-1] == 'L' else -1) > 0) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n.startswith('ear'): return ear & side
    if n.startswith('moss'): return strand & side
    if n == 'head': return headv & ~ear & ~strand
    if n == 'tail': return tail
    if n[:5] in ('fFore', 'fCann', 'fHoof'): return fleg & side
    if n[:5] in ('hShin', 'hCann', 'hHoof'): return hleg & side
    core = ~(headv | tail | fleg | hleg)
    if n.startswith('fUpper'): return core & side & (ax > 0.03) & (d < 0.075) & (y < 0.47) & (z > 0.03)
    if n.startswith('hThigh'): return core & side & (ax > 0.025) & (d < 0.085) & (y < 0.52) & (z < -0.1)
    if n in ('neck1', 'neck2'): return core & (z > 0.05) & (y > 0.5)
    if n == 'hips': return core & (z < 0.0)
    if n == 'chest': return core & (z > -0.1)
    return core
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(skull, 'head')
for s, sg in (('L', 1), ('R', -1)):
    k = strand & (x * sg > 0); w = np.clip((STRAND_TOP - y[k]) / STRAND_LEN, 0, 1); w = w * w * (3 - 2 * w)      # a strand bends away from the beam it hangs on
    W[k] = 0; W[k, ix['moss' + s]] = w; W[k, ix['head']] = 1 - w
    k = ear & (x * sg > 0); w = np.clip((ax[k] - 0.048) / 0.025, 0, 1)
    W[k] = 0; W[k, ix['ear' + s]] = w; W[k, ix['head']] = 1 - w
    force(fleg & (x * sg > 0) & (y < 0.045), 'fHoof' + s); force(hleg & (x * sg > 0) & (y < 0.045), 'hHoof' + s)           # hooves stay hard
finish(M, J, ends, W, names, out, [face, antler, strand], fallback='spine')
print('tris', len(M.F), 'bones', len(names) - 1)
