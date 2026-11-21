# The Bellfounder's rig. usage: python3 -I rig.py <body.glb> <crucible.glb> <outdir> <kit dir>
# A hunched kiln of fire brick on two short brick legs with stone boots, a bronze bell for a helmet with two violet eye
# slits, dark slag arms reaching forward with open palms, an arched iron door on its chest with the fire behind the bars,
# and a small bronze bell hanging on a chain at each hip. Tripo sent the crucible as its own file: this scales it into the
# open hands, handles to the palms and the spout forward, and fills it with a molten surface. The chest door is cut free
# on its own hinge so the Firing can throw it open; the hole behind it is closed with a glowing hearth.
# Bones: the spine chain, two limb arms (shoulder, elbow, wrist, fingers) that grip the crucible's handles, two limb legs
# (hip, knee, ankle, toes), the door, two hip bells on their chains, and the crucible on the root.
import sys, json; sys.path.insert(0, sys.argv[4])
import numpy as np
from rigkit import Mesh, skin, finish, Editor
src, csrc, out = sys.argv[1], sys.argv[2], sys.argv[3]; M = Mesh(src); C = Mesh(csrc)
V0 = M.V; x0, y0, z0 = V0.T; tc0 = M.tc.astype(float); lum0 = tc0.sum(1)

def pick_uv(vmask, q):
    idx = np.nonzero(vmask)[0]; lum = tc0[idx].sum(1); want = np.quantile(lum, q); cand = idx[np.argsort(np.abs(lum - want))[:60]]; tex = M.tex; TH, TW = tex.shape[:2]; best = None
    for i in cand:
        u, v = M.UV[i]; px, py = int((u % 1) * (TW - 1)), int((1 - v % 1) * (TH - 1)); pt = tex[max(0, py - 5):py + 6, max(0, px - 5):px + 6].reshape(-1, 3)
        sc = pt.std(0).sum() + 0.3 * abs(pt.sum(1).mean() - want)
        if best is None or sc < best[0]: best = (sc, M.UV[i].copy(), pt.mean(0))
    print('   uv pick q', q, 'colour', best[2].round(0)); return best[1]
uv_iron = pick_uv((x0 > 0.2) & (y0 > 0.45) & (lum0 < 230), 0.35)      # the slag of the upper arm: the crucible's iron
uv_door = pick_uv((z0 > 0.1) & (y0 > 0.38) & (y0 < 0.56) & (lum0 < 200), 0.5)  # the door's iron
# the hearth behind the door: the hottest texel of the fire between the bars
hotk = (z0 > 0.08) & (np.abs(x0) < 0.12) & (y0 > 0.38) & (y0 < 0.56)
hi = np.nonzero(hotk)[0][np.argmax(tc0[hotk, 0] + tc0[hotk, 1] - tc0[hotk, 2])]; uv_fire = M.UV[hi].copy(); print('   fire texel', tc0[hi])
mi = np.nonzero(hotk)[0][np.argsort(-(tc0[hotk, 0] + 0.6 * tc0[hotk, 1]))[3]]; uv_melt = M.UV[mi].copy(); print('   molten texel', tc0[mi])

E_ = Editor(M)
uv_brick = pick_uv((np.abs(x0) < 0.15) & (z0 < -0.15) & (y0 > 0.4) & (y0 < 0.6), 0.3)
# ---- the arms: Tripo welded each upper arm to the side of the body from the shoulder down to y 0.5, so lifting an arm
# pulled the bricks after it in long slivers. Each arm is cut free whole along its dark slag; both cuts are closed (brick
# on the body, slag on the arm). The shoulder joint sits inside the cut, so the arm turns on it like a puppet's.
ax0 = np.abs(x0)
arm0 = (lum0 < 235) & (ax0 > 0.168) & (y0 > 0.225) & ~((ax0 < 0.27) & (y0 < 0.3) & (z0 < 0.0)) & ~((y0 < 0.36) & (ax0 < 0.215))
for s_, sg_ in (('L', 1), ('R', -1)):
    Aarm = (arm0 & (np.sign(x0) == sg_))[M.F].all(1)
    rims = E_.split(Aarm, 'armcut' + s_, uv_brick, uv_iron)
    print('arm', s_, 'faces', int(Aarm.sum()), 'rims', [len(r) for r in rims])
