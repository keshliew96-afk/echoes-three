# The Mire King's venom spots: the biggest warts on his back. usage: python3 -I warts.py <rig out dir>
# Finds raised bumps on the back (the skin against a smoothed copy of itself), keeps the biggest that are well apart, writes
# them into the first glow mask as NEGATIVE values (the sac is +1 there; the page reads sac = max(m,0), warts = max(-m,0)),
# and saves where each sits (warts.json: the joint it rides, its place from that joint, which way it points).
import sys, json, numpy as np, scipy.sparse as sp
from PIL import Image
d = sys.argv[1]
V = np.fromfile(d + '/b_pos.bin', '<f4').reshape(-1, 3).astype(float); F = np.fromfile(d + '/b_idx.bin', '<u4').reshape(-1, 3); N = np.fromfile(d + '/b_nrm.bin', '<f4').reshape(-1, 3).astype(float)
UV = np.fromfile(d + '/b_uv.bin', '<f4').reshape(-1, 2); JI = np.fromfile(d + '/b_ji.bin', '<u2').reshape(-1, 4); JW = np.fromfile(d + '/b_jw.bin', '<f4').reshape(-1, 4)
MK = np.fromfile(d + '/b_mask.bin', '<f4').reshape(-1, 3); sk = json.load(open(d + '/skel.json')); names = sk['names']; pos = np.array(sk['pos'])
MK[:, 0] = np.maximum(MK[:, 0], 0)  # a second run starts clean
tex = np.asarray(Image.open(d + '/body_tex.jpg').convert('RGB')).astype(int); TH, TW = tex.shape[:2]
tc = tex[np.clip(((1 - UV[:, 1] % 1) * (TH - 1)).astype(int), 0, TH - 1), np.clip(((UV[:, 0] % 1) * (TW - 1)).astype(int), 0, TW - 1)]
key = np.round(V, 5); uq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel(); nw = len(uq)
E = np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]); e = inv[E]; e = e[e[:, 0] != e[:, 1]]
A = sp.coo_matrix((np.ones(2 * len(e)), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(nw, nw)).tocsr(); A.data[:] = 1; deg = np.asarray(A.sum(1)).ravel(); Dn = sp.diags(1 / np.maximum(deg, 1)) @ A
Nw = np.zeros((nw, 3)); np.add.at(Nw, inv, N); Nw /= np.linalg.norm(Nw, axis=1, keepdims=True) + 1e-12
S = uq.copy()
for _ in range(60): S = 0.5 * S + 0.5 * (Dn @ S)
bump = ((uq - S) * Nw).sum(1)
tcw = np.zeros((nw, 3)); cnt = np.zeros(nw); np.add.at(tcw, inv, tc); np.add.at(cnt, inv, 1); tcw /= cnt[:, None]
teal = tcw[:, 1] - tcw[:, 0] > 18
x, y, z = uq.T
back = teal & (y > 0.33) & (y < 0.72) & (z < 0.1) & (z > -0.42) & (Nw[:, 1] > 0.25) & (np.abs(x) < 0.3)
print('back verts', back.sum(), 'bump range', bump[back].min().round(4), bump[back].max().round(4), 'p90', np.percentile(bump[back], 90).round(4))
back &= (np.abs(x) < 0.25) & (y > 0.36)
cand = np.nonzero(back & (bump > 0.012))[0]; cand = cand[np.argsort(-bump[cand])]; keep = []
for i in cand:
    if all(np.linalg.norm(uq[i] - uq[k]) > 0.095 for k in keep): keep.append(i)
    if len(keep) == 11: break
print('warts kept', len(keep))
w = np.zeros(nw); out = []
for pk in keep:
    dist = np.linalg.norm(uq - uq[pk], axis=1); near = (dist < 0.09) & (bump < 0.25 * bump[pk]); R = float(np.clip(dist[near].min() if near.any() else 0.06, 0.036, 0.062))
    k = np.clip(1 - dist / R, 0, 1); k = k * k * (3 - 2 * k); w = np.maximum(w, k)
    top = uq[pk]; vi = np.nonzero(inv == pk)[0][0]; b = JI[vi][np.argmax(JW[vi])]; nrm = Nw[pk]
    out.append({'bone': names[b], 'off': (top - pos[b]).round(4).tolist(), 'n': nrm.round(3).tolist(), 'p': top.round(4).tolist(), 'r': round(R, 4)})
    print('  wart at', top.round(3), 'r %.3f' % R, 'height %.3f' % bump[pk], 'bone', names[b])
MK[:, 0] = np.where(w[inv] > 0.01, -w[inv], MK[:, 0])
MK.astype('<f4').tofile(d + '/b_mask.bin'); json.dump(out, open(d + '/warts.json', 'w'))
print('mask: wart verts', int((MK[:, 0] < 0).sum()), 'sac verts', int((MK[:, 0] > 0).sum()))
