# Removes the extra shield Tripo fused onto the Briar Knight's sword arm and rebuilds the outer half of the forearm.
# usage: python3 -I unshield.py <kit dir> <in.glb> <out.glb>
import sys; sys.path.insert(0, sys.argv[1]); sys.path.insert(0, 'wip')
import numpy as np, trimesh
from PIL import Image
from scipy.spatial import Delaunay
from scipy.ndimage import distance_transform_edt
from matplotlib.path import Path
from rigkit import Mesh, face_graph, groove_cut, loops_of, _earclip
M = Mesh(sys.argv[2]); V = M.V; F = M.F; UV = M.UV
g = face_graph(M); fc = g['fc']; fn = g['fn']; Vw = g['Vw']
pl = np.load('wip/plane.npy'); cb, nb, cf, nf = pl[:3], pl[3:6], pl[6:9], pl[9:]
n = nb; ey = np.array([0, 1, 0.]); ev = ey - (ey @ n) * n; ev /= np.linalg.norm(ev); eu = np.cross(ev, n)
u = (fc - cb) @ eu; v = (fc - cb) @ ev; d = (fc - cb) @ n; dv = ((V - cb) @ n)[F]; r = np.hypot(u + 0.015, v - 0.022)
src = ((abs(d) < 0.004) & ((fn @ n) < -0.85) & (r < 0.17)) | ((abs((fc - cf) @ nf) < 0.004) & ((fn @ nf) > 0.85) & (r < 0.17))
sink = (dv.max(1) < -0.012) | (r > 0.21) | (dv.min(1) > 0.08)
A = groove_cut(M, src, sink); print('shield faces', A.sum())
loops = sorted(loops_of(M, A), key=len, reverse=True)

# ---- the forearm shell that is left: faces reachable from the big rim without leaving the forearm's box
main = loops[0]; R3 = Vw[main]; R2 = np.c_[(R3 - cb) @ eu, (R3 - cb) @ ev]; Rd = (R3 - cb) @ n
print('main rim', len(main), 'u', R2[:, 0].min().round(3), R2[:, 0].max().round(3), 'v', R2[:, 1].min().round(3), R2[:, 1].max().round(3), 'd', Rd.min().round(3), Rd.max().round(3))
keep = ~A
Fw = M.inv[F]
P = Vw[Fw]                                   # triangles in welded positions
lo, hi = R2.min(0) - 0.012, R2.max(0) + 0.012
inbox = keep & (u > lo[0]) & (u < hi[0]) & (v > lo[1]) & (v < hi[1]) & (d > -0.085) & (d < 0.02)
# flood from the faces that touch the rim
rimset = np.zeros(M.nw, bool); rimset[main] = True
seed = inbox & rimset[Fw].any(1)
a, b = g['a'], g['b']; ok = inbox[a] & inbox[b]
import scipy.sparse as sp, scipy.sparse.csgraph as cg
G = sp.coo_matrix((np.ones(ok.sum()), (a[ok], b[ok])), shape=(len(F), len(F))).tocsr()
nc, lab = cg.connected_components(G, directed=False); shell = np.isin(lab, np.unique(lab[seed])) & inbox
print('shell faces', shell.sum(), 'of inbox', inbox.sum())
np.save('wip/shell.npy', shell)