# ---- the hip bells: each touches the outer thigh, so a step dragged the bell's skin; cut each bell and its chain free
rg0 = tc0[:, 0] / (tc0[:, 1] + 1)
hb0 = (ax0 > 0.176) & (ax0 < 0.275) & (y0 < 0.292) & (y0 > 0.1) & (z0 < 0.012) & (rg0 < 1.42) & ~arm0
for s_, sg_ in (('L', 1), ('R', -1)):
    Ahb = (hb0 & (np.sign(x0) == sg_))[M.F].all(1)
    rims = E_.split(Ahb, 'hbcut' + s_, uv_brick, uv_iron)
    print('hip bell', s_, 'faces', int(Ahb.sum()), 'rims', [len(r) for r in rims])
# ---- the chest door: the arched iron face, cut free along its frame; hinge on its left edge (+x)
DX, DW, DY0, DY1, DTOP = 0.006, 0.133, 0.372, 0.522, 0.056
def in_door(P):
    u = (P[:, 0] - DX) / DW
    return (np.abs(u) < 1) & (P[:, 1] > DY0) & (P[:, 1] < DY1 + DTOP * np.sqrt(np.clip(1 - u * u, 0, 1))) & (P[:, 2] > 0.075)
Fc = V0[M.F].mean(1); FN = np.cross(V0[M.F[:, 1]] - V0[M.F[:, 0]], V0[M.F[:, 2]] - V0[M.F[:, 0]]); FN /= np.linalg.norm(FN, axis=1, keepdims=True) + 1e-12
A = in_door(Fc)
# keep only the main connected sheet of the door faces
print('door faces', int(A.sum()))
rims = E_.split(A, 'door', uv_fire, uv_door)
print('door rims', [len(r) for r in rims])

# ---- the crucible: Tripo's own file, scaled into the hands; handles to the palms (+-x), spout forward (+z)
CS = 0.3; CP = np.array([0.0, 0.16, 0.26])
Rc = np.array([[0, 0, -1], [0, 1, 0], [1, 0, 0]], float)  # crucible x (spout) -> +z, crucible z (handles) -> -x
cc = C.V.copy(); cc[:, 0] -= -0.03  # its cup is centred 0.03 toward -x in its own file
CV = (cc @ Rc.T) * CS + CP
E_.add(CV, uv_iron, C.F, 'cru')
# the molten bronze inside, a little under the rim
MOLT_Y = 0.6
n = 20; ang = 2 * np.pi * np.arange(n) / n; ring = np.c_[0.37 * np.cos(ang), np.full(n, MOLT_Y), 0.37 * np.sin(ang)]
mp = np.vstack([[0, MOLT_Y, 0], ring]); mt = np.array([(0, 1 + (i + 1) % n, 1 + i) for i in range(n)])
E_.add((mp @ Rc.T) * CS + CP, uv_melt, mt, 'molten')
HANDLE = {s: (np.array([-0.03, 0.58, 0.46 * (-1 if s == 'L' else 1)]) - [-0.03, 0, 0]) @ Rc.T * CS + CP for s in 'LR'}
SPOUT = (np.array([0.47, 0.66, 0.0]) - [-0.03, 0, 0]) @ Rc.T * CS + CP
print('handles', {k: v.round(3).tolist() for k, v in HANDLE.items()}, 'spout', SPOUT.round(3))

