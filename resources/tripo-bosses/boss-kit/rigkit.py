# Shared rigging helpers for the Tripo bosses: load a GLB, weld it, find pieces, diffuse skin weights from bones
# that each see only their own region, write the files build.mjs reads, and draw the joint overlay.
import json
import trimesh, numpy as np, scipy.sparse as sp, scipy.sparse.linalg as spl, scipy.sparse.csgraph as cg

class Mesh:
    def __init__(self, src):
        m = trimesh.load(src, force='mesh', process=False); self.m = m
        self.V = np.asarray(m.vertices, float); self.F = np.asarray(m.faces); self.N = np.asarray(m.vertex_normals, float); self.UV = np.asarray(m.visual.uv, float)
        self.tex = np.asarray(m.visual.material.baseColorTexture.convert('RGB')).astype(int); self.reindex()
    def reindex(self):
        tex = self.tex; TH, TW = tex.shape[:2]
        self.tc = tex[np.clip(((1 - self.UV[:, 1] % 1) * (TH - 1)).astype(int), 0, TH - 1), np.clip(((self.UV[:, 0] % 1) * (TW - 1)).astype(int), 0, TW - 1)]
        if hasattr(self, '_fg'): del self._fg
        key = np.round(self.V, 5); uq, inv = np.unique(key, axis=0, return_inverse=True); self.inv = inv.ravel(); self.nw = len(uq)
        E = np.vstack([self.F[:, [0, 1]], self.F[:, [1, 2]], self.F[:, [2, 0]]]); self.E = self.inv[E]; e = self.E[self.E[:, 0] != self.E[:, 1]]
        A = sp.coo_matrix((np.ones(2 * len(e)), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(self.nw, self.nw)).tocsr(); A.data[:] = 1.0; self.A = A
        nc, lab = cg.connected_components(A, directed=False); self.cnt = np.bincount(lab); self.comp = lab[self.inv]; self.main = self.cnt.argmax(); self.nc = nc
        print('verts', len(self.V), 'tris', len(self.F), 'welded', self.nw, 'pieces', nc, sorted(self.cnt.tolist(), reverse=True)[:6])
    def comps(self, mask):
        """connected pieces of the vertices in mask; returns a label per vertex (-1 outside)"""
        wm = np.zeros(self.nw, bool); wm[self.inv[mask]] = True; e = self.E[wm[self.E[:, 0]] & wm[self.E[:, 1]]]
        A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(self.nw, self.nw)).tocsr(); _, lab = cg.connected_components(A, directed=False)
        return np.where(wm, lab, -1)[self.inv]

def segdist(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1); c = a + np.outer(t, ab); return np.linalg.norm(P - c, axis=1)

def skin(M, J, segs, vis_of, heat=0.0015):
    """J: {name: (parent, pos)}; segs: [(bone, a, b)]; vis_of(bone, dist) -> mask of the vertices that bone may claim."""
    names = list(J.keys()); nb = len(names); ix = {n: i for i, n in enumerate(names)}; V = M.V
    D = np.full((len(V), nb), np.inf); vis = np.zeros((len(V), nb), bool)
    for n, a, b in segs:
        d = segdist(V, np.array(a, float), np.array(b, float)); j = ix[n]; ok = vis_of(n, d)
        better = d < D[:, j]; D[better, j] = d[better]; vis[better, j] = ok[better]
    L = sp.diags(np.asarray(M.A.sum(1)).ravel()) - M.A
    Dw = np.full((M.nw, nb), np.inf); np.minimum.at(Dw, M.inv, np.where(vis, D, np.inf))
    near = Dw.argmin(1); dn = Dw.min(1); has = np.isfinite(dn)
    print('verts without a bone in sight', int((~has).sum()), 'of', M.nw)
    Hc = np.where(has, heat / (dn ** 2 + 1e-6), 0)
    solve = spl.factorized((L + sp.diags(Hc) + sp.eye(M.nw) * 1e-9).tocsc())
    Ww = np.zeros((M.nw, nb))
    for j in range(nb):
        p = Hc * (near == j)
        if p.any(): Ww[:, j] = solve(p)
    return np.clip(Ww, 0, None)[M.inv], names, ix

