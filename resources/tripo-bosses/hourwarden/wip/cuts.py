# stage 1: find the faces of the parts to cut free, and write a coloured GLB to look at
import sys; sys.path.insert(0, sys.argv[2])
import numpy as np, trimesh
from rigkit import Mesh, groove_cut
M = Mesh(sys.argv[1]); V=M.V; F=M.F; x,y,z=V.T; tc=M.tc.astype(float); lum=tc.sum(1)
Fc=V[F].mean(1); fx,fy,fz=Fc.T; flum=lum[F].mean(1)
parts={}
# pendulum, front and back
for nm,sg,wall in (('pendF',1,0.042),('pendB',-1,0.052)):
    src=((np.abs(fx)<0.03)&(fy>0.25)&(fy<0.33)&(fz*sg>0.075))|((np.abs(fx)<0.005)&(fy>0.34)&(fy<0.43)&(fz*sg>wall+0.008))
    win=(np.abs(fx)<0.07)&(fy>0.22)&(fy<0.46)&(fz*sg>0.0)
    sink=(~win)|(win&(fz*sg<wall+0.004))
    A=groove_cut(M,src,sink); parts[nm]=A; print(nm,int(A.sum()),'faces; y',fy[A].min().round(3),fy[A].max().round(3),'x',fx[A].min().round(3),fx[A].max().round(3),'z',fz[A].min().round(3),fz[A].max().round(3))
# the clock hand
c=np.array([-0.004,0.659])
fr=np.hypot(fx-c[0],fy-c[1]); fa=np.degrees(np.arctan2(fy-c[1],fx-c[0]))
src=(fz>0.115)&(((fr<0.012))|((fr>0.015)&(fr<0.056)&(fa>12)&(fa<52)&(flum<470)))
sink=(fz<0.105)|(fr>0.062)|((flum>530)&(fr>0.014))
A=groove_cut(M,src,sink); parts['hand']=A; print('hand',int(A.sum()),'fr max',fr[A].max().round(3),'z',fz[A].min().round(3),fz[A].max().round(3))
# the arms with their chains and weights
for nm,sg in (('armL',1),('armR',-1)):
    sx=fx*sg
    src=((sx>0.25)&(fy>0.46)&(fy<0.58))|((sx>0.2)&(fy>0.22)&(fy<0.44))|((sx>0.185)&(fy>0.63)&(fy<0.75))
    sink=((sx<0.125)&(fy>0.2))|((fy<0.215)&(sx<0.24))|((sx<0.15)&(fy>0.77))
    A=groove_cut(M,src,sink); parts[nm]=A; print(nm,int(A.sum()),'x',fx[A].min().round(3),fx[A].max().round(3),'y',fy[A].min().round(3),fy[A].max().round(3))
np.savez(sys.argv[3]+'/cuts.npz',**parts)
col=np.tile([180,180,180,255],(len(F),1)).astype(np.uint8)
for nm,cc in zip(parts,[(255,0,0),(255,128,0),(0,0,255),(0,200,0),(200,0,200)]):
    col[parts[nm],:3]=cc
m=trimesh.Trimesh(V,F,process=False); m.visual=trimesh.visual.ColorVisuals(m,face_colors=col); m.export(sys.argv[3]+'/cuts.glb')
