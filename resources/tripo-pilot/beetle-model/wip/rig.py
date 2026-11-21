import trimesh, numpy as np, json, scipy.sparse as sp, scipy.sparse.linalg as spl
m=trimesh.load('bodys.glb',force='mesh',process=False)
V=np.asarray(m.vertices,float); F=np.asarray(m.faces); N=np.asarray(m.vertex_normals,float); UV=np.asarray(m.visual.uv,float)
V[:,0]+=0.02; V[:,2]-=0.07   # the Tripo beetle stands off centre (the pole and bell weigh the box to her left and back)
tex=np.asarray(m.visual.material.baseColorTexture.convert('RGB').resize((1024,1024))).astype(int)
tc=tex[np.clip(((1-UV[:,1]%1)*1023).astype(int),0,1023),np.clip(((UV[:,0]%1)*1023).astype(int),0,1023)]
dark=(tc[:,0]<70)&(tc[:,1]<90)
J={
 'root':(None,[0,0,0]),
 'hips':('root',[0,0.22,0]),
 'spine':('hips',[0,0.33,0]),
 'chest':('spine',[0,0.43,0]),
 'head':('chest',[0,0.52,0]),
 'antL':('head',[0.13,0.75,0.10]),'antR':('head',[-0.12,0.75,0.09]),
 'legL':('hips',[0.11,0.16,0]),'footL':('legL',[0.11,0.075,0]),
 'legR':('hips',[-0.11,0.16,0]),'footR':('legR',[-0.11,0.075,0]),
 'upperarmR':('chest',[-0.17,0.44,0.0]),'forearmR':('upperarmR',[-0.235,0.375,0.03]),'handR':('forearmR',[-0.295,0.32,0.06]),'fingersR':('handR',[-0.325,0.305,0.07]),
 'upperarmL':('chest',[0.19,0.44,-0.01]),'forearmL':('upperarmL',[0.255,0.375,0.0]),'handL':('forearmL',[0.30,0.32,0.01]),'fingersL':('handL',[0.325,0.305,0.015]),
 'capeL':('chest',[0.12,0.42,-0.17]),'capeR':('chest',[-0.12,0.42,-0.17]),
 'pole':('chest',[0.15,0.57,-0.14]),'bell':('pole',[0.305,0.895,-0.235]),
}
ends={'head':[0,0.86,0.01],'footL':[0.11,0.02,0.09],'footR':[-0.11,0.02,0.09],'antL':[0.235,0.83,0.15],'antR':[-0.24,0.83,0.135],
      'fingersL':[0.345,0.29,0.02],'fingersR':[-0.345,0.29,0.08],'capeL':[0.2,0.13,-0.25],'capeR':[-0.2,0.13,-0.25],'bell':[0.305,0.73,-0.235]}
names=list(J.keys())
segs=[]
for n in names:
    if n=='root': continue
    a=np.array(J[n][1],float)
    kids=[k for k in names if J[k][0]==n]
    if n in ends: segs.append((n,a,np.array(ends[n],float)))
    elif n=='hips': segs.append((n,a,np.array(J['spine'][1],float))); segs.append((n,a,a+[0,-0.08,0]))
    elif n=='chest': segs.append((n,a,np.array(J['head'][1],float)))
    elif n=='pole': segs.append((n,a,np.array([0.15,0.93,-0.15]))); segs.append((n,np.array([0.15,0.93,-0.15]),np.array([0.23,1.0,-0.22]))); segs.append((n,np.array([0.23,1.0,-0.22]),np.array([0.30,0.93,-0.235])))
    else: segs.append((n,a,np.array(J[kids[0]][1],float)))
def segdist(P,a,b):
    ab=b-a; t=np.clip(((P-a)@ab)/(ab@ab),0,1); c=a+np.outer(t,ab); return np.linalg.norm(P-c,axis=1),c
nb=len(names); D=np.full((len(V),nb),np.inf); vis=np.zeros((len(V),nb),bool)
ax=np.abs(V[:,0]); y=V[:,1]; z=V[:,2]
bellm=(V[:,0]>0.22)&(z<-0.12)&(y<0.90)&((y<0.875)|(V[:,0]>0.285))
rad=np.hypot(V[:,0],z-0.01)
polem=(y>0.58)&(V[:,0]>0.09)&(z<-0.08)&~bellm&((y>0.80)|((y>0.72)&(rad>0.207))|((y<=0.72)&~dark&(rad>0.19)))
antm=dark&(y>0.745)&(ax>0.1)&(z>0.03)
armz=(z>-0.045)
capem=(y<0.36)&(y>0.105)&(z<-0.045)&~bellm
framem=(z<-0.135)&(y>=0.36)&(y<0.60)&~polem&~bellm
for n,a,b in segs:
    d,c=segdist(V,a,b); j=names.index(n)
    if n.startswith('upperarm'): ok=(ax>0.185)&(y>0.33)&(y<0.47)&(d<0.075)&armz
    elif n[:4] in('fore','hand','fing'): ok=(ax>0.215)&(d<0.075)&(y>0.25)&(y<0.42)&armz
    elif n.startswith('leg') or n.startswith('foot'): ok=(y<0.125)&(z>-0.1)&(z<0.12)&(ax>0.03)&(ax<0.2)
    elif n.startswith('cape'): ok=capem.copy()
    elif n=='bell': ok=bellm.copy()
    elif n=='pole': ok=polem.copy()
    elif n.startswith('ant'): ok=antm.copy()
    elif n=='head': ok=(y>0.52)&~polem&~bellm&~antm
    else: ok=~bellm&~polem&~antm
    if n[-1] in 'LR': ok&=(np.sign(V[:,0])==(1 if n[-1]=='L' else -1))
    better=d<D[:,j]; D[better,j]=d[better]; vis[better,j]=ok[better]
lim=[names.index(n) for n in names if n[:3] in('upp','for','han','fin','leg','foo','ant','bel')]
anyl=vis[:,lim].any(1)
for n in ('hips','spine','chest','head','pole','capeL','capeR'): vis[anyl,names.index(n)]=False
for n in names:
    if n!='chest': vis[framem,names.index(n)]=False
# below the belt the body is hips only, so the belly and the belt stay whole
skirt=(y<0.30)&~anyl
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
for n in ('capeL','capeR','antL','antR','pole','bell'):
    j=names.index(n); print(n,'vis',int(vis[:,j].sum()),'near',int((near==j).sum()), 'x range of dominant', V[JI[:,0]==j][:,0].min() if (JI[:,0]==j).any() else None, V[JI[:,0]==j][:,0].max() if (JI[:,0]==j).any() else None)
