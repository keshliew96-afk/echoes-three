# Colossus floor cracks, top-down, centred on him. Two layers: dark seams (normal blend) and a pale-gold core (additive).
import math, random
from PIL import Image, ImageDraw, ImageFilter
N=1024; C=N/2; rng=random.Random(23); R=lambda a,b: a+rng.random()*(b-a)
dark=Image.new('RGBA',(N,N),(0,0,0,0)); dd=ImageDraw.Draw(dark,'RGBA')
glow=Image.new('L',(N,N),0); gd=ImageDraw.Draw(glow)
hot=[]  # glint spots: forks and the first 20% of each run
def crack(x,y,a,L,w,depth,lit=1.0,forks=0):
    pts=[(x,y)]; steps=rng.choice([4,5])
    for i in range(1,steps+1):
        a+=R(-0.75,0.75); l=L/steps*R(0.6,1.4); x+=math.cos(a)*l; y+=math.sin(a)*l; pts.append((x,y))
    nseg=len(pts)-1
    # taper: three width steps along the run
    for k,(i0,i1,ww) in enumerate([(0,max(1,nseg//3),w),(max(1,nseg//3),max(2,2*nseg//3),w*0.6),(max(2,2*nseg//3),nseg,w*0.35)]):
        if i1>i0: dd.line(pts[i0:i1+1],fill=(30,24,18,245),width=max(2,int(ww)),joint='curve')
    br=lit*R(0.6,1.0)
    ng=max(1,round(nseg*0.6))  # gold on the inner 60% of the run
    for i in range(1,ng+1):
        f=i/ng; gd.line([pts[i-1],pts[i]],fill=int(255*br*(1-0.5*f)),width=max(2,int(w*0.35)))
    for _ in range(forks):
        j=rng.randrange(1,nseg); fx,fy=pts[j]; hot.append((fx,fy,lit*0.8))
        crack(fx,fy,a+rng.choice([-1,1])*R(1.05,1.6),L*R(0.25,0.4),w*0.5,0,lit*0.7)
# 5 branching runs from about 0.5u out (C ~ 2.3u), 1.2-1.6u long, tips at or just past the middle ring
n=5
for i in range(n):
    a=i/n*6.283+R(-0.15,0.15); r0=C*0.22
    crack(C+math.cos(a)*r0,C+math.sin(a)*r0,a,C*R(0.52,0.66),R(12,13),1,1.0,rng.choice([2,3]))
hot=sorted(hot,key=lambda h:-h[2])[:6]
halo=Image.new('L',(N,N),0); hd=ImageDraw.Draw(halo)
for hx,hy,hb in hot:
    hd.ellipse([hx-11,hy-11,hx+11,hy+11],fill=int(255*0.2))
    gd.ellipse([hx-5.5,hy-5.5,hx+5.5,hy+5.5],fill=255)
from PIL import ImageChops as _IC
glow=_IC.lighter(glow,halo.filter(ImageFilter.GaussianBlur(5)))
# a soft dusty bed so the cracked area reads as one patch
bed=Image.new('L',(N,N),0); ImageDraw.Draw(bed).ellipse([C-C*0.62,C-C*0.62,C+C*0.62,C+C*0.62],fill=0); bed=bed.filter(ImageFilter.GaussianBlur(60))
base=Image.new('RGBA',(N,N),(150,128,98,0)); base.putalpha(bed); out=Image.alpha_composite(base,dark)
out.save('colossus-cracks.png')
m=Image.new('L',(N,N),255); ImageDraw.Draw(m).ellipse([C-C*0.2,C-C*0.2,C+C*0.2,C+C*0.2],fill=0); m=m.filter(ImageFilter.GaussianBlur(25)); from PIL import ImageChops; glow=ImageChops.multiply(glow,m)
g2=glow.filter(ImageFilter.GaussianBlur(0.8)); gl=Image.merge('RGBA',[Image.new('L',(N,N),255)]*3+[g2]); gl.save('colossus-glow.png')
bg=Image.new('RGBA',(N,N),(104,100,94,255)); bg.alpha_composite(out)
gc=Image.new('RGBA',(N,N),(232,190,110,0)); gc.putalpha(g2.point(lambda v:int(v*0.8))); bg.alpha_composite(gc)
bg.convert('RGB').resize((512,512)).save('preview-col.jpg')

# small cracks for each foe's base: 4 short runs from the centre, dark with a thin gold start
N2=256; c2=N2/2
sm_=Image.new('RGBA',(N2,N2),(0,0,0,0)); sd=ImageDraw.Draw(sm_,'RGBA')
for i in range(4):
    a=i/4*6.283+R(-0.4,0.4); x,y=c2+math.cos(a)*c2*0.3,c2+math.sin(a)*c2*0.3; pts=[(x,y)]
    for k in range(3):
        a+=R(-0.7,0.7); l=c2*R(0.15,0.25); x+=math.cos(a)*l; y+=math.sin(a)*l; pts.append((x,y))
    sd.line(pts[:3],fill=(38,28,20,235),width=5,joint='curve'); sd.line(pts[2:],fill=(38,28,20,220),width=3,joint='curve')
    sd.line(pts[:2],fill=(240,190,110,170),width=2)
sm_.save('colossus-foe-cracks.png')
