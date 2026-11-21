import json,struct,sys,io,glob
import numpy as np
from PIL import Image
RES={'Ember':(0xFF,0x5A,0x36),'Violet':(0xB7,0x9C,0xF0),'BrightHeal':(0x5F,0xE8,0x73)}
def acc(j,b,bin0,i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    dt={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}[a['componentType']]
    off=bin0+bv.get('byteOffset',0)+a.get('byteOffset',0)
    stride=bv.get('byteStride',0); isz=np.dtype(dt).itemsize*n
    if stride and stride!=isz:
        raw=np.frombuffer(b,np.uint8,a['count']*stride,off).reshape(a['count'],stride)[:,:isz]
        arr=np.frombuffer(raw.tobytes(),dt).reshape(a['count'],n)
    else: arr=np.frombuffer(b,dt,a['count']*n,off).reshape(a['count'],n)
    if a.get('normalized'): arr=arr.astype(np.float32)/np.iinfo(dt).max
    return arr.astype(np.float64) if dt==np.float32 else arr
def lab(rgb):
    c=rgb/255.0; c=np.where(c>0.04045,((c+0.055)/1.055)**2.4,c/12.92)
    M=np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]])
    xyz=c@M.T/np.array([0.95047,1,1.08883]); f=np.where(xyz>0.008856,np.cbrt(xyz),7.787*xyz+16/116)
    return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],-1)
TH=float(sys.argv[1])
for f in sys.argv[2:]:
    b=open(f,'rb').read(); l=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+l]); bin0=20+l+8
    tot={k:0.0 for k in RES}; area_all=0
    for m in j['meshes']:
        for p in m['primitives']:
            mat=j['materials'][p['material']]; pb=mat.get('pbrMetallicRoughness',{})
            if 'baseColorTexture' in pb:
                ti=pb['baseColorTexture']['index']; im=j['images'][j['textures'][ti]['source']]; bv=j['bufferViews'][im['bufferView']]
                img=np.asarray(Image.open(io.BytesIO(b[bin0+bv.get('byteOffset',0):bin0+bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB')).astype(np.float64)
            else:
                c=pb.get('baseColorFactor',[1,1,1,1]); img=np.full((1,1,3),[min(255,x*255) for x in c[:3]],float)
            P=acc(j,b,bin0,p['attributes']['POSITION'])
            UV=acc(j,b,bin0,p['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in p['attributes'] else np.zeros((len(P),2))
            I=acc(j,b,bin0,p['indices']).reshape(-1,3).astype(int) if 'indices' in p else np.arange(len(P)).reshape(-1,3)
            A=np.linalg.norm(np.cross(P[I[:,1]]-P[I[:,0]],P[I[:,2]]-P[I[:,0]]),axis=1)/2
            uv=UV[I].mean(1); h,w=img.shape[:2]
            px=img[np.clip((uv[:,1]%1)*h,0,h-1).astype(int),np.clip((uv[:,0]%1)*w,0,w-1).astype(int)]
            L=lab(px); area_all+=A.sum()
            for k,c in RES.items():
                d=np.linalg.norm(L-lab(np.array(c,float)),axis=1); tot[k]+=A[d<TH].sum()
    print(f.split('/')[-1].replace('-tripo-rigged.glb',''), ' '.join(f"{k} {100*v/area_all:.2f}%" for k,v in tot.items()))
