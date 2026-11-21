# Softens a Tripo plant model's texture toward the colours of its sheet and turns the model so its
# front faces +z (the other plants' convention). Keeps Kesh's export as <name>-original.glb and
# writes <name>.glb. Usage: python3 soften.py <name>   (run from anywhere; D is fixed below)
import json,struct,io,sys,os
from PIL import Image
import numpy as np
name=sys.argv[1]; D=f'/mnt/project-files/tripo-summons/{name}/'
# hue knots (degrees): (hue, saturation x, value x, hue shift in degrees)
KNOTS={
 'snapjaw':[(12,0.80,0.92,0),(25,0.78,0.92,0),(40,0.55,1.0,-3),(55,0.46,1.0,-6),(65,0.71,0.97,0),(75,0.72,0.93,0),(120,0.72,0.93,0)],
 'lurelily':[(8,0.68,0.95,0),(15,0.66,0.94,0),(25,0.80,0.92,0),(35,0.60,0.95,-3),(45,0.56,0.93,-8),(55,0.85,0.95,-3),(65,0.70,0.97,0),(75,0.67,0.97,0),(120,0.67,0.97,0)],
}[name]
KEEP_GOLD = name=='lurelily'   # the honey heart stays golden: very saturated yellow is softened less
b=open(D+f'{name}-original.glb','rb').read()
l,_=struct.unpack('<I4s',b[12:20]); j=json.loads(b[20:20+l]); bin0=bytearray(b[20+l+8:])
bvs=j['bufferViews']; ib=j['images'][0]['bufferView']
def view(i):
    v=bvs[i]; o=v.get('byteOffset',0); return bytes(bin0[o:o+v['byteLength']])
def hsv(a):
    r,g,b_=a[...,0],a[...,1],a[...,2]; mx=a.max(-1); mn=a.min(-1); d=mx-mn; m=d>1e-6; dd=np.where(m,d,1)
    rc=(mx-r)/dd; gc=(mx-g)/dd; bc=(mx-b_)/dd
    h=np.where(mx==r,bc-gc,np.where(mx==g,2+rc-bc,4+gc-rc)); h=np.where(m,(h/6)%1,0)
    s=np.where(mx>0,d/np.where(mx>0,mx,1),0); return h,s,mx
def rgb(h,s,v):
    i=np.floor(h*6).astype(int)%6; f=h*6-np.floor(h*6); p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s)
    r=np.choose(i,[v,q,p,p,t,v]); g=np.choose(i,[t,v,v,q,p,p]); b_=np.choose(i,[p,p,t,v,v,q]); return np.stack([r,g,b_],-1)
tex=Image.open(io.BytesIO(view(ib))).convert('RGB'); a=np.asarray(tex).astype(float)/255
h,s,v=hsv(a); hd=h*360
hs=[k[0] for k in KNOTS]
ks=np.interp(hd,hs,[k[1] for k in KNOTS]); kv=np.interp(hd,hs,[k[2] for k in KNOTS]); dh=np.interp(hd,hs,[k[3] for k in KNOTS])
if KEEP_GOLD:
    gold=np.clip((s-0.72)/0.18,0,1)*((hd>36)&(hd<58))
    ks=ks+(0.9-ks)*gold; kv=kv+(1.0-kv)*gold; dh=dh*(1-gold)
out=rgb(((hd+dh)/360)%1,np.clip(s*ks,0,1),np.clip(v*kv,0,1))
img=Image.fromarray((np.clip(out,0,1)*255).round().astype('uint8'))
buf=io.BytesIO(); img.save(buf,'JPEG',quality=92,subsampling=0); newtex=buf.getvalue()
# turn 180 degrees about y: x -> -x, z -> -z on positions and normals (a rotation, winding kept)
turned=set()
for m in j['meshes']:
    for p in m['primitives']:
        for key in ('POSITION','NORMAL'):
            ai=p['attributes'].get(key)
            if ai is None or ai in turned: continue
            turned.add(ai); acc=j['accessors'][ai]; bv=bvs[acc['bufferView']]
            assert acc['componentType']==5126 and acc['type']=='VEC3'
            off=bv.get('byteOffset',0)+acc.get('byteOffset',0); stride=bv.get('byteStride',12); n=acc['count']
            for k in range(n):
                o=off+k*stride; x,y,z=struct.unpack_from('<fff',bin0,o); struct.pack_into('<fff',bin0,o,-x,y,-z)
            if 'min' in acc:
                mn,mx=acc['min'],acc['max']; acc['min']=[-mx[0],mn[1],-mx[2]]; acc['max']=[-mn[0],mx[1],-mn[2]]
parts=[];off=0
for i,vw in enumerate(bvs):
    data=newtex if i==ib else view(i)
    pad=(-off)%4; parts.append(b'\0'*pad); off+=pad
    vw['byteOffset']=off; vw['byteLength']=len(data); parts.append(data); off+=len(data)
binn=b''.join(parts); binn+=b'\0'*((-len(binn))%4)
j['buffers'][0]['byteLength']=len(binn)
js=json.dumps(j,separators=(',',':')).encode(); js+=b' '*((-len(js))%4)
glb=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(binn))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binn),b'BIN\0')+binn
open(D+f'{name}.glb','wb').write(glb); print(name,'glb',len(b),'->',len(glb))
