import sys
from PIL import Image, ImageDraw
out=sys.argv[1]; fs=sys.argv[2:]
ims=[Image.open(f).resize((960,400)) for f in fs]
S=Image.new('RGB',(1920,400*((len(ims)+1)//2))); d=ImageDraw.Draw(S)
for i,im in enumerate(ims): S.paste(im,((i%2)*960,(i//2)*400)); d.rectangle([(i%2)*960,(i//2)*400,(i%2)*960+60,(i//2)*400+14],fill=(0,0,0)); d.text(((i%2)*960+3,(i//2)*400+2),fs[i].split('/')[-1],fill=(255,255,0))
S.save(out,quality=80)
