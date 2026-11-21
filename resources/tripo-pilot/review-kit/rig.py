import trimesh, numpy as np, json, scipy.sparse as sp, scipy.sparse.linalg as spl
m=trimesh.load('body2s.glb',force='mesh',process=False)
V=np.asarray(m.vertices,float); F=np.asarray(m.faces); N=np.asarray(m.vertex_normals,float); UV=np.asarray(m.visual.uv,float)
cx,cz=-0.022,0.10
J={ # name: (parent, position)
 'root':(None,[cx,0,cz]),
 'hips':('root',[cx,0.30,cz]),
 'spine':('hips',[cx,0.42,cz]),
 'chest':('spine',[cx,0.52,cz]),
 'head':('chest',[cx,0.61,cz]),
 'earL':('head',[cx+0.14,0.84,cz]),
 'earR':('head',[cx-0.14,0.84,cz]),
 'legL':('hips',[0.066,0.22,cz]),'footL':('legL',[0.066,0.05,0.12]),
 'legR':('hips',[-0.111,0.22,cz]),'footR':('legR',[-0.111,0.05,0.12]),
 'tail1':('hips',[cx,0.15,-0.05]),'tail2':('tail1',[0.07,0.07,-0.14]),'tail3':('tail2',[0.17,0.06,-0.22]),
 'tail4':('tail3',[0.26,0.09,-0.30]),'tail5':('tail4',[0.33,0.16,-0.36]),
}
for s,sg in (('L',1),('R',-1)):
    J['upperarm'+s]=('chest',[cx+sg*0.11,0.56,cz])
    J['forearm'+s]=('upperarm'+s,[cx+sg*0.205,0.455,cz])
    J['hand'+s]=('forearm'+s,[cx+sg*0.295,0.365,cz+0.01])
    J['fingers'+s]=('hand'+s,[cx+sg*0.335,0.33,cz+0.015])
ends={'head':[cx,0.88,cz+0.04],'earL':[cx+0.27,0.93,cz],'earR':[cx-0.27,0.93,cz],'footL':[0.066,0.03,0.22],'footR':[-0.111,0.03,0.22],
      'tail5':[0.36,0.28,-0.37],'fingersL':[cx+0.365,0.305,cz+0.02],'fingersR':[cx-0.365,0.305,cz+0.02]}
names=list(J.keys())
segs=[]
for n in names:
    if n=='root': continue
    a=np.array(J[n][1],float)
    kids=[k for k in names if J[k][0]==n]
    if n in ends: segs.append((n,a,np.array(ends[n],float)))
    elif n=='hips': segs.append((n,a,np.array(J['spine'][1],float))); segs.append((n,a,a+[0,-0.08,0]))
    elif n=='chest': segs.append((n,a,np.array(J['head'][1],float)))
    else: segs.append((n,a,np.array(J[kids[0]][1],float)))
def segdist(P,a,b):
    ab=b-a; t=np.clip(((P-a)@ab)/(ab@ab),0,1); c=a+np.outer(t,ab); return np.linalg.norm(P-c,axis=1),c
nb=len(names); D=np.full((len(V),nb),np.inf); vis=np.zeros((len(V),nb),bool)
col=np.load('col2.npy'); rb=col[:,0]-col[:,2]
ax=np.abs(V[:,0]-cx); y=V[:,1]; z=V[:,2]
for n,a,b in segs:
    d,c=segdist(V,a,b); j=names.index(n)
    if n.startswith('ear'): ok=(ax>0.15)&(y>0.68)&(rb>0.19)&(np.sign(V[:,0]-cx)==(1 if n[-1]=='L' else -1))
    elif n.startswith('upperarm'): ok=(ax>0.17)&(np.abs(z-cz)<0.12)&(y>0.36)&(y<0.6)&(d<0.09)
    elif n[:4] in('fore','hand','fing'): ok=(ax>0.2)&(d<0.08)&(y<0.52)
    elif n.startswith('leg'): ok=(y<0.2)&(d<0.075)&(z>0)
    elif n.startswith('foot'): ok=(y<0.11)&(d<0.09)&(z>0)
    elif n.startswith('tail'): ok=(d<0.05)&(col[:,0]>0.78)&(rb>0.15)&(z<-0.03)&(y<0.33)
    else: ok=np.ones(len(V),bool)
    if n[-1] in 'LR' and not n.startswith('tail'): ok&=(np.sign(V[:,0]-(cx if n[:3] not in('leg','foo') else -0.022))==(1 if n[-1]=='L' else -1))
    better=d<D[:,j]; D[better,j]=d[better]; vis[better,j]=ok[better]
