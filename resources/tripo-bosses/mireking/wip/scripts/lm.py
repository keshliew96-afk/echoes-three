import sys, trimesh, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
import scipy.sparse as sp, scipy.sparse.csgraph as cg
m = trimesh.load(sys.argv[1], force='mesh', process=False)
V = np.asarray(m.vertices, float); F=np.asarray(m.faces); UV = np.asarray(m.visual.uv, float)
tex = np.asarray(m.visual.material.baseColorTexture.convert('RGB')).astype(int); TH, TW = tex.shape[:2]
tc = tex[np.clip(((1 - UV[:, 1] % 1) * (TH - 1)).astype(int), 0, TH - 1), np.clip(((UV[:, 0] % 1) * (TW - 1)).astype(int), 0, TW - 1)]
np.save(sys.argv[2]+'/tc.npy', tc)
key = np.round(V, 5); uq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel(); nw = len(uq)
E_ = np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]); E_ = inv[E_]
A = sp.coo_matrix((np.ones(len(E_)), (E_[:, 0], E_[:, 1])), shape=(nw, nw)).tocsr()
nc, lab = cg.connected_components(A, directed=False); cnt=np.bincount(lab)
print('pieces', nc, sorted(cnt.tolist(), reverse=True)[:10])
comp=lab[inv]
for c in np.argsort(-cnt)[:8]:
    k=comp==c; print(c, cnt[c], V[k].min(0).round(3), V[k].max(0).round(3))
print('bbox', V.min(0), V.max(0), 'x mean', V[:,0].mean())
c = np.clip(tc*1.3,0,255)/255
def ax_(a, hx, hy, k, title, s=1.6):
    a.scatter(V[k, hx], V[k, hy], s=s, c=c[k]); a.set_facecolor('#555'); a.set_aspect('equal'); a.set_title(title); a.grid(True, lw=0.3)
    a.set_xticks(np.arange(-0.5, 0.51, 0.05)); a.set_yticks(np.arange(-0.5 if hy==0 else 0, 1.01 if hy==1 else 0.51, 0.05)); a.tick_params(labelsize=7)
fig, axs = plt.subplots(1, 2, figsize=(34, 18))
ax_(axs[0], 2, 1, V[:,0]>0.0, 'left half (z right = front)')
ax_(axs[1], 0, 1, V[:,2]>0.0, 'front half from front (x right = model left)')
plt.tight_layout(); plt.savefig(sys.argv[2]+'/lm_a.png', dpi=56)
fig, axs = plt.subplots(1, 2, figsize=(34, 18))
ax_(axs[0], 2, 0, V[:,1]<0.12, 'low y<0.12 from top (z right, x up)', 3)
ax_(axs[1], 2, 0, (V[:,1]>0.12)&(V[:,1]<0.3), 'y 0.12-0.3 (z right, x up)', 3)
plt.tight_layout(); plt.savefig(sys.argv[2]+'/lm_b.png', dpi=56)
fig, axs = plt.subplots(2, 4, figsize=(36, 18))
for a,(lo,hi) in zip(axs.ravel(),((0,0.025),(0.05,0.075),(0.1,0.125),(0.15,0.175),(0.2,0.225),(0.3,0.325),(0.4,0.425),(0.5,0.525))):
    k=(V[:,1]>lo)&(V[:,1]<hi); a.scatter(V[k,2],V[k,0],s=3,c=c[k]); a.set_facecolor('#555'); a.set_aspect('equal'); a.grid(True,lw=0.3); a.set_title(f'y {lo}-{hi} (z right, x up)')
    a.set_xticks(np.arange(-0.5,0.51,0.05)); a.set_yticks(np.arange(-0.4,0.41,0.05)); a.tick_params(labelsize=7)
plt.tight_layout(); plt.savefig(sys.argv[2]+'/lm_sec.png', dpi=56)
