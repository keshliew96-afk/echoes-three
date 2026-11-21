# picks the right forearm (to mirror) and the left forearm (to replace) on the shield-less mesh
import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, trimesh
from rigkit import Mesh, face_graph, groove_cut, loops_of, segdist
M=Mesh(sys.argv[2]); V=M.V; F=M.F; g=face_graph(M); fc=g['fc']; Vw=g['Vw']
A=np.load('wip/AL.npy'); sw=(M.comp!=M.main)[F].any(1)
YR=float(sys.argv[3]); YL=float(sys.argv[4]); UP=float(sys.argv[5])
def forearm(sg, extra_src, YC):
    sh=np.array([0.175*sg,0.745,-0.045]); el=np.array([0.2*sg,0.60,-0.085]); wr=np.array([0.215*sg,0.46,-0.01])
    da=np.minimum(segdist(fc,el,wr+(wr-el)*0.3),segdist(fc,el+(sh-el)*UP,el))
    src=((da<0.04)&(fc[:,1]<YC-0.03))|extra_src
    sink=(np.abs(fc[:,0])<0.125)|(fc[:,1]>YC+0.03)|(fc[:,1]<0.36)|(fc[:,0]*sg<0)|sw
    return groove_cut(M,src&~sink,sink)
R=forearm(-1,np.zeros(len(F),bool),YR); L=forearm(1,A,YL)
for nm,k in (('R',R),('L',L)):
    lp=sorted(loops_of(M,k),key=len,reverse=True); print(nm,'faces',k.sum(),'loops',[len(l) for l in lp][:6],'y',fc[k,1].min().round(3),fc[k,1].max().round(3))
    for l in lp[:3]: P=Vw[l]; print('   loop',len(l),'c',P.mean(0).round(3),'size',np.ptp(P,0).round(3))
np.save('wip/R.npy',R); np.save('wip/L.npy',L)
for nm,k in (('kit/fR.glb',R),('kit/fL.glb',L),('kit/fK.glb',~L)):
    m=trimesh.Trimesh(V,F[k],process=False); m.visual=trimesh.visual.TextureVisuals(uv=M.UV,material=M.m.visual.material); m.vertex_normals=M.N; m.export(nm)
