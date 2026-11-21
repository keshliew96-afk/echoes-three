# The Drowned Miller's rig. usage: python3 -I rig.py <in.glb> <outdir> <thick.npy> <kit dir>
# A stout miller holding a millstone by its chain in both hands in front of his apron. Tripo fused the stone to the
# apron and the forearms to the belly, so first the stone (and the link above it) is CUT free: the triangles joining it
# to the apron go to the body, the vertices they shared are doubled, and both openings are capped (the apron behind
# with apron colour, the stone's back with stone colour). Then: hips, spine, chest, neck, head; short legs as 'limb'
# chains (thigh, shin, foot, toe); arms on the shoulder, elbow and hand (their weights only reach a short way into the
# belly they lie on); and the CHAIN bone at the right hand's grip with the STONE bone where the chain meets the stone.
# The chain bone stretches along its length to pay out the chain for the whirl; the stone counter-scales.
import sys; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, segdist
src, out = sys.argv[1], sys.argv[2]; M = Mesh(src)

STONE_C = np.array([0.005, 0.315]); STONE_R = 0.128
def cut(M, region_fn):
    V, F, N, UV = M.V, M.F, M.N, M.UV
    R = region_fn(V, M.tc)
    Rw = np.zeros(M.nw, bool); Rw[M.inv[R]] = True; R = Rw[M.inv]
    cnt = R[F].sum(1); piece = cnt == 3; body = ~piece
    keyof = lambda P: [tuple(k) for k in np.round(P, 5)]
    # doubles for the region vertices the body still uses
    used = np.unique(F[body][R[F[body]]])
    nonR = np.nonzero(~R)[0]
    newV, newN, newUV, remap = [list(V), list(N), list(UV), {}]
    for v in used:
        j = nonR[np.argmin(np.linalg.norm(V[nonR] - V[v], axis=1))]
        remap[v] = len(newV); newV.append(V[v] + np.array([0, 0, -3e-5])); newN.append(N[v]); newUV.append(UV[j])
    FB = F[body].copy()
    for i in range(FB.shape[0]):
        for c in range(3):
            if FB[i, c] in remap: FB[i, c] = remap[FB[i, c]]
    FP = F[piece].copy()
    newV = np.array(newV); newN = np.array(newN); newUV = np.array(newUV)
    def cap(faces, ok, push, uvpool, nrm):
        nonlocal newV, newN, newUV
        K = np.round(newV, 5); keys = {}
        kid = np.unique(K, axis=0, return_inverse=True)[1].ravel()
        from collections import Counter
        cntE = Counter()
        for f in faces:
            for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])): cntE[frozenset((kid[a], kid[b]))] += 1
        edges = [(a, b) for f in faces for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])) if cntE[frozenset((kid[a], kid[b]))] == 1 and ok[a] and ok[b]]
        if not edges: return np.zeros((0, 3), int)
        loop = np.unique(np.array(edges).ravel()); c = newV[loop].mean(0) + push
        j = uvpool[np.argmin(np.linalg.norm(newV[uvpool] - c, axis=1))]
        # the cap has its own vertices, all on one texel (a plain patch of apron or stone), offset a hair so they stay apart
        own = {v: len(newV) + i for i, v in enumerate(loop)}
        newV = np.vstack([newV, newV[loop] + push * 0.02, c]); newN = np.vstack([newN, np.tile(nrm, (len(loop) + 1, 1))]); newUV = np.vstack([newUV, np.tile(newUV[j], (len(loop) + 1, 1))])
        ci = len(newV) - 1
        print('cap', len(edges), 'edges at', c.round(3))
        return np.array([(own[b], own[a], ci) for a, b in edges])
    isdup = np.zeros(len(newV), bool); isdup[list(remap.values())] = True
    tcB = M.tc.astype(int); brown = nonR[((tcB[nonR, 0] - tcB[nonR, 2]) > 35) & (tcB[nonR].sum(1) > 150) & (tcB[nonR].sum(1) < 400) & (M.V[nonR, 2] > 0.09)]
    print('apron texels', len(brown), tcB[brown].mean(0).round())
    capB = cap(FB, isdup, np.array([0, 0, -0.012]), brown, np.array([0, 0, 1.0]))
    M.bodycap = np.arange(len(newV) - len(np.unique(capB[:, :2])) - 1, len(newV)) if len(capB) else np.zeros(0, int)
    inP = np.zeros(len(newV), bool); inP[np.unique(FP)] = True
    pv = np.unique(FP); capP = cap(FP, inP, np.array([0, 0, -0.006]), pv, np.array([0, 0, -1.0]))
    M.V = newV; M.N = newN; M.UV = newUV; M.F = np.vstack([FB, capB, FP, capP]).astype(np.int64); M.reindex()
