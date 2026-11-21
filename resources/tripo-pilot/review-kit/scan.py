# scan.py <dir>: how much of the thick trunk rides on an arm bone (read only)
import sys,json,numpy as np
D=sys.argv[1]; sk=json.load(open(D+'/skel.json')); names=sk['names']
P=np.fromfile(D+'/b_pos.bin',np.float32).reshape(-1,3); J=np.fromfile(D+'/b_ji.bin',np.uint16).reshape(-1,4); W=np.fromfile(D+'/b_jw.bin',np.float32).reshape(-1,4); th=np.load(D+'/thick.npy')
N=len(P); full=np.zeros((N,len(names)))
for k in range(4): np.add.at(full,(np.arange(N),J[:,k]),W[:,k])
arm=full[:,[i for i,n in enumerate(names) if n[:-1] in ('upperarm','forearm','hand','fingers')]].sum(1)
sh=np.array(sk['pos'])[[names.index('upperarmL'),names.index('upperarmR')]]
dsh=np.minimum(np.linalg.norm(P-sh[0],axis=1),np.linalg.norm(P-sh[1],axis=1))
for T in (0.12,0.18):
    m=(th>T)&(th<5); bad=m&(arm>0.3); far=bad&(dsh>0.10)
    print('%-8s thick>%.2f: %5d verts, %4d ride an arm over 30%%, %4d of them more than 10 cm from the shoulder (y %.2f..%.2f)'%(D.split('/')[-1],T,m.sum(),bad.sum(),far.sum(),P[far,1].min() if far.sum() else 0,P[far,1].max() if far.sum() else 0))
