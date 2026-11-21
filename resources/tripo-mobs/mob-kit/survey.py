import sys,json,struct
for f in sys.argv[1:]:
    b=open(f,'rb').read(); n=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+n])
    tris=0; prims=0; mn=[9e9]*3; mx=[-9e9]*3
    for m in j.get('meshes',[]):
        for p in m['primitives']:
            prims+=1; a=j['accessors'][p['indices']] if 'indices' in p else j['accessors'][p['attributes']['POSITION']]
            tris+=a['count']//3; pa=j['accessors'][p['attributes']['POSITION']]
            mn=[min(x,y) for x,y in zip(mn,pa['min'])]; mx=[max(x,y) for x,y in zip(mx,pa['max'])]
    imgs=len(j.get('images',[])); ext=j.get('extensionsUsed',[])
    name=f.split('/')[-2]
    print('%-11s tris %6d prims %d imgs %d  size %s  ext %s'%(name,tris,prims,imgs,' x '.join('%.2f'%(b-a) for a,b in zip(mn,mx)),','.join(ext)))
