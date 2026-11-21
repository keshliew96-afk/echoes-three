from PIL import Image, ImageDraw
import sys
names=sys.argv[1].split(',');out=sys.argv[2]
ims=[Image.open(sys.argv[3]+n+'.png').convert('RGB') for n in names]
w,h=ims[0].size; s=0.5; W,H=int(w*s),int(h*s); cols=3; rows=(len(ims)+cols-1)//cols
M=Image.new('RGB',(W*cols,H*rows),'white'); d=ImageDraw.Draw(M)
for i,(n,im) in enumerate(zip(names,ims)):
  x,y=(i%cols)*W,(i//cols)*H; M.paste(im.resize((W,H)),(x,y)); d.text((x+6,y+6),n,fill='black')
M.save(out)
