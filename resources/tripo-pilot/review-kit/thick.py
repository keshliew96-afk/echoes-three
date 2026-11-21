# thick.py <dir>: local thickness of the body mesh at every vertex (ray along the inward normal to the opposite wall), saved as thick.npy
import sys,numpy as np
D=sys.argv[1]
P=np.fromfile(D+'/b_pos.bin',np.float32).reshape(-1,3); Nn=np.fromfile(D+'/b_nrm.bin',np.float32).reshape(-1,3); I=np.fromfile(D+'/b_idx.bin',np.uint32).reshape(-1,3)
A=P[I[:,0]].astype(np.float64); E1=P[I[:,1]]-A; E2=P[I[:,2]]-A
# geometric vertex normals (area weighted) on welded positions, so UV seams do not matter
key=np.round(P*20000).astype(np.int64); _,inv=np.unique(key,axis=0,return_inverse=True); inv=inv.ravel(); M=inv.max()+1
fn=np.cross(E1,E2); vn=np.zeros((M,3)); 
for k in range(3): np.add.at(vn,inv[I[:,k]],fn)
vn/=np.maximum(np.linalg.norm(vn,axis=1,keepdims=True),1e-12); n=vn[inv]
th=np.full(len(P),9.0)
for s in range(0,len(P),150):
    o=(P[s:s+150]-n[s:s+150]*1e-4).astype(np.float64); d=-n[s:s+150]
    pv=np.cross(d[:,None,:],E2[None]); det=(E1[None]*pv).sum(2); ok=np.abs(det)>1e-12; inv_det=np.where(ok,1/np.where(ok,det,1),0)
    tv=o[:,None,:]-A[None]; u=(tv*pv).sum(2)*inv_det; qv=np.cross(tv,E1[None]); v=(d[:,None,:]*qv).sum(2)*inv_det; t=(E2[None]*qv).sum(2)*inv_det
    hit=ok&(u>=-1e-6)&(v>=-1e-6)&(u+v<=1+1e-6)&(t>2e-4); t=np.where(hit,t,9.0); th[s:s+150]=t.min(1)
np.save(D+'/thick.npy',th.astype(np.float32)); print('thickness percentiles',np.percentile(th,[5,25,50,75,95]).round(3))