def finish(M, J, ends, W, names, out, masks, fallback='spine', extra=None):
    ix = {n: i for i, n in enumerate(names)}; nb = len(names); V = M.V
    W[W.sum(1) == 0, ix[fallback]] = 1
    idx = np.argsort(-W, axis=1)[:, :4]; val = np.take_along_axis(W, idx, 1); val[val < 0.02 * val[:, :1]] = 0; val /= val.sum(1, keepdims=True)
    print('dominant:', {names[j]: int((idx[:, 0] == j).sum()) for j in range(nb)})
    sk = {'names': names, 'parents': [J[n][0] for n in names], 'pos': [list(map(float, J[n][1])) for n in names], 'ends': {k: list(map(float, v)) for k, v in ends.items()}}
    if extra: sk.update(extra)
    json.dump(sk, open(out + '/skel.json', 'w'))
    V.astype('<f4').tofile(out + '/b_pos.bin'); M.N.astype('<f4').tofile(out + '/b_nrm.bin'); M.UV.astype('<f4').tofile(out + '/b_uv.bin'); M.F.astype('<u4').tofile(out + '/b_idx.bin')
    idx.astype('<u2').tofile(out + '/b_ji.bin'); val.astype('<f4').tofile(out + '/b_jw.bin')
    np.c_[tuple(k.astype(float) for k in masks)].astype('<f4').tofile(out + '/b_mask.bin')
    M.m.visual.material.baseColorTexture.convert('RGB').save(out + '/body_tex.jpg', quality=90)
    rng = np.random.RandomState(5); pal = (rng.rand(nb, 3) * 200 + 55)
    vc = np.clip((val[:, :, None] * pal[idx]).sum(1), 0, 255).astype(np.uint8); vc4 = np.c_[vc, np.full(len(V), 255, np.uint8)]
    trimesh.Trimesh(V, M.F, vertex_colors=vc4, process=False).export(out + '/dbg_w.glb')
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    fig, axs = plt.subplots(1, 3, figsize=(36, 13))
    for a, (nm, k, hx, hy) in zip(axs, (('left half (z right)', V[:, 0] > 0, 2, 1), ('front (x right)', V[:, 2] > -10, 0, 1), ('top (z right, x up)', V[:, 1] > -1, 2, 0))):
        a.scatter(V[k, hx], V[k, hy], s=1, c=vc[k] / 255)
        for n in names:
            if n == 'root': continue
            p = np.array(J[n][1]); q = np.array(J[J[n][0]][1]) if J[n][0] != 'root' else p
            if 'left' in nm and p[0] < -0.02: continue
            a.plot([q[hx], p[hx]], [q[hy], p[hy]], 'k-', lw=1.5); a.plot(p[hx], p[hy], 'ro', ms=5)
            if n in ends: e = np.array(ends[n]); a.plot([p[hx], e[hx]], [p[hy], e[hy]], 'k--', lw=1)
        a.set_aspect('equal'); a.set_title(nm); a.grid(True, lw=0.3); a.set_xticks(np.arange(-0.5, 0.51, 0.05)); a.tick_params(labelsize=7)
    plt.tight_layout(); plt.savefig(out + '/rig_overlay.png', dpi=60)

# ---- cutting a fused part free (a folded wing, a closed bill) and closing the holes ---------------------------------
def face_graph(M):
    """pairs of faces over each welded edge, with the edge's length, its fold angle and whether it is a groove"""
    if hasattr(M, '_fg'): return M._fg
    F = M.F; Fw = M.inv[F]; nF = len(F); P = M.V[F]
    fn = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]); fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-12; fc = P.mean(1)
    e = np.vstack([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]]); fid = np.tile(np.arange(nF), 3); es = np.sort(e, 1)
    key = es[:, 0].astype(np.int64) * M.nw + es[:, 1]; o = np.argsort(key, kind='stable'); ks = key[o]; same = ks[1:] == ks[:-1]
    a = fid[o][:-1][same]; b = fid[o][1:][same]; ev = es[o][:-1][same]
    Vw = np.zeros((M.nw, 3)); Vw[M.inv] = M.V; ln = np.linalg.norm(Vw[ev[:, 0]] - Vw[ev[:, 1]], axis=1)
    ang = np.arccos(np.clip((fn[a] * fn[b]).sum(1), -1, 1)); concave = ((fc[b] - fc[a]) * fn[a]).sum(1) > 0
    M._fg = dict(a=a, b=b, ev=ev, ln=ln, ang=ang, concave=concave, fc=fc, fn=fn, Vw=Vw); return M._fg

