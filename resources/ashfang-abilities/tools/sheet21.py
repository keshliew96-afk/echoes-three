import sys
from PIL import Image
d,outp=sys.argv[1],sys.argv[2]; fr=[int(x) for x in sys.argv[3].split(',')]
box=[float(x) for x in sys.argv[4].split(',')] if len(sys.argv)>4 else [0.1,0.12,0.9,0.85]
cols=int(sys.argv[5]) if len(sys.argv)>5 else 4; s=float(sys.argv[6]) if len(sys.argv)>6 else 0.6
ims=[Image.open(f'{d}/{i:03d}.jpg') for i in fr]
w,h=ims[0].size; b=(int(w*box[0]),int(h*box[1]),int(w*box[2]),int(h*box[3]))
cw,ch=int((b[2]-b[0])*s),int((b[3]-b[1])*s); rows=(len(ims)+cols-1)//cols
o=Image.new('RGB',(cw*cols,ch*rows))
for k,im in enumerate(ims): o.paste(im.crop(b).resize((cw,ch)),((k%cols)*cw,(k//cols)*ch))
o.save(outp,quality=88)
