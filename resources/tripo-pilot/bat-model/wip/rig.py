import trimesh, numpy as np, json, scipy.sparse as sp, scipy.sparse.linalg as spl
m=trimesh.load('bodys.glb',force='mesh',process=False)
V=np.asarray(m.vertices,float); F=np.asarray(m.faces); N=np.asarray(m.vertex_normals,float); UV=np.asarray(m.visual.uv,float)
tex=np.asarray(m.visual.material.baseColorTexture.convert('RGB').resize((1024,1024))).astype(int)
tc=tex[np.clip(((1-UV[:,1]%1)*1023).astype(int),0,1023),np.clip(((UV[:,0]%1)*1023).astype(int),0,1023)]
dark=(tc[:,0]<70)&(tc[:,1]<90)
J={
 'root':(None,[0,0,0]),
 'hips':('root',[0,0.20,0]),
 'spine':('hips',[0,0.32,0]),
 'chest':('spine',[0,0.44,0]),
 'head':('chest',[0,0.585,0.0]),
 'earL':('head',[0.15,0.80,-0.03]),'earR':('head',[-0.15,0.80,-0.03]),
 'legL':('hips',[0.12,0.14,0.02]),'footL':('legL',[0.12,0.06,0.03]),
 'legR':('hips',[-0.12,0.14,0.02]),'footR':('legR',[-0.12,0.06,0.03]),
 'upperarmR':('chest',[-0.17,0.45,0.0]),'forearmR':('upperarmR',[-0.25,0.41,0.05]),'handR':('forearmR',[-0.335,0.37,0.10]),'fingersR':('handR',[-0.28,0.235,-0.01]),
 'upperarmL':('chest',[0.17,0.45,0.0]),'forearmL':('upperarmL',[0.25,0.41,0.05]),'handL':('forearmL',[0.335,0.37,0.10]),'fingersL':('handL',[0.28,0.235,-0.01]),
}
ends={'head':[0,0.9,0.02],'footL':[0.12,0.02,0.11],'footR':[-0.12,0.02,0.11],'earL':[0.32,1.0,-0.22],'earR':[-0.32,1.0,-0.22],
      'fingersL':[0.22,0.08,-0.12],'fingersR':[-0.22,0.08,-0.12]}
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
rx=np.interp(y,[0.0,0.36,0.5],[0.185,0.185,0.14])
outside=(V[:,0]/rx)**2+((z-0.0)/0.2)**2>1
wingm=(ax>0.16)&(y<0.50)&(y>0.015)&outside&~((y<0.135)&(ax<0.195))
hd=np.linalg.norm(V-np.array([0,0.74,0.02]),axis=1)
earm=(y>0.76)&(ax>0.12)&(hd>0.205)
for n,a,b in segs:
    d,c=segdist(V,a,b); j=names.index(n)
    if n[:3] in('upp','for'): ok=wingm&(d<0.07)&(y>0.33)
    elif n[:3] in('han','fin'): ok=wingm.copy()
    elif n.startswith('leg') or n.startswith('foot'): ok=(y<0.135)&(ax>0.03)&(ax<0.195)&(z>-0.09)
    elif n.startswith('ear'): ok=earm.copy()
    elif n=='head': ok=(y>0.585)&~earm
    else: ok=~earm&~wingm
    if n[-1] in 'LR': ok&=(np.sign(V[:,0])==(1 if n[-1]=='L' else -1))
    better=d<D[:,j]; D[better,j]=d[better]; vis[better,j]=ok[better]
lim=[names.index(n) for n in names if n[:3] in('upp','for','han','fin','leg','foo','ear')]
anyl=vis[:,lim].any(1)
for n in ('hips','spine','chest','head'): vis[anyl,names.index(n)]=False
# the round belly below the ruff is hips and spine only, so it stays whole
skirt=(y<0.26)&~anyl
for n in ('chest','head'): vis[skirt,names.index(n)]=False
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
print('wing',int(wingm.sum()),'ear',int(earm.sum()))