M = E_.done(); V = M.V; x, y, z = V.T; ax = np.abs(x); tc = M.tc.astype(float); r, g, b = tc.T; lum = tc.sum(1); tag = M.tag; T = M.tags
is_ = lambda *names: np.isin(tag, [T[n] for n in names if n in T])
armcut = is_('armcutL', 'armcutR', 'armcutL.lid', 'armcutR.lid'); armhole = is_('armcutL.hole', 'armcutR.hole')
body = (tag == 0) | armcut | armhole | is_('hbcutL', 'hbcutR', 'hbcutL.lid', 'hbcutR.lid', 'hbcutL.hole', 'hbcutR.hole')
cru = is_('cru', 'molten'); door = is_('door', 'door.lid'); hole = is_('door.hole')
print('parts', {k: int((tag == v).sum()) for k, v in T.items()})

J = {
 'root': (None, [0, 0, 0]),
 'hips': ('root', [0, 0.25, -0.04]), 'spine': ('hips', [0, 0.42, -0.04]), 'chest': ('spine', [0, 0.6, -0.05]),
 'neck': ('chest', [0, 0.73, -0.04]), 'head': ('neck', [0, 0.775, -0.03]),
 'door': ('spine', [0.139, 0.47, 0.135]),
 'cru': ('root', CP.tolist()),
}
ends = {'head': [0, 1.0, 0.0], 'door': [0.139, 0.57, 0.135], 'cru': (CP + [0, 0.25, 0]).tolist()}
for s, sg in (('L', 1), ('R', -1)):
    J['arm' + s] = ('chest', [0.185 * sg, 0.69, -0.085]); J['fore' + s] = ('arm' + s, [0.27 * sg, 0.405, -0.075])
    J['hand' + s] = ('fore' + s, [0.325 * sg, 0.30, 0.055]); J['fing' + s] = ('hand' + s, [0.34 * sg, 0.275, 0.15]); ends['fing' + s] = [0.355 * sg, 0.28, 0.21]
    J['thigh' + s] = ('hips', [0.108 * sg, 0.235, -0.045]); J['shin' + s] = ('thigh' + s, [0.112 * sg, 0.145, -0.035])
    J['foot' + s] = ('shin' + s, [0.11 * sg, 0.07, -0.055]); J['toe' + s] = ('foot' + s, [0.12 * sg, 0.018, 0.02]); ends['toe' + s] = [0.125 * sg, 0.0, 0.07]
    J['hb' + s] = ('hips', [0.205 * sg, 0.278, -0.045]); ends['hb' + s] = [0.225 * sg, 0.14, -0.05]
names = list(J.keys())
segs = []
for nm in names:
    if nm == 'root': continue
    a = np.array(J[nm][1], float); kids = [k for k in names if J[k][0] == nm and k not in ('door', 'cru') and not k.startswith('hb')]
    if nm in ends: segs.append((nm, a, np.array(ends[nm], float)))
    elif nm == 'hips': segs.append((nm, a, np.array(J['spine'][1], float))); segs.append((nm, a + [-0.12, 0, 0], a + [0.12, 0, 0]))
    elif nm == 'spine': segs.append((nm, a, np.array(J['chest'][1], float))); segs.append((nm, a + [0, 0, -0.15], a + [0, 0, 0.12]))
    elif nm == 'chest': segs.append((nm, a, np.array(J['neck'][1], float))); segs.append((nm, a + [-0.14, 0.05, 0], a + [0.14, 0.05, 0])); segs.append((nm, a, a + [0, 0, -0.17]))
    else: segs.append((nm, a, np.array(J[kids[0]][1], float)))

# ---- regions
arm = armcut
hand = arm & (z > 0.03) & (y < 0.37)
fing = hand & (z > 0.145)
leg = body & (y < 0.24) & (ax > 0.025) & (ax < 0.2) & ~arm
foot = leg & (y < 0.095)
toe = foot & (z > 0.0)
hbcut = is_('hbcutL', 'hbcutR', 'hbcutL.lid', 'hbcutR.lid')
hb = hbcut
head = body & ((y > 0.775) | ((y > 0.735) & (ax < 0.13) & (z > -0.17)))
eye = body & (y > 0.85) & (y < 0.895) & (ax > 0.015) & (ax < 0.065) & (z > 0.03) & (b > g + 20)
print({k: int(v.sum()) for k, v in dict(arm=arm, hand=hand, fing=fing, leg=leg, foot=foot, toe=toe, hb=hb, head=head, eye=eye).items()})

