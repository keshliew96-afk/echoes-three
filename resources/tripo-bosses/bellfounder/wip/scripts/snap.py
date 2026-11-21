import sys; sys.path.insert(0, sys.argv[1])
import numpy as np
from glbanim import Rigged
R = Rigged(sys.argv[2]); clip=sys.argv[3]; bone=sys.argv[4]; f0,f1=int(sys.argv[5]),int(sys.argv[6])
k=R.names.index(bone); par=R.parent[k]
prev=None
for f in range(f0,f1):
    M=R.world(clip,f); A=M[k][:3,:3]; A=A/np.linalg.norm(A,axis=0); P=M[par][:3,:3]; P=P/np.linalg.norm(P,axis=0)
    L=P.T@A
    q,t,s=R.local(clip,f)
    pos=M[k][:3,3]; ch=[j for j in range(len(R.names)) if R.parent[j]==k]
    cp=M[ch[0]][:3,3] if ch else pos
    d=(cp-pos); d/=np.linalg.norm(d)
    ang=0 if prev is None else np.degrees(np.arccos(np.clip((np.trace(prev.T@A)-1)/2,-1,1)))
    # twist: rotation about bone dir
    prev=A
    print(f, np.round(q[k],3), 'dir',np.round(d,3),'step %.1f'%ang, 'x-axis',np.round(A[:,0],2))
