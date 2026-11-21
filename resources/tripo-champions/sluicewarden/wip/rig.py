# The Sluice Warden's rig. usage: python3 -I rig.py <sluicewarden.glb> <outdir> <thick.npy> <kit dir>
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, groove_cut, face_graph, segdist, loops_of, cap_loop
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src); th = np.load(sys.argv[3])
XS, ZS = -0.0175, 0.03                       # the model stands a little to its left and behind its own middle: bring the hips over the root
M.V[:, 0] += XS; M.V[:, 2] += ZS; M.reindex()
J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.40, 0.0]), 'spine': ('hips', [0, 0.46, 0.0]), 'chest': ('spine', [0, 0.52, 0.0]), 'head': ('chest', [0, 0.775, 0.0]),
 'upperarmL': ('chest', [0.185, 0.70, -0.03]), 'forearmL': ('upperarmL', [0.225, 0.525, -0.04]),
 'upperarmR': ('chest', [-0.195, 0.70, -0.025]), 'forearmR': ('upperarmR', [-0.24, 0.55, -0.075]), 'handR': ('forearmR', [-0.2325, 0.555, 0.06]),
 'skF': ('hips', [0, 0.40, 0.10]), 'skB': ('hips', [0, 0.40, -0.12]),
}
ends = {'head': [0, 0.9, 0.0], 'forearmL': [0.225, 0.335, -0.01], 'handR': [-0.2345, 0.556, 0.152], 'skF': [0, 0.17, 0.115], 'skB': [0, 0.17, -0.145]}
for s, sg in (('L', 1), ('R', -1)):
    J['thigh' + s] = ('hips', [0.1 * sg, 0.36, -0.01]); J['shin' + s] = ('thigh' + s, [0.115 * sg, 0.2, 0.0]); J['foot' + s] = ('shin' + s, [0.1185 * sg, 0.07, -0.03]); ends['foot' + s] = [0.1185 * sg, 0, 0.119]
names = list(J.keys()); segs = []
for n in names:
    if n == 'root': continue
    a = np.array(J[n][1], float); kids = [k for k in names if J[k][0] == n]
    if n in ends: segs.append((n, a, np.array(ends[n], float)))
    elif n == 'hips': segs.append((n, a, a + [0, -0.04, 0])); segs.append((n, a + [-0.1, 0, 0], a + [0.1, 0, 0]))
    elif n == 'chest': segs.append((n, a, np.array(J['head'][1], float))); segs.append((n, a + [-0.14, 0.12, 0], a + [0.14, 0.12, 0]))
    elif n == 'spine': segs.append((n, a, np.array(J['chest'][1], float)))
    else: segs.append((n, a, np.array(J[kids[0]][1], float)))
    if n.startswith('foot'): segs.append((n, a, a + [0, -0.05, -0.06]))
# ---- the left forearm came fused to his side by two small bridges at the belt: cut them, close both sides, so the arm can leave the body
def arm_faces(M, sg):
    g = face_graph(M); fc = g['fc']; fpole = (M.comp != M.main)[M.F].any(1)
    sh = np.array(J['upperarm' + ('L' if sg > 0 else 'R')][1]); el = np.array(J['forearm' + ('L' if sg > 0 else 'R')][1]); wr = np.array(ends['forearmL'] if sg > 0 else J['handR'][1])
    da = np.minimum(segdist(fc, el, wr), segdist(fc, el + (sh - el) * 0.25, el))
    srcf = (da < 0.04) & (fc[:, 0] * sg > 0.15) & ~fpole
    sink = ((np.abs(fc[:, 0]) < 0.13) | (fc[:, 1] > 0.72) | (fc[:, 1] < (0.27 if sg > 0 else 0.44)) | (fc[:, 0] * sg < 0)) & ~fpole
    A = groove_cut(M, srcf & ~sink, sink | fpole); return A & ~fpole
