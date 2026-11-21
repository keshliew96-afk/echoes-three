import trimesh, numpy as np, json, scipy.sparse as sp, scipy.sparse.linalg as spl
m=trimesh.load('bodys.glb',force='mesh',process=False)
V=np.asarray(m.vertices,float); F=np.asarray(m.faces); N=np.asarray(m.vertex_normals,float); UV=np.asarray(m.visual.uv,float)
V[:,2]-=0.15   # the Tripo otter stands 15 cm ahead of the origin (her tail fills the back half); centre her trunk
cz=0.0
J={
 'root':(None,[0,0,cz]),
 'hips':('root',[0,0.27,cz]),
 'spine':('hips',[0,0.42,cz]),
 'chest':('spine',[0,0.56,cz]),
 'head':('chest',[0,0.73,0.02]),
 'legL':('hips',[0.11,0.2,-0.03]),'footL':('legL',[0.125,0.06,-0.04]),
 'legR':('hips',[-0.11,0.2,-0.03]),'footR':('legR',[-0.125,0.06,-0.04]),
 'tail1':('hips',[0.0,0.10,-0.20]),'tail2':('tail1',[0.02,0.055,-0.31]),'tail3':('tail2',[0.045,0.035,-0.40]),'tail4':('tail3',[0.078,0.028,-0.475]),
 'upperarmR':('chest',[-0.195,0.53,-0.02]),'forearmR':('upperarmR',[-0.245,0.455,0.0]),'handR':('forearmR',[-0.295,0.405,0.005]),'fingersR':('handR',[-0.32,0.385,0.005]),
 'upperarmL':('chest',[0.195,0.53,0.04]),'forearmL':('upperarmL',[0.245,0.465,0.09]),'handL':('forearmL',[0.295,0.425,0.125]),'fingersL':('handL',[0.32,0.41,0.14]),
}
ends={'head':[0,0.92,0.06],'footL':[0.16,0.02,0.12],'footR':[-0.16,0.02,0.12],
      'tail4':[0.107,0.02,-0.54],'fingersL':[0.337,0.39,0.16],'fingersR':[-0.337,0.36,0.01]}
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
ax=np.abs(V[:,0]); y=V[:,1]; z=V[:,2]
tailm=(z<-0.19)&(y<0.17)
for n,a,b in segs:
    d,c=segdist(V,a,b); j=names.index(n)
    if n.startswith('upperarm'): ok=(ax>0.185)&(y>0.40)&(y<0.60)&(d<0.09)&~tailm
    elif n[:4] in('fore','hand','fing'): ok=(ax>0.225)&(d<0.08)&(y>0.33)&(y<0.52)&~tailm
    elif n.startswith('leg') or n.startswith('foot'): ok=(y<0.17)&(z>-0.19)&(ax>0.03)
    elif n.startswith('tail'): ok=tailm
    elif n=='head': ok=(y>0.73)
    else: ok=np.ones(len(V),bool)
    if n[-1] in 'LR': ok&=(np.sign(V[:,0])==(1 if n[-1]=='L' else -1))
    better=d<D[:,j]; D[better,j]=d[better]; vis[better,j]=ok[better]
lim=[names.index(n) for n in names if n[:3] in('upp','for','han','fin','leg','foo','tai')]
anyl=vis[:,lim].any(1)
for n in ('hips','spine','chest','head'): vis[anyl,names.index(n)]=False
# skirt (below the belt) is hips only so the tabard bell stays whole
skirt=(y<0.36)&~anyl
for n in ('spine','chest','head'): vis[skirt,names.index(n)]=False
key=np.round(V,5); uq,inv=np.unique(key,axis=0,return_inverse=True); inv=inv.ravel(); nw=len(uq)
E_=np.vstack([F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]); E_=inv[E_]; E_=E_[E_[:,0]!=E_[:,1]]
A=sp.coo_matrix((np.ones(2*len(E_)),(np.r_[E_[:,0],E_[:,1]],np.r_[E_[:,1],E_[:,0]])),shape=(nw,nw)).tocsr()
A.data[:]=1.0
L=sp.diags(np.asarray(A.sum(1)).ravel())-A
Dw=np.full((nw,nb),np.inf); Dm=np.where(vis,D,np.inf); np.minimum.at(Dw,inv,Dm)
near=Dw.argmin(1); dn=Dw.min(1); has=np.isfinite(dn)
print('verts without visible bone',(~has).sum(),'of',nw)
Hc=np.where(has,0.0015/(dn**2+1e-6),0)
M=(L+sp.diags(Hc)).tocsc(); solve=spl.factorized(M)
Ww=np.zeros((nw,nb))
for j in range(nb):
    p=Hc*(near==j)
    if p.any(): Ww[:,j]=solve(p)
Ww=np.clip(Ww,0,None)
idx=np.argsort(-Ww,axis=1)[:,:4]; val=np.take_along_axis(Ww,idx,1); val[val<0.02*val[:,:1]]=0; val/=val.sum(1,keepdims=True)
JI=idx[inv]; JW=val[inv]
print('dominant:',{names[j]:int((idx[:,0]==j).sum()) for j in range(nb)})
json.dump({'names':names,'parents':[J[n][0] for n in names],'pos':[J[n][1] for n in names]},open('skel.json','w'))
V.astype('<f4').tofile('b_pos.bin');N.astype('<f4').tofile('b_nrm.bin');UV.astype('<f4').tofile('b_uv.bin');F.astype('<u4').tofile('b_idx.bin');JI.astype('<u2').tofile('b_ji.bin');JW.astype('<f4').tofile('b_jw.bin')
m.visual.material.baseColorTexture.convert('RGB').save('body_tex.jpg',quality=90)
rng=np.random.RandomState(3); pal=(rng.rand(nb,3)*200+55).astype(np.uint8)
vc=np.c_[pal[JI[:,0]],np.full(len(V),255,np.uint8)]
trimesh.Trimesh(V,F,vertex_colors=vc,process=False).export('dbg_w.glb')
