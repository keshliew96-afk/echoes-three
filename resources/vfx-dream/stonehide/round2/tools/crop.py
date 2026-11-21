import sys,shutil,os
from PIL import Image
D='/mnt/project-files/vfx-dream/stonehide/round2'
# name: (file, frame, cx, cy)
C={
'S13':('05-bristle',60,1560,1120),'S14':('06-basic-slam',56,1880,1080),'S15':('07-dash',22,1960,1040),
'S16':('08-bellow',38,1860,1100),'S17':('09-rock-toss',44,2240,1120),'S19':('10-growlstone',38,2240,1160),
'S20':('11-fracture',58,1960,1040),'S47':('12-stone-ring',25,1860,1180),'S48':('13-slab-throw',27,2320,1120),
'S50':('14-stone-cubs',81,2200,1120),'S21':('15-slabguard',89,1980,1040),'S22':('16-bodyguard',37,1960,1080),
'S24':('17-burrow',38,1840,1040),'S25':('18-rallying-cry',27,1860,1100),'S53':('19-stoneheart',93,1950,1020),
'S27':('20-maul',38,1960,1040),'S28':('21-bloodboil',59,2000,1040),'S29':('22-savage-bite',21,2160,1060),
'S49':('23-grindstone',47,1860,1120),'S55':('24-badger-toss',47,2240,1020),'S30':('25-iron-bristles',26,1800,1040),
'S31':('26-grudge',118,1860,960),'S32':('27-iron-briar',31,2160,1140),'S33':('28-iron-quills',26,2220,1040),
'S54':('29-counter-spin',70,1860,1000)}
for n in (sys.argv[1:] or C):
  f,fr,cx,cy=C[n]; src=f'out/{n}/{fr:03d}.png'
  if not os.path.exists(src): print('missing',n); continue
  im=Image.open(src); x=max(0,min(3840-1920,cx-960)); y=max(0,min(2160-1080,cy-540))
  im.crop((x,y,x+1920,y+1080)).save(f'{D}/{f}.png'); shutil.copy(src,f'{D}/full/{f}-4k.png'); print(n,f,x,y)
