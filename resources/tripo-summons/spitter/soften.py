import json,struct,io,colorsys,shutil,os
from PIL import Image
import numpy as np
D='/mnt/project-files/tripo-summons/spitter/'
orig=D+'spitter-original.glb'
if not os.path.exists(orig): shutil.copy(D+'spitter.glb',orig)
b=open(orig,'rb').read()
l,_=struct.unpack('<I4s',b[12:20]); j=json.loads(b[20:20+l]); bin0=b[20+l+8:]
bvs=j['bufferViews']; ib=j['images'][0]['bufferView']
def view(i):
    v=bvs[i]; o=v.get('byteOffset',0); return bin0[o:o+v['byteLength']]
tex=Image.open(io.BytesIO(view(ib))).convert('RGB'); print(tex.size)
def hsv(a):
    r,g,b_=a[...,0],a[...,1],a[...,2]; mx=a.max(-1); mn=a.min(-1); d=mx-mn
    h=np.zeros_like(mx); m=d>1e-6
    rc=np.where(m,(mx-r)/np.where(m,d,1),0); gc=np.where(m,(mx-g)/np.where(m,d,1),0); bc=np.where(m,(mx-b_)/np.where(m,d,1),0)
    h=np.where(mx==r,bc-gc,np.where(mx==g,2+rc-bc,4+gc-rc)); h=(h/6)%1; h=np.where(m,h,0)
    s=np.where(mx>0,d/np.where(mx>0,mx,1),0); return h,s,mx
def rgb(h,s,v):
    i=np.floor(h*6).astype(int)%6; f=h*6-np.floor(h*6); p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s)
    r=np.choose(i,[v,q,p,p,t,v]); g=np.choose(i,[t,v,v,q,p,p]); b_=np.choose(i,[p,p,t,v,v,q]); return np.stack([r,g,b_],-1)
# target from the sheet's front crop
sh=np.asarray(Image.open(D+'spitter-1-front.png').convert('RGB')).astype(float)/255
h,s,v=hsv(sh); m=(h>0.09)&(h<0.165)&(s>0.15)&(v>0.6)
tgt=(np.median(h[m]),np.median(s[m]),np.median(v[m])); print('sheet petals h,s,v',[round(float(x),3) for x in tgt], 'p10/p90 s',np.percentile(s[m],[10,90]).round(2))
a=np.asarray(tex).astype(float)/255
h,s,v=hsv(a); m=(h>0.09)&(h<0.165)&(s>0.3)&(v>0.45)
cur=(np.median(h[m]),np.median(s[m]),np.median(v[m])); print('model petals h,s,v',[round(float(x),3) for x in cur],'share',m.mean().round(3), 'p10/p90 s',np.percentile(s[m],[10,90]).round(2),'v',np.percentile(v[m],[10,90]).round(2))
# soft mask: yellow hue window, falling off toward orange (ribbon) and olive green (stalk); needs some brightness
def ramp(x,a0,a1): return np.clip((x-a0)/(a1-a0),0,1)
w=ramp(h,0.085,0.105)*(1-ramp(h,0.155,0.178))*ramp(s,0.15,0.35)*ramp(v,0.30,0.50)
from PIL import ImageFilter
w=np.asarray(Image.fromarray((w*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.5))).astype(float)/255
# pale cream on the open petals, butter yellow kept in the throat and creases (the texture's more saturated texels)
s2=np.clip(0.30+(s-0.73)/(0.98-0.73)*(0.74-0.30),0.24,0.80)
# keep shading: lift value gently toward the sheet's lighter petals
kv=tgt[2]/cur[2]; v2=np.clip(v*kv,0,1) if kv>1 else v*kv
h2=h+(tgt[0]-cur[0])
out=rgb(np.clip(h2,0,1),np.clip(s2,0,1),v2)
res=a*(1-w[...,None])+out*w[...,None]
img=Image.fromarray((np.clip(res,0,1)*255).round().astype('uint8'))
buf=io.BytesIO(); img.save(buf,'JPEG',quality=92,subsampling=0); newtex=buf.getvalue(); print('jpeg',len(view(ib)),'->',len(newtex))
img.save('spitter_tex_soft.jpg'); tex.save('spitter_tex_orig.jpg')
# rebuild BIN
parts=[];off=0
for i,vw in enumerate(bvs):
    data=newtex if i==ib else view(i)
    pad=(-off)%4; parts.append(b'\0'*pad); off+=pad
    vw['byteOffset']=off; vw['byteLength']=len(data); parts.append(data); off+=len(data)
binn=b''.join(parts); binn+=b'\0'*((-len(binn))%4)
j['buffers'][0]['byteLength']=len(binn)
js=json.dumps(j,separators=(',',':')).encode(); js+=b' '*((-len(js))%4)
glb=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(binn))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binn),b'BIN\0')+binn
open(D+'spitter.glb','wb').write(glb); print('glb',len(b),'->',len(glb))
h,s,v=hsv(np.asarray(img).astype(float)/255); m=(h>0.09)&(h<0.165)&(s>0.15)&(v>0.45)
print('after petals h,s,v',[round(float(np.median(x[m])),3) for x in (h,s,v)])