def stone_region(V, tc):
    x, y, z = V.T
    disc = (np.hypot(x - STONE_C[0], y - STONE_C[1]) < STONE_R) & (z > 0.112)
    link = (np.abs(x) < 0.03) & (y > 0.425) & (y < 0.465) & (z > 0.13)
    return disc | link
cut(M, stone_region)
V = M.V; tc = M.tc; x, y, z = V.T; ax = np.abs(x); r, g, b = tc.T.astype(int)
bc = np.zeros(len(M.V), bool); bc[M.bodycap] = True
stone = (M.comp != M.main) & ~bc & (np.bincount(M.comp)[M.comp] > 1)
print('stone piece verts', int(stone.sum()), V[stone].min(0).round(3), V[stone].max(0).round(3))

GRIP = [0.0, 0.452, 0.152]         # the chain's top, in the grip of both hands (the chain bone hangs off the right hand)
TOP = [0.005, 0.315, 0.15]         # the stone's centre: the stone bone, counter-scaled, so the stone keeps its shape
J = {'root': (None, [0, 0, 0]), 'hips': ('root', [0, 0.27, -0.01]), 'spine': ('hips', [0, 0.42, -0.01]), 'chest': ('spine', [0, 0.58, -0.02]),
     'neck': ('chest', [0, 0.76, -0.01]), 'head': ('neck', [0, 0.80, 0.0])}
ends = {'head': [0, 1.0, 0.02]}
for s, sg in (('L', 1), ('R', -1)):
    m = lambda p: [p[0] * sg, p[1], p[2]]
    J['thigh' + s] = ('hips', m([0.1, 0.24, -0.01])); J['shin' + s] = ('thigh' + s, m([0.12, 0.135, 0.004]))
    J['foot' + s] = ('shin' + s, m([0.13, 0.05, -0.03])); J['toe' + s] = ('foot' + s, m([0.135, 0.015, 0.05])); ends['toe' + s] = m([0.14, 0.0, 0.1])
    J['arm' + s] = ('chest', m([0.17, 0.68, -0.03])); J['fore' + s] = ('arm' + s, m([0.215, 0.53, -0.02])); J['hand' + s] = ('fore' + s, m([0.075, 0.465, 0.135]))
    ends['hand' + s] = m([0.04, 0.455, 0.165])
J['chain'] = ('handR', GRIP); ends['chain'] = TOP
J['stone'] = ('chain', TOP); ends['stone'] = [0.005, 0.19, 0.15]
names = list(J.keys())
# --- regions
def near_arm(s):
    sg = 1 if s == 'L' else -1
    a = np.array(J['arm' + s][1]); e = np.array(J['fore' + s][1]); h = np.array(J['hand' + s][1]); t = np.array(ends['hand' + s])
    d = np.minimum(np.minimum(segdist(V, a, e), segdist(V, e, h)), segdist(V, h, t))
    return (d < 0.055) & (np.sign(x) == sg) & ~stone & ~bc & (y > 0.4)
