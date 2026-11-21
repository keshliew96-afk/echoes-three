import json,os,glob
S='/tmp/claude-0/-home-user/f34e0118-a5db-5e30-9199-a860704bfc68/scratchpad'
t=open(S+'/page/template.html').read()
t=t.replace('/*DATA*/null',open(S+'/skills.json').read())
caps=json.load(open(S+'/page/captions.json')) if os.path.exists(S+'/page/captions.json') else {}
figs=''
for f in sorted(glob.glob(S+'/page/shots/*.jpg')):
    n=os.path.basename(f)[:-4]
    figs+=f'<figure><img src="shots/{n}.jpg" alt="{caps.get(n,n)}" loading="lazy" width="1600" height="900"><figcaption>{caps.get(n,n)}</figcaption></figure>\n'
t=t.replace('<!--SHOTS-->',figs)
open(S+'/page/index.html','w').write(t)
print(len(t), figs.count('<figure>'))
