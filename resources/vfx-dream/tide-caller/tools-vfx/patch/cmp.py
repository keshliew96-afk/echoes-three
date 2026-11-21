# cmp.py <livedir> <outdir> [names] : target | live side by side (each 960x540)
import sys,glob,os
from PIL import Image,ImageDraw
L,O=sys.argv[1],sys.argv[2]; os.makedirs(O,exist_ok=True); T='/mnt/project-files/vfx-dream/tide-caller/targets'
for f in sorted(glob.glob(L+'/*.png')):
    nm=os.path.basename(f).rsplit('_',1)[0]; t=Image.open(f'{T}/{nm}.png').convert('RGB').resize((960,540)); l=Image.open(f).convert('RGB').resize((960,540))
    S=Image.new('RGB',(1920,540)); S.paste(t,(0,0)); S.paste(l,(960,0)); d=ImageDraw.Draw(S)
    for x,s in [(0,'target'),(960,'live')]: d.rectangle((x,0,x+80,20),fill='black'); d.text((x+4,4),s,fill='yellow')
    S.save(f'{O}/{nm}.jpg',quality=88)