def cast(U2):
    """deepest hit of the shell under each (u,v), looking along -n. Returns depth (>0 inward, nan if none), face id, barycentric"""
    T = P[shell]; ids = np.nonzero(shell)[0]
    t0 = np.c_[(T[:, 0] - cb) @ eu, (T[:, 0] - cb) @ ev]; t1 = np.c_[(T[:, 1] - cb) @ eu, (T[:, 1] - cb) @ ev]; t2 = np.c_[(T[:, 2] - cb) @ eu, (T[:, 2] - cb) @ ev]
    z = np.c_[(T[:, 0] - cb) @ n, (T[:, 1] - cb) @ n, (T[:, 2] - cb) @ n]
    den = (t1[:, 1] - t2[:, 1]) * (t0[:, 0] - t2[:, 0]) + (t2[:, 0] - t1[:, 0]) * (t0[:, 1] - t2[:, 1]); good = abs(den) > 1e-12
    dep = np.full(len(U2), np.nan); fid = np.full(len(U2), -1); bc = np.zeros((len(U2), 3))
    for s in range(0, len(U2), 4000):
        q = U2[s:s + 4000]
        w0 = ((t1[:, 1] - t2[:, 1])[None] * (q[:, 0:1] - t2[:, 0][None]) + (t2[:, 0] - t1[:, 0])[None] * (q[:, 1:2] - t2[:, 1][None])) / np.where(good, den, 1)[None]
        w1 = ((t2[:, 1] - t0[:, 1])[None] * (q[:, 0:1] - t2[:, 0][None]) + (t0[:, 0] - t2[:, 0])[None] * (q[:, 1:2] - t2[:, 1][None])) / np.where(good, den, 1)[None]
        w2 = 1 - w0 - w1; ins = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6) & good[None]
        zz = w0 * z[:, 0][None] + w1 * z[:, 1][None] + w2 * z[:, 2][None]; zz = np.where(ins, -zz, -np.inf)   # depth inward
        k = zz.argmax(1); best = zz[np.arange(len(q)), k]; hit = np.isfinite(best)
        dep[s:s + 4000] = np.where(hit, best, np.nan); fid[s:s + 4000] = np.where(hit, ids[k], -1)
        bc[s:s + 4000] = np.c_[w0[np.arange(len(q)), k], w1[np.arange(len(q)), k], w2[np.arange(len(q)), k]]
    return dep, fid, bc

# ---- triangulate the hole: the rim plus a grid of inner points
GRID = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0075; SMAX = 1.6; WS = 2.0
def crossings(Q):
    m = len(Q); out = []
    cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    for i in range(m):
        for j in range(i + 2, m):
            if i == 0 and j == m - 1: continue
            a, b, c, e = Q[i], Q[(i + 1) % m], Q[j], Q[(j + 1) % m]
            if cr(a, b, c) * cr(a, b, e) < 0 and cr(c, e, a) * cr(c, e, b) < 0: out.append((i, j))
    return out
# the rim is not flat, so its shadow on the plane crosses itself in a few kinks: triangulate on a slightly relaxed copy of the shadow
Rr3 = R3.copy()
for attempt in range(8):
    R2t = np.c_[(Rr3 - cb) @ eu, (Rr3 - cb) @ ev]; R2 = R2t.copy(); nr = len(R2); it = 0
    while crossings(R2) and it < 60:
        bad = set()
        for i, j in crossings(R2): bad.update(range(i - 1, i + 3)); bad.update(range(j - 1, j + 3))
        for k in bad: k %= nr; R2[k] = 0.5 * R2[k] + 0.25 * (R2[k - 1] + R2[(k + 1) % nr])
        it += 1
    print('rim relaxed in', it, 'passes; moved by up to', np.linalg.norm(R2 - R2t, axis=1).max().round(4))
    path = Path(R2); lo2, hi2 = R2.min(0), R2.max(0)
    gx, gy = np.meshgrid(np.arange(lo2[0], hi2[0], GRID), np.arange(lo2[1], hi2[1], GRID * 0.866)); gx[1::2] += GRID / 2; Gp = np.c_[gx.ravel(), gy.ravel()]
    dd = np.min(np.linalg.norm(Gp[:, None] - R2[None], axis=2), axis=1); Gp = Gp[path.contains_points(Gp) & (dd > GRID * 0.55)]
    mid = (R2 + np.roll(R2, -1, 0)) / 2; rad = np.linalg.norm(R2 - np.roll(R2, -1, 0), axis=1) / 2          # keep clear of each rim edge's circle, so the edge survives
    Gp = Gp[(np.linalg.norm(Gp[:, None] - mid[None], axis=2) > rad[None] * 1.02).all(1)]
    Q2 = np.r_[R2, Gp]; T = Delaunay(Q2).simplices; T = T[path.contains_points(Q2[T].mean(1))]
    d1 = Q2[T[:, 1]] - Q2[T[:, 0]]; d2 = Q2[T[:, 2]] - Q2[T[:, 0]]; ar = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]; T = T[abs(ar) > 1e-10]; ar = ar[abs(ar) > 1e-10]
    es = set(); [es.update({(t[0], t[1]), (t[1], t[2]), (t[2], t[0]), (t[1], t[0]), (t[2], t[1]), (t[0], t[2])}) for t in T.tolist()]
    miss = [i for i in range(nr) if (i, (i + 1) % nr) not in es]
    if not miss: break
    for i in reversed(miss): Rr3 = np.insert(Rr3, i + 1, (Rr3[i] + Rr3[(i + 1) % nr]) / 2, axis=0)
