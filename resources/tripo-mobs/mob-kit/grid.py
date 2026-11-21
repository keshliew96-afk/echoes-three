# grid.py <png> <nviews> <half> <cy> <axes...>: draw world grid lines (every 0.05, labelled every 0.1) on ortho views; axes per view like "-z,y" or "x,y" or "x,-z"(top: screen right x, screen up -z)
import sys
from PIL import Image,ImageDraw
im=Image.open(sys.argv[1]).convert('RGB'); n=int(sys.argv[2]); half=float(sys.argv[3]); cy=float(sys.argv[4]); axes=sys.argv[5:]
W,H=im.size; vw=W//n; d=ImageDraw.Draw(im); s=H/(2*half)
for i,ax in enumerate(axes):
    hx,vy=ax.split(','); ox=i*vw+vw/2; c0={'y':cy}.get(vy.strip('-'),0)
    import numpy as np
    for v in np.arange(-1,1.0001,0.05):
        px=ox+v*s*(1 if not hx.startswith('-') else -1)
        if i*vw<=px<(i+1)*vw:
            d.line([(px,0),(px,H)],fill=(255,0,0) if abs(v)<1e-6 else (60,60,200),width=1)
            if abs(round(v/0.1)*0.1-v)<1e-6: d.text((px+2,2),'%s%.1f'%(hx.strip('-'),v),fill=(0,0,120))
        py=H/2-(v-c0)*s*(1 if not vy.startswith('-') else -1)
        if 0<=py<H:
            d.line([(i*vw,py),((i+1)*vw,py)],fill=(255,0,0) if abs(v)<1e-6 else (60,60,200),width=1)
            if abs(round(v/0.1)*0.1-v)<1e-6: d.text((i*vw+2,py+1),'%s%.1f'%(vy.strip('-'),v),fill=(0,0,120))
im.save(sys.argv[1].replace('.png','_g.png'))
