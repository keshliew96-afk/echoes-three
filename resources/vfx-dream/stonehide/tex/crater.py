# Heavy Slam crater decal, top-down, +x = the blow's direction. 1024 px = the decal's full width.
import numpy as np, math, random
from PIL import Image, ImageDraw, ImageFilter
N=1024; C=N/2; rng=random.Random(11); R=lambda a,b: a+rng.random()*(b-a)
yy,xx=np.mgrid[0:N,0:N]; dx=(xx-C)/C; dy=(yy-C)/C; rr=np.hypot(dx,dy)
img=np.zeros((N,N,4),np.float32)
def over(rgb,a):
    a=np.clip(a,0,1)[...,None]; src=np.concatenate([np.broadcast_to(np.array(rgb,np.float32)/255,(N,N,3)),np.ones((N,N,1))],-1)
    out_a=a+img[...,3:4]*(1-a); img[...,:3]=(src[...,:3]*a+img[...,:3]*img[...,3:4]*(1-a))/np.maximum(out_a,1e-6); img[...,3:4]=out_a
noise=np.array(Image.effect_noise((N,N),60).filter(ImageFilter.GaussianBlur(6)),np.float32)/255
# 1 dust bed: warm tan, darker in the middle, noisy edge, stretched a little forward
ex=np.hypot((dx-0.08)/1.12,dy)
over((200,168,122), np.clip(1-ex/0.62+ (noise-0.5)*0.5,0,1)*0.7)
over((84,70,54), np.clip(1-ex/0.36+(noise-0.5)*0.4,0,1)*0.7)
# 2 broken plates (voronoi) inside the crater
pts=[(C+math.cos(a)*d,C+math.sin(a)*d) for a,d in [(R(0,6.283),R(0,0.48*C)) for _ in range(60)]]
P=np.array(pts); d2=((xx[...,None]-P[:,0])**2+(yy[...,None]-P[:,1])**2); lab=d2.argmin(-1); s=np.sort(d2,-1); edge=(np.sqrt(s[...,1])-np.sqrt(s[...,0]))
inside=np.clip((0.4+(noise-0.5)*0.35-rr)/0.04,0,1)
shade=np.array([R(0.8,1.35) for _ in pts])[lab]
plate=np.stack([80*shade,71*shade,61*shade],-1)
a_plate=inside*0.85
img[...,:3]=img[...,:3]*(1-a_plate[...,None])+plate/255*a_plate[...,None]; img[...,3]=np.maximum(img[...,3],a_plate)
seam=np.clip(1-edge/7,0,1)*(inside>0.02); over((16,13,10),seam*0.97)
lip=np.zeros((N,N))
# 3 radial cracks: jagged, tapering, mostly forward, with forks
im=Image.fromarray((np.clip(img,0,1)*255).astype(np.uint8),'RGBA'); dr=ImageDraw.Draw(im,'RGBA')
def crack(x,y,a,L,w,depth):
    pts=[(x,y)]; steps=8
    for i in range(1,steps+1):
        a+=R(-0.28,0.28); x+=math.cos(a)*L/steps; y+=math.sin(a)*L/steps; pts.append((x,y))
    for i in range(1,len(pts)):
        ww=max(1,w*(1-(i-1)/len(pts)))
        (x0,y0),(x1,y1)=pts[i-1],pts[i]
        dr.line([(x0+1.5,y0+1.5),(x1+1.5,y1+1.5)],fill=(196,180,154,50),width=int(ww+2))
        dr.line([(x0,y0),(x1,y1)],fill=(30,25,20,235),width=int(ww))
    if depth>0:
        for k in range(rng.choice([1,1,2])):
            j=rng.randrange(3,7); fx,fy=pts[j]
            crack(fx,fy,a+rng.choice([-1,1])*R(0.3,0.6),L*R(0.3,0.45),w*0.6,depth-1)
n=11
for i in range(n):
    a=i/n*6.283+R(-0.2,0.2)
    if a>math.pi: a-=6.283
    fwd=abs(a)<1.9
    L=C*(R(0.7,0.95) if fwd else R(0.58,0.72))
    r0=C*R(0.3,0.38)
    crack(C+math.cos(a)*r0,C+math.sin(a)*r0,a,L-r0,R(16,19) if fwd else R(12,14),2)
# dark pit at the blow
pit=Image.new('L',(N,N),0); ImageDraw.Draw(pit).ellipse([C-70,C-60,C+70,C+60],fill=200); pit=pit.filter(ImageFilter.GaussianBlur(28))
dark=Image.new('RGBA',(N,N),(26,20,15,0)); dark.putalpha(pit); im=Image.alpha_composite(im,dark)
im.save('slam-crater.png')
bg=Image.new('RGBA',(N,N),(112,106,98,255)); bg.alpha_composite(im); bg.convert('RGB').resize((512,512)).save('preview.jpg')
