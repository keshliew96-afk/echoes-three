import sys,glob
from PIL import Image,ImageDraw
for n in sys.argv[1:]:
  fs=sorted(glob.glob(f'out/{n}/*.png'))
  ims=[Image.open(f).crop((640,360,3200,1800)).resize((640,360)) for f in fs]
  sh=Image.new('RGB',(640*3,360*2)); d=ImageDraw.Draw(sh)
  for i,(f,im) in enumerate(zip(fs,ims)):
    x,y=(i%3)*640,(i//3)*360; sh.paste(im,(x,y)); d.text((x+5,y+5),f[-7:-4],fill='yellow')
  sh.save(f'strip-{n}.jpg',quality=80)
