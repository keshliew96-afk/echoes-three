import trimesh, numpy as np, json, scipy.sparse as sp, scipy.sparse.linalg as spl
m=trimesh.load('bodys.glb',force='mesh',process=False)
V=np.asarray(m.vertices,float); F=np.asarray(m.faces); N=np.asarray(m.vertex_normals,float); UV=np.asarray(m.visual.uv,float)
OX,OZ=-0.027,0.17
V[:,0]-=OX; V[:,2]-=OZ
cx,cz=0.0,0.03
def P(x,y,z): return [x-OX,y,z-OZ]
J={
 'root':(None,[0,0,cz]),
 'hips':('root',[0,0.36,cz]),
 'spine':('hips',[0,0.47,cz]),
 'chest':('spine',[0,0.57,cz]),
 'head':('chest',[0,0.69,cz]),
 'earL':('head',[0.09,0.87,0.0]),'earR':('head',[-0.09,0.87,0.0]),
 'legL':('hips',[0.067,0.33,cz]),'footL':('legL',[0.067,0.07,0.0]),
 'legR':('hips',[-0.067,0.33,cz]),'footR':('legR',[-0.067,0.07,0.0]),
 'tail1':('hips',[0,0.36,-0.07]),'tail2':('tail1',P(-0.033,0.40,-0.1)),'tail3':('tail2',P(-0.033,0.41,-0.2)),
 'tail4':('tail3',P(-0.03,0.45,-0.28)),'tail5':('tail4',P(-0.03,0.49,-0.34)),
}
for s_,sg in (('L',1),('R',-1)):
    J['upperarm'+s_]=('chest',[sg*0.125,0.62,0.02])
    J['forearm'+s_]=('upperarm'+s_,[sg*0.185,0.48,0.03])
    J['hand'+s_]=('forearm'+s_,[sg*0.228,0.385,0.05])
    J['fingers'+s_]=('hand'+s_,[sg*0.25,0.345,0.065])
ends={'head':[0,0.9,0.08],'earL':[0.14,1.0,-0.01],'earR':[-0.14,1.0,-0.01],'footL':[0.067,0.02,0.1],'footR':[-0.067,0.02,0.1],
      'tail5':P(-0.03,0.52,-0.39),'fingersL':[0.272,0.31,0.07],'fingersR':[-0.272,0.31,0.07]}
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
tailm=(z<-0.1)&(y<0.57)&(y>0.18)&~((y>0.47)&(z>-0.27))
for n,a,b in segs:
    d,c=segdist(V,a,b); j=names.index(n)
    if n.startswith('ear'): ok=(ax>0.05)&(y>0.86)
    elif n.startswith('upperarm'): ok=(ax>0.11)&(y>0.44)&(y<0.7)&(d<0.075)&~tailm
    elif n[:4] in('fore','hand','fing'): ok=(ax>0.15)&(d<0.07)&(y<0.52)&~tailm
    elif n.startswith('leg') or n.startswith('foot'): ok=(y<0.27)&~tailm
    elif n.startswith('tail'): ok=tailm
    elif n=='head': ok=(y>0.7)
    else: ok=np.ones(len(V),bool)
    if n[-1] in 'LR': ok&=(np.sign(V[:,0])==(1 if n[-1]=='L' else -1))
    better=d<D[:,j]; D[better,j]=d[better]; vis[better,j]=ok[better]
lim=[names.index(n) for n in names if n[:3] in('ear','upp','for','han','fin','leg','foo','tai')]
anyl=vis[:,lim].any(1)
for n in ('hips','spine','chest','head'): vis[anyl,names.index(n)]=False
# skirt (below the belt) is hips only so the tabard bell stays whole
skirt=(y<0.43)&~anyl
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
