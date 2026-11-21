import trimesh, numpy as np
m=trimesh.load('body2s.glb',force='mesh',process=False)
V=m.vertices; print(len(V),len(m.faces),m.bounds)
uv=m.visual.uv; tex=np.asarray(m.visual.material.baseColorTexture.convert('RGB')).astype(float)/255
H,W=tex.shape[:2]; col=tex[np.clip(((1-uv[:,1]%1)*H).astype(int),0,H-1),np.clip(((uv[:,0]%1)*W).astype(int),0,W-1)]
np.save('col2.npy',col)
print('y slices: x-range, z-range')
for y in np.arange(0,1,0.05):
    k=(V[:,1]>=y)&(V[:,1]<y+0.05)
    print(round(y,2),k.sum(),V[k,0].min().round(2),V[k,0].max().round(2),V[k,2].min().round(2),V[k,2].max().round(2))
# arms: x slices for x>0.15
for x in np.arange(0.14,0.40,0.03):
    k=(V[:,0]>=x)&(V[:,0]<x+0.03)&(V[:,1]>0.25)&(V[:,1]<0.75)&(np.abs(V[:,2])<0.15)
    if k.sum(): print('armL x',round(x,2),k.sum(),'y',V[k,1].min().round(2),V[k,1].max().round(2),'z',V[k,2].mean().round(2),'col',col[k].mean(0).round(2))
# tail: z<-0.2
k=(V[:,2]<-0.17)&(V[:,1]<0.35)
print('tail verts',k.sum())
for z in np.arange(-0.38,-0.1,0.03):
    kk=(V[:,2]>=z)&(V[:,2]<z+0.03)&(V[:,1]<0.3)&(col[:,0]>col[:,2]+0.12)
    if kk.sum(): print('tail z',round(z,2),kk.sum(),'x',V[kk,0].min().round(2),V[kk,0].max().round(2),'y',V[kk,1].min().round(2),V[kk,1].max().round(2))
# feet y<0.08
for s in (-1,1):
    k=(V[:,1]<0.1)&(V[:,0]*s>0.02)&(V[:,2]>-0.1)
    print('foot',s,V[k].mean(0).round(3),V[k].min(0).round(2),V[k].max(0).round(2))
