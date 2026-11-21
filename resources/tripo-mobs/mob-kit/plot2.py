# plot2.py <glb> <out.png> <view: side|top|front> [xmin xmax ymin ymax] [filter python expr on x,y,z]: one big view, grid 0.02
import sys,trimesh,numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
m=trimesh.load(sys.argv[1],force='mesh',process=False); V=np.asarray(m.vertices); UV=np.asarray(m.visual.uv)
tex=np.asarray(m.visual.material.baseColorTexture.convert('RGB')); TH,TW=tex.shape[:2]
c=tex[np.clip(((1-UV[:,1]%1)*(TH-1)).astype(int),0,TH-1),np.clip(((UV[:,0]%1)*(TW-1)).astype(int),0,TW-1)]/255
x,y,z=V.T; view=sys.argv[3]; lim=[float(a) for a in sys.argv[4:8]] if len(sys.argv)>7 else None
k=eval(sys.argv[8]) if len(sys.argv)>8 else np.ones(len(V),bool)
h,v={'side':(z,y),'top':(x,z),'front':(x,y)}[view]
fig,a=plt.subplots(figsize=(16,16)); a.scatter(h[k],v[k],s=6,c=c[k]); a.set_aspect('equal')
if lim: a.set_xlim(lim[0],lim[1]); a.set_ylim(lim[2],lim[3])
xs=a.get_xlim(); ys=a.get_ylim(); a.set_xticks(np.arange(round(xs[0],2),xs[1],0.02)); a.set_yticks(np.arange(round(ys[0],2),ys[1],0.02)); a.grid(True,lw=0.4); a.tick_params(labelsize=7); plt.xticks(rotation=90)
plt.tight_layout(); plt.savefig(sys.argv[2],dpi=60)
