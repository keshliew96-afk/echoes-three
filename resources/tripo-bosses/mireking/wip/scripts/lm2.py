import sys, trimesh, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
m = trimesh.load(sys.argv[1], force='mesh', process=False)
V = np.asarray(m.vertices, float); tc=np.load(sys.argv[2]+'/tc.npy'); c=np.clip(tc*1.3,0,255)/255
x,y,z=V.T
def ax_(a, hx, hy, k, title, s=4):
    a.scatter(V[k, hx], V[k, hy], s=s, c=c[k]); a.set_facecolor('#555'); a.set_aspect('equal'); a.set_title(title); a.grid(True, lw=0.3)
    lo,hi=V[k,hx].min(),V[k,hx].max(); a.set_xticks(np.arange(np.floor(lo*20)/20, hi+0.05, 0.05)); lo,hi=V[k,hy].min(),V[k,hy].max(); a.set_yticks(np.arange(np.floor(lo*20)/20, hi+0.05, 0.05)); a.tick_params(labelsize=8)
fig, axs = plt.subplots(2, 3, figsize=(36, 22))
ax_(axs[0,0], 2, 1, (x>0.27)&(y<0.45), 'outer left x>0.27 side (z right)')
ax_(axs[0,1], 2, 1, (x>0.18)&(x<0.27)&(y<0.45), 'x 0.18-0.27 side')
ax_(axs[0,2], 0, 1, (z>-0.12)&(z<0.02)&(x>0.1)&(y<0.45), 'knee slab z -0.12..0.02 front (x right)')
ax_(axs[1,0], 0, 1, (z<-0.28)&(x>0.0)&(y<0.45), 'heel slab z<-0.28 (x right)')
ax_(axs[1,1], 0, 1, (z>0.02)&(z<0.12)&(x>0.0)&(y<0.6), 'arm slab z 0.02..0.12 (x right)')
ax_(axs[1,2], 0, 1, (z>0.12)&(z<0.22)&(x>0.0)&(y<0.6), 'arm slab z 0.12..0.22 (x right)')
plt.tight_layout(); plt.savefig(sys.argv[2]+'/lm_legs.png', dpi=56)
fig, axs = plt.subplots(1, 3, figsize=(36, 13))
ax_(axs[0], 2, 1, (abs(x)<0.03)&(y>0.3), 'mid slab |x|<0.03 side (z right)',6)
ax_(axs[1], 2, 1, (x>0.12)&(x<0.2)&(y>0.3), 'x 0.12-0.2 side',6)
ax_(axs[2], 2, 0, (y>0.55)&(y<0.66), 'y 0.55-0.66 top (z right, x up)',6)
plt.tight_layout(); plt.savefig(sys.argv[2]+'/lm_head.png', dpi=56)
