import sys
from PIL import Image, ImageDraw
a=sys.argv[1:]; labels=None
if '--labels' in a: i=a.index('--labels'); labels=a[i+1].split(','); a=a[:i]
out=a[0]; fs=a[1:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; cols=3 if len(ims)>4 else 2; rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),(30,30,30)); d=ImageDraw.Draw(S)
for i,im in enumerate(ims):
  x,y=(i%cols)*w,(i//cols)*h; S.paste(im,(x,y))
  if labels: d.rectangle([x+w-62,y+h-24,x+w-2,y+h-2],fill=(0,0,0)); d.text((x+w-58,y+h-20),labels[i]+'s',fill=(255,255,0))
S.save(out,quality=85)
