# The Hourwarden's rig. usage: python3 -I rig.py <in.glb> <cuts.npz> <outdir> <kit dir>
# A clock tower on a bed of gears: a stone case with bronze bands, an arched window front and back with a pendulum in it,
# a clock face on the chest with one hand, stone shoulders with bronze pauldrons, fists that hold a bronze clock weight on
# a chain each, and a peaked stone cap over a face with two violet eyes. Tripo welded it all into one shell: the gears and
# the pendulum are carved into the case. This cuts free the pendulum (front and back, one bone), the clock hand and both
# arms with their chains and weights (cuts.py finds the faces), closes every cut, and skins it.
import sys, json; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, Editor
src, cuts, out = sys.argv[1], sys.argv[2], sys.argv[3]; M = Mesh(src); C = np.load(cuts)
V0 = M.V; x0, y0, z0 = V0.T; tc0 = M.tc.astype(float); lum0 = tc0.sum(1)
def pick_uv(vmask, q):
    idx = np.nonzero(vmask)[0]; lum = tc0[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0)); return best[1]
DC = np.array([-0.004, 0.659, 0.13])   # the dial's centre: the clock hand turns on it
dr = np.hypot(x0 - DC[0], y0 - DC[1])
uv_pale = pick_uv((z0 > 0.105) & (dr < 0.06) & (dr > 0.02) & (lum0 > 530), 0.5)
uv_bronze = pick_uv((np.abs(x0) < 0.1) & (y0 > 0.48) & (y0 < 0.52) & (z0 > 0.08), 0.5)
uv_recess = pick_uv((np.abs(x0) < 0.05) & (y0 > 0.34) & (y0 < 0.43) & (z0 > 0.03) & (z0 < 0.045), 0.3)
uv_stone = pick_uv((np.abs(x0) > 0.1) & (np.abs(x0) < 0.16) & (y0 > 0.62) & (y0 < 0.74) & (z0 < -0.05), 0.5)

E_ = Editor(M)
for nm, uh, ul in (('pendF', uv_recess, uv_bronze), ('pendB', uv_recess, uv_bronze), ('hand', uv_pale, uv_bronze), ('armL', uv_stone, uv_stone), ('armR', uv_stone, uv_stone)):
    rims = E_.split(C[nm], nm, uh, ul); print(nm, 'faces', int(C[nm].sum()), 'rims', [len(r) for r in rims])
M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r, g, b = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
pend = is_('pendF', 'pendF.lid', 'pendB', 'pendB.lid'); hand = is_('hand', 'hand.lid')
armL = is_('armL', 'armL.lid'); armR = is_('armR', 'armR.lid'); arm = armL | armR
body = ~(pend | hand | arm)
print('parts', {k: int((tag == v).sum()) for k, v in T.items()})

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.2, 0]), 'spine': ('hips', [0, 0.36, 0]), 'chest': ('spine', [0, 0.52, 0]),
 'neck': ('chest', [0, 0.76, 0.0]), 'head': ('neck', [0, 0.79, 0.0]),
 'pend': ('spine', [0, 0.44, 0]), 'hand': ('chest', DC.tolist()),
}
ends = {'head': [0, 1.0, 0.0], 'pend': [0, 0.25, 0], 'hand': (DC + [0.046, 0.03, 0]).tolist()}
SH, EL, WR, CH = np.array([0.172, 0.655, -0.01]), np.array([0.19, 0.57, -0.004]), np.array([0.258, 0.498, 0.062]), np.array([0.243, 0.448, 0.078])
for s, sg in (('L', 1), ('R', -1)):
    m = np.array([sg, 1, 1])
    J['sh' + s] = ('chest', (SH * m).tolist()); J['el' + s] = ('sh' + s, (EL * m).tolist()); J['wr' + s] = ('el' + s, (WR * m).tolist())
    J['ch' + s] = ('wr' + s, (CH * m).tolist()); ends['wr' + s] = (np.array([0.272, 0.47, 0.1]) * m).tolist(); ends['ch' + s] = (np.array([0.243, 0.22, 0.08]) * m).tolist()