assert not miss, 'rim edges missing'
print('patch: rim pts', nr, '(from', len(main), ') inner', len(Gp), 'tris', len(T))
# ---- the patch's height: a thin plate that leaves the rim at the slope the forearm's own surface arrives with
import scipy.sparse.linalg as spl
area2 = lambda Q: 0.5 * sum(Q[i][0] * Q[(i + 1) % len(Q)][1] - Q[(i + 1) % len(Q)][0] * Q[i][1] for i in range(len(Q)))
sgn = 1 if area2(R2) > 0 else -1
tan2 = np.roll(R2, -1, 0) - np.roll(R2, 1, 0); tan2 /= np.linalg.norm(tan2, axis=1, keepdims=True) + 1e-12
m2 = sgn * np.c_[-tan2[:, 1], tan2[:, 0]]                                   # into the hole, in the plane
m3 = np.outer(m2[:, 0], eu) + np.outer(m2[:, 1], ev)
fa = 0.5 * np.linalg.norm(np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]), axis=1); sh = np.nonzero(shell)[0]
slope = np.zeros(nr)
for i in range(nr):
    dist = np.linalg.norm(fc[sh] - Rr3[i], axis=1); near = dist < 0.02
    if not near.any(): near = dist < dist.min() + 0.005
    N = (fn[sh][near] * (fa[sh][near] * np.exp(-(dist[near] / 0.012) ** 2))[:, None]).sum(0); N /= np.linalg.norm(N) + 1e-12
    nn = N @ n; mm = N @ m3[i]; slope[i] = SMAX if nn <= 1e-3 else np.clip(-mm / nn, 0.0, SMAX)
for _ in range(3): slope = 0.5 * slope + 0.25 * (np.roll(slope, 1) + np.roll(slope, -1))
print('rim slopes: min', slope.min().round(2), 'median', np.median(slope).round(2), 'max', slope.max().round(2))
hr = (Rr3 - cb) @ n; NQ = len(Q2); inner = np.arange(nr, NQ)
nbrs = [set() for _ in range(NQ)]
for t in T.tolist():
    for i in range(3): nbrs[t[i]].update((t[i - 1], t[(i + 1) % 3]))
# distance of each inner point to the rim polyline, and the rim value and slope there
def to_rim(q):
    best = (1e9, 0, 0)
    for i in range(nr):
        a_, b_ = R2[i], R2[(i + 1) % nr]; ab = b_ - a_; tt = np.clip(((q - a_) @ ab) / max(ab @ ab, 1e-12), 0, 1); dd_ = np.linalg.norm(q - (a_ + tt * ab))
        if dd_ < best[0]: best = (dd_, i, tt)
    return best
rows, cols, vals, rhs = [], [], [], []; r_ = 0
for i in inner:                                                             # smoothness: each inner point sits at its neighbours' mean
    nb_ = list(nbrs[i]); rows += [r_] * (len(nb_) + 1); cols += [i] + nb_; vals += [1.0] + [-1.0 / len(nb_)] * len(nb_); rhs.append(0.0); r_ += 1
tdist = np.zeros(NQ)
for i in inner:
    dd_, k, tt = to_rim(Q2[i]); tdist[i] = dd_
    if dd_ < 1.7 * GRID:                                                    # the first rows leave the rim at its slope
        h0 = hr[k] * (1 - tt) + hr[(k + 1) % nr] * tt; s0 = slope[k] * (1 - tt) + slope[(k + 1) % nr] * tt
        rows.append(r_); cols.append(i); vals.append(WS); rhs.append(WS * (h0 + s0 * dd_)); r_ += 1
