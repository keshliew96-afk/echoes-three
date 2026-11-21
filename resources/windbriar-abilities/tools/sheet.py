import sys
from PIL import Image, ImageDraw
a=sys.argv[1:]; i=a.index('--labels'); out=a[0]; files=a[1:i]; labels=a[i+1].split(',')
ims=[Image.open(f) for f in files]; w,h=ims[0].size; cols=3 if len(ims)>4 else len(ims); rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),'black')
for k,im in enumerate(ims):
    S.paste(im,((k%cols)*w,(k//cols)*h)); d=ImageDraw.Draw(S); d.text(((k%cols)*w+6,(k//cols)*h+h-16),'t='+labels[k],fill='yellow')
S.save(out)
