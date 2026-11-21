# plot.py <glb> <out.png> [thick.npy]: side (z,y), front (x,y), top (x,z) point clouds coloured by texture, grid every 0.05
import sys,trimesh,numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
m=trimesh.load(sys.argv[1],force='mesh',process=False); V=np.asarray(m.vertices); UV=np.asarray(m.visual.uv)
tex=np.asarray(m.visual.material.baseColorTexture.convert('RGB')); TH,TW=tex.shape[:2]
c=tex[np.clip(((1-UV[:,1]%1)*(TH-1)).astype(int),0,TH-1),np.clip(((UV[:,0]%1)*(TW-1)).astype(int),0,TW-1)]/255
fig,axs=plt.subplots(1,3,figsize=(33,11))
for a,(h,v,nm,k) in zip(axs,((2,1,'left side (z,y), x>0',V[:,0]>-0.01),(0,1,'front (x,y), z>-0.1',V[:,2]>-0.1),(0,2,'top (x,z)',V[:,1]>-1))):
    o=np.argsort(V[k][:, {2:0,0:2}.get(h,0)] if h!=0 else V[k][:,2]) if False else np.arange(k.sum())
    a.scatter(V[k,h],V[k,v],s=3,c=c[k]); a.set_aspect('equal'); a.set_title(nm,fontsize=18)
    a.set_xticks(np.arange(-0.5,0.51,0.05)); a.set_yticks(np.arange(-0.5,1.01,0.05)); a.grid(True,lw=0.4); a.tick_params(labelsize=8)
plt.tight_layout(); plt.savefig(sys.argv[2],dpi=55)
