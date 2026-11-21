import trimesh, numpy as np, json
m=trimesh.load('model.glb',force='mesh',process=False)
V=m.vertices.copy(); F=m.faces.copy(); uv=np.asarray(m.visual.uv).copy(); N=m.vertex_normals.copy()
col=np.load('col.npy')
c=np.array([-0.24939645,0.5482451,0.3146013]); ax=np.array([-0.14040752,0.97851529,0.15097534])
d=V-c; t=d@ax; perp=np.linalg.norm(d-np.outer(t,ax),axis=1)
brown=np.array([.54,.39,.28]); cd=np.linalg.norm(col-brown,axis=1)
near_region=(V[:,2]>0.15)&(V[:,0]<-0.1)
HLO,HHI=-0.28,-0.04
sv=near_region&(((t>HHI)&(perp<0.075))|((t<HLO)&(perp<0.03))|((t>=HLO)&(t<=HHI)&(perp<0.024)&(cd<0.12)))
sf=sv[F].all(1)
print('staff verts',sv.sum(),'staff faces',sf.sum())
# in hand zone report colours of near-axis verts
k=(t>=HLO)&(t<=HHI)&(perp<0.03)&near_region
print('hand zone near axis',k.sum(),'brown',(k&(cd<0.12)).sum())
def sub(mask):
    fi=F[mask]; ids=np.unique(fi); remap=-np.ones(len(V),int); remap[ids]=np.arange(len(ids))
    return V[ids],remap[fi],uv[ids],N[ids],ids
def loops(Vs,Fs):
    # boundary edges using position-welded verts
    key=np.round(Vs,6); _,inv=np.unique(key,axis=0,return_inverse=True)
    e={}
    for f in Fs:
        for a,b in ((f[0],f[1]),(f[1],f[2]),(f[2],f[0])):
            e[(inv[a],inv[b])]=(a,b)
    bnd=[(k,v) for k,v in e.items() if (k[1],k[0]) not in e]
    nxt={k[0]:(k[1],v) for k,v in bnd}
    out=[];seen=set()
    for k,v in bnd:
        if k[0] in seen: continue
        loop=[];cur=k[0]
        while cur not in seen and cur in nxt:
            seen.add(cur); nx,vv=nxt[cur]; loop.append(vv[0]); cur=nx
        out.append(loop)
    return out
def cap(Vs,Fs,UVs,Ns,capuv,minlen=3):
    Vs=list(Vs);Fs=list(Fs);UVs=list(UVs);Ns=list(Ns)
    for lp in loops(np.array(Vs),np.array(Fs)):
        if len(lp)<minlen: continue
        P=np.array([Vs[i] for i in lp]); ctr=P.mean(0)
        # normal: reverse winding of loop
        n=np.zeros(3)
        for i in range(len(P)): n+=np.cross(P[i]-ctr,P[(i+1)%len(P)]-ctr)
        n=-n/ (np.linalg.norm(n)+1e-9)
        base=len(Vs)
        for p in P: Vs.append(p);UVs.append(capuv);Ns.append(n)
        Vs.append(ctr);UVs.append(capuv);Ns.append(n); ci=len(Vs)-1
        for i in range(len(P)): Fs.append([base+(i+1)%len(P),base+i,ci])
        print(' cap loop',len(lp),'at',ctr.round(3))
    return np.array(Vs),np.array(Fs),np.array(UVs),np.array(Ns)
# staff
sV,sF,sUV,sN,sid=sub(sf)
browni=np.argmin(cd+ (~sv)*10); brownuv=uv[browni]
print('staff caps'); sV,sF,sUV,sN=cap(sV,sF,sUV,sN,brownuv)
# bridge cylinder through hand zone
r=0.0165; n=8
a=np.cross(ax,[1,0,0]); a/=np.linalg.norm(a); b=np.cross(ax,a)
base=len(sV); ring=[]
VV=list(sV);UU=list(sUV);NN=list(sN);FF=list(sF)
for tt in (HLO-0.03,HHI+0.03):
    for i in range(n):
        ang=2*np.pi*i/n; nr=np.cos(ang)*a+np.sin(ang)*b
        VV.append(c+tt*ax+r*nr);UU.append(brownuv);NN.append(nr)
for i in range(n):
    j=(i+1)%n
    FF.append([base+i,base+j,base+n+i]);FF.append([base+j,base+n+j,base+n+i])
sV,sF,sUV,sN=np.array(VV),np.array(FF),np.array(UU),np.array(NN)
# fix cylinder winding: check outward
f=sF[-1]; fn=np.cross(sV[f[1]]-sV[f[0]],sV[f[2]]-sV[f[0]]); mid=sV[f].mean(0); out=mid-(c+((mid-c)@ax)*ax)
if fn@out<0: sF[-2*n:]=sF[-2*n:,::-1]
# body
bV,bF,bUV,bN,bid=sub(~sf)
# paw colour: verts in hand zone not staff
pk=np.where(k&~sv)[0]; pawi=pk[np.argmin(np.linalg.norm(col[pk]-np.median(col[pk],axis=0),axis=1))]
print('paw col',col[pawi]); print('body caps'); bV,bF,bUV,bN=cap(bV,bF,bUV,bN,uv[pawi])
grip=c+(-0.14)*ax
np.savez('split.npz',sV=sV,sF=sF,sUV=sUV,sN=sN,bV=bV,bF=bF,bUV=bUV,bN=bN,grip=grip,ax=ax)
print('staff',sV.shape,sF.shape,'body',bV.shape,bF.shape,'grip',grip)
# quick debug glb
tex=m.visual.material
for nm,(v,f,u) in {'dbg_staff':(sV,sF,sUV),'dbg_body':(bV,bF,bUV)}.items():
    mm=trimesh.Trimesh(v,f,process=False,visual=trimesh.visual.TextureVisuals(uv=u,material=tex)); mm.export(nm+'.glb')