for i in range(nr): rows.append(r_); cols.append(i); vals.append(100.0); rhs.append(100.0 * hr[i]); r_ += 1
Amat = sp.coo_matrix((vals, (rows, cols)), shape=(r_, NQ)).tocsr(); h = spl.lsqr(Amat, np.array(rhs), atol=1e-12, btol=1e-12, iter_lim=20000)[0]; h[:nr] = hr
pts = cb + np.outer(Q2[:, 0], eu) + np.outer(Q2[:, 1], ev) + np.outer(h, n); pts[:nr] = Rr3
# orientation: the patch faces outward (+n)
fnp = np.cross(pts[T[:, 1]] - pts[T[:, 0]], pts[T[:, 2]] - pts[T[:, 0]])
if (fnp @ n).sum() < 0: T = T[:, ::-1]
print('patch height above the shield plane', h[nr:].min().round(3), h[nr:].max().round(3))

# ---- bake the patch's texture from the shell it mirrors, into a new strip under the old texture
tex = np.asarray(M.m.visual.material.baseColorTexture.convert('RGB')).astype(float); TH, TW = tex.shape[:2]; DENS = 1066.0; PAD = 6
cw = int(np.ceil((hi2[1] - lo2[1]) * DENS)) + 2 * PAD; ch = int(np.ceil((hi2[0] - lo2[0]) * DENS)) + 2 * PAD      # v runs along the strip, u across it
EXTRA = int(np.ceil((ch + 4) / 64) * 64); NH = TH + EXTRA; cx0, cy0 = 4, TH + 2
jj, ii = np.meshgrid(np.arange(cw), np.arange(ch)); 
tu = lo2[0] + (ii.ravel() - PAD + 0.5) / DENS; tv = lo2[1] + (jj.ravel() - PAD + 0.5) / DENS
# each texel's point on the patch
Q2t = Q2.copy(); Q2t[:nr] = R2t; pos = np.full((ch * cw, 3), np.nan)
for t in T:
    q = Q2t[t]; i0 = max(int(np.floor((q[:, 0].min() - lo2[0]) * DENS + PAD - 1)), 0); i1 = min(int(np.ceil((q[:, 0].max() - lo2[0]) * DENS + PAD + 1)), ch - 1)
    j0 = max(int(np.floor((q[:, 1].min() - lo2[1]) * DENS + PAD - 1)), 0); j1 = min(int(np.ceil((q[:, 1].max() - lo2[1]) * DENS + PAD + 1)), cw - 1)
    if i1 < i0 or j1 < j0: continue
    I, J = np.meshgrid(np.arange(i0, i1 + 1), np.arange(j0, j1 + 1), indexing='ij'); x = lo2[0] + (I.ravel() - PAD + 0.5) / DENS; y = lo2[1] + (J.ravel() - PAD + 0.5) / DENS
    den = (q[1, 1] - q[2, 1]) * (q[0, 0] - q[2, 0]) + (q[2, 0] - q[1, 0]) * (q[0, 1] - q[2, 1])
    if abs(den) < 1e-14: continue
    w0 = ((q[1, 1] - q[2, 1]) * (x - q[2, 0]) + (q[2, 0] - q[1, 0]) * (y - q[2, 1])) / den; w1 = ((q[2, 1] - q[0, 1]) * (x - q[2, 0]) + (q[0, 0] - q[2, 0]) * (y - q[2, 1])) / den; w2 = 1 - w0 - w1
    k = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02); idx = I.ravel()[k] * cw + J.ravel()[k]
    pos[idx] = np.outer(w0[k], pts[t[0]]) + np.outer(w1[k], pts[t[1]]) + np.outer(w2[k], pts[t[2]])
# the forearm's axis, and the forearm unrolled round it (s along the axis, a round it)
Pall = np.vstack([Vw[np.unique(Fw[shell])], pts]); cs = []
for y0 in np.arange(0.47, 0.62, 0.015):
    k = abs(Pall[:, 1] - y0) < 0.01
    if k.sum() > 8: cs.append([(Pall[k, 0].min() + Pall[k, 0].max()) / 2, y0, (Pall[k, 2].min() + Pall[k, 2].max()) / 2])
A0 = np.array([-0.212, 0.545, -0.052]); ax = np.array([-0.015, -0.09, 0.065]); ax /= np.linalg.norm(ax)      # read off the cross-sections
e1 = n - (n @ ax) * ax; e1 /= np.linalg.norm(e1); e2 = np.cross(ax, e1); e2 = -e2 if e2 @ eu < 0 else e2
def unroll(Pp):
    w = Pp - A0; s_ = w @ ax; q = w - np.outer(s_, ax); return s_, np.arctan2(q @ e2, q @ e1), np.linalg.norm(q, axis=1)