def groove_cut(M, src, sink, soft=0.5):
    """faces on the src side of the cheapest cut between two sets of seed faces; grooves are cheap to cut along"""
    g = face_graph(M); nF = len(M.F); a, b = g['a'], g['b']
    w = np.where(g['concave'], np.clip(1 - g['ang'] / soft, 0.03, 1), 1 + 2 * g['ang']); cap = np.maximum(1, (g['ln'] * w * 2e5).astype(np.int64))
    sink = sink & ~src; S_, T_ = nF, nF + 1; BIG = 10 ** 9; si, ti = np.nonzero(src)[0], np.nonzero(sink)[0]
    G = sp.csr_matrix((np.r_[cap, cap, np.full(len(si), BIG), np.full(len(ti), BIG)], (np.r_[a, b, np.full(len(si), S_), ti], np.r_[b, a, si, np.full(len(ti), T_)])), shape=(nF + 2, nF + 2)).astype(np.int32)
    res = cg.maximum_flow(G, S_, T_); R = (G - res.flow).tocsr(); R.data[R.data < 0] = 0; R.eliminate_zeros()
    reach = cg.breadth_first_order(R, S_, directed=True, return_predecessors=False); out = np.zeros(nF + 2, bool); out[reach] = True
    return out[:nF]

def loops_of(M, A):
    """the closed rims of the face set A, each a list of welded vertex ids in the direction A's faces run"""
    Fw = M.inv[M.F[A]]; he = np.vstack([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]]); he = he[he[:, 0] != he[:, 1]]
    have = set(map(tuple, he.tolist())); rim = [(u, v) for u, v in he.tolist() if (v, u) not in have]
    nxt = {}
    for u, v in rim: nxt.setdefault(u, []).append(v)
    loops = []
    while nxt:
        u0 = next(iter(nxt)); lp = [u0]; u = u0
        while True:
            vs = nxt[u]; v = vs.pop();
            if not vs: del nxt[u]
            if v == u0: break
            lp.append(v); u = v
            if u not in nxt: break
        loops.append(lp)
    return loops

def _earclip(P2):
    n = len(P2); idx = list(range(n)); area = 0.5 * sum(P2[i][0] * P2[(i + 1) % n][1] - P2[(i + 1) % n][0] * P2[i][1] for i in range(n)); sgn = 1 if area > 0 else -1; tris = []
    cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    guard = 0
    while len(idx) > 3 and guard < 20000:
        guard += 1; m = len(idx); best = None
        for k in range(m):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % m]; a, b, c = P2[i0], P2[i1], P2[i2]
            if cr(a, b, c) * sgn <= 1e-14: continue
            ok = True
            for j in idx:
                if j in (i0, i1, i2): continue
                p = P2[j]
                if cr(a, b, p) * sgn >= -1e-14 and cr(b, c, p) * sgn >= -1e-14 and cr(c, a, p) * sgn >= -1e-14: ok = False; break
            if ok:
                q = min(np.linalg.norm(b - a), np.linalg.norm(c - b), 1) / (np.linalg.norm(c - a) + 1e-9)  # prefer fat ears
                if best is None or q > best[0]: best = (q, k)
        if best is None: best = (0, 0)
        k = best[1]; tris.append((idx[k - 1], idx[k], idx[(k + 1) % len(idx)])); idx.pop(k)
    tris.append(tuple(idx)); return np.array(tris), sgn

