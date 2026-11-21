import sys
from PIL import Image
pre,n,cols=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]); sc=float(sys.argv[4]) if len(sys.argv)>4 else 0.5
ims=[Image.open(f'{pre}_{i}.png').convert('RGB') for i in range(n)]
ims=[i.resize((int(i.width*sc),int(i.height*sc))) for i in ims]
W,H=ims[0].size; rows=(n+cols-1)//cols; o=Image.new('RGB',(W*cols,H*rows),'white')
for k,i in enumerate(ims): o.paste(i,((k%cols)*W,(k//cols)*H))
o.save(pre+'.png'); print(o.size)
