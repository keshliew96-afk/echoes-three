import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from rigkit import Mesh, face_graph
M = Mesh(sys.argv[2]); V=M.V; F=M.F
g=face_graph(M); fc=g['fc']; fn=g['fn']
P=V[F]; ar=0.5*np.linalg.norm(np.cross(P[:,1]-P[:,0],P[:,2]-P[:,0]),axis=1)
reg=(fc[:,0]<-0.16)&(fc[:,0]>-0.31)&(fc[:,1]>0.36)&(fc[:,1]<0.69)&(fc[:,2]>-0.18)&(fc[:,2]<0.1)
rng=np.random.RandomState(1)
def ransac(sel,thr=0.004,it=4000):
    idx=np.nonzero(sel)[0]; best=(0,None)
    for _ in range(it):
        a,b,c_=fc[rng.choice(idx,3,replace=False)]; n=np.cross(b-a,c_-a); l=np.linalg.norm(n)
        if l<1e-8: continue
        n/=l
        if n[0]>0: n=-n
        d=(fc[idx]-a)@n; inl=(abs(d)<thr)&(abs(fn[idx]@n)>0.85); sc=ar[idx][inl].sum()
        if sc>best[0]: best=(sc,(a,n,idx[inl]))
    a,n,inl=best[1]
    for _ in range(5):
        c=(fc[inl]*ar[inl,None]).sum(0)/ar[inl].sum(); X=(fc[inl]-c)*np.sqrt(ar[inl,None]); n2=np.linalg.svd(X,full_matrices=False)[2][2]
        if n2[0]>0: n2=-n2
        d=(fc[idx]-c)@n2; k=(abs(d)<thr)&(abs(fn[idx]@n2)>0.85); inl=idx[k]; n=n2
    return c,n,inl
n0=np.array([-0.969,0.155,0.194])
cb,nb,ib=ransac(reg&((fn@n0)<-0.7))
print('BACK  c',cb.round(4),'n',nb.round(4),'faces',len(ib),'area',ar[ib].sum().round(4))
cf,nf,if_=ransac(reg&((fn@n0)>0.7))
print('FRONT c',cf.round(4),'n',nf.round(4),'faces',len(if_),'area',ar[if_].sum().round(4),'offset of front from back along nb',((cf-cb)@nb).round(4))
n=nb; ey=np.array([0,1,0.]); ev=ey-(ey@n)*n; ev/=np.linalg.norm(ev); eu=np.cross(ev,n)
for nm,i,c in (('back',ib,cb),('front',if_,cf)):
    u=(fc[i]-cb)@eu; v=(fc[i]-cb)@ev; print(nm,'u',u.min().round(3),u.max().round(3),'v',v.min().round(3),v.max().round(3))
np.save('wip/plane.npy',np.r_[cb,nb,cf,nf])
u=(fc-cb)@eu; v=(fc-cb)@ev; d=(fc-cb)@n
fig,axs=plt.subplots(1,3,figsize=(36,13))
near=reg|((abs(u)<0.2)&(abs(v)<0.2)&(d>-0.08)&(d<0.08))
for a,(nm,k) in zip(axs,(('back-facing',near&((fn@n)<-0.7)),('front-facing',near&((fn@n)>0.7)),('side',near&(abs(fn@n)<=0.7)))):
    s=a.scatter(u[k],v[k],c=d[k],s=18,cmap='turbo',vmin=-0.05,vmax=0.05); a.set_aspect('equal'); a.set_title(nm+': colour = d (outward +)'); a.grid(True,lw=0.3); plt.colorbar(s,ax=a)
    a.set_xlim(-0.2,0.2); a.set_ylim(-0.2,0.25); a.set_xlabel('u (+z, forward)'); a.set_ylabel('v (up)')
plt.tight_layout(); plt.savefig('plane3.png',dpi=45)
