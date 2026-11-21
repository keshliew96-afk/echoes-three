import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, trimesh
from rigkit import Mesh, face_graph, groove_cut, loops_of, segdist
M=Mesh(sys.argv[2]); V=M.V; F=M.F; g=face_graph(M); fc=g['fc']; fn=g['fn']
pl=np.load('wip/planeL.npy'); cb,n,cf,nf=pl[:3],pl[3:6],pl[6:9],pl[9:]
ey=np.array([0,1,0.]); ev=ey-(ey@n)*n; ev/=np.linalg.norm(ev); eu=np.cross(n,ev)
u=(fc-cb)@eu; v=(fc-cb)@ev; d=(fc-cb)@n; dv=((V-cb)@n)[F]; r=np.hypot(u+0.04,v-0.01)
DB=float(sys.argv[3]); RS=float(sys.argv[4]); XR=float(sys.argv[6]); XS=float(sys.argv[7])
el=np.array([0.2,0.6,-0.085]); wr=np.array([0.215,0.46,-0.01]); wr2=wr+(wr-el)*0.35; da=segdist(fc,el,wr2); sh_=np.array([0.175,0.745,-0.045]); du=segdist(fc,sh_,el)
print('forearm in frame: el', [round(float((el-cb)@e),3) for e in (eu,ev,n)], 'wr', [round(float((wr-cb)@e),3) for e in (eu,ev,n)])
rim=(r>0.09)&(r<0.16)&(du>0.07)&(d>-0.12)&(da>float(sys.argv[5]))&(fc[:,0]>XR)&(fc[:,1]>0.33)
src=rim|(((abs(d)<0.004)&((fn@n)<-0.85))|((abs((fc-cf)@nf)<0.004)&((fn@nf)>0.85))|(dv.min(1)>0.012))&(r<RS)&(fc[:,0]>0.12)
sink=((dv.max(1)<DB)&(da<0.05))|(du<0.055)|(fc[:,1]<0.36)|(dv.max(1)<-0.13)|(r>0.24)|(fc[:,0]<XS)
A=groove_cut(M,src,sink); print('shield faces',A.sum(),'src',src.sum())
lp=sorted(loops_of(M,A),key=len,reverse=True); print('loops',[len(l) for l in lp][:12])
np.save('wip/AL.npy',A)
for nm,k in (('kitL_shield.glb',A),('kitL_keep.glb',~A)):
    m=trimesh.Trimesh(V,F[k],process=False); m.visual=trimesh.visual.TextureVisuals(uv=M.UV,material=M.m.visual.material); m.vertex_normals=M.N; m.export('kit/'+nm)
Vw=g['Vw']
for l in lp:
    P_=Vw[l]; c=P_.mean(0); print(len(l),'c',c.round(3),'size',np.ptp(P_,0).round(3),'frame u v d',[round(float((c-cb)@e),3) for e in (eu,ev,n)])
