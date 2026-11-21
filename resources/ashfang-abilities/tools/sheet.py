import sys,os
from PIL import Image
d=sys.argv[1]; out=sys.argv[2]; every=int(sys.argv[3]) if len(sys.argv)>3 else 3
fs=sorted(os.listdir(d))[2::every][:15]
ims=[Image.open(os.path.join(d,f)).resize((400,250)) for f in fs]
W=Image.new('RGB',(400*5,250*((len(ims)+4)//5)))
for i,im in enumerate(ims): W.paste(im,((i%5)*400,(i//5)*250))
W.save(out,quality=82)
