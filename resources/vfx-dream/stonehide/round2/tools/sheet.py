import sys,subprocess,os,glob
from PIL import Image,ImageDraw
name=sys.argv[1]; src=f'/mnt/project-files/stonehide-abilities/vid/{name}.mp4'
d=f'fr/{name}'; os.makedirs(d,exist_ok=True)
for f in glob.glob(d+'/*'): os.remove(f)
subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-i',src,'-vf','scale=320:-2',d+'/%03d.png'])
fs=sorted(glob.glob(d+'/*.png')); n=len(fs)
step=max(1,n//30); pick=fs[::step][:30]
w,h=Image.open(pick[0]).size; cols=6; rows=(len(pick)+cols-1)//cols
sh=Image.new('RGB',(w*cols,h*rows),'black'); dr=ImageDraw.Draw(sh)
for i,f in enumerate(pick):
  k=int(os.path.basename(f)[:3])-1+6  # rec frame index
  x,y=(i%cols)*w,(i//cols)*h; sh.paste(Image.open(f),(x,y)); dr.rectangle([x,y,x+40,y+16],fill='black'); dr.text((x+3,y+2),str(k),fill='yellow')
sh.save(f'sheets/{name}.jpg',quality=80); print(name,n,step)