names = list(J.keys())
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm and k not in ('pend', 'hand', 'chL', 'chR')]
    if nm in ends: segs.append((nm, a, np.array(ends[nm], float)))
    elif nm == 'chest': segs.append((nm, a, np.array(J['neck'][1], float))); segs.append((nm, a + [-0.15, 0.12, 0], a + [0.15, 0.12, 0]))
    elif nm == 'hips': segs.append((nm, a, np.array(J['spine'][1], float))); segs.append((nm, a + [-0.15, -0.1, 0], a + [0.15, -0.1, 0]))
    else: segs.append((nm, a, np.array(J[kids[0]][1], float)))

# ---- regions
chain = arm & (y < 0.452)
fist = arm & ~chain & (y < 0.53) & (ax > 0.22)
fore = arm & ~chain & ~fist & (y < 0.6)
upper = arm & (y >= 0.585)
head = body & (y > 0.78)
eye = body & (y > 0.805) & (y < 0.83) & (z > 0.06) & (b > g + 40)
bed = body & (y < 0.2)
print({k: int(v.sum()) for k, v in dict(chain=chain, fist=fist, fore=fore, upper=upper, head=head, eye=eye, bed=bed).items()})

def vis_of(nm, d):
    side = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm == 'head': return head
    if nm == 'pend': return pend
    if nm == 'hand': return hand
    if nm in ('chL', 'chR'): return chain & side
    if nm.startswith('wr'): return fist & side
    if nm.startswith('el'): return fore & side
    if nm.startswith('sh'): return upper & side
    if nm == 'neck': return body & (y > 0.72) & ~head
    if nm == 'hips': return body & (y < 0.33)
    if nm == 'spine': return body & (y > 0.2) & (y < 0.58)
    if nm == 'chest': return body & (y > 0.45) & ~head
    return body
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, nm): W[mask] = 0; W[mask, ix[nm]] = 1
# cut parts move nothing but themselves, and are moved by nothing else
for nm_, own_ in (('pend', pend), ('hand', hand)): W[~own_, ix[nm_]] = 0
for s, own_ in (('L', armL), ('R', armR)):
    for bn in ('sh', 'el', 'wr', 'ch'): W[~own_, ix[bn + s]] = 0
    others = [j for j in range(len(names)) if names[j][-1] != s or names[j] in ('hips', 'pend')]
    W[np.ix_(own_, others)] = 0
force(pend, 'pend'); force(hand, 'hand'); force(bed, 'hips'); force(head & (y > 0.8), 'head')
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg; force(chain & sd, 'ch' + s); force(fist & sd & (ax > 0.24), 'wr' + s); force(upper & sd & (y > 0.62), 'sh' + s)
# the stone case is one solid: the lower case stays rigid on the hips, the chest case rigid on the chest
force(body & (y > 0.26) & (y < 0.4) & ~pend, 'spine'); force(body & (y > 0.56) & (y < 0.78), 'chest')
# masks: x the eyes; y the dial's pale face; z kinds (the pendulum 1, the weights 0.5, the clock hand 0.25)
dial = body & (z > 0.1) & (np.hypot(x - DC[0], y - DC[1]) < 0.075) & (lum > 500)
wgt = chain & (y < 0.34)
gz = np.where(pend, 1.0, np.where(wgt, 0.5, np.where(hand, 0.25, 0.0)))
extra_ = {'dial': DC.tolist(), 'weights': {s: (np.array([0.243, 0.275, 0.08]) * [sg, 1, 1]).tolist() for s, sg in (('L', 1), ('R', -1))}}
finish(M, J, ends, W, names, out, [eye, dial, gz], fallback='spine', extra=extra_)