rs, rth, rrho = unroll(Rr3); RHO = float(np.median(rrho)); print('forearm axis', A0.round(3), ax.round(3), 'rim radius', round(RHO, 3), 'rim angles', np.degrees(rth).min().round(0), np.degrees(rth).max().round(0))
Rs = np.c_[rs, RHO * rth]
for _ in range(2): Rs = 0.5 * Rs + 0.25 * (np.roll(Rs, 1, 0) + np.roll(Rs, -1, 0))
okp = ~np.isnan(pos[:, 0]); ps, pth, prho = unroll(pos[okp]); Pu = np.c_[ps, RHO * pth]
# nearest point of the rim, then the mirror image across it
bestd = np.full(len(Pu), 1e9); bestr = np.zeros((len(Pu), 2))
for i in range(nr):
    a_, b_ = Rs[i], Rs[(i + 1) % nr]; ab = b_ - a_; tt = np.clip(((Pu - a_) @ ab) / max(ab @ ab, 1e-12), 0, 1); c_ = a_ + tt[:, None] * ab; dd_ = np.linalg.norm(Pu - c_, axis=1)
    k = dd_ < bestd; bestd[k] = dd_[k]; bestr[k] = c_[k]
Pm = 2 * bestr - Pu; ms = Pm[:, 0]; mth = Pm[:, 1] / RHO
O = A0 + np.outer(ms, ax); D = np.outer(np.cos(mth), e1) + np.outer(np.sin(mth), e2)
Tsh = P[shell]; ids = np.nonzero(shell)[0]; E1 = Tsh[:, 1] - Tsh[:, 0]; E2 = Tsh[:, 2] - Tsh[:, 0]
hit_f = np.full(len(O), -1); hit_bc = np.zeros((len(O), 3)); hit_t = np.full(len(O), -1.0)
for s0 in range(0, len(O), 3000):
    o = O[s0:s0 + 3000]; dd_ = D[s0:s0 + 3000]
    pv = np.cross(dd_[:, None, :], E2[None]); det = (E1[None] * pv).sum(2); inv_ = 1.0 / np.where(abs(det) < 1e-12, 1, det)
    tv_ = o[:, None, :] - Tsh[None, :, 0]; uu = (tv_ * pv).sum(2) * inv_; qv = np.cross(tv_, E1[None]); vv = (dd_[:, None, :] * qv).sum(2) * inv_; tt = (E2[None] * qv).sum(2) * inv_
    okh = (abs(det) > 1e-12) & (uu >= -1e-6) & (vv >= -1e-6) & (uu + vv <= 1 + 1e-6) & (tt > 0.005) & (tt < 0.12)
    tt = np.where(okh, tt, -1); k = tt.argmax(1); bt = tt[np.arange(len(o)), k]; h_ = bt > 0
    hit_f[s0:s0 + 3000] = np.where(h_, ids[k], -1); hit_t[s0:s0 + 3000] = bt
    hit_bc[s0:s0 + 3000] = np.c_[1 - uu[np.arange(len(o)), k] - vv[np.arange(len(o)), k], uu[np.arange(len(o)), k], vv[np.arange(len(o)), k]]
okh = hit_f >= 0; print('patch texels', int(okp.sum()), 'that found the forearm in the mirror', int(okh.sum()))
uvh = (UV[F[hit_f[okh]]] * hit_bc[okh][:, :, None]).sum(1)
def sample(uv):
    x = (uv[:, 0] % 1) * (TW - 1); y = (1 - uv[:, 1] % 1) * (TH - 1); x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); x1 = np.minimum(x0 + 1, TW - 1); y1 = np.minimum(y0 + 1, TH - 1); fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return tex[y0, x0] * (1 - fx) * (1 - fy) + tex[y0, x1] * fx * (1 - fy) + tex[y1, x0] * (1 - fx) * fy + tex[y1, x1] * fx * fy
