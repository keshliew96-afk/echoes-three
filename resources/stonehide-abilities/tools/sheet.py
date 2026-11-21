import sys,glob
from PIL import Image
d,out=sys.argv[1],sys.argv[2]; step=int(sys.argv[3]) if len(sys.argv)>3 else 3
crop=None
if len(sys.argv)>4: crop=tuple(map(int,sys.argv[4].split(',')))
fs=sorted(glob.glob(d+'/*.jpg'))[::step][:16]
ims=[Image.open(f) for f in fs]
if crop: ims=[i.crop(crop) for i in ims]
w,h=ims[0].size; s=0.5 if not crop else 1.0
w2,h2=int(w*s),int(h*s); cols=4; rows=(len(ims)+3)//4
S=Image.new('RGB',(w2*cols,h2*rows))
for k,i in enumerate(ims): S.paste(i.resize((w2,h2)),((k%cols)*w2,(k//cols)*h2))
S.save(out,quality=85)