armL, armR = near_arm('L'), near_arm('R'); arm = armL | armR
leg = (y < 0.2) & ~stone
head = (y > 0.79) & ~arm
eye = np.zeros(len(V), bool)
print({k: int(v.sum()) for k, v in dict(armL=armL, armR=armR, leg=leg, head=head, stone=stone).items()})
segs = []
for nm in names:
    if nm in ('root', 'chain', 'stone'): continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm and k not in ('chain', 'stone')]
    e = np.array(ends[nm], float) if nm in ends else np.array(J[kids[0]][1], float)
    if nm in ('hips', 'spine', 'chest', 'neck'): e = np.array(J[{'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head'}[nm]][1], float)
    segs.append((nm, a, e))
def vis_of(nm, d):
    sd = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm.startswith(('arm', 'fore', 'hand')): return armL if nm[-1] == 'L' else armR
    if nm.startswith(('thigh', 'shin', 'foot', 'toe')): return leg & sd
    return ~arm & ~leg & ~stone
W, names, ix = skin(M, J, segs, vis_of)
trunk = ~arm & ~leg & ~stone
H = [(-1, 'hips'), (0.27, 'hips'), (0.42, 'spine'), (0.58, 'chest'), (0.76, 'neck'), (0.80, 'head'), (2, 'head')]
hs = np.array([h for h, _ in H]); ti = np.nonzero(trunk)[0]
W[ti] = 0
for i in ti:
    k = min(max(np.searchsorted(hs, y[i]) - 1, 0), len(H) - 2); f = (y[i] - hs[k]) / (hs[k + 1] - hs[k])
    W[i, ix[H[k][1]]] += 1 - f; W[i, ix[H[k + 1][1]]] += f
# the arms lie on the belly: their edge verts blend into the chest, so moving them drags the smock along softly
for s, A in (('L', armL), ('R', armR)):
    a = np.array(J['arm' + s][1]); e = np.array(J['fore' + s][1]); h = np.array(J['hand' + s][1]); t = np.array(ends['hand' + s])
    i = np.nonzero(A)[0]; d = np.minimum(np.minimum(segdist(V[i], a, e), segdist(V[i], e, h)), segdist(V[i], h, t))
    k = np.clip((d - 0.03) / 0.025, 0, 1) * 0.7
    W[i] *= (1 - k)[:, None]; W[i, ix['chest']] += k
    # the shoulder top rides the chest too
    j = np.nonzero(A & (y > 0.64))[0]; k = 0.6 * np.clip((y[j] - 0.64) / 0.06, 0, 1)
    W[j] *= (1 - k)[:, None]; W[j, ix['chest']] += k
# the smock's hem over the legs: the hips, blended into the thigh on its side lower down
for s, sg in (('L', 1), ('R', -1)):
    i = np.nonzero(trunk & (np.sign(x) == sg) & (y < 0.26))[0]
    k = 0.6 * np.clip((0.26 - y[i]) / 0.08, 0, 1) * np.clip(ax[i] / 0.05, 0, 1)
    W[i] *= (1 - k)[:, None]; W[i, ix['thigh' + s]] += k
# the stone and its link: the link (above the stone's rim) on the chain, the disc on the stone
W[stone] = 0
# the link blends from the chain at its top to the stone at the rim, so as the chain pays out it stretches from the hand to the stone
W[stone, ix['stone']] = 1
i = np.nonzero(stone & (y > 0.428))[0]; k = np.clip((y[i] - 0.428) / 0.022, 0, 1); W[i, ix['stone']] = 1 - k; W[i, ix['chain']] = k
W[head] = 0; W[head, ix['head']] = 1
# the apron patch takes the weights of the apron edge it closes (the centre the mean), so it never parts from it
ci = np.nonzero(bc)[0]; others = np.nonzero(~bc & ~stone)[0]
for i in ci[:-1]: W[i] = W[others[np.argmin(np.linalg.norm(V[others] - V[i], axis=1))]]
W[ci[-1]] = W[ci[:-1]].mean(0)
finish(M, J, ends, W, names, out, [np.zeros(len(V), bool), np.zeros(len(V), bool), eye], fallback='spine')