def cap_loop(P, grid=None):
    """a surface across a closed rim P (n,3). Returns points (the rim first, then inner points) and triangles that run the rim's way."""
    n = len(P); c = P.mean(0); U, S_, Vt = np.linalg.svd(P - c); ex, ey, ez = Vt[0], Vt[1], Vt[2]; P2 = np.c_[(P - c) @ ex, (P - c) @ ey]
    tris, sgn = _earclip(P2); pts = P.copy()
    if grid:
        from scipy.spatial import Delaunay; from matplotlib.path import Path
        R3 = P.copy()  # the rim, which may gain points on its own edges until the triangulation keeps every edge
        for attempt in range(6):
            R2 = np.c_[(R3 - c) @ ex, (R3 - c) @ ey]; n = len(R2); path = Path(R2); lo, hi = R2.min(0), R2.max(0)
            gx, gy = np.meshgrid(np.arange(lo[0], hi[0], grid), np.arange(lo[1], hi[1], grid)); G = np.c_[gx.ravel(), gy.ravel()]; G[1::2, 0] += grid / 2
            d = np.min(np.linalg.norm(G[:, None] - R2[None], axis=2), axis=1); G = G[path.contains_points(G) & (d > grid * 0.6)]
            Q2 = np.r_[R2, G]; T = Delaunay(Q2).simplices; T = T[path.contains_points(Q2[T].mean(1))]
            d1 = Q2[T[:, 1]] - Q2[T[:, 0]]; d2 = Q2[T[:, 2]] - Q2[T[:, 0]]; ar = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]; T = T[np.abs(ar) > 1e-10]; ar = ar[np.abs(ar) > 1e-10]
            T[ar * sgn < 0] = T[ar * sgn < 0][:, ::-1]
            es = set(); [es.update({(t[0], t[1]), (t[1], t[2]), (t[2], t[0])}) for t in T.tolist()]
            miss = [i for i in range(n) if (i, (i + 1) % n) not in es]
            if not miss: break
            for i in reversed(miss): R3 = np.insert(R3, i + 1, (R3[i] + R3[(i + 1) % n]) / 2, axis=0)
        if not miss:
            h = np.r_[(R3 - c) @ ez, np.zeros(len(G))]; nb = [set() for _ in range(len(Q2))]
            for t in T.tolist():
                for i in range(3): nb[t[i]].update((t[i - 1], t[(i + 1) % 3]))
            for _ in range(300):
                for i in range(n, len(Q2)): h[i] = np.mean(h[list(nb[i])])
            pts = c + np.outer(Q2[:, 0], ex) + np.outer(Q2[:, 1], ey) + np.outer(h, ez); tris = T
        else: print('  cap: the triangulation kept missing rim edges, using ear clipping')
    return pts, tris

class Editor:
    """Grows a mesh: split a face set off along its rim, close both sides, add new pieces. tag marks who owns each vertex."""
    def __init__(self, M):
        self.M = M; self.V = [M.V.copy()]; self.UV = [M.UV.copy()]; self.N = [M.N.copy()]; self.F = M.F.copy(); self.newF = []; self.n = len(M.V); self.tag = np.zeros(len(M.V), int); self.tags = {'body': 0}
    def tid(self, name): return self.tags.setdefault(name, len(self.tags))
    def add(self, P, uv, tris, name, flip=False):
        P = np.asarray(P, float); tris = np.asarray(tris); tris = tris[:, ::-1] if flip else tris
        fn = np.cross(P[tris[:, 1]] - P[tris[:, 0]], P[tris[:, 2]] - P[tris[:, 0]]); N = np.zeros_like(P)
        for i in range(3): np.add.at(N, tris[:, i], fn)
        N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
        self.V.append(P); self.UV.append(np.tile(np.asarray(uv, float), (len(P), 1)) if np.ndim(uv) == 1 else np.asarray(uv, float)); self.N.append(N)
        self.newF.append(tris + self.n); self.tag = np.r_[self.tag, np.full(len(P), self.tid(name))]; self.n += len(P); return self.n - len(P)
    def split(self, A, name, uv_body, uv_part, grid=None, caps=True):
        """A: mask over the original faces. Its vertices become the part `name`; the rim is closed on the body (name+'.hole') and on the part (name+'.lid')."""
        M = self.M; F = self.F; nF0 = len(M.F); used_a = np.zeros(self.n, bool); used_a[F[:nF0][A].ravel()] = True; used_o = np.zeros(self.n, bool); used_o[F[:nF0][~A].ravel()] = True
        sh = np.nonzero(used_a & used_o)[0]; V = np.vstack(self.V); UV = np.vstack(self.UV); N = np.vstack(self.N)
        remap = np.arange(self.n); remap[sh] = self.n + np.arange(len(sh))
        self.V = [V, V[sh]]; self.UV = [UV, UV[sh]]; self.N = [N, N[sh]]; self.tag = np.r_[self.tag, np.zeros(len(sh), int)]; self.n += len(sh)
        fa = F[:nF0][A]; F[:nF0][A] = remap[fa]; self.tag[np.unique(F[:nF0][A])] = self.tid(name)
        g = face_graph(M); out = []
        for lp in loops_of(M, A):
            if len(lp) < 3: continue
            P = g['Vw'][lp]; out.append(P)
            if not caps: continue
            pts, tris = cap_loop(P, grid)
            self.add(pts, uv_body, tris, name + '.hole'); self.add(pts, uv_part, tris, name + '.lid', flip=True)
            print('  ', name, 'rim', len(lp), 'cap tris', len(tris))
        return out
    def done(self):
        M = self.M; M.V = np.vstack(self.V); M.UV = np.vstack(self.UV); M.N = np.vstack(self.N); M.F = np.vstack([self.F] + self.newF); M.tag = self.tag; M.tags = self.tags
        M.reindex(); return M
