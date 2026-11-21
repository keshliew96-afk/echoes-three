import sys
from PIL import Image
# mont.py DIR start end step out [crop x0 y0 x1 y1]
d,s,e,st,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),sys.argv[5]
crop=[int(v) for v in sys.argv[6:10]] if len(sys.argv)>9 else None
ims=[]
for i in range(s,e+1,st):
    im=Image.open('%s/%03d.jpg'%(d,i))
    if crop: im=im.crop(crop)
    ims.append(im)
w,h=ims[0].size; cols=min(6,len(ims)); rows=(len(ims)+cols-1)//cols
sc=min(1.0,1980/(w*cols))
W,H=int(w*sc),int(h*sc)
M=Image.new('RGB',(W*cols,H*rows))
for k,im in enumerate(ims): M.paste(im.resize((W,H)),((k%cols)*W,(k//cols)*H))
M.save(out,quality=85); print(M.size, ims[0].size if not crop else crop)
