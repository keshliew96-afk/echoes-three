import trimesh, numpy as np
from PIL import Image
m=trimesh.load('model.glb',force='mesh',process=False)
V=m.vertices; F=m.faces; uv=m.visual.uv
tex=np.asarray(m.visual.material.baseColorTexture.convert('RGB')).astype(float)/255
H,W=tex.shape[:2]
px=np.clip((uv[:,0]%1)*W,0,W-1).astype(int); py=np.clip((1-uv[:,1]%1)*H,0,H-1).astype(int)
col=tex[py,px]
np.save('col.npy',col)
# candidate seed: far from body
seed=(V[:,2]>0.2)&(V[:,0]<-0.12)&((V[:,1]>0.62)|(V[:,1]<0.3))
print('seed',seed.sum())
P=V[seed]; c=P.mean(0); u,s,vt=np.linalg.svd(P-c); ax=vt[0]; ax*=np.sign(ax[1])
print('center',c,'axis',ax,'sv',s)
d=V-c; t=d@ax; perp=np.linalg.norm(d-np.outer(t,ax),axis=1)
for lo in np.arange(-0.5,0.55,0.05):
    k=(t>=lo)&(t<lo+0.05)&(perp<0.08)
    if k.sum(): print(round(lo,2),'y~',round(V[k,1].mean(),2),k.sum(),'perp pct',np.percentile(perp[k],[50,90,100]).round(3),'col',col[k].mean(0).round(2))