HINGES = []
def cut_free(M, A, lp, th, sg, arc=None):
    """The arm faces A leave the body along the welded rim lp: all of it, or with arc=(first, count) one run of it whose two ends stay shared as a hinge.
    Both sides are closed with a cap. Returns the mesh's new thickness array and A grown by the arm's cap."""
    g = face_graph(M); Vw = g['Vw']; nV = len(M.V); F = M.F.copy()
    ids = list(lp) if arc is None else [lp[(arc[0] + i) % len(lp)] for i in range(arc[1])]; inner = ids if arc is None else ids[1:-1]
    fa = np.nonzero(A)[0]; used = np.unique(F[fa]); on = used[np.isin(M.inv[used], inner)]; nud = np.array([3e-4 * sg, 0, 0])
    remap = np.arange(nV); remap[on] = nV + np.arange(len(on)); F[fa] = remap[F[fa]]
    aV, aN, aUV, aT, aF, aA = [M.V[on] + nud], [M.N[on]], [M.UV[on]], [th[on]], [], []
    pts, tris = cap_loop(Vw[ids]); base = nV + len(on)
    if arc is not None: HINGES.extend([(sg, Vw[ids[0]].copy()), (sg, Vw[ids[-1]].copy())])
    for arm in (0, 1):
        q = pts.copy()
        if arm:
            q += nud
            if arc is not None: q[0] -= nud; q[len(ids) - 1] -= nud
        nrm = np.cross(q[tris[:, 1]] - q[tris[:, 0]], q[tris[:, 2]] - q[tris[:, 0]]).sum(0); t = tris
        if (nrm[0] * sg > 0) == bool(arm): t = tris[:, ::-1]; nrm = -nrm
        nrm /= np.linalg.norm(nrm) + 1e-12
        aV.append(q); aN.append(np.tile(nrm, (len(q), 1))); aUV.append(np.tile(M.UV[on[0]], (len(q), 1))); aT.append(np.full(len(q), 0.2)); aF.append(t + base); aA.append(np.full(len(t), bool(arm))); base += len(q)
    M.V = np.vstack([M.V] + aV); M.N = np.vstack([M.N] + aN); M.UV = np.vstack([M.UV] + aUV); M.F = np.vstack([F] + aF); M.reindex()
    return np.r_[th] if False else np.concatenate([th] + aT), np.r_[A, np.concatenate(aA)]
# 1. the left forearm came fused to his side by two small bridges at the belt
while True:
    A = arm_faces(M, 1); g = face_graph(M); small = [lp for lp in loops_of(M, A) if len(lp) <= 12 and g['Vw'][lp][:, 1].mean() < 0.52]
    if not small: break
    print('cut a bridge of', len(small[0]), 'at', g['Vw'][small[0]].mean(0).round(3)); th, _ = cut_free(M, A, small[0], th, 1)
# 2. each elbow came fused into the flank: the lower run of the rim (on the flank, under the armpit) is cut, the run over the upper arm stays
ARMF = {}
for sg in (1, -1):
    A = arm_faces(M, sg); g = face_graph(M); lp = max(loops_of(M, A), key=len); Pl = g['Vw'][lp]; onflank = (np.abs(Pl[:, 0]) < 0.15) & (Pl[:, 1] < 0.6); n = len(lp)
    runs = []; i = 0
    while i < n:
        if onflank[i] and not onflank[i - 1]:
            c = 1
            while onflank[(i + c) % n] and c < n: c += 1
            runs.append((i, c))
        i += 1
    i0_, c = max(runs, key=lambda r: r[1]); print('arm', 'L' if sg > 0 else 'R', 'rim', n, 'flank run', c, 'from', Pl[i0_].round(3), 'to', Pl[(i0_ + c - 1) % n].round(3))
    th, A = cut_free(M, A, lp, th, sg, arc=(i0_, c)); ARMF[sg] = A
ARMF[1] = np.r_[ARMF[1], np.zeros(len(M.F) - len(ARMF[1]), bool)]
V = M.V; tc = M.tc
x, y, z = V.T; ax = np.abs(x)
polem = M.comp != M.main                     # the pole came as its own piece, with the right fist fused on it
pv = V[polem]; tip = pv[pv[:, 1].argmin()]; print('pole verts', int(polem.sum()), 'low', tip.round(3), 'top', pv[:, 1].max().round(3))
# ---- regions
thin = th < 0.03
headm = (((y > 0.775) & (ax < 0.135)) | (y > 0.8)) & ~polem
armlow = np.zeros(len(V), bool)
for sg in (1, -1):
    A = ARMF[sg]; k = np.zeros(len(V), bool); k[M.F[A].ravel()] = True; armlow |= k
    print('arm', 'L' if sg > 0 else 'R', 'faces', int(A.sum()), 'verts', int(k.sum()), 'rims', [len(l) for l in loops_of(M, A)])