lim=[names.index(n) for n in names if n[:3] in('ear','upp','for','han','fin','leg','foo','tai')]
anyl=vis[:,lim].any(1)
for n in ('hips','spine','chest','head'): vis[anyl,names.index(n)]=False
# weld by position for graph
key=np.round(V,5); uq,inv=np.unique(key,axis=0,return_inverse=True); inv=inv.ravel(); nw=len(uq)
E=np.vstack([F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]); E=inv[E]; E=E[E[:,0]!=E[:,1]]
Wp=uq
w=1.0/(np.linalg.norm(Wp[E[:,0]]-Wp[E[:,1]],axis=1)+1e-4)
A=sp.coo_matrix((np.r_[w,w],(np.r_[E[:,0],E[:,1]],np.r_[E[:,1],E[:,0]])),shape=(nw,nw)).tocsr()
A.data[:]=1.0  # uniform graph laplacian after dedupe
L=sp.diags(np.asarray(A.sum(1)).ravel())-A
# per welded vertex: nearest visible bone
Dw=np.full((nw,nb),np.inf); 
Dm=np.where(vis,D,np.inf)
np.minimum.at(Dw,inv,Dm)
near=Dw.argmin(1); dn=Dw.min(1); has=np.isfinite(dn)
print('verts without visible bone',(~has).sum(),'of',nw)
Hc=np.where(has,0.0015/(dn**2+1e-6),0)   # heat coefficient scaled for uniform laplacian
M=(L+sp.diags(Hc)).tocsc(); solve=spl.factorized(M)
Ww=np.zeros((nw,nb))
for j in range(nb):
    p=Hc*(near==j)
    if p.any(): Ww[:,j]=solve(p)
Ww=np.clip(Ww,0,None); 
# keep top 4
idx=np.argsort(-Ww,axis=1)[:,:4]; val=np.take_along_axis(Ww,idx,1); val[val<0.02*val[:,:1]]=0; val/=val.sum(1,keepdims=True)
JI=idx[inv]; JW=val[inv]
print('bone vertex counts (dominant):',{names[j]:int((idx[:,0]==j).sum()) for j in range(nb)})
np.savez('rig.npz',V=V,F=F,N=N,UV=UV,JI=JI,JW=JW)
json.dump({'names':names,'parents':[J[n][0] for n in names],'pos':[J[n][1] for n in names]},open('skel.json','w'))
# binary dumps for node
V.astype('<f4').tofile('b_pos.bin');N.astype('<f4').tofile('b_nrm.bin');UV.astype('<f4').tofile('b_uv.bin');F.astype('<u4').tofile('b_idx.bin');JI.astype('<u2').tofile('b_ji.bin');JW.astype('<f4').tofile('b_jw.bin')
m.visual.material.baseColorTexture.convert('RGB').save('body_tex.jpg',quality=90)
# debug: dominant bone colour as vertex colours
rng=np.random.RandomState(3); pal=(rng.rand(nb,3)*200+55).astype(np.uint8)
vc=np.c_[pal[JI[:,0]],np.full(len(V),255,np.uint8)]
trimesh.Trimesh(V,F,vertex_colors=vc,process=False).export('dbg_w.glb')
