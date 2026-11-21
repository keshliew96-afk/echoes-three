import trimesh, numpy as np, json, scipy.sparse as sp, scipy.sparse.linalg as spl
m=trimesh.load('bodys.glb',force='mesh',process=False)
V=np.asarray(m.vertices,float); F=np.asarray(m.faces); N=np.asarray(m.vertex_normals,float); UV=np.asarray(m.visual.uv,float)
cx,cz=0.0,0.04
J={
 'root':(None,[cx,0,cz]),
 'hips':('root',[cx,0.30,cz]),
 'spine':('hips',[cx,0.45,cz]),
 'chest':('spine',[cx,0.58,cz]),
 'head':('chest',[cx,0.72,0.06]),
 'earL':('head',[0.11,0.90,0.03]),'earR':('head',[-0.11,0.90,0.03]),
 'legL':('hips',[0.15,0.22,cz]),'footL':('legL',[0.15,0.06,0.05]),
 'legR':('hips',[-0.15,0.22,cz]),'footR':('legR',[-0.15,0.06,0.05]),
 'tail1':('hips',[0,0.16,-0.14]),'tail2':('tail1',[0,0.13,-0.21]),'tail3':('tail2',[0,0.09,-0.27]),
}
for s,sg in (('L',1),('R',-1)):
    J['upperarm'+s]=('chest',[sg*0.24,0.66,0.03])
    J['forearm'+s]=('upperarm'+s,[sg*0.33,0.53,0.03])
    J['hand'+s]=('forearm'+s,[sg*0.42,0.42,0.04])
    J['fingers'+s]=('hand'+s,[sg*0.46,0.38,0.05])
ends={'head':[0,0.95,0.12],'earL':[0.15,0.97,0.03],'earR':[-0.15,0.97,0.03],'footL':[0.15,0.03,0.15],'footR':[-0.15,0.03,0.15],
      'tail3':[0,0.07,-0.31],'fingersL':[0.5,0.35,0.05],'fingersR':[-0.5,0.35,0.05]}
names=list(J.keys())
segs=[]
for n in names:
    if n=='root': continue
    a=np.array(J[n][1],float)
    kids=[k for k in names if J[k][0]==n]
    if n in ends: segs.append((n,a,np.array(ends[n],float)))
    elif n=='hips': segs.append((n,a,np.array(J['spine'][1],float))); segs.append((n,a,a+[0,-0.2,0]))
    elif n=='chest': segs.append((n,a,np.array(J['head'][1],float)))
    else: segs.append((n,a,np.array(J[kids[0]][1],float)))
def segdist(P,a,b):
    ab=b-a; t=np.clip(((P-a)@ab)/(ab@ab),0,1); c=a+np.outer(t,ab); return np.linalg.norm(P-c,axis=1),c
nb=len(names); D=np.full((len(V),nb),np.inf); vis=np.zeros((len(V),nb),bool)
ax=np.abs(V[:,0]); y=V[:,1]; z=V[:,2]
for n,a,b in segs:
    d,c=segdist(V,a,b); j=names.index(n)
    if n.startswith('ear'): ok=(ax>0.07)&(y>0.89)&(d<0.07)
    elif n.startswith('upperarm'): ok=(ax>0.2)&(y>0.42)&(d<0.17)
    elif n[:4] in('fore','hand','fing'): ok=(ax>0.29)&(d<0.1)&(y<0.6)
    elif n.startswith('leg'): ok=(y<0.105)&~((z<-0.1)&(ax<0.09))
    elif n.startswith('foot'): ok=(y<0.105)&~((z<-0.1)&(ax<0.09))
    elif n.startswith('tail'): ok=(y<0.115)&(z<-0.1)&(ax<0.09)
    elif n=='head': ok=(y>0.7)|((y>0.66)&(z>0.2))
    else: ok=np.ones(len(V),bool)
    if n[-1] in 'LR': ok&=(np.sign(V[:,0])==(1 if n[-1]=='L' else -1))
    better=d<D[:,j]; D[better,j]=d[better]; vis[better,j]=ok[better]
lim=[names.index(n) for n in names if n[:3] in('ear','upp','for','han','fin','leg','foo','tai')]
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
