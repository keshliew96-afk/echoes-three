import sys,subprocess,json,os
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad'
def frames(name,t0,n,step):
    out=[]
    for i in range(n):
        f=f'{S}/zz/_f{i}.png'
        subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',f'{t0+i*step:.3f}','-i',f'{S}/page/vid/{name}.mp4','-frames:v','1',f],check=True)
        if os.path.exists(f): out.append(Image.open(f).convert('RGB').copy())
    return out
def hero(im):
    a=np.asarray(im).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
    m=(g>190)&(b>140)&(b<215)&(r>80)&(r<165)&(g-r>60)&(g-b>15)
    ys,xs=np.nonzero(m)
    if len(xs)<20: return None
    return int(np.median(xs)),int(np.median(ys))
def strip(name,t0=0.27,n=12,step=1/15,size=150):
    fr=frames(name,t0,n,step)
    c=hero(fr[0]) or (480,300)
    x0=max(0,min(960-size,c[0]-size//2)); y0=max(0,min(600-size,c[1]-size+38))
    out=Image.new('RGB',(size*len(fr),size))
    for i,f in enumerate(fr): out.paste(f.crop((x0,y0,x0+size,y0+size)),(i*size,0))
    return out
names=sys.argv[2:]
rows=[strip(n) for n in names]
W=max(r.width for r in rows); o=Image.new('RGB',(W,sum(r.height for r in rows)))
y=0
for r in rows: o.paste(r,(0,y)); y+=r.height
o.save(sys.argv[1]); print(sys.argv[1],o.size)
