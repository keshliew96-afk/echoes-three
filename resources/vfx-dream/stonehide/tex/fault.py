# Fault Line fissure, top-down: 6.4u long x 2.8u wide -> 2048 x 896 (320 px/u). Runs left (start, at him) to right.
import math, random
from PIL import Image, ImageDraw, ImageFilter
W,H=2048,896; cy=H/2; rng=random.Random(31); R=lambda a,b:a+rng.random()*(b-a)
img=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(img,'RGBA')
# main fissure path: jagged straight runs
pts=[(0,cy)]; x=0; y=cy
while x<W-40:
    x+=R(60,130); y=cy+R(-34,34)*(1-0.5*x/W); pts.append((x,y))
pts.append((W,cy+R(-10,10)))
def width_at(px): f=max(0,min(1,px/W)-0.3)/0.7; return 14+180*(1-f)**1.5   # Kesh 19 Nov: a wide gap at the strike (0.6u, held over the first 1.9u, through the first foe), narrowing to a hairline seam (0.04u) at the far end
# soft dark bed either side (crushed floor), then lip light/shadow, then core
bed=Image.new('L',(W,H),0); bd=ImageDraw.Draw(bed)
for i in range(1,len(pts)):
    (x0,y0),(x1,y1)=pts[i-1],pts[i]; w=width_at(x0)
    bd.line([(x0,y0),(x1,y1)],fill=77,width=int(60+w*1.6),joint='curve')
bed=bed.filter(ImageFilter.GaussianBlur(22))
base=Image.new('RGBA',(W,H),(60,48,36,0)); base.putalpha(bed); img=Image.alpha_composite(img,base); d=ImageDraw.Draw(img,'RGBA')
# densify the path so the gap's edges taper smoothly, then draw the gap as one polygon with jagged lips
dense=[]
for i in range(1,len(pts)):
    (x0,y0),(x1,y1)=pts[i-1],pts[i]; n=max(1,int(math.hypot(x1-x0,y1-y0)/14))
    for k in range(n): f=k/n; dense.append((x0+(x1-x0)*f,y0+(y1-y0)*f))
dense.append(pts[-1])
up=[];dn=[]
for i,(x,y) in enumerate(dense):
    w=width_at(x)/2; j=1+0.16*math.sin(i*0.55)+0.1*math.sin(i*1.9+1)+R(-0.05,0.05)
    up.append((x,y-w*j)); dn.append((x,y+w*(2-j)))
d.line([(x,y-3) for x,y in up],fill=(196,180,152,130),width=5,joint='curve')     # lit upper lip
d.line([(x,y+3) for x,y in dn],fill=(20,16,12,150),width=6,joint='curve')        # shadowed lower lip
d.polygon(up+dn[::-1],fill=(20,17,15,200))
inner=[(x,(yu*0.6+yd*0.4)) for (x,yu),(_,yd) in zip(up,dn)]+[(x,(yu*0.3+yd*0.7)) for (x,yu),(_,yd) in zip(up[::-1],dn[::-1])]
d.polygon(inner,fill=(12,10,8,225))
# side cracks spidering out, thinner, jagged
def crack(x,y,a,L,w,depth):
    p=[(x,y)]
    for k in range(rng.choice([3,4])):
        a+=R(-0.4,0.4); l=L/3.5*R(0.6,1.4); x+=math.cos(a)*l; y+=math.sin(a)*l; p.append((x,y))
    d.line(p[:3],fill=(30,24,18,235),width=max(2,int(w)),joint='curve')
    d.line(p[2:],fill=(30,24,18,215),width=max(2,int(w*0.55)),joint='curve')
    if depth>0 and rng.random()<0.7:
        j=rng.randrange(1,len(p)-1); crack(p[j][0],p[j][1],a+rng.choice([-1,1])*R(0.8,1.4),L*0.45,w*0.6,depth-1)
# Kesh 19 Nov: many cracks at the start, fewer toward the end
for i in range(1,len(pts)-1):
    x0,y0=pts[i]; f=x0/W
    for side in (-1,1):
        n=2 if f<0.5 else 1
        for k in range(n):
            if rng.random()<0.95-0.7*f:
                a=side*R(0.5,1.15)+(0 if rng.random()<0.7 else math.pi*0.15)
                crack(x0+R(-30,30),y0+side*width_at(x0)*0.45,a,(R(200,340) if f<0.3 else R(110,210)*(1.2-0.7*f)),R(6,9)*(1.2-0.5*f),1 if f<0.6 else 0)
img.save('fault-crack.png')
bg=Image.new('RGBA',(W,H),(104,100,94,255)); bg.alpha_composite(img); bg.convert('RGB').resize((1024,448)).save('preview-fault.jpg')

# seam lining (gold, additive in the page): the main seam only, thin
gl=Image.new('RGBA',(W,H),(0,0,0,0)); gdd=ImageDraw.Draw(gl)
for i in range(1,len(pts)):
    (x0,y0),(x1,y1)=pts[i-1],pts[i]
    gdd.line([(x0,y0),(x1,y1)],fill=(255,255,255,255),width=max(3,int(4+width_at(x0)*0.06)),joint='curve')
gl=gl.filter(ImageFilter.GaussianBlur(2)); gl.save('fault-glow.png')
# a star of 5-6 forking hairlines (per foe and at his strike point): 2.4u across -> 768 px (320 px/u)
N=768; c=N/2
st=Image.new('RGBA',(N,N),(0,0,0,0)); sd=ImageDraw.Draw(st,'RGBA')
def hair(x,y,a,L,w0,fork):
    # 2-3 kinks, tapering from w0 to nothing, one fork
    p=[(x,y)]; n=rng.choice([3,4])
    for k in range(n):
        a+=R(-0.7,0.7); l=L/n*R(0.7,1.3); x+=math.cos(a)*l; y+=math.sin(a)*l; p.append((x,y))
    for k in range(1,len(p)):
        f=(k-1)/(len(p)-1); sd.line([p[k-1],p[k]],fill=(20,17,15,225),width=max(1,int(w0*(1-f))))
    if fork:
        j=rng.randrange(1,len(p)-1); hair(p[j][0],p[j][1],a+rng.choice([-1,1])*R(0.6,1.1),L*0.4,w0*0.5,False)
for i in range(3):
    a=i/3*6.283+R(-0.4,0.4); hair(c+math.cos(a)*24,c+math.sin(a)*24,a,R(160,290),16,True)
st.save('fault-star.png')
