import json,sys,subprocess
# shots.py name:t,t,t[:views] ...  -> s-<name>.png
jobs=[]
for a in sys.argv[1:]:
    p=a.split(':'); jobs.append({'clip':p[0],'t':p[1],'out':'s-'+p[0]+(p[3] if len(p)>3 else '')+'.png','views':p[2] if len(p)>2 and p[2] else 'q,s'})
json.dump(jobs,open('jobs.json','w'))
print(subprocess.run(['node','sheet.cjs','out.glb','x','@','jobs.json'],capture_output=True,text=True).stdout[-600:])
