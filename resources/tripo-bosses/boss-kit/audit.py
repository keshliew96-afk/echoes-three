# The detail audit: every vertex of the skinned model in every frame of every clip.
#   floor     how far each part goes under the floor (clips marked sinks are skipped below the water line)
#   through   one part pushed into another: a vertex of part A that is inside part B's surface, deeper than it is in the bind pose
#   snap      a joint that turns much more in one frame than in the frames either side of it (a one-frame pop)
#   stretch   triangles pulled or crushed against their bind size
# usage: python3 -I audit.py <glb> <meta.json> <out.json> [clip ...]
import sys, json; sys.path.insert(0, sys.argv[0].rsplit('/', 2)[0] + '/kit')
import numpy as np
from scipy.spatial import cKDTree
from glbanim import Rigged
R = Rigged(sys.argv[1]); meta = json.load(open(sys.argv[2])); want = sys.argv[4:]
names = R.names; nb = len(names); par = R.parent
W = np.nan_to_num(R.W); dom = R.J[np.arange(len(R.V)), W.argmax(1)]
# parts: bones grouped so that a part is a stretch of the body (a leg segment, a neck segment, a wing with its feathers)
import re
def part(n):
    m = re.match(r'^(f[LR])\d+$', n)
    if m: return 'wing' + m.group(1)[1]
    if re.match(r'^sk[AB]\d+$', n): return 'robe'  # the Cantor's robe columns
    m = re.match(r'^(?:th|f[123]|wr)([LR])$', n)
    if m: return 'hand' + m.group(1)
    if re.match(r'^note\d$', n): return 'notes'
    if re.match(r'^mote\d$', n): return 'mote' + n[-1]
    m = re.match(r'^(?:fist|knuck)([LR])$', n)  # the Colossus's fist and its knuckles are one rock
    if m: return 'fist' + m.group(1)
    m = re.match(r'^(?:foot|toe)([LR])$', n)
    if m: return 'foot' + m.group(1)
    m = re.match(r'^wing([LR])$', n)
    if m: return 'wing' + m.group(1)
    return n
P = [part(n) for n in names]; pnames = sorted(set(P)); pid = np.array([pnames.index(p) for p in P]); vp = pid[dom]
# two parts are neighbours when their bones are joined (parent and child) or share a parent; neighbours always overlap at the joint
adj = np.eye(len(pnames), dtype=bool)
for k in range(nb):
    if par[k] >= 0: adj[pid[k], pid[par[k]]] = adj[pid[par[k]], pid[k]] = True
    for j in range(nb):
        if par[k] >= 0 and par[j] == par[k]: adj[pid[k], pid[j]] = adj[pid[j], pid[k]] = True
adj2 = adj | ((adj.astype(int) @ adj.astype(int)) > 0)  # and the neighbour's neighbour (a short chain bends through itself harmlessly)
F = R.F; fp = vp[F[:, 0]]
def depth(V, N):
    """for every vertex: how deep it sits inside the nearest surface of a part that is not its own or a neighbour (0 if outside)"""
    out = np.zeros(len(V)); who = np.full(len(V), -1)
    for b in range(len(pnames)):
        kb = np.nonzero(vp == b)[0]
        if len(kb) < 8: continue
        tr = cKDTree(V[kb]); ka = np.nonzero(~adj2[vp, b])[0]
        if not len(ka): continue
        lo, hi = V[kb].min(0) - 0.02, V[kb].max(0) + 0.02; ka = ka[np.all((V[ka] > lo) & (V[ka] < hi), axis=1)]
        if not len(ka): continue
        d, i = tr.query(V[ka], k=3); ins = np.ones(len(ka), bool); dep = np.zeros(len(ka))
        for c in range(3):
            j = kb[i[:, c]]; s = np.einsum('ij,ij->i', V[ka] - V[j], N[j]); ins &= s < 0; dep = np.maximum(dep, -s) if c == 0 else np.minimum(dep, np.maximum(-s, 0))
        ins &= d[:, 0] < 0.06; dep = np.where(ins, dep, 0); up = dep > out[ka]; out[ka[up]] = dep[up]; who[ka[up]] = b
    return out, who