def vis_of(nm, d):
    side = (np.sign(x) == (1 if nm[-1] == 'L' else -1)) if nm[-1] in 'LR' else np.ones(len(V), bool)
    if nm == 'head': return head
    if nm == 'door': return door
    if nm == 'cru': return cru
    if nm.startswith('hb'): return hb & side
    if nm.startswith('fing'): return fing & side
    if nm.startswith('hand'): return hand & side & ~fing
    if nm.startswith('fore'): return arm & side & (y < 0.47) & ~hand
    if nm.startswith('arm'): return arm & side & (y > 0.36)
    if nm.startswith('toe'): return toe & side
    if nm.startswith('foot'): return foot & side & ~toe
    if nm.startswith('shin'): return leg & side & (y < 0.19) & ~foot
    rest = (body | hole) & ~(head | arm | leg | hb)
    if nm.startswith('thigh'): return (leg & side & (y > 0.12) & ~foot) | (rest & side & (y < 0.27) & (ax > 0.04) & (ax < 0.17))
    if nm == 'neck': return (rest & (y > 0.68)) | (head & (y < 0.8))
    if nm == 'hips': return rest & (y < 0.4)
    if nm == 'spine': return rest & (y > 0.24) & (y < 0.62)
    if nm == 'chest': return rest & (y > 0.48)
    return rest
W, names, ix = skin(M, J, segs, vis_of)
def force(mask, nm): W[mask] = 0; W[mask, ix[nm]] = 1
# the brick body must not follow the arms: away from the shoulder joint the arm bones let go of every vertex that is not arm
for s_, sg_ in (('L', 1), ('R', -1)):
    d_sh = np.linalg.norm(V - np.array(J['arm' + s_][1]), axis=1); keep = np.clip((0.03 - d_sh) / 0.03, 0, 1); keep = keep * keep * (3 - 2 * keep)
    for bn in ('arm', 'fore', 'hand', 'fing'):
        j = ix[bn + s_]; W[~arm, j] *= keep[~arm]
    # and the arm does not stay behind on the body: past the shoulder an arm vertex belongs to the arm bones alone
    mine = arm & (np.sign(x) == sg_); chain = [ix[bn + s_] for bn in ('arm', 'fore', 'hand', 'fing')]
    others = np.setdiff1d(np.arange(len(names)), chain)
    sub = W[np.ix_(mine, others)] * keep[mine][:, None]; W[np.ix_(mine, others)] = sub
for nm_, own_ in (('door', door), ('cru', cru)): W[~own_, ix[nm_]] = 0  # parts cut free move nothing but themselves
for s_, sg_ in (('L', 1), ('R', -1)): W[~(hb & (np.sign(x) == sg_)), ix['hb' + s_]] = 0
force(head & (y > 0.8), 'head'); force(door, 'door'); force(cru, 'cru')
for s, sg in (('L', 1), ('R', -1)):
    sd = np.sign(x) == sg
    force(hb & sd, 'hb' + s); force(fing & sd & (z > 0.16), 'fing' + s); force(foot & sd & (y < 0.06) & ~toe, 'foot' + s); force(toe & sd & (z > 0.03), 'toe' + s)
# masks: x the eye slits; y the fire (the door's face and the hearth behind it); z kinds (molten 1, hearth 0.75, hip bells 0.5, crucible 0.25)
fire = door | hole
gz = np.where(is_('molten'), 1.0, np.where(hole, 0.75, np.where(hb, 0.5, np.where(cru, 0.25, 0.0))))
extra_ = {'handles': {k: v.tolist() for k, v in HANDLE.items()}, 'spout': SPOUT.tolist(), 'cru': {'scale': CS, 'pos': CP.tolist(), 'molten_y': float(CP[1] + MOLT_Y * CS)}}
finish(M, J, ends, W, names, out, [eye, fire, gz], fallback='spine', extra=extra_)
