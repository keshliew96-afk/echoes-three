# Softens the seed model's texture toward the colours of its sheet (same job as spitter/soften.py).
# Keeps Kesh's export as seed-original.glb and writes the softened model as seed.glb.
import json,struct,io,shutil,os
from PIL import Image
import numpy as np
D='/mnt/project-files/tripo-summons/seed/'
orig=D+'seed-original.glb'
if not os.path.exists(orig): shutil.copy(D+'seed.glb',orig)
b=open(orig,'rb').read()
l,_=struct.unpack('<I4s',b[12:20]); j=json.loads(b[20:20+l]); bin0=b[20+l+8:]
bvs=j['bufferViews']; ib=j['images'][0]['bufferView']
def view(i):
    v=bvs[i]; o=v.get('byteOffset',0); return bin0[o:o+v['byteLength']]
tex=Image.open(io.BytesIO(view(ib))).convert('RGB')
def hsv(a):
    r,g,b_=a[...,0],a[...,1],a[...,2]; mx=a.max(-1); mn=a.min(-1); d=mx-mn; m=d>1e-6; dd=np.where(m,d,1)
    rc=(mx-r)/dd; gc=(mx-g)/dd; bc=(mx-b_)/dd
    h=np.where(mx==r,bc-gc,np.where(mx==g,2+rc-bc,4+gc-rc)); h=np.where(m,(h/6)%1,0)
    s=np.where(mx>0,d/np.where(mx>0,mx,1),0); return h,s,mx
def rgb(h,s,v):
    i=np.floor(h*6).astype(int)%6; f=h*6-np.floor(h*6); p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s)
    r=np.choose(i,[v,q,p,p,t,v]); g=np.choose(i,[t,v,v,q,p,p]); b_=np.choose(i,[p,p,t,v,v,q]); return np.stack([r,g,b_],-1)
def med(path_or_arr):
    a=path_or_arr; h,s,v=hsv(a); out={}
    for n,(h0,h1) in {'band':(5,24),'wood':(24,50),'leaf':(60,130)}.items():
        m=(h*360>=h0)&(h*360<h1)&(s>0.3)&(v>0.2); out[n]=(float(np.median(h[m])*360),float(np.median(s[m])),float(np.median(v[m])))
    return out
sheet=np.concatenate([np.asarray(Image.open(D+f'seed-{k}.png').convert('RGB')).astype(float)/255 for k in ('1-front','2-left','3-back','4-right')])
a=np.asarray(tex).astype(float)/255
T=med(sheet); C=med(a)
print('sheet',{k:[round(x,2) for x in v] for k,v in T.items()}); print('model',{k:[round(x,2) for x in v] for k,v in C.items()})
hs=[C[k][0] for k in ('band','wood','leaf')]
ks=[T[k][1]/C[k][1] for k in ('band','wood','leaf')]; kv=[T[k][2]/C[k][2] for k in ('band','wood','leaf')]
print('hue knots',np.round(hs,1),'sat x',np.round(ks,2),'val x',np.round(kv,2))
h,s,v=hsv(a); hd=h*360
out=rgb(h,np.clip(s*np.interp(hd,hs,ks),0,1),np.clip(v*np.interp(hd,hs,kv),0,1))
img=Image.fromarray((np.clip(out,0,1)*255).round().astype('uint8'))
buf=io.BytesIO(); img.save(buf,'JPEG',quality=92,subsampling=0); newtex=buf.getvalue()
print('after',{k:[round(x,2) for x in v] for k,v in med(np.asarray(img).astype(float)/255).items()})
parts=[];off=0
for i,vw in enumerate(bvs):
    data=newtex if i==ib else view(i)
    pad=(-off)%4; parts.append(b'\0'*pad); off+=pad
    vw['byteOffset']=off; vw['byteLength']=len(data); parts.append(data); off+=len(data)
binn=b''.join(parts); binn+=b'\0'*((-len(binn))%4)
j['buffers'][0]['byteLength']=len(binn)
js=json.dumps(j,separators=(',',':')).encode(); js+=b' '*((-len(js))%4)
glb=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(binn))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binn),b'BIN\0')+binn
open(D+'seed.glb','wb').write(glb); print('glb',len(b),'->',len(glb))
