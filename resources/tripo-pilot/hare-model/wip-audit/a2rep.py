import json,sys
m=json.load(open(sys.argv[1])); bind=m.pop('__bind'); at=m.pop('__at')
print('bind',bind)
keys=sorted({k for v in m.values() for k in v})
for k in keys:
    hi=k in('headSpeed',)
    xs=sorted(((v[k][0],c,v[k][1]) for c,v in m.items() if k in v),reverse=hi)
    print(k.ljust(12),' '.join('%s@%s:%s'%(c,t,x) for x,c,t in xs[:5]))
for a in at: print(a)
