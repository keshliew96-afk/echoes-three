# reweigh.py <dir> [Rb] [Rl] : the trunk must not ride on the wing arms.
# Trunk = thick part of the mesh, limb = thin part bound to an arm (the wing sheet and the arm). Trunk vertices lose their arm weight
# except within Rb of the seam (measured along the surface); limb vertices blend toward the trunk only within Rl of the seam.
import sys,json,numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
D=sys.argv[1]; Rb=float(sys.argv[2]) if len(sys.argv)>2 else 0.03; Rl=float(sys.argv[3]) if len(sys.argv)>3 else 0.06
src=lambda n: D+'/'+n.replace('.bin','.prethigh.bin')
import os,shutil
for n in ('b_ji.bin','b_jw.bin'):
    if not os.path.exists(src(n)): shutil.copy(D+'/'+n,src(n))
sk=json.load(open(D+'/skel.json')); names=sk['names']; NB=len(names)
P=np.fromfile(D+'/b_pos.bin',np.float32).reshape(-1,3); I=np.fromfile(D+'/b_idx.bin',np.uint32).reshape(-1,3)
J=np.fromfile(src('b_ji.bin'),np.uint16).reshape(-1,4); W=np.fromfile(src('b_jw.bin'),np.float32).reshape(-1,4); th=np.load(D+'/thick.npy')
N=len(P); full=np.zeros((N,NB)); 
for k in range(4): np.add.at(full,(np.arange(N),J[:,k]),W[:,k])
ARM={s:[names.index(n+s) for n in ('upperarm','forearm','hand','fingers')] for s in 'LR'}; armI=ARM['L']+ARM['R']; bodyI=[i for i in range(NB) if i not in armI]
arm=full[:,armI].sum(1)
key=np.round(P*20000).astype(np.int64); _,inv=np.unique(key,axis=0,return_inverse=True); inv=inv.ravel(); M=inv.max()+1
cnt=np.bincount(inv,minlength=M); wth=np.bincount(inv,th,M)/cnt; warm=np.bincount(inv,arm,M)/cnt; wP=np.stack([np.bincount(inv,P[:,k],M)/cnt for k in range(3)],1)
e=np.concatenate([inv[I[:,[0,1]]],inv[I[:,[1,2]]],inv[I[:,[2,0]]]]); e=e[e[:,0]!=e[:,1]]; L=np.linalg.norm(wP[e[:,0]]-wP[e[:,1]],axis=1)
G=coo_matrix((np.r_[L,L],(np.r_[e[:,0],e[:,1]],np.r_[e[:,1],e[:,0]])),shape=(M,M)).tocsr(); G.data=np.maximum(G.data,1e-6)
adj=coo_matrix((np.ones(len(e)*2),(np.r_[e[:,0],e[:,1]],np.r_[e[:,1],e[:,0]])),shape=(M,M)).tocsr(); adj.data[:]=1
limb=(wth<0.07)&(warm>=0.3)
for it in range(2):  # majority filter: no speckle
    nb=adj@limb.astype(float); deg=np.asarray(adj.sum(1)).ravel(); limb=np.where(nb/np.maximum(deg,1)>0.5,True,np.where(nb/np.maximum(deg,1)<0.5,False,limb))
trunk=~limb
dT,_,srcT=dijkstra(G,indices=np.where(trunk)[0],min_only=True,return_predecessors=True)   # distance to the trunk, and which trunk vertex
dL=dijkstra(G,indices=np.where(limb)[0],min_only=True)
ss=lambda x: np.clip(x,0,1)**2*(3-2*np.clip(x,0,1))
target=np.where(trunk,0.5*(1-ss(dL/Rb)),0.5+0.5*ss(dT/Rl))
# welded per-vertex full weights
wfull=np.zeros((M,NB)); np.add.at(wfull,inv,full); wfull/=cnt[:,None]
newarm=np.minimum(wfull[:,armI].sum(1),target)
out=np.zeros((M,NB)); changed=0
for v in range(M):
    a_old=wfull[v,armI].sum(); a=newarm[v]
    if abs(a-a_old)<1e-4: out[v]=wfull[v]; continue
    changed+=1
    ad=wfull[v,armI]/a_old if a_old>1e-6 else None
    bd=wfull[v,bodyI]; 
    if bd.sum()<1e-4:  # an all-arm vertex that now needs some trunk: take the trunk bones of the nearest trunk vertex
        bd=wfull[srcT[v],bodyI]
        if bd.sum()<1e-4: bd=np.zeros(len(bodyI)); bd[bodyI.index(names.index('spine'))]=1
    bd=bd/bd.sum()
    if ad is not None: out[v,armI]=ad*a
    out[v,bodyI]=bd*(1-a)
o=out[inv]; top=np.argsort(-o,axis=1)[:,:4]; w4=np.take_along_axis(o,top,1); w4/=w4.sum(1,keepdims=True); top=np.where(w4>0,top,0)
top.astype(np.uint16).tofile(D+'/b_ji.bin'); w4.astype(np.float32).tofile(D+'/b_jw.bin')
np.save(D+'/limb.npy',limb[inv])
print('welded verts',M,'limb',int(limb.sum()),'trunk',int(trunk.sum()),'changed',changed)
tr=trunk[inv]; print('trunk verts with arm weight > 0.05: before',int(((arm>0.05)&tr).sum()),'after',int(((o[:,armI].sum(1)>0.05)&tr).sum()))
print('limb verts given trunk weight:',int(((o[:,armI].sum(1)<0.99)&~tr).sum()),'of',int((~tr).sum()))