chart = np.zeros((ch * cw, 3)); okt = np.zeros(ch * cw, bool); ii_ = np.nonzero(okp)[0][okh]; chart[ii_] = sample(uvh); okt[ii_] = True
chart = chart.reshape(ch, cw, 3); okm = okt.reshape(ch, cw)
_, (iy, ix) = distance_transform_edt(~okm, return_indices=True); chart = chart[iy, ix]          # fill the texels that found nothing
Image.fromarray(np.clip(chart, 0, 255).astype(np.uint8)).resize((cw * 3, ch * 3), Image.NEAREST).save('chart.png')
newtex = np.zeros((NH, TW, 3)); newtex[:TH] = tex; newtex[TH:] = tex[-1:].mean(axis=(0, 1))
newtex[cy0:cy0 + ch, cx0:cx0 + cw] = chart
def chart_uv(q2):   # (u,v) -> trimesh uv in the new texture
    px = cx0 + PAD + (q2[:, 1] - lo2[1]) * DENS; py = cy0 + PAD + (q2[:, 0] - lo2[0]) * DENS
    return np.c_[px / TW, 1 - py / NH]
puv = chart_uv(Q2t)

# ---- the small holes: closed flat with the colour around them
sw = cx0 + cw + 8; newV = [pts]; newUV = [puv]; newF = [T + len(V)]; base = len(V) + len(pts)
for k, lp in enumerate(loops[1:]):
    Pl = Vw[lp]; c0 = Pl.mean(0); U_, S_, Vt = np.linalg.svd(Pl - c0); tr, sg = _earclip(np.c_[(Pl - c0) @ Vt[0], (Pl - c0) @ Vt[1]])
    # colour: mean of the kept faces round the rim
    rs = np.zeros(M.nw, bool); rs[lp] = True; nf_ = keep & rs[Fw].any(1); col = sample(UV[F[nf_]].reshape(-1, 2)).mean(0)
    newtex[TH + 4 + k * 20:TH + 20 + k * 20, sw:sw + 16] = col; uvk = np.array([(sw + 8) / TW, 1 - (TH + 12 + k * 20) / NH])
    newV.append(Pl); newUV.append(np.tile(uvk, (len(Pl), 1))); newF.append(tr + base); base += len(Pl)
    print('small hole', len(lp), 'at', c0.round(3), 'size', np.ptp(Pl, axis=0).round(3), 'colour', col.round(0))

UVo = np.c_[UV[:, 0], 1 - (1 - UV[:, 1]) * TH / NH]            # the old faces keep their texels in the taller texture
Vn = np.vstack([V] + newV); UVn = np.vstack([UVo] + newUV); Fn = np.vstack([F[keep]] + newF)
used = np.zeros(len(Vn), bool); used[Fn.ravel()] = True; remap = np.cumsum(used) - 1; Vn = Vn[used]; UVn = UVn[used]; Fn = remap[Fn]
img = Image.fromarray(np.clip(newtex, 0, 255).astype(np.uint8))
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=img, metallicFactor=0.0, roughnessFactor=0.9)
m = trimesh.Trimesh(Vn, Fn, process=False); m.visual = trimesh.visual.TextureVisuals(uv=UVn, material=mat)
# smooth normals over welded positions
key = np.round(Vn, 5); uq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
fnn = np.cross(Vn[Fn[:, 1]] - Vn[Fn[:, 0]], Vn[Fn[:, 2]] - Vn[Fn[:, 0]]); Nw = np.zeros((len(uq), 3))
for i in range(3): np.add.at(Nw, inv[Fn[:, i]], fnn)
# keep the old vertices' own normals, give the new ones the welded normal
Nn = Nw[inv] / (np.linalg.norm(Nw[inv], axis=1, keepdims=True) + 1e-12); nold = used[:len(V)].sum(); Nn[:nold] = M.N[used[:len(V)]]
m.vertex_normals = Nn
m.export(sys.argv[3]); img.save('wip/newtex.png')
print('out', sys.argv[3], 'verts', len(Vn), 'tris', len(Fn), 'texture', img.size)
# open edges check
e = np.sort(np.vstack([inv[Fn[:, [0, 1]]], inv[Fn[:, [1, 2]]], inv[Fn[:, [2, 0]]]]), 1); ue, cnt = np.unique(e, axis=0, return_counts=True)
print('edges used once (open)', int((cnt == 1).sum()), 'used more than twice', int((cnt > 2).sum()))