armlow &= ~polem
armup = (ax > 0.15) & (y > 0.56) & (y < 0.8) & ~headm & ~polem
low = (y < 0.44) & ~armlow & ~polem                     # belt down: skirt, hip plates, legs
leg = low & (y < 0.17) & ~(thin & (y > 0.1))            # boots and shin armour; the hem's tatters stay with the skirt
skirt = low & ~leg
panelF = skirt & (z > 0.045) & (ax < 0.1); panelB = skirt & (z < -0.075) & (ax < 0.1)
visor = headm & (y > 0.78) & (y < 0.85) & (z > 0.03) & (ax < 0.1)        # the slit is drawn in the texture inside a few big faces: the page lights only the cyan texels of this patch
blade = polem & (y < 0.26)
wheel = (~polem) & (z > 0.09) & (np.hypot(x - 0.0, y - 0.60) < 0.075)
print({k: int(v.sum()) for k, v in dict(head=headm, leg=leg, skirt=skirt, panelF=panelF, panelB=panelB, armlow=armlow, armup=armup, visor=visor, blade=blade, wheel=wheel).items()})
def vis_of(n, d):
    side = (np.sign(x) == (1 if n[-1] == 'L' else -1)) if n[-1] in 'LR' else np.ones(len(V), bool)
    if n == 'handR': return polem
    if n == 'skF': return panelF
    if n == 'skB': return panelB
    if n == 'head': return headm & ~polem
    if n[:4] in ('shin', 'foot'): return leg & side
    if n[:4] == 'thig': return side & (skirt | leg) & (y < 0.4) & (ax > 0.02)
    if n.startswith('forearm'): return armlow & side
    if n.startswith('upperarm'): return side & (armup | (armlow & (y > 0.5))) & (d < 0.14)
    ok = ~(headm | leg | armlow | polem)
    if n == 'hips': ok = ok & (y < 0.5)
    if n == 'spine': ok = ok & (y > 0.4) & (y < 0.56)
    if n == 'chest': ok = ok & (y > 0.46)
    return ok
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, n): W[mask] = 0; W[mask, ix[n]] = 1
force(polem, 'handR')
# the arms hang against his sides. Below the armpit the body keeps none of the arm; round the armpit and over the shoulder the arm's
# share grows with the distance from his middle (none at 0.15, all of it at 0.2), so the cloth there stretches evenly and no face is torn
sstep = lambda a, b, v: np.clip((v - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((v - a) / (b - a), 0, 1))
flank = ~(armlow | armup | polem) & (y < 0.56)
ramp = sstep(0.15, 0.2, ax); share = np.where(armlow, 1 + (ramp - 1) * sstep(0.58, 0.62, y), ramp); share[flank] = 0; share[polem] = 1
for n in ('upperarmL', 'forearmL', 'upperarmR', 'forearmR'): gone = W[:, ix[n]] * (1 - share); W[:, ix[n]] -= gone; W[:, ix['chest']] += gone
force(headm & (y > 0.79), 'head')
torso = ~(headm | armlow | armup | polem) & (y > 0.5) & (ax < 0.2); force(torso, 'chest')        # the gate, the wheel and the back plank are stiff: he bends at the belt
# the two ends of each cut are the arm's hinge on the flank: round them the arm's share is evened out over the neighbours, so the web
# under the armpit stretches as a whole when the arm swings out
W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
for sg, hp in HINGES:
    cols = [ix['upperarm' + ('L' if sg > 0 else 'R')], ix['forearm' + ('L' if sg > 0 else 'R')]]; near = np.linalg.norm(V - hp, axis=1) < 0.05
    wn = np.zeros(M.nw, bool); wn[M.inv[near]] = True; t = np.zeros(M.nw); cnt = np.zeros(M.nw); np.add.at(t, M.inv, W[:, cols].sum(1)); np.add.at(cnt, M.inv, 1); t /= np.maximum(cnt, 1); t0 = t.copy()
    deg = np.asarray(M.A.sum(1)).ravel()
    for _ in range(12): t[wn] = (0.5 * t + 0.5 * (M.A @ t) / np.maximum(deg, 1))[wn]
    tv = t[M.inv]; old = W[:, cols].sum(1); ch = near & (np.abs(tv - old) > 1e-4) & ~polem
    for v in np.nonzero(ch)[0]:
        o = old[v]; n_ = tv[v]; rest_ = W[v].copy(); rest_[cols] = 0
        armw = W[v, cols] * (n_ / o) if o > 1e-6 else np.array([n_, 0.0])
        rs = rest_.sum(); rest_ = rest_ * ((1 - n_) / rs) if rs > 1e-6 else rest_
        if rs <= 1e-6: rest_[ix['chest']] = 1 - n_
        W[v] = rest_; W[v, cols] = armw
    print('hinge', sg, hp.round(3), 'verts evened', int(ch.sum()))
force(leg & (y < 0.055) & (x > 0), 'footL'); force(leg & (y < 0.055) & (x < 0), 'footR')
finish(M, J, ends, W, names, out, [visor, blade, wheel], fallback='spine', extra={'zshift': ZS, 'xshift': XS, 'poleTip': list(map(float, tip))})
