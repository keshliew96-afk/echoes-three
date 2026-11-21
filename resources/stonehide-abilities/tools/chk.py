import json,sys
from PIL import Image, ImageDraw
a=json.load(open('jobs/all30.json'))
order=['S13','S14','S15','S16','S17','S18','S19','S19b','S20','S21','S21b','S22','S23','S24','S25','S26','S27','S28','S29','S30','S31','S32','S33','S45','S45b','S47','S48','S49','S50','S51','S53','S54','S55','S55b','BC','C1','C2','C3','C4','C5','C7','C8','C9']
rows=[]
for n in order:
    j=a[n]; fps=30; N=round(j['secs']*fps)
    casts=[q for q in j.get('seq',[]) if q[1] in('cast','combo','dash')]
    t0=casts[0][0] if casts else 0.3
    r1=[min(N-1,round((t0+d)*fps)) for d in (0.0,0.07,0.1,0.17,0.27,0.4,0.6,0.9)]
    tl=casts[-1][0] if len(casts)>1 else t0+1.2
    if len(casts)>1: r2=[min(N-1,round((tl+d)*fps)) for d in (0.0,0.07,0.1,0.17,0.27,0.4,0.6,0.9)]
    else: r2=[min(N-1,round((tl+k*(j['secs']-tl-0.05)/7)*fps)) for k in range(8)]
    rows.append((n+' @%.1f'%t0,r1,n)); rows.append((n+(' last cast @%.1f'%tl if len(casts)>1 else ' rest'),r2,n))
W,H=247,170
per=8
for p in range(0,len(rows),per):
    chunk=rows[p:p+per]; M=Image.new('RGB',(W*8,H*len(chunk)))
    for r,(lab,fr,n) in enumerate(chunk):
        for c,f in enumerate(fr):
            im=Image.open('outM0/%s/%03d.jpg'%(n,f)).crop((130,60,830,542)).resize((W,H))
            M.paste(im,(c*W,r*H))
        d=ImageDraw.Draw(M); d.rectangle((0,r*H,150,r*H+13),fill=(0,0,0)); d.text((2,r*H+1),lab,fill=(255,255,0))
    M.save('chk%02d.jpg'%(p//per),quality=82)
print((len(rows)+per-1)//per)