M0 = np.tile(np.eye(4), (nb, 1, 1)); M0[:, :3, 3] = R.bind
V0, N0 = R.skin(M0, True); base, _ = depth(V0, N0)
e0 = np.linalg.norm(V0[F[:, 1]] - V0[F[:, 0]], axis=1) + 1e-9; e1 = np.linalg.norm(V0[F[:, 2]] - V0[F[:, 0]], axis=1) + 1e-9
res = {}
for clip in R.clips:
    if want and clip not in want: continue
    m = meta.get(clip, {}); sinks = bool(m.get('sinks')); nF = R.nframes(clip); T = R.clips[clip]['t']
    floor = {}; thru = {}; stretch = (0, 0); q_prev = None; steps = np.zeros((nF, nb))
    for f in range(nF):
        Mw = R.world(clip, f); V, N = R.skin(Mw, True); q, _, _ = R.local(clip, f)
        if q_prev is not None: steps[f] = 2 * np.degrees(np.arccos(np.clip(np.abs((q * q_prev).sum(1)), 0, 1)))
        q_prev = q
        if not sinks:
            lowv = V[:, 1] < -0.004
            for b in np.unique(vp[lowv]):
                y = V[lowv & (vp == b), 1].min(); p = pnames[b]
                if p not in floor or y < floor[p][0]: floor[p] = (float(y), float(T[f]))
        d, who = depth(V, N); d = d - base; d[(V[:, 1] < 0) if sinks else np.zeros(len(V), bool)] = 0; hit = d > 0.006
        for a in np.unique(vp[hit]):
            ka = hit & (vp == a)
            for b in np.unique(who[ka]):
                kk = ka & (who == b); key = pnames[a] + ' into ' + pnames[b]; dd = float(d[kk].max()); n = int(kk.sum())
                e = thru.setdefault(key, {'deep_mm': 0, 'at': 0, 'verts': 0, 'frames': 0}); e['frames'] += 1
                if dd * 1000 > e['deep_mm']: e.update(deep_mm=round(dd * 1000, 1), at=round(float(T[f]), 3), verts=n)
        s = np.maximum(np.linalg.norm(V[F[:, 1]] - V[F[:, 0]], axis=1) / e0, np.linalg.norm(V[F[:, 2]] - V[F[:, 0]], axis=1) / e1); i = int(s.argmax())
        if s[i] > stretch[0]: stretch = (float(s[i]), float(T[f]), pnames[fp[i]])
    snaps = []
    for k in range(nb):
        s = steps[:, k]
        for f in range(2, nF - 1):
            nei = max(s[f - 1], s[f + 1])
            if s[f] > 9 and s[f] > 3.2 * nei + 2: snaps.append((round(float(s[f]), 1), names[k], round(float(T[f]), 3), round(float(nei), 1)))
    snaps.sort(reverse=True)
    res[clip] = {'floor': {k: [round(v[0] * 1000, 1), round(v[1], 3)] for k, v in sorted(floor.items(), key=lambda x: x[1][0])}, 'through': dict(sorted(thru.items(), key=lambda x: -x[1]['deep_mm'])), 'snaps': snaps[:12], 'stretch': [round(stretch[0], 2), round(stretch[1], 3), stretch[2]]}
    print('%-9s floor %s' % (clip, ', '.join('%s %.0fmm@%.2f' % (k, v[0], v[1]) for k, v in list(res[clip]['floor'].items())[:4]) or 'clean'))
    for k, e in list(res[clip]['through'].items())[:8]: print('          %-28s %5.1f mm at %.2f  (%d verts, %d frames)' % (k, e['deep_mm'], e['at'], e['verts'], e['frames']))
    if snaps: print('          snaps: ' + ', '.join('%s %.0f deg@%.2f (beside %.0f)' % (n, a, t, o) for a, n, t, o in snaps[:5]))
    print('          stretch x%.2f at %.2f on %s' % stretch)
json.dump(res, open(sys.argv[3], 'w'), indent=1)
